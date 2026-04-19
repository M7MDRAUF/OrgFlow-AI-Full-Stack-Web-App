// projects-agent — Project service tests. Verifies RBAC scope, create, update,
// and member-only visibility rules.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import * as projectService from '../src/modules/projects/project.service.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const PG = { page: 1, pageSize: 100 };

const ORG = new Types.ObjectId();
const TEAM = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();
const LEADER_ID = new Types.ObjectId();
const MEMBER_ID = new Types.ObjectId();
const OTHER_MEMBER_ID = new Types.ObjectId();

beforeAll(async () => {
  await TeamModel.create({
    _id: TEAM,
    organizationId: ORG,
    name: 'ProjTeam',
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
    { _id: ADMIN_ID, email: 'adm-p@test', displayName: 'Admin', role: 'admin', ...userBase },
    { _id: LEADER_ID, email: 'ldr-p@test', displayName: 'Leader', role: 'leader', ...userBase },
    { _id: MEMBER_ID, email: 'mem-p@test', displayName: 'Member', role: 'member', ...userBase },
    {
      _id: OTHER_MEMBER_ID,
      email: 'other-p@test',
      displayName: 'Other',
      role: 'member',
      ...userBase,
    },
  ]);

  await ProjectModel.create({
    organizationId: ORG,
    teamId: TEAM,
    title: 'Seed Project',
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

const otherMemberAuth: AuthContext = {
  userId: OTHER_MEMBER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'member',
};

describe('project service', () => {
  let createdProjectId: string;

  it('leader can create a project in their team', async () => {
    const project = await projectService.createProject(leaderAuth, {
      teamId: TEAM.toString(),
      title: 'Leader Proj',
      memberIds: [MEMBER_ID.toString()],
    });
    createdProjectId = project.id;
    expect(project.title).toBe('Leader Proj');
    expect(project.teamId).toBe(TEAM.toString());
  });

  it('member cannot create a project', async () => {
    await expect(
      projectService.createProject(memberAuth, {
        teamId: TEAM.toString(),
        title: 'Member Proj',
      }),
    ).rejects.toThrow(/only admins or the team leader/i);
  });

  it('member sees only projects they belong to', async () => {
    const { items: projects } = await projectService.listProjects(memberAuth, {}, PG);
    for (const p of projects) {
      expect(p.memberIds).toContain(MEMBER_ID.toString());
    }
  });

  it('member not in project cannot see it', async () => {
    const { items: projects } = await projectService.listProjects(otherMemberAuth, {}, PG);
    const ids = projects.map((p) => p.id);
    expect(ids).not.toContain(createdProjectId);
  });

  it('leader can update project title', async () => {
    const updated = await projectService.updateProject(leaderAuth, createdProjectId, {
      title: 'Renamed Proj',
    });
    expect(updated.title).toBe('Renamed Proj');
  });

  it('leader can delete their project', async () => {
    await projectService.deleteProject(leaderAuth, createdProjectId);
    await expect(projectService.getProject(leaderAuth, createdProjectId)).rejects.toThrow(
      /not found/i,
    );
  });
});

// BUG-001 regression: project deletion must cascade tasks and comments.
describe('project delete cascade (BUG-001)', () => {
  it('deletes tasks and comments when project is deleted', async () => {
    const { TaskModel, TaskCommentModel } = await import('../src/modules/tasks/task.model.js');
    const project = await projectService.createProject(leaderAuth, {
      teamId: TEAM.toString(),
      title: 'Cascade Proj',
      memberIds: [MEMBER_ID.toString()],
    });
    // Create tasks in the project
    const task = await TaskModel.create({
      organizationId: ORG,
      teamId: TEAM,
      projectId: new Types.ObjectId(project.id),
      title: 'Cascade Task',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignedTo: MEMBER_ID,
      createdBy: LEADER_ID,
    });
    await TaskCommentModel.create({
      taskId: task._id,
      userId: LEADER_ID,
      body: 'cascade comment',
    });

    await projectService.deleteProject(leaderAuth, project.id);

    const remainingTasks = await TaskModel.countDocuments({
      projectId: new Types.ObjectId(project.id),
    });
    const remainingComments = await TaskCommentModel.countDocuments({
      taskId: task._id,
    });
    expect(remainingTasks).toBe(0);
    expect(remainingComments).toBe(0);
  });
});
