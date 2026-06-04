// qa-agent — askQuestion unit tests with mocked retrieval, stats, data, and
// Ollama channels. Tests prompt construction fallback paths and RBAC logging.
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';

// Mock all external dependencies before ANY imports.
vi.mock('../src/utils/circuit-breaker.js', () => ({
  createCircuitBreaker: () => ({
    isOpen: () => false,
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    getName: () => 'mock-breaker',
    reset: vi.fn(),
  }),
}));

vi.mock('../src/modules/ai/chat/chitchat-tool.js', () => ({
  detectChitchatIntent: vi.fn(),
  chitchatSystemPrompt: vi.fn().mockReturnValue('You are a friendly assistant.'),
  chitchatFallbackReply: vi.fn().mockReturnValue('Hi there!'),
}));

vi.mock('../src/modules/ai/chat/stats-tool.js', () => ({
  detectStatsIntent: vi.fn(),
  buildStatsBlock: vi.fn(),
}));

vi.mock('../src/modules/ai/chat/workspace-data-tool.js', () => ({
  detectWorkspaceDataIntent: vi.fn(),
  buildWorkspaceDataBlock: vi.fn(),
}));

vi.mock('../src/modules/ai/retrieval.js', () => ({
  retrieveChunks: vi.fn(),
}));

import { retrieveChunks } from '../src/modules/ai/retrieval.js';
import {
  detectChitchatIntent,
  chitchatFallbackReply,
} from '../src/modules/ai/chat/chitchat-tool.js';
import { detectStatsIntent, buildStatsBlock } from '../src/modules/ai/chat/stats-tool.js';
import {
  detectWorkspaceDataIntent,
  buildWorkspaceDataBlock,
} from '../src/modules/ai/chat/workspace-data-tool.js';
import { askQuestion } from '../src/modules/ai/chat/chat.service.js';
import { ChatLogModel } from '../src/modules/ai/chat/chat-log.model.js';
import './setup-db.js';

const ORG = new Types.ObjectId();
const USER_ID = new Types.ObjectId();
const TEAM_ID = new Types.ObjectId();

const auth: AuthContext = {
  userId: USER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM_ID.toString(),
  role: 'member',
};

const originalFetch = globalThis.fetch;

beforeAll(() => {
  vi.mocked(detectChitchatIntent).mockReturnValue(null);
  vi.mocked(detectStatsIntent).mockReturnValue(false);
  vi.mocked(buildStatsBlock).mockResolvedValue(null);
  vi.mocked(detectWorkspaceDataIntent).mockReturnValue(null);
  vi.mocked(buildWorkspaceDataBlock).mockResolvedValue(null);
  vi.mocked(retrieveChunks).mockResolvedValue([]);
});

beforeEach(async () => {
  vi.clearAllMocks();
  // Restore default mocks after clear
  vi.mocked(detectChitchatIntent).mockReturnValue(null);
  vi.mocked(detectStatsIntent).mockReturnValue(false);
  vi.mocked(buildStatsBlock).mockResolvedValue(null);
  vi.mocked(detectWorkspaceDataIntent).mockReturnValue(null);
  vi.mocked(buildWorkspaceDataBlock).mockResolvedValue(null);
  vi.mocked(retrieveChunks).mockResolvedValue([]);
  globalThis.fetch = vi.fn();
  await ChatLogModel.deleteMany({});
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('askQuestion with mocked channels', () => {
  it('returns chitchat reply when detectChitchatIntent matches', async () => {
    vi.mocked(detectChitchatIntent).mockReturnValue({ kind: 'greeting' });
    vi.mocked(chitchatFallbackReply).mockReturnValue('Hello!');

    const result = await askQuestion(auth, { question: 'hi' });

    expect(result.answer).toBe('Hello!');
    expect(result.sources).toHaveLength(0);
    expect(retrieveChunks).not.toHaveBeenCalled();

    const logs = await ChatLogModel.find({});
    expect(logs).toHaveLength(2);
  });

  it('uses Ollama response when available', async () => {
    vi.mocked(retrieveChunks).mockResolvedValue([
      {
        documentId: 'doc1',
        documentTitle: 'Status Doc',
        chunkIndex: 0,
        content: 'Project status is active.',
        score: 0.95,
      },
    ]);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: 'Ollama answer' } }),
    } as Response);

    const result = await askQuestion(auth, { question: 'what is project status?' });

    expect(result.answer).toBe('Ollama answer');
    expect(result.usedFallback).toBe(false);
  });

  it('falls back to extractive answer when Ollama fails and chunks exist', async () => {
    vi.mocked(retrieveChunks).mockResolvedValue([
      {
        documentId: 'doc1',
        documentTitle: 'Status Doc',
        chunkIndex: 0,
        content: 'Project status is active.',
        score: 0.95,
      },
    ]);
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await askQuestion(auth, { question: 'what is project status?' });

    expect(result.answer).toContain('Status Doc');
    expect(result.usedFallback).toBe(true);
  });

  it('returns data block fallback when Ollama fails and data exists', async () => {
    vi.mocked(detectWorkspaceDataIntent).mockReturnValue({ entity: 'task', filter: null });
    vi.mocked(buildWorkspaceDataBlock).mockResolvedValue({
      text: 'Task: Fix login (status: active)',
      citation: { documentId: 'data-synth', title: 'Live Workspace Data', chunkIndex: 0 },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await askQuestion(auth, { question: 'list tasks' });

    expect(result.answer).toContain('Fix login');
    expect(result.usedFallback).toBe(true);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.documentId).toBe('data-synth');
  });

  it('returns stats fallback when Ollama fails and stats exist', async () => {
    vi.mocked(detectStatsIntent).mockReturnValue(true);
    vi.mocked(buildStatsBlock).mockResolvedValue({
      text: 'Total tasks: 5',
      citation: { documentId: 'stats-synth', title: 'Live Workspace Stats', chunkIndex: 0 },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await askQuestion(auth, { question: 'how many tasks?' });

    expect(result.answer).toContain('Total tasks: 5');
    expect(result.usedFallback).toBe(true);
  });

  it('returns "not found" when everything is empty and Ollama fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await askQuestion(auth, { question: 'unknown topic' });

    expect(result.answer).toBe('I could not find this in the available documents.');
    expect(result.usedFallback).toBe(true);
  });

  it('validates empty question', async () => {
    await expect(askQuestion(auth, { question: '' })).rejects.toThrow('Question is required');
  });

  it('passes teamId and projectId scope to retrieveChunks', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: 'Answer' } }),
    } as Response);

    await askQuestion(auth, { question: 'status?', teamId: 'team-x', projectId: 'proj-y' });

    expect(retrieveChunks).toHaveBeenCalledWith(
      auth,
      'status?',
      { teamId: 'team-x', projectId: 'proj-y' },
      5,
    );
  });

  it('logs the conversation to ChatLogModel', async () => {
    vi.mocked(retrieveChunks).mockResolvedValue([
      {
        documentId: 'doc1',
        documentTitle: 'Status Doc',
        chunkIndex: 0,
        content: 'Project status is active.',
        score: 0.95,
      },
    ]);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: 'Logged answer' } }),
    } as Response);

    await askQuestion(auth, { question: 'log me' });

    const logs = await ChatLogModel.find({}).sort({ _id: 1 });
    expect(logs).toHaveLength(2);
    expect(logs[0]?.role).toBe('user');
    expect(logs[0]?.content).toBe('log me');
    expect(logs[1]?.role).toBe('assistant');
    expect(logs[1]?.content).toBe('Logged answer');
  });
});
