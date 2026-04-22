// rag-chat-agent — unit tests for the chat stats tool.
// Verifies intent detection and that buildStatsBlock returns scope-correct
// text + a synthetic 'live-stats' citation. Runs against the in-memory Mongo
// from setup-db.ts so getDashboard executes its real aggregation pipeline.
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { buildStatsBlock, detectStatsIntent } from '../src/modules/ai/chat/stats-tool.js';
import './setup-db.js';

const ORG = new Types.ObjectId();
const USER = new Types.ObjectId();

const adminAuth: AuthContext = {
  userId: USER.toString(),
  organizationId: ORG.toString(),
  teamId: null,
  role: 'admin',
};

const memberAuth: AuthContext = {
  userId: USER.toString(),
  organizationId: ORG.toString(),
  teamId: null,
  role: 'member',
};

describe('detectStatsIntent', () => {
  it('detects "how many ... users"', () => {
    expect(detectStatsIntent('how many team users are there?')).toBe(true);
  });
  it('detects "number of projects"', () => {
    expect(detectStatsIntent('what is the number of projects?')).toBe(true);
  });
  it('detects "list the tasks"', () => {
    expect(detectStatsIntent('list the tasks please')).toBe(true);
  });
  it('detects "total tasks"', () => {
    expect(detectStatsIntent('total tasks overdue')).toBe(true);
  });
  it('rejects non-stats questions', () => {
    expect(detectStatsIntent('what is our onboarding policy?')).toBe(false);
    expect(detectStatsIntent('hello')).toBe(false);
    expect(detectStatsIntent('how are you?')).toBe(false);
  });
  it('does not match when only entity is present', () => {
    expect(detectStatsIntent('users are great')).toBe(false);
  });
  it('does not match when only verb is present', () => {
    expect(detectStatsIntent('how many do we have?')).toBe(false);
  });
});

describe('buildStatsBlock', () => {
  it('returns admin-scoped block with users count and synthetic citation', async () => {
    const block = await buildStatsBlock(adminAuth);
    expect(block.citation.documentId).toBe('live-stats');
    expect(block.citation.chunkIndex).toBe(0);
    expect(block.citation.title).toContain('admin');
    expect(block.text).toMatch(/Users \(team users in this organization\): \d+/);
    expect(block.text).toMatch(/Tasks total: \d+/);
  });

  it('returns member-scoped block with assigned counts', async () => {
    const block = await buildStatsBlock(memberAuth);
    expect(block.citation.title).toContain('member');
    expect(block.text).toMatch(/My assigned tasks total: \d+/);
    expect(block.text).not.toMatch(/Users \(team users/);
  });
});
