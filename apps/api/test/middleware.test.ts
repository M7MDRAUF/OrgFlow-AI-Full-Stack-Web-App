// platform-agent — Middleware unit tests: role guard, validate.
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { requireRole } from '../src/middleware/role.middleware.js';
import { validate } from '../src/middleware/validate.middleware.js';

// ----- helpers to fake Express req/res/next -----
function fakeReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, query: {}, params: {}, ...overrides } as unknown as Request;
}
function fakeRes(): Response {
  return {} as unknown as Response;
}

// ======================== requireRole ========================
describe('requireRole middleware', () => {
  it('passes when role meets minimum', () => {
    const next = vi.fn<NextFunction>();
    const req = fakeReq({
      auth: { userId: '1', organizationId: '1', teamId: null, role: 'admin' },
    });
    requireRole('leader')(req, fakeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects when role is below minimum', () => {
    const next = vi.fn<NextFunction>();
    const req = fakeReq({
      auth: { userId: '1', organizationId: '1', teamId: null, role: 'member' },
    });
    requireRole('admin')(req, fakeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('rejects when auth is missing', () => {
    const next = vi.fn<NextFunction>();
    const req = fakeReq({ auth: undefined });
    requireRole('member')(req, fakeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

// ======================== validate ========================
describe('validate middleware', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it('passes valid body and replaces req.body with parsed data', () => {
    const next = vi.fn<NextFunction>();
    const req = fakeReq({ body: { name: 'Alice', age: 30 } });
    validate({ body: schema })(req, fakeRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Alice', age: 30 });
  });

  it('rejects invalid body', () => {
    const next = vi.fn<NextFunction>();
    const req = fakeReq({ body: { name: '', age: -1 } });
    validate({ body: schema })(req, fakeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('validates query params', () => {
    const qSchema = z.object({ page: z.coerce.number().int().positive().default(1) });
    const next = vi.fn<NextFunction>();
    const req = fakeReq({ query: { page: '5' } as unknown as Request['query'] });
    validate({ query: qSchema })(req, fakeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects invalid query params', () => {
    const qSchema = z.object({ limit: z.coerce.number().int().positive() });
    const next = vi.fn<NextFunction>();
    const req = fakeReq({ query: { limit: 'abc' } as unknown as Request['query'] });
    validate({ query: qSchema })(req, fakeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
