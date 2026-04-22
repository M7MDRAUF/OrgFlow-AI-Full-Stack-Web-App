// rag-chat-agent — Unit tests for the workspace data intent detector. The
// detector picks the right entity (projects/teams/tasks/users) and the right
// filter (active/overdue/mine/etc.) so the chat service can fetch live,
// scope-safe rows for the user's question instead of relying purely on RAG.
import { describe, expect, it } from 'vitest';
import { detectWorkspaceDataIntent } from '../src/modules/ai/chat/workspace-data-tool.js';

describe('detectWorkspaceDataIntent', () => {
  it.each([
    ["what's the name of the current project?", 'projects', 'active'],
    ['the current project that active and details of it', 'projects', 'active'],
    ['list all projects', 'projects', 'all'],
    ['show me archived projects', 'projects', 'archived'],
    ['how many completed projects do we have', 'projects', 'completed'],
    ['give me the details for each project', 'projects', 'all'],
    ['details for all projects', 'projects', 'all'],
    ['tell me about every project', 'projects', 'all'],
    ['list teams', 'teams', 'all'],
    ['show me all teams in the org', 'teams', 'all'],
    ['list users', 'users', 'all'],
    ['show me all members', 'users', 'all'],
    ['how many users are there', 'users', 'all'],
    ['list overdue tasks', 'tasks', 'overdue'],
    ['show my tasks', 'tasks', 'mine'],
    ['list tasks in progress', 'tasks', 'in-progress'],
    ['show me todo tasks', 'tasks', 'todo'],
    ['count of done tasks', 'tasks', 'done'],
  ] as const)('routes %j -> entity=%s filter=%s', (q, entity, filter) => {
    const intent = detectWorkspaceDataIntent(q);
    expect(intent).not.toBeNull();
    expect(intent?.entity).toBe(entity);
    expect(intent?.filter).toBe(filter);
  });

  it.each([
    ['hi'],
    ['thanks!'],
    ['what is the vacation policy'],
    ['who are you'],
    ['I love coffee'],
  ])('returns null for non-data question %j', (q) => {
    expect(detectWorkspaceDataIntent(q)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(detectWorkspaceDataIntent('')).toBeNull();
    expect(detectWorkspaceDataIntent('   ')).toBeNull();
  });
});
