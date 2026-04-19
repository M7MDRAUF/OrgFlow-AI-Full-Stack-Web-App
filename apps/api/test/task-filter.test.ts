// tasks-agent — Task filter combination tests (status, priority, assignedTo, mine).
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import * as taskService from '../src/modules/tasks/task.service.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const PG = { page: 1, pageSize: 100 };

const ORG = new Types.ObjectId();
const TEAM = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();
const LEADER_ID = new Types.ObjectId();
const MEMBER_A = new Types.ObjectId();
const MEMBER_B = new Types.ObjectId();
const PROJECT = new Types.ObjectId();

const _adminAuth: AuthContext = {
  userId: ADMIN_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'admin',
};

const leaderAuth: AuthContext = {
  userId: LEADER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'leader',
};

const memberAAuth: AuthContext = {
  userId: MEMBER_A.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'member',
};

const memberBAuth: AuthContext = {
  userId: MEMBER_B.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'member',
};

const userBase = {
  organizationId: ORG,
  teamId: TEAM,
  status: 'active' as const,
  passwordHash: 'x',
  inviteTokenHash: null,
  inviteExpiresAt: null,
  themePreference: 'system' as const,
};

beforeAll(async () => {
  await TeamModel.create({
    _id: TEAM,
    organizationId: ORG,
    name: 'Filter Team',
    description: null,
    leaderId: LEADER_ID,
  });

  await UserModel.create([
    { _id: ADMIN_ID, email: 'flt-admin@t', displayName: 'Admin', role: 'admin', ...userBase },
    { _id: LEADER_ID, email: 'flt-lead@t', displayName: 'Leader', role: 'leader', ...userBase },
    { _id: MEMBER_A, email: 'flt-memA@t', displayName: 'MemA', role: 'member', ...userBase },
    { _id: MEMBER_B, email: 'flt-memB@t', displayName: 'MemB', role: 'member', ...userBase },
  ]);

  await ProjectModel.create({
    _id: PROJECT,
    organizationId: ORG,
    teamId: TEAM,
    title: 'Filter Project',
    description: null,
    createdBy: LEADER_ID,
    memberIds: [MEMBER_A, MEMBER_B],
    status: 'active',
    startDate: null,
    dueDate: null,
  });

  // Seed tasks with varying status/priority/assignee
  await taskService.createTask(leaderAuth, {
    projectId: PROJECT.toString(),
    title: 'High Todo A',
    priority: 'high',
    assignedTo: MEMBER_A.toString(),
  });
  await taskService.createTask(leaderAuth, {
    projectId: PROJECT.toString(),
    title: 'Low Done B',
    priority: 'low',
    assignedTo: MEMBER_B.toString(),
  });
  // mark it done
  const { items: tasks } = await taskService.listTasks(
    leaderAuth,
    { projectId: PROJECT.toString() },
    PG,
  );
  const taskB = tasks.find((t) => t.title === 'Low Done B');
  if (taskB !== undefined) {
    await taskService.updateTask(leaderAuth, taskB.id, { status: 'done' });
  }

  await taskService.createTask(leaderAuth, {
    projectId: PROJECT.toString(),
    title: 'Medium InProgress',
    priority: 'medium',
    assignedTo: MEMBER_A.toString(),
  });
  const { items: tasks2 } = await taskService.listTasks(
    leaderAuth,
    { projectId: PROJECT.toString() },
    PG,
  );
  const taskC = tasks2.find((t) => t.title === 'Medium InProgress');
  if (taskC !== undefined) {
    await taskService.updateTask(leaderAuth, taskC.id, { status: 'in-progress' });
  }
});

describe('task filter: status', () => {
  it('filters by status=todo', async () => {
    const { items: results } = await taskService.listTasks(
      leaderAuth,
      {
        projectId: PROJECT.toString(),
        status: 'todo',
      },
      PG,
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const t of results) {
      expect(t.status).toBe('todo');
    }
  });

  it('filters by status=done', async () => {
    const { items: results } = await taskService.listTasks(
      leaderAuth,
      {
        projectId: PROJECT.toString(),
        status: 'done',
      },
      PG,
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const t of results) {
      expect(t.status).toBe('done');
    }
  });
});

describe('task filter: priority', () => {
  it('filters by priority=high', async () => {
    const { items: results } = await taskService.listTasks(
      leaderAuth,
      {
        projectId: PROJECT.toString(),
        priority: 'high',
      },
      PG,
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const t of results) {
      expect(t.priority).toBe('high');
    }
  });
});

describe('task filter: assignedTo', () => {
  it('filters by specific assignee', async () => {
    const { items: results } = await taskService.listTasks(
      leaderAuth,
      {
        projectId: PROJECT.toString(),
        assignedTo: MEMBER_A.toString(),
      },
      PG,
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const t of results) {
      expect(t.assignedTo).toBe(MEMBER_A.toString());
    }
  });
});

describe('task filter: mine', () => {
  it('mine=true narrows to tasks assigned to current user', async () => {
    const { items: results } = await taskService.listTasks(
      memberAAuth,
      {
        projectId: PROJECT.toString(),
        mine: true,
      },
      PG,
    );
    for (const t of results) {
      expect(t.assignedTo).toBe(MEMBER_A.toString());
    }
  });

  it('memberB mine=true only sees their tasks', async () => {
    const { items: results } = await taskService.listTasks(
      memberBAuth,
      {
        projectId: PROJECT.toString(),
        mine: true,
      },
      PG,
    );
    for (const t of results) {
      expect(t.assignedTo).toBe(MEMBER_B.toString());
    }
  });
});

describe('task filter: combined filters', () => {
  it('status=todo + priority=high returns matching subset', async () => {
    const { items: results } = await taskService.listTasks(
      leaderAuth,
      {
        projectId: PROJECT.toString(),
        status: 'todo',
        priority: 'high',
      },
      PG,
    );
    for (const t of results) {
      expect(t.status).toBe('todo');
      expect(t.priority).toBe('high');
    }
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('no results for impossible combination', async () => {
    const { items: results } = await taskService.listTasks(
      leaderAuth,
      {
        projectId: PROJECT.toString(),
        status: 'done',
        priority: 'high',
      },
      PG,
    );
    expect(results.length).toBe(0);
  });
});

describe('task member scope', () => {
  it('member sees tasks in their project even if not assigned', async () => {
    // memberA is in the project; should see memberB tasks too
    const { items: results } = await taskService.listTasks(
      memberAAuth,
      {
        projectId: PROJECT.toString(),
      },
      PG,
    );
    const titles = results.map((t) => t.title);
    expect(titles).toContain('Low Done B');
  });
});
