// Integration test — auth login flow over HTTP using an in-memory Mongo.
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import './setup-db.js';
import { createApp } from '../src/app/app.js';
import { loadEnv } from '../src/app/env.js';
import { UserModel } from '../src/modules/users/user.model.js';

const env = loadEnv();
const app = createApp(env);

const TEST_ORG_ID = new Types.ObjectId();

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('correct-horse', 10);
  await UserModel.create({
    organizationId: TEST_ORG_ID,
    teamId: null,
    email: 'admin@example.com',
    displayName: 'Test Admin',
    role: 'admin',
    status: 'active',
    passwordHash,
    inviteTokenHash: null,
    inviteExpiresAt: null,
    themePreference: 'system',
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'correct-horse' });
    expect(res.status).toBe(200);
    const body = res.body as {
      success: boolean;
      data: { token: string; user: { email: string; role: string } };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe('string');
    expect(body.data.user.email).toBe('admin@example.com');
    expect(body.data.user.role).toBe('admin');
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    const body = res.body as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('validates payload shape', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'bad' });
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
