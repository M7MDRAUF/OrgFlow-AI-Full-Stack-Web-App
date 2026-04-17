// Unit tests — deterministic chunker behavior.
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

  it('splits long text into overlapping chunks', () => {
    const words = Array.from({ length: 250 }, (_, i) => `word${String(i)}`).join(' ');
    const chunks = chunkText(words, { targetTokens: 100, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    // First chunk should have ~100 words.
    expect((chunks[0] ?? '').split(/\s+/).length).toBe(100);
    // Overlap: last 20 words of chunk 1 should match first 20 of chunk 2.
    const tail = (chunks[0] ?? '').split(/\s+/).slice(-20).join(' ');
    const head = (chunks[1] ?? '').split(/\s+/).slice(0, 20).join(' ');
    expect(tail).toBe(head);
  });
});
