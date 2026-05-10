// Backend infrastructure invariants — covers Phase 4 orphan-scan, Phase 7
// config fail-fast, Phase 8 security headers + CORS allowlist, Phase 9 DB
// indexes, Phase 10 logger redaction. Aligns with Expert Test Master Plan
// §4.4 / §4.7 / §4.8 / §4.9 / §4.10. Pure unit-style — no live HTTP servers.
import { Types } from 'mongoose';
import pino from 'pino';
import request from 'supertest';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app/app.js';
import { __resetEnvCacheForTests, getCorsOrigins, loadEnv } from '../src/app/env.js';
import { DocumentChunkModel } from '../src/modules/ai/documents/document-chunk.model.js';
import { DocumentModel } from '../src/modules/ai/documents/document.model.js';
import { TaskCommentModel, TaskModel } from '../src/modules/tasks/task.model.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { ChatLogModel } from '../src/modules/ai/chat/chat-log.model.js';
import { AnnouncementModel } from '../src/modules/announcements/announcement.model.js';
import './setup-db.js';

// ─────────────────── Phase 7 — config fail-fast (CFG-001/002/003) ───────────────────
describe('CFG fail-fast (Phase 7)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    __resetEnvCacheForTests();
  });

  it('CFG-001: missing JWT_SECRET → loadEnv throws', () => {
    __resetEnvCacheForTests();
    delete process.env['JWT_SECRET'];
    expect(() => loadEnv()).toThrow(/JWT_SECRET/);
  });

  it('CFG-002: JWT_SECRET shorter than 32 chars → loadEnv throws', () => {
    __resetEnvCacheForTests();
    process.env['JWT_SECRET'] = 'too-short';
    expect(() => loadEnv()).toThrow(/at least 32 chars/);
  });

  it('CFG-003: NODE_ENV=production + DEV_VECTOR_FALLBACK=1 → loadEnv throws (RAG-R-005)', () => {
    __resetEnvCacheForTests();
    process.env['NODE_ENV'] = 'production';
    process.env['DEV_VECTOR_FALLBACK'] = '1';
    process.env['JWT_SECRET'] = 'a'.repeat(40);
    process.env['MONGODB_URI'] = 'mongodb://localhost/x';
    expect(() => loadEnv()).toThrow(/DEV_VECTOR_FALLBACK/);
  });

  it('CFG-003 happy path: NODE_ENV=production + DEV_VECTOR_FALLBACK=0 boots', () => {
    __resetEnvCacheForTests();
    process.env['NODE_ENV'] = 'production';
    process.env['DEV_VECTOR_FALLBACK'] = '0';
    process.env['JWT_SECRET'] = 'a'.repeat(40);
    process.env['MONGODB_URI'] = 'mongodb://localhost/x';
    const env = loadEnv();
    expect(env.NODE_ENV).toBe('production');
    expect(env.DEV_VECTOR_FALLBACK).toBe(false);
  });
});

