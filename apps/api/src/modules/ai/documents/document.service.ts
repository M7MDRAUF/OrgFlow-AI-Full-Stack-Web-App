// rag-ingest-agent — Document service: upload, parse, chunk, embed, list, delete.
// Enforces RBAC + org/team/project scope per AGENTS.md §12.
import type { DocumentResponseDto, UserRole } from '@orgflow/shared-types';
import { Types } from 'mongoose';
import { loadEnv } from '../../../app/env.js';
import { getLogger } from '../../../config/logger.js';
import type { AuthContext } from '../../../middleware/auth-context.js';
import { logAudit } from '../../../utils/audit.js';
import { errors } from '../../../utils/errors.js';
import { toSkipLimit, type Pagination } from '../../../utils/pagination.js';
import { ProjectModel } from '../../projects/project.model.js';
import { TeamModel } from '../../teams/team.model.js';
import { embedMany } from '../embeddings.js';
import { chunkText } from './chunker.js';
import { DocumentChunkModel } from './document-chunk.model.js';
import { DocumentModel, type DocumentHydrated } from './document.model.js';
import type { ListDocumentsQuery, UploadDocumentInput } from './document.schema.js';
import { assertMimeMatchesMagic } from './mime-detect.js';
import { extractText } from './parser.js';

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

  // H-002: verify declared mimetype against the file's magic bytes BEFORE we
  // insert any document record. A mismatch is a hard 400 at the boundary; we
  // never want to persist + index content whose type we cannot trust.
  try {
    assertMimeMatchesMagic(file.buffer, file.mimetype, file.originalname);
  } catch (e) {
    throw errors.validation(e instanceof Error ? e.message : 'Unsupported file content');
  }

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

    // Persist raw text so reindex can re-chunk/re-embed without the original file.
    doc.rawText = parsed.text;

    if (chunks.length === 0) {
      doc.status = 'parsed';
      doc.chunkCount = 0;
      await doc.save();
      logAudit(auth, {
        action: 'document.upload',
        resourceId: doc.id as string,
        meta: { documentId: doc.id as string, fileName: file.originalname },
      });
      return toDto(doc);
    }

    doc.status = 'parsed';
    doc.chunkCount = chunks.length;
    await doc.save();

    const embeddings = await embedMany(chunks);
    const allowedRoles: UserRole[] = input.allowedRoles ?? [];
    // F-004: cleanup any previously-inserted partial chunks before retry.
    // insertMany failures (network blip, dup key) would otherwise leave the
    // document in a half-indexed state that retrieval would still serve.
    await DocumentChunkModel.deleteMany({ documentId: doc._id });
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
    logAudit(auth, {
      action: 'document.upload',
      resourceId: doc.id as string,
      meta: { documentId: doc.id as string, fileName: file.originalname },
    });
    return toDto(doc);
  } catch (err) {
    const logger = getLogger(loadEnv());
    logger.error(
      {
        documentId: doc.id as string,
        fileName: file.originalname,
        fileType: file.mimetype,
        model: loadEnv().OLLAMA_EMBED_MODEL,
        err,
      },
      'Document ingestion failed',
    );
    // F-004: on any failure, clean up the chunks we may have written so a
    // retry starts from a clean state and no stale embeddings leak into
    // retrieval. The parent document is kept as status='failed' for audit.
    try {
      await DocumentChunkModel.deleteMany({ documentId: doc._id });
    } catch {
      // best-effort cleanup; the outer failure is what we surface.
    }
    doc.status = 'failed';
    doc.error = err instanceof Error ? err.message : 'Unknown ingestion error';
    await doc.save();
    throw errors.internal(`Ingestion failed: ${doc.error}`);
  }
}

export async function listDocuments(
  auth: AuthContext,
  query: ListDocumentsQuery,
  pagination: Pagination,
): Promise<{ items: DocumentResponseDto[]; total: number }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const clauses: Record<string, unknown>[] = [{ visibility: 'organization' }];
  if (auth.teamId !== null) {
    clauses.push({ visibility: 'team', teamId: new Types.ObjectId(auth.teamId) });
  }
  // Project visibility: include projects where user is a member (or admin sees all).
  if (auth.role === 'admin') {
    clauses.push({ visibility: 'team' });
    clauses.push({ visibility: 'project' });
  } else if (auth.role === 'leader') {
    // DA-002: Leaders see ALL project-visibility documents for projects in
    // their team, matching retrieval.ts logic. Previously this only showed
    // projects where the leader was in memberIds, creating an inconsistency
    // where a leader could chat about a document but not see it in the list.
    if (auth.teamId !== null) {
      clauses.push({ visibility: 'project', teamId: new Types.ObjectId(auth.teamId) });
    }
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

  const filter: Record<string, unknown> = {
    organizationId: orgId,
    $or: clauses,
    // DA-011: match retrieval.ts allowedRoles filtering — documents whose
    // allowedRoles is empty are visible to everyone; otherwise the
    // authenticated user's role must be in the allowedRoles list.
    $and: [{ $or: [{ allowedRoles: { $size: 0 } }, { allowedRoles: auth.role }] }],
  };
  if (query.visibility !== undefined) filter['visibility'] = query.visibility;
  if (query.teamId !== undefined) filter['teamId'] = new Types.ObjectId(query.teamId);
  if (query.projectId !== undefined) filter['projectId'] = new Types.ObjectId(query.projectId);

  const { skip, limit } = toSkipLimit(pagination);
  const [docs, total] = await Promise.all([
    DocumentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    DocumentModel.countDocuments(filter),
  ]);
  return { items: docs.map(toDto), total };
}

