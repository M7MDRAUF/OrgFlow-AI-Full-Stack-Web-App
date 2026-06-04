// qa-agent — TG-B01: Invite + complete-invite integration tests.
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app/app.js';
import { loadEnv } from '../src/app/env.js';
import { signAuthToken } from '../src/middleware/auth.middleware.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const env = loadEnv();
const app = createApp(env);
const ORG = new Types.ObjectId();
const TEAM = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();

let adminToken: string;

beforeAll(async () => {
  await OrganizationModel.create({ _id: ORG, name: 'InviteOrg', slug: 'inv' });
  await TeamModel.create({ _id: TEAM, organizationId: ORG, name: 'InvTeam' });
  const passwordHash = await bcrypt.hash('admin-password1', 10);
  await UserModel.create({
    _id: ADMIN_ID,
    organizationId: ORG,
    teamId: TEAM,
    email: 'inv-admin@example.com',
    displayName: 'Inv Admin',
    role: 'admin',
    status: 'active',
    passwordHash,
    inviteTokenHash: null,
    inviteExpiresAt: null,
  });
  adminToken = signAuthToken({
    sub: ADMIN_ID.toString(),
    organizationId: ORG.toString(),
    teamId: TEAM.toString(),
    role: 'admin',
  });
});

describe('POST /api/v1/auth/invite', () => {
  it('creates a pending user and returns invite token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newbie@example.com',
        name: 'Newbie',
        role: 'member',
        teamId: TEAM.toString(),
      });
    expect(res.status).toBe(201);
    const body = res.body as {
      success: boolean;
      data: { inviteToken: string; user: { status: string } };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data.inviteToken).toBe('string');
    expect(body.data.user.status).toBe('pending');
  });

  it('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'newbie@example.com', name: 'Dupe', role: 'member' });
    expect(res.status).toBe(409);
  });

  it('rejects non-admin', async () => {
    const memberToken = signAuthToken({
      sub: new Types.ObjectId().toString(),
      organizationId: ORG.toString(),
      teamId: TEAM.toString(),
      role: 'member',
    });
    const res = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'another@example.com', name: 'Foo', role: 'member' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/auth/complete-invite', () => {
  let inviteToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'activate@example.com', name: 'Activator', role: 'leader' });
    const body = res.body as { data: { inviteToken: string } };
    inviteToken = body.data.inviteToken;
  });

  it('activates user with valid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/complete-invite')
      .send({ token: inviteToken, password: 'secure-password-42' });
    expect(res.status).toBe(200);
    const body = res.body as {
      success: boolean;
      data: { token: string; user: { status: string } };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe('string');
    expect(body.data.user.status).toBe('active');
  });

  it('rejects already-used token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/complete-invite')
      .send({ token: inviteToken, password: 'any-long-password-1', displayName: 'Again' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app).post('/api/v1/auth/complete-invite').send({
      token: 'not-a-real-token-abcdef1234',
      password: 'any-long-password-1',
      displayName: 'Bad',
    });
    expect(res.status).toBe(401);
  });
});