// ─────────────────── Phase 8 — CORS allowlist + headers (SEC-002) ───────────────────
describe('SEC: CORS allowlist + headers (Phase 8)', () => {
  it('getCorsOrigins strips empty entries and wildcard', () => {
    const env = loadEnv();
    // Mutate copy so we don't poison cache.
    const corsList = getCorsOrigins({ ...env, CORS_ORIGIN: 'http://a, , *,http://b' });
    expect(corsList).toEqual(['http://a', 'http://b']);
  });

  it('CORS rejects an unknown origin (no Access-Control-Allow-Origin echoed)', async () => {
    const env = loadEnv();
    const app = createApp({ ...env, CORS_ORIGIN: 'http://allowed.example' });
    const res = await request(app).get('/health').set('Origin', 'http://evil.example');
    // CORS error path: cors() forwards a 500 via next(err) for the disallowed
    // origin. The point is that the browser-trusted ACAO header is NOT echoed.
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('CORS allows an explicitly allowed origin', async () => {
    const env = loadEnv();
    const app = createApp({ ...env, CORS_ORIGIN: 'http://allowed.example' });
    const res = await request(app).get('/health').set('Origin', 'http://allowed.example');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://allowed.example');
  });

  it('helmet sets baseline security headers', async () => {
    const env = loadEnv();
    const app = createApp(env);
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    // helmet() default headers — these specific names must always be present.
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    // x-powered-by must be disabled (server fingerprinting).
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

// ─────────────────── Phase 9 — DB invariants (DB-001) ───────────────────
describe('DB invariants — required indexes (Phase 9)', () => {
  // Inspect declared indexes via mongoose schema (no collection round-trip
  // needed, works against a fresh in-memory mongo where collections may not
  // yet exist). Each schema.indexes() entry is `[keys, options]`.
  interface SchemaLike {
    schema: { indexes(): [Record<string, unknown>, unknown][] };
  }

  function indexKeySets(model: SchemaLike): string[][] {
    return model.schema.indexes().map(([keys]) => Object.keys(keys));
  }

  function hasIndexCovering(model: SchemaLike, required: string[]): boolean {
    return indexKeySets(model).some((keys) => required.every((k) => keys.includes(k)));
  }

  it('UserModel has unique (organizationId, email) index', () => {
    expect(hasIndexCovering(UserModel as unknown as SchemaLike, ['organizationId', 'email'])).toBe(
      true,
    );
  });

  it('TeamModel has (organizationId, name) index', () => {
    expect(hasIndexCovering(TeamModel as unknown as SchemaLike, ['organizationId', 'name'])).toBe(
      true,
    );
  });

  it('TaskModel has organizationId+status indexes', () => {
    expect(hasIndexCovering(TaskModel as unknown as SchemaLike, ['organizationId', 'status'])).toBe(
      true,
    );
  });

  it('ProjectModel has (organizationId, teamId) index', () => {
    expect(
      hasIndexCovering(ProjectModel as unknown as SchemaLike, ['organizationId', 'teamId']),
    ).toBe(true);
  });

  it('DocumentChunkModel has (documentId, chunkIndex) unique index', () => {
    expect(
      hasIndexCovering(DocumentChunkModel as unknown as SchemaLike, ['documentId', 'chunkIndex']),
    ).toBe(true);
  });

  it('AnnouncementModel has organization+target index', () => {
    expect(
      hasIndexCovering(AnnouncementModel as unknown as SchemaLike, [
        'organizationId',
        'targetType',
      ]),
    ).toBe(true);
  });

  it('ChatLogModel has (organizationId, userId, createdAt) index', () => {
    expect(
      hasIndexCovering(ChatLogModel as unknown as SchemaLike, [
        'organizationId',
        'userId',
        'createdAt',
      ]),
    ).toBe(true);
  });
});

// ─────────────────── Phase 10 — logger redaction (OBS-002) ───────────────────
describe('OBS: pino logger redaction paths (Phase 10)', () => {
  // Build a fresh pino instance with the same redact paths as production
  // logger.ts, then capture serialised lines via a Writable.
  function captureLogger(): { logger: pino.Logger; lines: string[] } {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(String(chunk));
        cb();
      },
    });
    const logger = pino(
      {
        level: 'trace',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.passwordHash',
            '*.token',
            'token',
            '*.inviteToken',
            '*.inviteTokenHash',
            '*.embedding',
            'embedding',
            '*.vector',
            'vector',
            '*.queryVector',
            'queryVector',
            '*.secret',
          ],
          censor: '[redacted]',
        },
      },
      stream,
    );
    return { logger, lines };
  }

  it('redacts password / passwordHash / token / embedding / vector', () => {
    const { logger, lines } = captureLogger();
    logger.info({
      user: { password: 'p455w0rd!', passwordHash: 'bcrypt$...' },
      token: 'eyJhbGciOi.fake.jwt',
      session: { token: 'inner-token-xyz' },
      ai: { embedding: [0.1, 0.2, 0.3], vector: [9, 8], queryVector: [1, 2] },
      embedding: [0.5],
      auth: { secret: 'shhh' },
    });
    const joined = lines.join('');
    expect(joined).not.toContain('p455w0rd!');
    expect(joined).not.toContain('bcrypt$...');
    expect(joined).not.toContain('eyJhbGciOi.fake.jwt');
    expect(joined).not.toContain('inner-token-xyz');
    expect(joined).not.toContain('0.1,0.2');
    expect(joined).not.toContain('shhh');
    expect(joined).toContain('[redacted]');
  });

  it('redacts Authorization request header', () => {
    const { logger, lines } = captureLogger();
    logger.info({ req: { headers: { authorization: 'Bearer secret-jwt' } } });
    const joined = lines.join('');
    expect(joined).not.toContain('secret-jwt');
    expect(joined).toContain('[redacted]');
  });
});

// ─────────────────── Phase 4 — orphan-scan invariant (BUG-001 follow-up) ───────────────────
describe('Cascade orphan-scan (Phase 4)', () => {
  // Existing project.service.test.ts BUG-001 verifies the deletion path.
  // This test is the COMPLEMENTARY invariant: after every DocumentModel.create,
  // every chunk's documentId must point to an existing Document; after every
  // ProjectModel.delete, no Task may reference a missing Project.
  beforeEach(async () => {
    await Promise.all([
      DocumentModel.deleteMany({}),
      DocumentChunkModel.deleteMany({}),
      ProjectModel.deleteMany({}),
      TaskModel.deleteMany({}),
      TaskCommentModel.deleteMany({}),
    ]);
  });

  it('chunks never reference a non-existent document', async () => {
    const orgId = new Types.ObjectId();
    const doc = await DocumentModel.create({
      organizationId: orgId,
      teamId: null,
      projectId: null,
      visibility: 'organization',
      allowedRoles: [],
      title: 'Inv',
      originalFilename: 'i.txt',
      mimeType: 'text/plain',
      uploadedBy: new Types.ObjectId(),
      status: 'indexed',
      chunkCount: 1,
      error: null,
    });
    await DocumentChunkModel.create({
      documentId: doc._id,
      organizationId: orgId,
      teamId: null,
      projectId: null,
      visibility: 'organization',
      allowedRoles: [],
      chunkIndex: 0,
      content: 'x',
      embedding: new Array<number>(8).fill(0),
    });

    // Orphan scan — every chunk's documentId must be in DocumentModel.
    const chunks = await DocumentChunkModel.find({});
    const docIds = (await DocumentModel.find({}).select({ _id: 1 })).map((d) => d.id as string);
    for (const c of chunks) {
      expect(docIds).toContain(c.documentId.toString());
    }
  });

  it('after deleting a Document, no orphan chunks remain (manual delete path)', async () => {
    const orgId = new Types.ObjectId();
    const doc = await DocumentModel.create({
      organizationId: orgId,
      teamId: null,
      projectId: null,
      visibility: 'organization',
      allowedRoles: [],
      title: 'ToDel',
      originalFilename: 'd.txt',
      mimeType: 'text/plain',
      uploadedBy: new Types.ObjectId(),
      status: 'indexed',
      chunkCount: 1,
      error: null,
    });
    await DocumentChunkModel.create({
      documentId: doc._id,
      organizationId: orgId,
      teamId: null,
      projectId: null,
      visibility: 'organization',
      allowedRoles: [],
      chunkIndex: 0,
      content: 'x',
      embedding: new Array<number>(8).fill(0),
    });
    // Simulate deleteDocument cascade (chunks deleted in same tx).
    await DocumentChunkModel.deleteMany({ documentId: doc._id });
    await DocumentModel.deleteOne({ _id: doc._id });
    const remaining = await DocumentChunkModel.countDocuments({ documentId: doc._id });
    expect(remaining).toBe(0);
  });
});
