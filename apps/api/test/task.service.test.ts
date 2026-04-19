// tasks-agent — Task service tests. Verifies RBAC, scope safety, create
// restrictions, and overdue logic.
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
const MEMBER_ID = new Types.ObjectId();
const PROJECT_ID = new Types.ObjectId();

beforeAll(async () => {
  await TeamModel.create({
    _id: TEAM,
    organizationId: ORG,
    name: 'TaskTeam',
    description: null,
    leaderId: LEADER_ID,
  });

  const userBase = {
    organizationId: ORG,
    teamId: TEAM,
    status: 'active',
    passwordHash: 'x',
    inviteTokenHash: null,
    inviteExpiresAt: null,
    themePreference: 'system',
  };
  await UserModel.create([
    { _id: ADMIN_ID, email: 'adm-tk@test', displayName: 'Admin', role: 'admin', ...userBase },
    { _id: LEADER_ID, email: 'ldr-tk@test', displayName: 'Leader', role: 'leader', ...userBase },
    { _id: MEMBER_ID, email: 'mem-tk@test', displayName: 'Member', role: 'member', ...userBase },
  ]);

  await ProjectModel.create({
    _id: PROJECT_ID,
    organizationId: ORG,
    teamId: TEAM,
    title: 'Task Project',
    description: null,
    createdBy: LEADER_ID,
    memberIds: [MEMBER_ID],
    status: 'active',
    startDate: null,
    dueDate: null,
  });
});

const leaderAuth: AuthContext = {
  userId: LEADER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'leader',
};

const memberAuth: AuthContext = {
  userId: MEMBER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'member',
};

describe('task service', () => {
  let taskId: string;

  it('leader can create a task', async () => {
    const task = await taskService.createTask(leaderAuth, {
      projectId: PROJECT_ID.toString(),
      title: 'First Task',
      assignedTo: MEMBER_ID.toString(),
    });
    taskId = task.id;
    expect(task.title).toBe('First Task');
    expect(task.assignedTo).toBe(MEMBER_ID.toString());
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
  });

  it('member cannot create a task', async () => {
    await expect(
      taskService.createTask(memberAuth, {
        projectId: PROJECT_ID.toString(),
        title: 'Denied',
      }),
    ).rejects.toThrow(/cannot create/i);
  });

  it('leader can update task status', async () => {
    const updated = await taskService.updateTask(leaderAuth, taskId, {
      status: 'in-progress',
    });
    expect(updated.status).toBe('in-progress');
  });

  it('member assigned to task can update it', async () => {
    const updated = await taskService.updateTask(memberAuth, taskId, {
      status: 'done',
    });
    expect(updated.status).toBe('done');
  });

  it('overdue is false when status is done', async () => {
    const task = await taskService.getTask(leaderAuth, taskId);
    expect(task.overdue).toBe(false);
  });

  it('overdue is true for past-due non-done task', async () => {
    const overdueTask = await taskService.createTask(leaderAuth, {
      projectId: PROJECT_ID.toString(),
      title: 'Late Task',
      dueDate: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(overdueTask.overdue).toBe(true);
  });

  it('listTasks filters by project', async () => {
    const { items: tasks } = await taskService.listTasks(
      leaderAuth,
      {
        projectId: PROJECT_ID.toString(),
      },
      PG,
    );
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    for (const t of tasks) {
      expect(t.projectId).toBe(PROJECT_ID.toString());
    }
  });

  it('leader can delete a task', async () => {
    await taskService.deleteTask(leaderAuth, taskId);
    await expect(taskService.getTask(leaderAuth, taskId)).rejects.toThrow(/not found/i);
  });
});

describe('updateTaskStatus', () => {
  let statusTaskId: string;

  it('leader creates a task for status tests', async () => {
    const task = await taskService.createTask(leaderAuth, {
      projectId: PROJECT_ID.toString(),
      title: 'Status Test Task',
      assignedTo: MEMBER_ID.toString(),
    });
    statusTaskId = task.id;
    expect(task.status).toBe('todo');
  });

  it('member can update status of assigned task', async () => {
    const updated = await taskService.updateTaskStatus(memberAuth, statusTaskId, {
      status: 'in-progress',
    });
    expect(updated.status).toBe('in-progress');
  });

  it('leader can update status', async () => {
    const updated = await taskService.updateTaskStatus(leaderAuth, statusTaskId, {
      status: 'done',
    });
    expect(updated.status).toBe('done');
  });

  it('rejects invalid status value', async () => {
    await expect(
      // @ts-expect-error — deliberately invalid
      taskService.updateTaskStatus(leaderAuth, statusTaskId, { status: 'invalid' }),
    ).rejects.toThrow();
  });
});
