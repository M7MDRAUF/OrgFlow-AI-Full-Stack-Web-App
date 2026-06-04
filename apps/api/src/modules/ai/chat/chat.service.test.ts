import { describe, expect, it } from 'vitest';
import { buildPrompt } from './chat.service.js';
import type { RetrievedChunk } from '../retrieval.js';

function makeChunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    documentId: 'doc1',
    documentTitle: 'Test Doc',
    chunkIndex: 0,
    content: 'Sample content',
    score: 0.9,
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('returns system and user messages', () => {
    const result = buildPrompt('hello', [], null, null);
    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe('system');
    expect(result[1]?.role).toBe('user');
  });

  it('strips <<< and >>> from user question', () => {
    const result = buildPrompt('<<<hello>>>', [], null, null);
    expect(result[1]?.content).toContain('USER_QUESTION:\n<<<\nhello\n>>>');
  });

  it('includes DATA section with citation [1] when dataText is provided', () => {
    const result = buildPrompt('question', [], null, 'project-data');
    const userContent = result[1]?.content;
    expect(userContent).toContain('DATA [1]');
    expect(userContent).toContain('project-data');
  });

  it('includes STATS section with citation [1] when statsText is provided (no data)', () => {
    const result = buildPrompt('question', [], 'stats-data', null);
    const userContent = result[1]?.content;
    expect(userContent).toContain('STATS [1]');
    expect(userContent).toContain('stats-data');
  });

  it('uses citations [1] for DATA and [2] for STATS when both provided', () => {
    const result = buildPrompt('question', [], 'stats-data', 'data-text');
    const userContent = result[1]?.content;
    expect(userContent).toContain('DATA [1]');
    expect(userContent).toContain('STATS [2]');
  });

  it('numbers context chunks starting after data and stats citations', () => {
    const chunks = [
      makeChunk({ documentTitle: 'Doc A', chunkIndex: 0, content: 'Content A' }),
      makeChunk({ documentTitle: 'Doc B', chunkIndex: 1, content: 'Content B' }),
    ];
    const result = buildPrompt('question', chunks, 'stats-data', 'data-text');
    const userContent = result[1]?.content;
    expect(userContent).toContain('[3] Doc A');
    expect(userContent).toContain('[4] Doc B');
  });

  it('numbers context chunks starting at [1] when no data/stats', () => {
    const chunks = [makeChunk({ documentTitle: 'Doc A', chunkIndex: 0, content: 'Content A' })];
    const result = buildPrompt('question', chunks, null, null);
    const userContent = result[1]?.content;
    expect(userContent).toContain('[1] Doc A');
  });

  it('produces empty CONTEXT section when chunks array is empty', () => {
    const result = buildPrompt('question', [], null, null);
    const userContent = result[1]?.content;
    expect(userContent).toContain('CONTEXT:\n<<<\n\n>>>');
  });

  it('no data or stats sections when both are null', () => {
    const result = buildPrompt('question', [], null, null);
    const userContent = result[1]?.content;
    expect(userContent).not.toContain('DATA [1]');
    expect(userContent).not.toContain('STATS [1]');
  });

  it('system prompt contains knowledge orchestrator role', () => {
    const result = buildPrompt('hello', [], null, null);
    expect(result[0]?.content).toContain('knowledge orchestrator');
  });

  it('system prompt contains citation rules', () => {
    const result = buildPrompt('hello', [], null, null);
    expect(result[0]?.content).toContain('Do NOT invent citation tokens');
  });
});
