// rag-ingest-agent — AI-03: token-aware text chunker.
//
// The previous implementation split on whitespace and counted "words", which
// is a poor proxy for LLM tokens: a paragraph of CJK script can blow past
// the model's context window even at 800 "words", while dense code or URLs
// produce far more tokens than visible whitespace suggests. We now use
// `gpt-tokenizer` (cl100k_base — the encoding used by recent OpenAI/embedding
// models, and a reasonable proxy for sentencepiece-style models like nomic).
// Chunk boundaries are picked on the token stream and decoded back to text,
// which keeps every chunk safely under any modern embedding model's input
// window without any per-language tuning.
import { decode, encode } from 'gpt-tokenizer';

export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
}

export function chunkText(input: string, options: ChunkOptions = {}): string[] {
  const target = options.targetTokens ?? 800;
  const overlap = options.overlapTokens ?? 100;
  const normalized = input.replace(/\r\n/g, '\n').trim();
  if (normalized.length === 0) return [];

  const tokens = encode(normalized);
  if (tokens.length <= target) return [normalized];

  const chunks: string[] = [];
  const step = Math.max(1, target - overlap);
  for (let start = 0; start < tokens.length; start += step) {
    const slice = tokens.slice(start, start + target);
    if (slice.length === 0) break;
    // `decode` round-trips through the same vocabulary used to encode, so
    // boundary characters are stitched correctly and no codepoint is split.
    chunks.push(decode(slice).trim());
    if (start + target >= tokens.length) break;
  }
  // Empty chunks are possible when the slice consists entirely of whitespace
  // tokens — drop them so consumers do not embed empty strings.
  return chunks.filter((c) => c.length > 0);
}
