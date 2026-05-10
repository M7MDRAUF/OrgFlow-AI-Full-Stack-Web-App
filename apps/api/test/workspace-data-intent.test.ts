// rag-chat-agent — Unit tests for the workspace data intent detector. The
// detector picks the right entity (projects/teams/tasks/users/announcements)
// and the right filter so the chat service can fetch live, scope-safe rows for
// the user's question instead of relying purely on RAG.
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
    // Announcements — these were previously undetected, causing hallucination.
    ['HOW MANY Announcements ARE THERE?', 'announcements', 'all'],
    ['how many announcements are there', 'announcements', 'all'],
    ['list all announcements', 'announcements', 'all'],
    ['show me all announcements', 'announcements', 'all'],
    ['give me my unread announcements', 'announcements', 'unread'],
    ['show unread notices', 'announcements', 'unread'],
    ['list bulletins', 'announcements', 'all'],
    // Kanban — routes to tasks entity.
    ['how many Kanban tasks are there', 'tasks', 'all'],
    ['how many kanban are there and to do?', 'tasks', 'todo'],
    ['show kanban board tasks', 'tasks', 'all'],
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

  describe('isKanban flag', () => {
    it('sets isKanban=true when question mentions kanban', () => {
      const intent = detectWorkspaceDataIntent('how many kanban tasks are there?');
      expect(intent?.isKanban).toBe(true);
    });

    it('sets isKanban=true for the exact user question that caused the AI wrong answer', () => {
      const intent = detectWorkspaceDataIntent('how many Kanban are there and to do?');
      expect(intent?.isKanban).toBe(true);
      expect(intent?.entity).toBe('tasks');
    });

    it('sets isKanban=false for plain task questions', () => {
      const intent = detectWorkspaceDataIntent('list my overdue tasks');
      expect(intent?.isKanban).toBe(false);
    });
  });

  describe('FILTER_TODO matches "to do" with a space', () => {
    it('detects "to do" (space-separated) as todo filter', () => {
      const intent = detectWorkspaceDataIntent('how many to do tasks are there?');
      expect(intent?.entity).toBe('tasks');
      expect(intent?.filter).toBe('todo');
    });
  });

  describe('BY_TEAM_AGGREGATION_REGEX suppresses DATA channel', () => {
    it('returns null for "give me by team Team Projects Tasks Overdue details" (user-reported query)', () => {
      // This query should go to STATS (byTeam breakdown), not per-row DATA.
      expect(
        detectWorkspaceDataIntent('give me by team Team Projects Tasks Overdue details'),
      ).toBeNull();
    });

    it('returns null for "by team breakdown of tasks"', () => {
      expect(detectWorkspaceDataIntent('by team breakdown of tasks')).toBeNull();
    });

    it('returns null for "per team projects and tasks"', () => {
      expect(detectWorkspaceDataIntent('per team projects and tasks')).toBeNull();
    });

    it('returns null for "summarize projects across teams"', () => {
      expect(detectWorkspaceDataIntent('summarize projects across teams')).toBeNull();
    });

    it('still returns an intent for plain overdue task queries (not by-team)', () => {
      const intent = detectWorkspaceDataIntent('list overdue tasks');
      expect(intent).not.toBeNull();
      expect(intent?.entity).toBe('tasks');
      expect(intent?.filter).toBe('overdue');
    });
  });
});
