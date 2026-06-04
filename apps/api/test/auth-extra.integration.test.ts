// AUTH P0 gap tests (Expert Test Master Plan §4.1).
// Covers JWT expiry, malformed payload, header variants, role escalation
// resistance, and NoSQL-injection-shaped query rejection. Existing files
// already cover algorithm pinning (jwt-algorithm-pinning.test.ts), invite
// replay (invite.integration.test.ts), and login flows.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app/app.js';
import { loadEnv } from '../src/app/env.js';
import { signAuthToken, verifyAuthToken } from '../src/middleware/auth.middleware.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const env = loadEnv();
const app = createApp(env);

const ORG = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();
const MEMBER_ID = new Types.ObjectId();

let adminToken = '';
let memberToken = '';

beforeAll(async () => {
  const pw = await bcrypt.hash('Password123!', 10);
  await UserModel.create([
    {
      _id: ADMIN_ID,
      organizationId: ORG,
      teamId: null,
      email: 'gap-admin@test',
      displayName: 'Gap Admin',
      role: 'admin',
      status: 'active',
      passwordHash: pw,
      inviteTokenHash: null,
      inviteExpiresAt: null,
      themePreference: 'system',
    },
    {
      _id: MEMBER_ID,
      organizationId: ORG,
      teamId: null,
      email: 'gap-member@test',
      displayName: 'Gap Member',
      role: 'member',
      status: 'active',
      passwordHash: pw,
      inviteTokenHash: null,
      inviteExpiresAt: null,
      themePreference: 'system',
    },
  ]);
  adminToken = signAuthToken({
    sub: ADMIN_ID.toString(),
    organizationId: ORG.toString(),
    teamId: null,
    role: 'admin',
  });
  memberToken = signAuthToken({
    sub: MEMBER_ID.toString(),
    organizationId: ORG.toString(),
    teamId: null,
    role: 'member',
  });
});

// ───────────────────── AUTH-004: expired JWT ─────────────────────
describe('AUTH-004 expired JWT', () => {
  it('rejects an expired token with 401', () => {
    const expired = jwt.sign(
      {
        sub: ADMIN_ID.toString(),
        organizationId: ORG.toString(),
        teamId: null,
        role: 'admin',
      },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' },
    );
    expect(() => verifyAuthToken(expired)).toThrow(/Invalid or expired token/);
  });

  it('rejects expired token at HTTP boundary', async () => {
    const expired = jwt.sign(
      {
        sub: ADMIN_ID.toString(),
        organizationId: ORG.toString(),
        teamId: null,
        role: 'admin',
      },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-10s' },
    );
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    const body = res.body as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});

// ───────────── AUTH-005: tampered / malformed payload ─────────────
describe('AUTH-005 malformed/tampered payload', () => {
  it('rejects token whose payload is missing required fields', () => {
    const malformed = jwt.sign({ sub: ADMIN_ID.toString() }, env.JWT_SECRET, {
      algorithm: 'HS256',
    });
    expect(() => verifyAuthToken(malformed)).toThrow(/Malformed token payload/);
  });

  it('rejects token whose role is not in the allowed enum', () => {
    const bogus = jwt.sign(
      {
        sub: ADMIN_ID.toString(),
        organizationId: ORG.toString(),
        teamId: null,
        role: 'superuser',
      },
      env.JWT_SECRET,
      { algorithm: 'HS256' },
    );
    expect(() => verifyAuthToken(bogus)).toThrow(/Malformed token payload/);
  });

  it('rejects signature-tampered token', () => {
    const valid = signAuthToken({
      sub: ADMIN_ID.toString(),
      organizationId: ORG.toString(),
      teamId: null,
      role: 'admin',
    });
    // Flip last char of signature (base64url) — signature mismatch.
    const flipped = valid.slice(0, -1) + (valid.endsWith('A') ? 'B' : 'A');
    expect(() => verifyAuthToken(flipped)).toThrow(/Invalid or expired token/);
  });
});

// ───────── AUTH-bearer-header: variants & malformed headers ─────────
describe('Authorization header variants', () => {
  it('rejects missing header with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects non-Bearer scheme', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Basic ${adminToken}`);
    expect(res.status).toBe(401);
  });

  it('accepts case-insensitive bearer prefix', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('rejects empty bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });
});

// ───────── USER-001: member cannot self-promote (PATCH role) ─────────
describe('USER-001 role escalation resistance', () => {
  it('member PATCH /users/:id role=admin → 403', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${MEMBER_ID.toString()}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
    // Confirm the persisted role did NOT change.
    const fresh = await UserModel.findById(MEMBER_ID);
    expect(fresh?.role).toBe('member');
  });

  it('admin PATCH /users/:id role=admin → 200 (positive control)', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${MEMBER_ID.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'leader' });
    expect(res.status).toBe(200);
    const fresh = await UserModel.findById(MEMBER_ID);
    expect(fresh?.role).toBe('leader');
    // Restore for subsequent tests.
    await UserModel.findByIdAndUpdate(MEMBER_ID, { role: 'member' });
  });
});

// ───── USER-004: NoSQL-injection-shaped query is rejected by Zod ─────
describe('USER-004 NoSQL injection sweep', () => {
  it('rejects role filter shaped as $-operator object', async () => {
    // Express parses ?role[$ne]=null into { role: { $ne: 'null' } }. Zod must
    // reject because role is an enum of plain strings, not an object.
    const res = await request(app)
      .get('/api/v1/users?role[$ne]=null')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects status filter shaped as $-operator object', async () => {
    const res = await request(app)
      .get('/api/v1/users?status[$ne]=disabled')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
