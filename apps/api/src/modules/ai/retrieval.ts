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
import { cosineSimilarity, embedTextWithStatus } from './embeddings.js';

const FALLBACK_MAX_CHUNKS = 100;

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
    // AI-01: exclude chunks whose embedding came from the deterministic
    // fallback (Ollama down at ingest time). Such vectors carry no
    // semantic signal; serving them as "grounded" answers is the
    // wrong-answer scenario the AI safety guardrails block.
    embeddingDegraded: { $ne: true },
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
  const { vector: queryEmbedding, degraded: queryDegraded } = await embedTextWithStatus(query);
  const { filter, roleClause } = await buildScopeFilter(auth, scope);

  if (queryDegraded) {
    getLogger(loadEnv()).warn(
      { textPreview: query.substring(0, 80) },
      'AI-02: query embedding is degraded (deterministic fallback) — returning empty retrieval set',
    );
    return [];
  }

  const env = loadEnv();
  const useVectorSearch = !env.DEV_VECTOR_FALLBACK;

  let top: {
    chunk: Pick<DocumentChunkDoc, 'documentId' | 'chunkIndex' | 'content'>;
    score: number;
  }[];

  if (useVectorSearch) {
    // F-001 / AI-04: Atlas $vectorSearch with RBAC-safe post-filter. Role
    // filtering goes through `$match` (not pre-filter) because `$size` is
    // unsupported in `$vectorSearch.filter`. Recall is therefore sensitive
    // to the ratio between `limit` and the number of post-match results,
    // so we adaptively grow the over-fetch from 4× to 8× when the first
    // pass returns fewer hits than `topK`.
    const runVectorSearch = async (
      multiplier: number,
    ): Promise<(DocumentChunkDoc & { score: number })[]> => {
      const pipeline = [
        {
          $vectorSearch: {
            index: 'chunk_vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: Math.max(topK * 20, topK * multiplier * 4),
            limit: topK * multiplier,
            filter,
          },
        },
        { $match: roleClause } satisfies PipelineStage,
        { $limit: topK } satisfies PipelineStage,
        { $addFields: { score: { $meta: 'vectorSearchScore' } } } satisfies PipelineStage,
      ] as PipelineStage[];
      return DocumentChunkModel.aggregate(pipeline);
    };

    try {
      let results = await runVectorSearch(8);
      if (results.length < topK) {
        // Victim of the post-filter cliff (member-scoped users with
        // narrow project membership or restrictive allowedRoles). Re-run
        // with a 16× multiplier before giving up.
        const logger = getLogger(env);
        logger.warn(
          { topK, firstPassHits: results.length, multiplier: 16 },
          'AI-04: vector retrieval under-recalled at 8×, retrying with 16× over-fetch',
        );
        results = await runVectorSearch(16);
      }
      top = results.map((r) => ({ chunk: r, score: r.score }));
    } catch (err: unknown) {
      // Atlas outage or misconfigured index — fall back to dev cosine path
      // so the user still gets a best-effort answer rather than a 500.
      const logger = getLogger(env);
      logger.error({ err }, '$vectorSearch aggregation failed, falling back to cosine similarity');
      const devFilter: Record<string, unknown> = { $and: [filter, roleClause] };
      const chunks: DocumentChunkHydrated[] =
        await DocumentChunkModel.find(devFilter).limit(FALLBACK_MAX_CHUNKS);
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
    const chunks: DocumentChunkHydrated[] =
      await DocumentChunkModel.find(devFilter).limit(FALLBACK_MAX_CHUNKS);

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
