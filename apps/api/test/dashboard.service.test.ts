// dashboard-agent — Dashboard service tests. Verifies role-based aggregation
// for admin, leader, and member scopes.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import { TaskModel } from '../src/modules/tasks/task.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { getDashboard } from '../src/modules/dashboard/dashboard.service.js';
import './setup-db.js';

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
    name: 'Engineering',
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
    { _id: ADMIN_ID, email: 'admin@test', displayName: 'Admin', role: 'admin', ...userBase },
    { _id: LEADER_ID, email: 'leader@test', displayName: 'Leader', role: 'leader', ...userBase },
    { _id: MEMBER_ID, email: 'member@test', displayName: 'Member', role: 'member', ...userBase },
  ]);

  await ProjectModel.create({
    _id: PROJECT_ID,
    organizationId: ORG,
    teamId: TEAM,
    title: 'Alpha',
    description: null,
    createdBy: LEADER_ID,
    memberIds: [MEMBER_ID],
    status: 'active',
    startDate: null,
    dueDate: null,
  });

  const past = new Date(Date.now() - 86_400_000);
  await TaskModel.create([
    {
      organizationId: ORG,
      teamId: TEAM,
      projectId: PROJECT_ID,
      title: 'Done task',
      description: null,
      assignedTo: MEMBER_ID,
      createdBy: LEADER_ID,
      status: 'done',
      priority: 'low',
      dueDate: null,
    },
    {
      organizationId: ORG,
      teamId: TEAM,
      projectId: PROJECT_ID,
      title: 'Overdue task',
      description: null,
      assignedTo: MEMBER_ID,
      createdBy: LEADER_ID,
      status: 'todo',
      priority: 'high',
      dueDate: past,
    },
    {
      organizationId: ORG,
      teamId: TEAM,
      projectId: PROJECT_ID,
      title: 'In-progress task',
      description: null,
      assignedTo: null,
      createdBy: LEADER_ID,
      status: 'in-progress',
      priority: 'medium',
      dueDate: null,
    },
  ]);
});

describe('getDashboard', () => {
  it('returns admin scope with org-wide stats', async () => {
    const auth: AuthContext = {
      userId: ADMIN_ID.toString(),
      organizationId: ORG.toString(),
      teamId: TEAM.toString(),
      role: 'admin',
    };
    const result = await getDashboard(auth);
    expect(result.scope).toBe('admin');
    if (result.scope !== 'admin') throw new Error('unexpected scope');
    expect(result.stats.teams).toBe(1);
    expect(result.stats.users).toBe(3);
    expect(result.stats.projects).toBe(1);
    expect(result.stats.tasks).toBe(3);
    expect(result.stats.tasksDone).toBe(1);
    expect(result.stats.tasksOverdue).toBe(1);
    expect(result.stats.tasksInProgress).toBe(1);
    expect(result.byTeam.length).toBe(1);
  });

  it('returns leader scope with team-scoped stats', async () => {
    const auth: AuthContext = {
      userId: LEADER_ID.toString(),
      organizationId: ORG.toString(),
      teamId: TEAM.toString(),
      role: 'leader',
    };
    const result = await getDashboard(auth);
    expect(result.scope).toBe('leader');
    if (result.scope !== 'leader') throw new Error('unexpected scope');
    expect(result.stats.tasks).toBe(3);
    expect(result.projects.length).toBe(1);
  });

  it('returns member scope with assigned task stats', async () => {
    const auth: AuthContext = {
      userId: MEMBER_ID.toString(),
      organizationId: ORG.toString(),
      teamId: TEAM.toString(),
      role: 'member',
    };
    const result = await getDashboard(auth);
    expect(result.scope).toBe('member');
    if (result.scope !== 'member') throw new Error('unexpected scope');
    expect(result.stats.assignedTotal).toBe(2);
    expect(result.stats.assignedDone).toBe(1);
    expect(result.stats.assignedOverdue).toBe(1);
  });

  it('returns empty leader dashboard when teamId is null', async () => {
    const auth: AuthContext = {
      userId: LEADER_ID.toString(),
      organizationId: ORG.toString(),
      teamId: null,
      role: 'leader',
    };
    const result = await getDashboard(auth);
    expect(result.scope).toBe('leader');
    if (result.scope !== 'leader') throw new Error('unexpected scope');
    expect(result.stats.tasks).toBe(0);
    expect(result.projects).toEqual([]);
  });
});
