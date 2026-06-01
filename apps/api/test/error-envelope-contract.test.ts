// Phase 6 — error envelope contract (CON-004 / CON-005).
// Asserts every error response has shape `{ success: false, error: { code, message } }`,
// no `stack` is leaked at the HTTP boundary, and 4xx/5xx don't trigger CORS-
// related body mutation.
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app/app.js';
import { loadEnv } from '../src/app/env.js';
import { signAuthToken } from '../src/middleware/auth.middleware.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const env = loadEnv();
const app = createApp(env);
const ORG = new Types.ObjectId();
const ADMIN = new Types.ObjectId();
const MEMBER = new Types.ObjectId();

beforeAll(async () => {
  const pw = await bcrypt.hash('Password123!', 10);
  await UserModel.create([
    {
      _id: ADMIN,
      organizationId: ORG,
      teamId: null,
      email: 'env-admin@test',
      displayName: 'Env',
      role: 'admin',
      status: 'active',
      passwordHash: pw,
      inviteTokenHash: null,
      inviteExpiresAt: null,
      themePreference: 'system',
    },
    {
      _id: MEMBER,
      organizationId: ORG,
      teamId: null,
      email: 'env-member@test',
      displayName: 'Env Member',
      role: 'member',
      status: 'active',
      passwordHash: pw,
      inviteTokenHash: null,
      inviteExpiresAt: null,
      themePreference: 'system',
    },
  ]);
});

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

function assertEnvelope(body: unknown): asserts body is ErrorEnvelope {
  expect(body).toBeTypeOf('object');
  const b = body as Record<string, unknown>;
  expect(b['success']).toBe(false);
  const err = b['error'];
  expect(err).toBeTypeOf('object');
  const e = err as Record<string, unknown>;
  expect(typeof e['code']).toBe('string');
  expect(typeof e['message']).toBe('string');
  // Forbidden keys at the boundary.
  expect(e['stack']).toBeUndefined();
  expect((b as { stack?: unknown }).stack).toBeUndefined();
}

describe('Error envelope contract (Phase 6)', () => {
  it('401 unauthenticated → envelope with code UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    assertEnvelope(res.body);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('400 validation → envelope with code VALIDATION_ERROR + details array', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    assertEnvelope(res.body);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('400 malformed JSON body → envelope with code INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{not valid json');
    expect(res.status).toBe(400);
    assertEnvelope(res.body);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('404 unknown route → envelope (notFound handler)', async () => {
    const res = await request(app).get('/api/v1/this-route-does-not-exist');
    expect(res.status).toBe(404);
    assertEnvelope(res.body);
  });

  it('403 RBAC deny → envelope with code FORBIDDEN', async () => {
    const memberToken = signAuthToken({
      sub: MEMBER.toString(),
      organizationId: ORG.toString(),
      teamId: null,
      role: 'member',
    });
    const res = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'x@y.test', name: 'X', role: 'member' });
    expect(res.status).toBe(403);
    assertEnvelope(res.body);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('200 success envelope shape (positive control) — has `success: true` and `data`', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
    // No error key on success responses.
    expect((res.body as { error?: unknown }).error).toBeUndefined();
  });
});