/**
 * H-013: Fetch a single document with the same visibility rules as listDocuments.
 * Members can only see organization-visibility documents, their team's
 * team-visibility documents, or project-visibility documents for projects they
 * belong to. Leaders are additionally limited to their own team for team/project
 * visibility. Admins see everything in their organization.
 */
export async function getDocument(auth: AuthContext, id: string): Promise<DocumentResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const documentId = assertObjectId(id, 'document id');
  const doc = await DocumentModel.findOne({ _id: documentId, organizationId: orgId });
  if (!doc) throw errors.notFound('Document not found');

  // DA-011: allowedRoles check — matching retrieval.ts. If the document has
  // explicit allowedRoles and the user's role is not included, deny access.
  const userRole: UserRole = auth.role;
  if (doc.allowedRoles.length > 0 && !doc.allowedRoles.includes(userRole)) {
    throw errors.forbidden('You cannot view this document');
  }

  // Visibility / scope check.
  if (doc.visibility === 'organization') {
    return toDto(doc);
  }
  if (doc.visibility === 'team') {
    if (auth.role === 'admin') return toDto(doc);
    if (doc.teamId !== null && doc.teamId.toString() === auth.teamId) return toDto(doc);
    throw errors.forbidden('You cannot view this document');
  }
  // project visibility
  if (auth.role === 'admin') return toDto(doc);
  if (auth.role === 'leader') {
    if (doc.teamId !== null && doc.teamId.toString() === auth.teamId) return toDto(doc);
    throw errors.forbidden('You cannot view this document');
  }
  // member: must be in the project's memberIds.
  if (doc.projectId === null) throw errors.forbidden('You cannot view this document');
  const userId = new Types.ObjectId(auth.userId);
  const project = await ProjectModel.findOne({
    _id: doc.projectId,
    organizationId: orgId,
    memberIds: userId,
  }).select({ _id: 1 });
  if (!project) throw errors.forbidden('You cannot view this document');
  return toDto(doc);
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
  logAudit(auth, {
    action: 'document.delete',
    resourceId: id,
    meta: {
      visibility: doc.visibility,
      teamId: doc.teamId?.toString() ?? null,
      projectId: doc.projectId?.toString() ?? null,
    },
  });
  return { deleted: true };
}

export async function reindexDocument(auth: AuthContext, id: string): Promise<DocumentResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const documentId = assertObjectId(id, 'document id');
  const doc = await DocumentModel.findOne({ _id: documentId, organizationId: orgId });
  if (!doc) throw errors.notFound('Document not found');

  if (auth.role === 'member') throw errors.forbidden('Members cannot reindex documents');
  if (auth.role === 'leader') {
    if (doc.visibility === 'organization') {
      throw errors.forbidden('Leaders cannot reindex organization documents');
    }
    const scopeTeamId = doc.teamId?.toString() ?? null;
    if (scopeTeamId !== auth.teamId) {
      throw errors.forbidden("Leaders can only reindex their own team's documents");
    }
  }

  if (doc.rawText === null) {
    throw errors.validation('Document has no stored text; re-upload instead');
  }

  try {
    const chunks = chunkText(doc.rawText);
    await DocumentChunkModel.deleteMany({ documentId: doc._id });

    if (chunks.length === 0) {
      doc.status = 'parsed';
      doc.chunkCount = 0;
      doc.error = null;
      await doc.save();
      logAudit(auth, { action: 'document.reindex', resourceId: id });
      return toDto(doc);
    }

    const embeddings = await embedMany(chunks);
    await DocumentChunkModel.insertMany(
      chunks.map((content, index) => ({
        documentId: doc._id,
        organizationId: orgId,
        teamId: doc.teamId,
        projectId: doc.projectId,
        visibility: doc.visibility,
        allowedRoles: doc.allowedRoles,
        chunkIndex: index,
        content,
        embedding: embeddings[index] ?? [],
      })),
    );

    doc.status = 'indexed';
    doc.chunkCount = chunks.length;
    doc.error = null;
    await doc.save();
    logAudit(auth, { action: 'document.reindex', resourceId: id });
    return toDto(doc);
  } catch (err) {
    try {
      await DocumentChunkModel.deleteMany({ documentId: doc._id });
    } catch {
      // best-effort cleanup
    }
    doc.status = 'failed';
    doc.error = err instanceof Error ? err.message : 'Unknown reindex error';
    await doc.save();
    throw errors.internal(`Reindex failed: ${doc.error}`);
  }
}
