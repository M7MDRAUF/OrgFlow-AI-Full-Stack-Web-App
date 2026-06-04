// Unit tests — cosine similarity is well-behaved on key cases.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockBreaker = vi.hoisted(() => ({
  isOpen: vi.fn().mockReturnValue(false),
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
  getName: vi.fn().mockReturnValue('ollama-embed'),
}));

vi.mock('../../app/env.js', () => ({
  loadEnv: () => ({
    OLLAMA_EMBED_DIMENSIONS: 4,
    OLLAMA_HOST: 'http://localhost:11434',
    OLLAMA_EMBED_MODEL: 'test-model',
  }),
}));

vi.mock('../../config/logger.js', () => ({
  getLogger: () => ({
    warn: vi.fn(),
  }),
}));

vi.mock('../../utils/circuit-breaker.js', () => ({
  createCircuitBreaker: () => mockBreaker,
}));

import {
  cosineSimilarity,
  deterministicEmbedding,
  getEmbeddingDimensions,
  embedTextWithStatus,
  embedText,
  embedMany,
} from './embeddings.js';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn();
  mockBreaker.isOpen.mockReturnValue(false);
  mockBreaker.getName.mockReturnValue('ollama-embed');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Existing: cosineSimilarity
// ---------------------------------------------------------------------------

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3, 4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('returns 0 when either vector is zero', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('is symmetric', () => {
    const a = [0.3, -0.5, 0.2];
    const b = [0.8, 0.1, -0.4];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 9);
  });
});

// ---------------------------------------------------------------------------
// deterministicEmbedding
// ---------------------------------------------------------------------------

describe('deterministicEmbedding', () => {
  it('returns an array of length dims', () => {
    const result = deterministicEmbedding('test', 8);
    expect(result).toHaveLength(8);
  });

  it('returns 4-dim vector when dims is 4', () => {
    const result = deterministicEmbedding('hello', 4);
    expect(result).toHaveLength(4);
  });

  it('returns the same vector for same input (deterministic)', () => {
    const a = deterministicEmbedding('hello world', 8);
    const b = deterministicEmbedding('hello world', 8);
    expect(a).toEqual(b);
  });

  it('returns different vectors for different inputs', () => {
    const a = deterministicEmbedding('hello', 8);
    const b = deterministicEmbedding('world', 8);
    expect(a).not.toEqual(b);
  });

  it('L2-normalizes the output (sum of squares ≈ 1)', () => {
    const result = deterministicEmbedding('test text here', 16);
    const sumSq = result.reduce((s, v) => s + v * v, 0);
    expect(sumSq).toBeCloseTo(1, 10);
  });

  it('handles empty string producing a zero vector', () => {
    const result = deterministicEmbedding('', 4);
    expect(result).toHaveLength(4);
    expect(result.every((v) => v === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getEmbeddingDimensions
// ---------------------------------------------------------------------------

describe('getEmbeddingDimensions', () => {
  it('returns dimensions from env', () => {
    expect(getEmbeddingDimensions()).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// embedTextWithStatus
// ---------------------------------------------------------------------------

describe('embedTextWithStatus', () => {
  it('returns vector and degraded: false when Ollama responds with valid embedding', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3, 0.4] }),
    });

    const result = await embedTextWithStatus('hello');

    expect(result.vector).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(result.degraded).toBe(false);
  });

  it('returns degraded result with deterministic fallback when fetch throws', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new Error('network error'));

    const result = await embedTextWithStatus('hello');

    expect(result.degraded).toBe(true);
    expect(result.vector).toHaveLength(4);
  });

  it('returns degraded result without calling fetch when circuit breaker is open', async () => {
    mockBreaker.isOpen.mockReturnValue(true);
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    const result = await embedTextWithStatus('hello');

    expect(result.degraded).toBe(true);
    expect(result.vector).toHaveLength(4);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('propagates dimension mismatch error', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] }),
    });

    await expect(embedTextWithStatus('hello')).rejects.toThrow('dimension mismatch');
  });

  it('returns degraded result when Ollama responds with HTTP error', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    });

    const result = await embedTextWithStatus('hello');

    expect(result.degraded).toBe(true);
    expect(result.vector).toHaveLength(4);
  });

  it('returns degraded result when Ollama returns empty embedding', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [] }),
    });

    const result = await embedTextWithStatus('hello');

    expect(result.degraded).toBe(true);
    expect(result.vector).toHaveLength(4);
  });

  it('records success on valid response', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3, 0.4] }),
    });

    await embedTextWithStatus('hello');

    expect(mockBreaker.recordSuccess).toHaveBeenCalledOnce();
  });

  it('records failure on fetch error', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new Error('network error'));

    await embedTextWithStatus('hello');

    expect(mockBreaker.recordFailure).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// embedText
// ---------------------------------------------------------------------------

describe('embedText', () => {
  it('calls embedTextWithStatus and returns just the vector', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.25, 0.5, 0.75, 1.0] }),
    });

    const vector = await embedText('hello');

    expect(vector).toEqual([0.25, 0.5, 0.75, 1.0]);
  });

  it('returns degraded vector from fallback when fetch fails', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new Error('timeout'));

    const vector = await embedText('hello');

    expect(vector).toHaveLength(4);
    vector.forEach((v) => expect(typeof v).toBe('number'));
  });
});

// ---------------------------------------------------------------------------
// embedMany
// ---------------------------------------------------------------------------

describe('embedMany', () => {
  it('returns array of EmbedResult with same length as input', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3, 0.4] }),
    });

    const texts = ['first document', 'second document', 'third document'];
    const results = await embedMany(texts);

    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r.vector).toHaveLength(4);
      expect(r.degraded).toBe(false);
    });
  });

  it('handles empty input array', async () => {
    const results = await embedMany([]);
    expect(results).toEqual([]);
  });

  it('handles mixed success and failure', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3, 0.4] }),
      })
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ embedding: [0.5, 0.6, 0.7, 0.8] }),
      });

    const texts = ['good', 'bad', 'good2'];
    const results = await embedMany(texts);

    expect(results).toHaveLength(3);
    expect(results[0]?.degraded).toBe(false);
    expect(results[1]?.degraded).toBe(true);
    expect(results[2]?.degraded).toBe(false);
    expect(results[1]?.vector).toHaveLength(4);
  });
});
