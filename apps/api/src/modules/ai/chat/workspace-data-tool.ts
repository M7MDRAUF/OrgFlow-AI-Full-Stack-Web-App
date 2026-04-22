// rag-chat-agent — Workspace data tool: turns the user's question into a
// targeted, RBAC-scoped query against the live domain services and returns a
// compact, model-friendly DATA block. This is what lets the assistant answer
// "what's the current active project?" or "list my overdue tasks" with real,
// authoritative numbers — without ever leaving the caller's scope.
//
// All data fetching delegates to the canonical service functions
// (listProjects / listTeams / listTasks / listUsers), so the same admin /
// leader / member RBAC that governs the REST API governs the assistant.
import type {
  ProjectResponseDto,
  TaskResponseDto,
  TeamResponseDto,
  UserResponseDto,
} from '@orgflow/shared-types';
import { Types } from 'mongoose';
import type { AuthContext } from '../../../middleware/auth-context.js';
import type { AiSourceCitation } from '@orgflow/shared-types';
import { listProjects } from '../../projects/project.service.js';
import { TaskModel } from '../../tasks/task.model.js';
import { listTasks } from '../../tasks/task.service.js';
import { TeamModel } from '../../teams/team.model.js';
import { listTeams } from '../../teams/team.service.js';
import { UserModel } from '../../users/user.model.js';
import { listUsers } from '../../users/user.service.js';

export type WorkspaceEntity = 'projects' | 'teams' | 'tasks' | 'users';

export interface WorkspaceDataIntent {
  entity: WorkspaceEntity;
  // Optional status / scope filter parsed from the question. Each entity only
  // honours filters that make sense for it (e.g. 'overdue' for tasks).
  filter:
    | 'active'
    | 'planned'
    | 'completed'
    | 'archived'
    | 'todo'
    | 'in-progress'
    | 'done'
    | 'overdue'
    | 'mine'
    | 'all';
}

export interface WorkspaceDataBlock {
  text: string;
  citation: AiSourceCitation;
}

