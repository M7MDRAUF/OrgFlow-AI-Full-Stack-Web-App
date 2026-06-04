// qa-agent — TG-B03: AI chat endpoint integration tests.
// Tests health + history endpoints via HTTP. askQuestion depends on Ollama
// and is not covered here — use E2E with a running Ollama for that.
import { Types } from 'mongoose';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app/app.js';
import { loadEnv } from '../src/app/env.js';
import { signAuthToken } from '../src/middleware/auth.middleware.js';
import { ChatLogModel } from '../src/modules/ai/chat/chat-log.model.js';
import './setup-db.js';

const env = loadEnv();
const app = createApp(env);
const ORG = new Types.ObjectId();
const USER_ID = new Types.ObjectId();

let token: string;

beforeAll(async () => {
  token = signAuthToken({
    sub: USER_ID.toString(),
    organizationId: ORG.toString(),
    teamId: null,
    role: 'member',
  });
  // Seed history for pagination test
  const logs = Array.from({ length: 5 }, (_, i) => ({
    organizationId: ORG,
    userId: USER_ID,
    role: 'user' as const,
    content: `msg-${String(i)}`,

    sources: [],
  }));
  await ChatLogModel.create(logs);
});

describe('GET /api/v1/ai/chat/health', () => {
  it('returns health status (may show unavailable if Ollama offline)', async () => {
    const res = await request(app)
      .get('/api/v1/ai/chat/health')
      .set('Authorization', `Bearer ${token}`);
    // Health endpoint always returns 200 with status field
    expect(res.status).toBe(200);
    const body = res.body as { success: boolean };
    expect(body.success).toBe(true);
  });
});

describe('GET /api/v1/ai/chat/history', () => {
  it('returns paginated chat history', async () => {
    const res = await request(app)
      .get('/api/v1/ai/chat/history?limit=3')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const body = res.body as {
      success: boolean;
      data: { messages: unknown[]; nextCursor: string | null };
    };
    expect(body.success).toBe(true);
    expect(body.data.messages.length).toBe(3);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/ai/chat/history');
    expect(res.status).toBe(401);
  });

  it('validates limit param', async () => {
    const res = await request(app)
      .get('/api/v1/ai/chat/history?limit=999')
      .set('Authorization', `Bearer ${token}`);
    // Zod rejects limit > 100
    expect(res.status).toBe(400);
  });
});
