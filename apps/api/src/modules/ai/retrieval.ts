// rag-ingest-agent — Permission-aware retrieval over document chunks.
// Per AGENTS.md §12: retrieval MUST include organization/team/project/role filters.
import { Types, type PipelineStage } from 'mongoose';
import { loadEnv } from '../../app/env.js';
import { getLogger } from '../../config/logger.js';
import type { AuthContext } from '../../middleware/auth-context.js';
import { ProjectModel } from '../projects/project.model.js';
import {
  DocumentChunkModel,
  type DocumentChunkDoc,
  type DocumentChunkHydrated,
} from './documents/document-chunk.model.js';
import { DocumentModel } from './documents/document.model.js';
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
): Promise<{ filter: Record<string, unknown>; roleClause: Record<string, unknown> }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  // Every authenticated user can always see organization-visibility chunks.
  const clauses: Record<string, unknown>[] = [{ visibility: 'organization' }];

  if (auth.role === 'admin') {
    // Admins are org-wide by design (§2.8 FR-001/FR-008). Cross-team and
    // cross-project documents are in-scope for admins — still filtered by
    // organizationId plus any optional scope narrowing applied below.
    clauses.push({ visibility: 'team' });
    clauses.push({ visibility: 'project' });
  } else if (auth.role === 'leader') {
    // Leaders see team-visibility chunks for their own team AND all
    // project-visibility chunks for projects in their team (AI-H-001).
    if (auth.teamId !== null) {
      const teamObj = new Types.ObjectId(auth.teamId);
      clauses.push({ visibility: 'team', teamId: teamObj });
      clauses.push({ visibility: 'project', teamId: teamObj });
    }
  } else {
    // Members see their own team's team-visibility chunks and project chunks
    // only for projects they are a member of.
    if (auth.teamId !== null) {
      clauses.push({ visibility: 'team', teamId: new Types.ObjectId(auth.teamId) });
    }
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
  };

  // Role-based chunk access: allowedRoles empty → any role; otherwise must contain auth.role.
  // $size is NOT supported inside Atlas $vectorSearch pre-filter, so we keep
  // the role clause separate and apply it as a post-$match in the vector path.
  const roleClause: Record<string, unknown> = {
    $or: [{ allowedRoles: { $size: 0 } }, { allowedRoles: auth.role }],
  };

  if (scope.teamId !== undefined) filter['teamId'] = new Types.ObjectId(scope.teamId);
  if (scope.projectId !== undefined) filter['projectId'] = new Types.ObjectId(scope.projectId);
  return { filter, roleClause };
}

export async function retrieveChunks(
  auth: AuthContext,
  query: string,
  scope: RetrievalScope,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);
  const { filter, roleClause } = await buildScopeFilter(auth, scope);

  const env = loadEnv();
  const useVectorSearch = !env.DEV_VECTOR_FALLBACK;

  let top: {
    chunk: Pick<DocumentChunkDoc, 'documentId' | 'chunkIndex' | 'content'>;
    score: number;
  }[];

  if (useVectorSearch) {
    // F-001: Atlas $vectorSearch pipeline with RBAC-safe post-filter.
    // Role filtering via $match (not pre-filter) because $size is unsupported
    // in $vectorSearch filter. Over-fetch by 2x to compensate for post-filtering.
    // $vectorSearch is an Atlas-specific stage not in PipelineStage union.
    const pipeline = [
      {
        $vectorSearch: {
          index: 'chunk_vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 20,
          limit: topK * 2,
          filter,
        },
      },
      { $match: roleClause } satisfies PipelineStage,
      { $limit: topK } satisfies PipelineStage,
      { $addFields: { score: { $meta: 'vectorSearchScore' } } } satisfies PipelineStage,
    ] as PipelineStage[];
    try {
      const results: (DocumentChunkDoc & { score: number })[] =
        await DocumentChunkModel.aggregate(pipeline);
      top = results.map((r) => ({ chunk: r, score: r.score }));
    } catch (err: unknown) {
      // Atlas outage or misconfigured index — fall back to dev cosine path
      // so the user still gets a best-effort answer rather than a 500.
      const logger = getLogger(env);
      logger.error({ err }, '$vectorSearch aggregation failed, falling back to cosine similarity');
      const devFilter: Record<string, unknown> = { $and: [filter, roleClause] };
      const chunks: DocumentChunkHydrated[] = await DocumentChunkModel.find(devFilter).limit(500);
      const scored = chunks.map((c) => ({
        chunk: c,
        score: cosineSimilarity(queryEmbedding, c.embedding),
      }));
      scored.sort((a, b) => b.score - a.score);
      top = scored.slice(0, topK);
    }
  } else {
    // DEV fallback: fetch scope-filtered chunks and rank in-memory with cosine
    // similarity. Portable for dev/test where no Atlas vector index exists.
    // Use $and to preserve both $or clauses (scope filter + role filter).
    const devFilter: Record<string, unknown> = { $and: [filter, roleClause] };
    const chunks: DocumentChunkHydrated[] = await DocumentChunkModel.find(devFilter).limit(500);

    const scored = chunks.map((c) => ({
      chunk: c,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    top = scored.slice(0, topK);
  }

  if (top.length === 0) return [];

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
