// qa-agent — Integration smoke test. Exercises the full API lifecycle
// end-to-end through the service layer: auth → teams → projects → tasks →
// announcements. Verifies that every major service function works together
// in a realistic happy-path flow.
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app/app.js';
import { loadEnv } from '../src/app/env.js';
import type { AuthContext } from '../src/middleware/auth-context.js';
import * as announcementService from '../src/modules/announcements/announcement.service.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import * as projectService from '../src/modules/projects/project.service.js';
import * as taskService from '../src/modules/tasks/task.service.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import * as teamService from '../src/modules/teams/team.service.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const PG = { page: 1, pageSize: 100 };
const env = loadEnv();
const app = createApp(env);

const ORG = new Types.ObjectId();
const TEAM = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();
const LEADER_ID = new Types.ObjectId();
const MEMBER_ID = new Types.ObjectId();

const ADMIN_PASSWORD = 'smoke-admin-pass-12';

const adminAuth: AuthContext = {
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

const memberAuth: AuthContext = {
  userId: MEMBER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'member',
};

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await OrganizationModel.create({ _id: ORG, name: 'Smoke Org', slug: 'smoke-org' });

  await TeamModel.create({
    _id: TEAM,
    organizationId: ORG,
    name: 'Smoke Team',
    description: null,
    leaderId: LEADER_ID,
  });

  const userBase = {
    organizationId: ORG,
    teamId: TEAM,
    status: 'active' as const,
    passwordHash: 'x',
    inviteTokenHash: null,
    inviteExpiresAt: null,
    themePreference: 'system' as const,
  };

  await UserModel.create([
    {
      _id: ADMIN_ID,
      email: 'smoke-admin@test.io',
      displayName: 'Smoke Admin',
      role: 'admin',
      ...userBase,
      passwordHash,
    },
    {
      _id: LEADER_ID,
      email: 'smoke-leader@test.io',
      displayName: 'Smoke Leader',
      role: 'leader',
      ...userBase,
    },
    {
      _id: MEMBER_ID,
      email: 'smoke-member@test.io',
      displayName: 'Smoke Member',
      role: 'member',
      ...userBase,
    },
  ]);
});

describe('smoke integration — full API lifecycle', () => {
  let authToken: string;
  let newTeamId: string;
  let projectId: string;
  let taskId: string;
  let announcementId: string;

  // ── Auth flow ──────────────────────────────────────────────────────────

  it('admin can login via HTTP and receive a JWT token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'smoke-admin@test.io', password: ADMIN_PASSWORD });

    expect(res.status).toBe(200);
    const body = res.body as {
      success: boolean;
      data: { token: string; user: { email: string; role: string } };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe('string');
    expect(body.data.user.role).toBe('admin');
    authToken = body.data.token;
  });

  it('authenticated /me endpoint returns admin profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const body = res.body as {
      success: boolean;
      data: { user: { email: string; role: string } };
    };
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('smoke-admin@test.io');
  });

  // ── Team CRUD ──────────────────────────────────────────────────────────

  it('admin creates a new team', async () => {
    const team = await teamService.createTeam(adminAuth, {
      name: 'Smoke Empty Team',
    });
    newTeamId = team.id;
    expect(team.name).toBe('Smoke Empty Team');
    expect(team.organizationId).toBe(ORG.toString());
  });

  it('admin lists org-scoped teams', async () => {
    const { items } = await teamService.listTeams(adminAuth, PG);
    expect(items.length).toBeGreaterThanOrEqual(2);
    const names = items.map((t) => t.name);
    expect(names).toContain('Smoke Empty Team');
    expect(names).toContain('Smoke Team');
  });

  // ── Project CRUD ───────────────────────────────────────────────────────

  it('leader creates a project in their team', async () => {
    const project = await projectService.createProject(leaderAuth, {
      teamId: TEAM.toString(),
      title: 'Smoke Project',
      memberIds: [MEMBER_ID.toString()],
    });
    projectId = project.id;
    expect(project.title).toBe('Smoke Project');
    expect(project.teamId).toBe(TEAM.toString());
  });

  it('leader lists projects in the org', async () => {
    const { items } = await projectService.listProjects(leaderAuth, {}, PG);
    expect(items.length).toBeGreaterThanOrEqual(1);
    const titles = items.map((p) => p.title);
    expect(titles).toContain('Smoke Project');
  });

  // ── Task CRUD ──────────────────────────────────────────────────────────

  it('leader creates a task assigned to a member', async () => {
    const task = await taskService.createTask(leaderAuth, {
      projectId,
      title: 'Smoke Task',
      assignedTo: MEMBER_ID.toString(),
    });
    taskId = task.id;
    expect(task.title).toBe('Smoke Task');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.assignedTo).toBe(MEMBER_ID.toString());
  });

  it('leader updates task status to in-progress', async () => {
    const updated = await taskService.updateTask(leaderAuth, taskId, {
      status: 'in-progress',
    });
    expect(updated.status).toBe('in-progress');
  });

  it('assigned member updates task status to done', async () => {
    const updated = await taskService.updateTask(memberAuth, taskId, {
      status: 'done',
    });
    expect(updated.status).toBe('done');
  });

  it('leader lists tasks filtered by project', async () => {
    const { items } = await taskService.listTasks(leaderAuth, { projectId }, PG);
    expect(items.length).toBeGreaterThanOrEqual(1);
    const titles = items.map((t) => t.title);
    expect(titles).toContain('Smoke Task');
  });

  // ── Announcement CRUD ──────────────────────────────────────────────────

  it('admin creates an org-wide announcement', async () => {
    const ann = await announcementService.createAnnouncement(adminAuth, {
      targetType: 'organization',
      targetId: ORG.toString(),
      title: 'Smoke Announcement',
      body: 'This is a smoke-test announcement for the whole org.',
    });
    announcementId = ann.id;
    expect(ann.title).toBe('Smoke Announcement');
    expect(ann.targetType).toBe('organization');
  });

  it('admin lists announcements', async () => {
    const { items } = await announcementService.listAnnouncements(adminAuth, {}, PG);
    expect(items.length).toBeGreaterThanOrEqual(1);
    const titles = items.map((a) => a.title);
    expect(titles).toContain('Smoke Announcement');
  });

  // ── Cleanup: delete in reverse creation order ──────────────────────────

  it('admin deletes announcement', async () => {
    const result = await announcementService.deleteAnnouncement(adminAuth, announcementId);
    expect(result.deleted).toBe(true);
  });

  it('leader deletes task', async () => {
    await taskService.deleteTask(leaderAuth, taskId);
    await expect(taskService.getTask(leaderAuth, taskId)).rejects.toThrow(/not found/i);
  });

  it('leader deletes project', async () => {
    await projectService.deleteProject(leaderAuth, projectId);
    await expect(projectService.getProject(leaderAuth, projectId)).rejects.toThrow(/not found/i);
  });

  it('admin deletes the empty team', async () => {
    await teamService.deleteTeam(adminAuth, newTeamId);
    await expect(teamService.getTeam(adminAuth, newTeamId)).rejects.toThrow(/not found/i);
  });
});
