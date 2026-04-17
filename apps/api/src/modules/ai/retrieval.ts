// rag-ingest-agent — Permission-aware retrieval over document chunks.
// Per AGENTS.md §12: retrieval MUST include organization/team/project/role filters.
import { Types } from 'mongoose';
import type { AuthContext } from '../../middleware/auth-context.js';
import {
  DocumentChunkModel,
  type DocumentChunkHydrated,
} from './documents/document-chunk.model.js';
import { DocumentModel } from './documents/document.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { cosineSimilarity, embedText } from './embeddings.js';

export interface RetrievalScope {
  teamId?: string;
  projectId?: string;
}

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  score: number;
}

async function buildScopeFilter(
  auth: AuthContext,
  scope: RetrievalScope,
): Promise<Record<string, unknown>> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const clauses: Record<string, unknown>[] = [{ visibility: 'organization' }];

  if (auth.teamId !== null) {
    clauses.push({ visibility: 'team', teamId: new Types.ObjectId(auth.teamId) });
  }
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

  const filter: Record<string, unknown> = {
    organizationId: orgId,
    $or: clauses,
    $and: [
      {
        $or: [{ allowedRoles: { $size: 0 } }, { allowedRoles: auth.role }],
      },
    ],
  };
  if (scope.teamId !== undefined) filter['teamId'] = new Types.ObjectId(scope.teamId);
  if (scope.projectId !== undefined) filter['projectId'] = new Types.ObjectId(scope.projectId);
  return filter;
}

export async function retrieveChunks(
  auth: AuthContext,
  query: string,
  scope: RetrievalScope,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);
  const filter = await buildScopeFilter(auth, scope);

  // NOTE: for production on MongoDB Atlas, replace this with a $vectorSearch
  // aggregation stage. Here we fetch scope-filtered chunks and rank in-memory,
  // which is correct and portable for dev/test.
  const chunks: DocumentChunkHydrated[] = await DocumentChunkModel.find(filter).limit(500);
  if (chunks.length === 0) return [];

  const scored = chunks.map((c) => ({
    chunk: c,
    score: cosineSimilarity(queryEmbedding, c.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);

  const docIds = [...new Set(top.map((t) => t.chunk.documentId.toString()))];
  const docs = await DocumentModel.find({ _id: { $in: docIds } }).select({ title: 1 });
  const titleById = new Map(docs.map((d) => [d.id as string, d.title]));

  return top.map((t) => ({
    documentId: t.chunk.documentId.toString(),
    documentTitle: titleById.get(t.chunk.documentId.toString()) ?? 'Untitled',
    chunkIndex: t.chunk.chunkIndex,
    content: t.chunk.content,
    score: t.score,
  }));
}
