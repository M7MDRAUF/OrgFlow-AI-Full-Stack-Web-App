// Unit tests — deterministic chunker behavior.
// AI-03: chunker is now token-based (gpt-tokenizer / cl100k_base). Counts
// are measured in BPE tokens, not whitespace-separated words, so the
// long-text assertion verifies the encoded length stays at the target.
import { encode } from 'gpt-tokenizer';
import { describe, expect, it } from 'vitest';
import { chunkText } from './chunker.js';

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n  ')).toEqual([]);
  });

  it('returns single chunk when under target', () => {
    const text = 'hello world this is short';
    const chunks = chunkText(text, { targetTokens: 100, overlapTokens: 10 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits long text into overlapping chunks at the token boundary', () => {
    // 250 short tokens of "word<n>" generally decode to >250 BPE tokens
    // because the trailing digit becomes its own token. The exact word
    // count per chunk therefore varies by input — what we assert is that
    // the encoded token count for each non-final chunk is exactly the
    // target, which is the contract retrieval cares about.
    const words = Array.from({ length: 250 }, (_, i) => `word${String(i)}`).join(' ');
    const chunks = chunkText(words, { targetTokens: 100, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(encode(chunks[0] ?? '').length).toBe(100);
  });
});
