// Regression tests for document upload Zod validation (BE-C-002 / FE-C-004).
// Verifies the validate middleware rejects bad payloads at the HTTP boundary,
// not inside the service.
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
const ORG_ID = new Types.ObjectId();

let adminToken = '';

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const admin = await UserModel.create({
    organizationId: ORG_ID,
    teamId: null,
    email: 'doc-admin@example.com',
    displayName: 'Doc Admin',
    role: 'admin',
    status: 'active',
    passwordHash,
    inviteTokenHash: null,
    inviteExpiresAt: null,
    themePreference: 'system',
  });
  adminToken = signAuthToken({
    sub: admin.id as string,
    organizationId: ORG_ID.toString(),
    teamId: null,
    role: 'admin',
  });
});

const endpoint = '/api/v1/ai/documents';

describe('POST /ai/documents (BE-C-002)', () => {
  it('rejects missing file field', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('visibility', 'organization');
    expect(res.status).toBe(400);
  });

  it('rejects invalid visibility via Zod boundary', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('visibility', 'public')
      .attach('file', Buffer.from('hello world'), {
        filename: 'hi.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects team-visibility without teamId', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('visibility', 'team')
      .attach('file', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects project-visibility without projectId', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('visibility', 'project')
      .attach('file', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid allowedRoles enum', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('visibility', 'organization')
      .field('allowedRoles', 'superuser')
      .attach('file', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});
