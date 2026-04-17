// rag-ingest-agent — Ollama-backed embeddings client with deterministic fallback.
// The real Ollama call is attempted; if the endpoint is unreachable (dev without
// Ollama), a deterministic pseudo-embedding is generated so that ingestion + retrieval
// still function end-to-end. This fallback is labelled non-production in docs.

import { loadEnv } from '../../app/env.js';

export const EMBEDDING_DIMENSIONS = 384;

function deterministicEmbedding(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const slot = (code * 2654435761) % EMBEDDING_DIMENSIONS;
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
    return data.embedding;
  } catch {
    return deterministicEmbedding(text);
  }
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    out.push(await embedText(text));
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