// Verb / question-shape patterns that indicate the user wants live workspace
// data (a list, count, status, or details about an entity) rather than RAG.
// Includes "current" — used for "current project" / "current tasks" — and
// "details (of|about)" so questions like "details of the active project"
// trigger entity routing.
const DATA_VERB_REGEX =
  /\b(how\s+many|number\s+of|count(\s+of)?|total(\s+(number|count))?|list(\s+(of|the|all|me))?|show(\s+me)?(\s+the|\s+all)?|what(['’]s|\s+is|\s+are)?|tell\s+me\s+about|details?(\s+(of|about|on))?|current(ly)?\s+active|current\b|active\b|overdue\b|status(\s+of)?|name(s)?\s+of)\b/i;

const PROJECT_REGEX = /\b(project|projects)\b/i;
const TEAM_REGEX = /\b(team|teams)\b/i;
const TASK_REGEX = /\b(task|tasks|todo|to-do|kanban)\b/i;
const USER_REGEX = /\b(user|users|member|members|people|staff|employee|employees)\b/i;

const FILTER_ACTIVE = /\b(active|current|currently\s+active|in\s+progress)\b/i;
const FILTER_PLANNED = /\b(planned|upcoming)\b/i;
const FILTER_COMPLETED = /\b(completed|finished|done(\s+projects?)?)\b/i;
const FILTER_ARCHIVED = /\barchived\b/i;
const FILTER_TODO = /\b(todo|to-do|backlog)\b/i;
const FILTER_INPROGRESS = /\b(in[- ]progress|wip|working\s+on)\b/i;
const FILTER_DONE = /\b(done|completed|finished)\b/i;
const FILTER_OVERDUE = /\b(overdue|late|past\s+due)\b/i;
const FILTER_MINE = /\b(mine|my|assigned\s+to\s+me)\b/i;

export function detectWorkspaceDataIntent(question: string): WorkspaceDataIntent | null {
  const q = question.trim();
  if (q.length === 0) return null;
  if (!DATA_VERB_REGEX.test(q)) return null;

  // Pick the entity. Order matters: tasks > projects > teams > users so
  // "list my overdue tasks" routes to tasks even though the verb is generic.
  let entity: WorkspaceEntity | null = null;
  if (TASK_REGEX.test(q) || FILTER_OVERDUE.test(q) || FILTER_TODO.test(q)) entity = 'tasks';
  else if (PROJECT_REGEX.test(q)) entity = 'projects';
  else if (TEAM_REGEX.test(q)) entity = 'teams';
  else if (USER_REGEX.test(q)) entity = 'users';
  if (entity === null) return null;

  let filter: WorkspaceDataIntent['filter'] = 'all';
  if (entity === 'projects') {
    if (FILTER_ARCHIVED.test(q)) filter = 'archived';
    else if (FILTER_COMPLETED.test(q)) filter = 'completed';
    else if (FILTER_PLANNED.test(q)) filter = 'planned';
    else if (FILTER_ACTIVE.test(q)) filter = 'active';
  } else if (entity === 'tasks') {
    if (FILTER_OVERDUE.test(q)) filter = 'overdue';
    else if (FILTER_MINE.test(q)) filter = 'mine';
    else if (FILTER_INPROGRESS.test(q)) filter = 'in-progress';
    else if (FILTER_DONE.test(q)) filter = 'done';
    else if (FILTER_TODO.test(q)) filter = 'todo';
  }
  return { entity, filter };
}

const DEFAULT_PAGE = { page: 1, pageSize: 50 } as const;

function isoToDate(iso: string | null): string {
  if (iso === null) return '—';
  return iso.slice(0, 10);
}

function isOverdueIso(dueIso: string | null, status: string): boolean {
  if (dueIso === null) return false;
  if (status === 'done') return false;
  return new Date(dueIso).getTime() < Date.now();
}

async function teamNameMap(
  organizationId: Types.ObjectId,
  teamIds: string[],
): Promise<Map<string, string>> {
  if (teamIds.length === 0) return new Map();
  const objIds = teamIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const teams = await TeamModel.find({ organizationId, _id: { $in: objIds } }, { _id: 1, name: 1 });
  return new Map(teams.map((t) => [t._id.toString(), t.name]));
}

// Resolve user ObjectIds to display names ("Name" / fallback to email) so the
// assistant never echoes raw 24-char hex ids to end users. Scoped to the
// caller's organization so we cannot leak names across orgs.
async function userNameMap(
  organizationId: Types.ObjectId,
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds.filter((id) => Types.ObjectId.isValid(id))));
  if (unique.length === 0) return new Map();
  const objIds = unique.map((id) => new Types.ObjectId(id));
  const users = await UserModel.find(
    { organizationId, _id: { $in: objIds } },
    { _id: 1, displayName: 1, email: 1 },
  ).lean<{ _id: Types.ObjectId; displayName: string; email: string }[]>();
  return new Map(
    users.map((u) => {
      const display = u.displayName.trim().length > 0 ? u.displayName : u.email;
      return [u._id.toString(), display];
    }),
  );
}

function lookupName(map: Map<string, string>, id: string | null | undefined): string {
  if (id === null || id === undefined || id === '') return '—';
  return map.get(id) ?? id;
}

function formatProjectsTable(items: ProjectResponseDto[], teamNames: Map<string, string>): string {
  if (items.length === 0) return '(no projects match this filter in your scope)';
  const header = '| Title | Team | Status | Members | Due |\n|---|---|---|---|---|';
  const rows = items.map((p) => {
    const team = teamNames.get(p.teamId) ?? p.teamId;
    return `| ${p.title} | ${team} | ${p.status} | ${String(p.memberIds.length)} | ${isoToDate(p.dueDate)} |`;
  });
  return [header, ...rows].join('\n');
}

function formatTeamsTable(items: TeamResponseDto[], userNames: Map<string, string>): string {
  if (items.length === 0) return '(no teams visible in your scope)';
  const header = '| Name | Members | Leader |\n|---|---|---|';
  const rows = items.map(
    (t) => `| ${t.name} | ${String(t.memberCount)} | ${lookupName(userNames, t.leaderId)} |`,
  );
  return [header, ...rows].join('\n');
}

function formatTasksTable(
  items: TaskResponseDto[],
  teamNames: Map<string, string>,
  userNames: Map<string, string>,
): string {
  if (items.length === 0) return '(no tasks match this filter in your scope)';
  const header = '| Title | Team | Status | Priority | Assignee | Due |\n|---|---|---|---|---|---|';
  const rows = items.map((t) => {
    const team = teamNames.get(t.teamId) ?? t.teamId;
    const overdueMark = isOverdueIso(t.dueDate, t.status) ? ' ⚠' : '';
    return `| ${t.title} | ${team} | ${t.status} | ${t.priority} | ${lookupName(userNames, t.assignedTo)} | ${isoToDate(t.dueDate)}${overdueMark} |`;
  });
  return [header, ...rows].join('\n');
}

function formatUsersTable(items: UserResponseDto[], teamNames: Map<string, string>): string {
  if (items.length === 0) return '(no users visible in your scope)';
  const header = '| Name | Email | Role | Team | Status |\n|---|---|---|---|---|';
  const rows = items.map((u) => {
    const team = u.teamId !== null ? (teamNames.get(u.teamId) ?? u.teamId) : '—';
    return `| ${u.name} | ${u.email} | ${u.role} | ${team} | ${u.status} |`;
  });
  return [header, ...rows].join('\n');
}

export async function buildWorkspaceDataBlock(
  auth: AuthContext,
  intent: WorkspaceDataIntent,
): Promise<WorkspaceDataBlock> {
  const orgId = new Types.ObjectId(auth.organizationId);

  if (intent.entity === 'projects') {
    const query: Parameters<typeof listProjects>[1] =
      intent.filter === 'active' ||
      intent.filter === 'planned' ||
      intent.filter === 'completed' ||
      intent.filter === 'archived'
        ? { status: intent.filter }
        : {};
    const { items, total } = await listProjects(auth, query, DEFAULT_PAGE);
    const names = await teamNameMap(
      orgId,
      items.map((p) => p.teamId),
    );
    const head = `PROJECTS (filter=${intent.filter}, scope=${auth.role}, total=${String(total)}):`;
    return {
      text: `${head}\n${formatProjectsTable(items, names)}`,
      citation: { documentId: 'live-projects', title: 'Live workspace projects', chunkIndex: 0 },
    };
  }

  if (intent.entity === 'teams') {
    const { items, total } = await listTeams(auth, DEFAULT_PAGE);
    const leaderIds = items
      .map((t) => t.leaderId)
      .filter((id): id is string => id !== null && id !== '');
    const userNames = await userNameMap(orgId, leaderIds);
    const head = `TEAMS (scope=${auth.role}, total=${String(total)}):`;
    return {
      text: `${head}\n${formatTeamsTable(items, userNames)}`,
      citation: { documentId: 'live-teams', title: 'Live workspace teams', chunkIndex: 0 },
    };
  }

  if (intent.entity === 'users') {
    const { items, total } = await listUsers(auth, {}, DEFAULT_PAGE);
    const names = await teamNameMap(
      orgId,
      items.map((u) => u.teamId).filter((t): t is string => t !== null),
    );
    const head = `USERS (scope=${auth.role}, total=${String(total)}):`;
    return {
      text: `${head}\n${formatUsersTable(items, names)}`,
      citation: { documentId: 'live-users', title: 'Live workspace users', chunkIndex: 0 },
    };
  }

  // tasks
  const tQuery: Parameters<typeof listTasks>[1] = {};
  if (intent.filter === 'todo' || intent.filter === 'in-progress' || intent.filter === 'done') {
    tQuery.status = intent.filter;
  }
  if (intent.filter === 'mine') tQuery.mine = true;
  const { items, total } = await listTasks(auth, tQuery, DEFAULT_PAGE);
  const filtered =
    intent.filter === 'overdue' ? items.filter((t) => isOverdueIso(t.dueDate, t.status)) : items;
  // Sanity check: we only ever surface tasks that came back from the
  // RBAC-aware listTasks call (guards against accidental scope drift).
  const orgScopeOk = await TaskModel.countDocuments({
    organizationId: orgId,
    _id: { $in: filtered.map((t) => new Types.ObjectId(t.id)) },
  });
  const safeItems = orgScopeOk === filtered.length ? filtered : [];
  const names = await teamNameMap(
    orgId,
    safeItems.map((t) => t.teamId),
  );
  const assigneeIds = safeItems
    .map((t) => t.assignedTo)
    .filter((id): id is string => id !== null && id !== '');
  const userNames = await userNameMap(orgId, assigneeIds);
  const head = `TASKS (filter=${intent.filter}, scope=${auth.role}, total=${String(total)}, shown=${String(safeItems.length)}):`;
  return {
    text: `${head}\n${formatTasksTable(safeItems, names, userNames)}`,
    citation: { documentId: 'live-tasks', title: 'Live workspace tasks', chunkIndex: 0 },
  };
}
