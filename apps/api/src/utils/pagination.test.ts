// qa-agent — Pagination utility unit tests.
import { describe, expect, it } from 'vitest';
import { paginationSchema, toSkipLimit } from './pagination.js';

describe('paginationSchema', () => {
  it('defaults page=1 and pageSize=20 when empty', () => {
    const result = paginationSchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerces string values to numbers', () => {
    const result = paginationSchema.parse({ page: '3', pageSize: '10' });
    expect(result).toEqual({ page: 3, pageSize: 10 });
  });

  it('accepts valid numeric values', () => {
    const result = paginationSchema.parse({ page: 5, pageSize: 50 });
    expect(result).toEqual({ page: 5, pageSize: 50 });
  });

  it('rejects page <= 0', () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
    expect(() => paginationSchema.parse({ page: -1 })).toThrow();
  });

  it('rejects non-integer page', () => {
    expect(() => paginationSchema.parse({ page: 1.5 })).toThrow();
  });

  it('rejects pageSize <= 0', () => {
    expect(() => paginationSchema.parse({ pageSize: 0 })).toThrow();
    expect(() => paginationSchema.parse({ pageSize: -5 })).toThrow();
  });

  it('rejects pageSize > 100', () => {
    expect(() => paginationSchema.parse({ pageSize: 101 })).toThrow();
  });

  it('accepts pageSize = 100 (boundary)', () => {
    const result = paginationSchema.parse({ pageSize: 100 });
    expect(result.pageSize).toBe(100);
  });

  it('rejects non-integer pageSize', () => {
    expect(() => paginationSchema.parse({ pageSize: 10.5 })).toThrow();
  });
});

describe('toSkipLimit', () => {
  it('page 1 produces skip=0', () => {
    expect(toSkipLimit({ page: 1, pageSize: 20 })).toEqual({ skip: 0, limit: 20 });
  });

  it('page 2 skips first page', () => {
    expect(toSkipLimit({ page: 2, pageSize: 20 })).toEqual({ skip: 20, limit: 20 });
  });

  it('page 3 with pageSize 10', () => {
    expect(toSkipLimit({ page: 3, pageSize: 10 })).toEqual({ skip: 20, limit: 10 });
  });

  it('page 1 with pageSize 100', () => {
    expect(toSkipLimit({ page: 1, pageSize: 100 })).toEqual({ skip: 0, limit: 100 });
  });
});
