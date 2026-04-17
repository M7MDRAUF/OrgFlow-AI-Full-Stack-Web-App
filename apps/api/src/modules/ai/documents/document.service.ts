// rag-ingest-agent — Document service: upload, parse, chunk, embed, list, delete.
// Enforces RBAC + org/team/project scope per AGENTS.md §12.
import { Types } from 'mongoose';
import type { DocumentResponseDto, UserRole } from '@orgflow/shared-types';
import { DocumentModel, type DocumentHydrated } from './document.model.js';
import { DocumentChunkModel } from './document-chunk.model.js';
import { ProjectModel } from '../../projects/project.model.js';
import { TeamModel } from '../../teams/team.model.js';
import { errors } from '../../../utils/errors.js';
import type { AuthContext } from '../../../middleware/auth-context.js';
import type { ListDocumentsQuery, UploadDocumentInput } from './document.schema.js';
import { extractText } from './parser.js';
import { chunkText } from './chunker.js';
import { embedMany } from '../embeddings.js';

function assertObjectId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw errors.validation(`Invalid ${label}`);
  return new Types.ObjectId(id);
}

function toDto(doc: DocumentHydrated): DocumentResponseDto {
  return {
    id: doc.id as string,
    organizationId: doc.organizationId.toString(),
    teamId: doc.teamId === null ? null : doc.teamId.toString(),
    projectId: doc.projectId === null ? null : doc.projectId.toString(),
    visibility: doc.visibility,
    title: doc.title,
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
    uploadedBy: doc.uploadedBy.toString(),
    status: doc.status,
    allowedRoles: doc.allowedRoles,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function assertCanUpload(
  auth: AuthContext,
  input: UploadDocumentInput,
): Promise<{ teamId: Types.ObjectId | null; projectId: Types.ObjectId | null }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  if (auth.role === 'member') {
    throw errors.forbidden('Members cannot upload documents');
  }

  if (input.visibility === 'organization') {
    if (auth.role !== 'admin') {
      throw errors.forbidden('Only admins can upload organization-wide documents');
    }
    return { teamId: null, projectId: null };
  }

  if (input.visibility === 'team') {
    const teamId = assertObjectId(input.teamId ?? '', 'teamId');
    const team = await TeamModel.findOne({ _id: teamId, organizationId: orgId });
    if (!team) throw errors.notFound('Team not found');
    if (auth.role === 'leader' && auth.teamId !== teamId.toString()) {
      throw errors.forbidden('Leaders can only upload to their own team');
    }
    return { teamId, projectId: null };
  }

  const projectId = assertObjectId(input.projectId ?? '', 'projectId');
  const project = await ProjectModel.findOne({ _id: projectId, organizationId: orgId });
  if (!project) throw errors.notFound('Project not found');
  if (auth.role === 'leader' && auth.teamId !== project.teamId.toString()) {
    throw errors.forbidden("Leaders can only upload to their own team's projects");
  }
  return { teamId: project.teamId, projectId };
}

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export async function uploadDocument(
  auth: AuthContext,
  input: UploadDocumentInput,
  file: UploadedFile,
): Promise<DocumentResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const { teamId, projectId } = await assertCanUpload(auth, input);

  const doc = await DocumentModel.create({
    organizationId: orgId,
    teamId,
    projectId,
    visibility: input.visibility,
    title: input.title,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    uploadedBy: new Types.ObjectId(auth.userId),
    status: 'uploaded',
    allowedRoles: input.allowedRoles ?? [],
    chunkCount: null,
    error: null,
  });

  try {
    const parsed = await extractText(file.buffer, file.mimetype, file.originalname);
    const chunks = chunkText(parsed.text);
    if (chunks.length === 0) {
      doc.status = 'parsed';
      doc.chunkCount = 0;
      await doc.save();
      return toDto(doc);
    }

    doc.status = 'parsed';
    doc.chunkCount = chunks.length;
    await doc.save();

    const embeddings = await embedMany(chunks);
    const allowedRoles: UserRole[] = input.allowedRoles ?? [];
    await DocumentChunkModel.insertMany(
      chunks.map((content, index) => ({
        documentId: doc._id,
        organizationId: orgId,
        teamId,
        projectId,
        visibility: input.visibility,
        allowedRoles,
        chunkIndex: index,
        content,
        embedding: embeddings[index] ?? [],
      })),
    );

    doc.status = 'indexed';
    await doc.save();
    return toDto(doc);
  } catch (err) {
    doc.status = 'failed';
    doc.error = err instanceof Error ? err.message : 'Unknown ingestion error';
    await doc.save();
    throw errors.internal(`Ingestion failed: ${doc.error}`);
  }
}

export async function listDocuments(
  auth: AuthContext,
  query: ListDocumentsQuery,
): Promise<DocumentResponseDto[]> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const clauses: Record<string, unknown>[] = [{ visibility: 'organization' }];
  if (auth.teamId !== null) {
    clauses.push({ visibility: 'team', teamId: new Types.ObjectId(auth.teamId) });
  }
  // Project visibility: include projects where user is a member (or admin sees all).
  if (auth.role === 'admin') {
    clauses.push({ visibility: 'team' });
    clauses.push({ visibility: 'project' });
  } else {
    const userId = new Types.ObjectId(auth.userId);
    const memberProjects = await ProjectModel.find({
      organizationId: orgId,
      memberIds: userId,
    }).select({ _id: 1 });
    const projectIds = memberProjects.map((p) => p._id);
    if (projectIds.length > 0) {
      clauses.push({ visibility: 'project', projectId: { $in: projectIds } });
    }
  }

  const filter: Record<string, unknown> = { organizationId: orgId, $or: clauses };
  if (query.visibility !== undefined) filter['visibility'] = query.visibility;
  if (query.teamId !== undefined) filter['teamId'] = new Types.ObjectId(query.teamId);
  if (query.projectId !== undefined) filter['projectId'] = new Types.ObjectId(query.projectId);

  const docs = await DocumentModel.find(filter).sort({ createdAt: -1 }).limit(200);
  return docs.map(toDto);
}

export async function deleteDocument(auth: AuthContext, id: string): Promise<{ deleted: true }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const documentId = assertObjectId(id, 'document id');
  const doc = await DocumentModel.findOne({ _id: documentId, organizationId: orgId });
  if (!doc) throw errors.notFound('Document not found');

  if (auth.role === 'member') throw errors.forbidden('Members cannot delete documents');
  if (auth.role === 'leader') {
    if (doc.visibility === 'organization') {
      throw errors.forbidden('Leaders cannot delete organization documents');
    }
    const scopeTeamId = doc.teamId?.toString() ?? null;
    if (scopeTeamId !== auth.teamId) {
      throw errors.forbidden("Leaders can only delete their own team's documents");
    }
  }

  await DocumentChunkModel.deleteMany({ documentId });
  await doc.deleteOne();
  return { deleted: true };
}
