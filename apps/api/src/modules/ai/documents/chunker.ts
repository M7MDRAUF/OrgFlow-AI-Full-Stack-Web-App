// rag-ingest-agent — Deterministic text chunker.
// Approximate token counting via whitespace words. Target ~800 tokens, 100 overlap.

export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
}

export function chunkText(input: string, options: ChunkOptions = {}): string[] {
  const target = options.targetTokens ?? 800;
  const overlap = options.overlapTokens ?? 100;
  const normalized = input.replace(/\r\n/g, '\n').trim();
  if (normalized.length === 0) return [];

  const words = normalized.split(/\s+/);
  if (words.length <= target) return [normalized];

  const chunks: string[] = [];
  const step = Math.max(1, target - overlap);
  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + target);
    if (slice.length === 0) break;
    chunks.push(slice.join(' '));
    if (start + target >= words.length) break;
  }
  return chunks;
}
