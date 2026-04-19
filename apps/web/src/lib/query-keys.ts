/**
 * Centralized query-key constants. Every TanStack Query cache entry should
 * derive its key from one of these roots so invalidation is predictable.
 */
export const QUERY_KEYS = {
  tasks: ['tasks'] as const,
  projects: ['projects'] as const,
  teams: ['teams'] as const,
  users: ['users'] as const,
  announcements: ['announcements'] as const,
  unreadCount: ['announcements', 'unread-count'] as const,
  dashboard: ['dashboard'] as const,
  chatHistory: ['ai', 'chat', 'history'] as const,
  ollamaHealth: ['ai', 'chat', 'health'] as const,
  documents: ['ai', 'documents'] as const,
  me: ['auth', 'me'] as const,
} as const;
