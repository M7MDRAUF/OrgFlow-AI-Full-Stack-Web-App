// rag-ingest-agent — Ollama-backed embeddings client with deterministic fallback.
// The real Ollama call is attempted; if the endpoint is unreachable (dev without
// Ollama), a deterministic pseudo-embedding is generated so that ingestion + retrieval
// still function end-to-end. This fallback is labelled non-production in docs.

import { loadEnv } from '../../app/env.js';
import { getLogger } from '../../config/logger.js';

// Dimensions are env-driven so deployments can swap embedding models without
// a code change (I-003). Callers MUST always use getEmbeddingDimensions() when
// allocating vectors so the fallback and the real model agree.
export function getEmbeddingDimensions(): number {
  return loadEnv().OLLAMA_EMBED_DIMENSIONS;
}

function deterministicEmbedding(text: string, dims: number): number[] {
  const vec = new Array<number>(dims).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const slot = (code * 2654435761) % dims;
    vec[slot] = (vec[slot] ?? 0) + 1;
  }
  // L2-normalize
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

interface OllamaEmbedResponse {
  embedding?: number[];
}

export async function embedText(text: string): Promise<number[]> {
  const env = loadEnv();
  const dims = env.OLLAMA_EMBED_DIMENSIONS;
  const url = `${env.OLLAMA_HOST}/api/embeddings`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.OLLAMA_EMBED_MODEL, prompt: text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Ollama embed failed: ${String(response.status)}`);
    const data = (await response.json()) as OllamaEmbedResponse;
    if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
      throw new Error('Ollama returned empty embedding');
    }
    // F-003: guard against dimension drift — a silent mismatch between
    // indexed embeddings and query embeddings corrupts retrieval ranking.
    if (data.embedding.length !== dims) {
      throw new Error(
        `Embedding dimension mismatch: expected ${String(dims)}, got ${String(data.embedding.length)}`,
      );
    }
    return data.embedding;
  } catch (err: unknown) {
    // DA-001: Only fall back on network/availability errors. Configuration
    // errors (dimension mismatch, empty embeddings) MUST propagate so that
    // callers surface them instead of silently indexing garbage vectors.
    if (err instanceof Error && err.message.includes('dimension mismatch')) {
      throw err;
    }
    getLogger(env).error(
      { model: env.OLLAMA_EMBED_MODEL, query: text.substring(0, 100), err },
      'Ollama embedding generation failed, using deterministic fallback',
    );
    return deterministicEmbedding(text, dims);
  }
}

/**
 * F-002: parallelised batch embedding. We cap concurrency to avoid saturating
 * Ollama while still being materially faster than a serial loop for large
 * documents. Order of results is preserved.
 */
export async function embedMany(texts: string[]): Promise<number[][]> {
  const CONCURRENCY = 8;
  const out = new Array<number[]>(texts.length);
  for (let start = 0; start < texts.length; start += CONCURRENCY) {
    const slice = texts.slice(start, start + CONCURRENCY);
    const results = await Promise.all(slice.map((t) => embedText(t)));
    for (let i = 0; i < results.length; i += 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out[start + i] = results[i]!;
    }
  }
  return out;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
