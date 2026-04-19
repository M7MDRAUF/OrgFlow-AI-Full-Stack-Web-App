// qa-agent — TG-B02: Task comment CRUD service tests.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import * as taskService from '../src/modules/tasks/task.service.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const ORG = new Types.ObjectId();
const TEAM = new Types.ObjectId();
const USER_ID = new Types.ObjectId();
const PROJECT = new Types.ObjectId();

const auth: AuthContext = {
  userId: USER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'leader',
};

beforeAll(async () => {
  await OrganizationModel.create({ _id: ORG, name: 'CommentOrg', slug: 'comment-org' });
  await TeamModel.create({ _id: TEAM, organizationId: ORG, name: 'CTeam', leaderId: USER_ID });
  await UserModel.create({
    _id: USER_ID,
    organizationId: ORG,
    teamId: TEAM,
    email: 'comm@example.com',
    displayName: 'Commenter',
    role: 'leader',
    status: 'active',
    passwordHash: 'x',
    inviteTokenHash: null,
    inviteExpiresAt: null,
  });
  await ProjectModel.create({
    _id: PROJECT,
    organizationId: ORG,
    teamId: TEAM,
    title: 'CProj',
    description: 'comment proj',
    status: 'active',
    createdBy: USER_ID,
    memberIds: [USER_ID],
  });
});

describe('task comments', () => {
  let taskId: string;

  it('creates a task to comment on', async () => {
    const task = await taskService.createTask(auth, {
      title: 'Commentable Task',
      projectId: PROJECT.toString(),
      assignedTo: USER_ID.toString(),
    });
    taskId = task.id;
    expect(taskId).toBeDefined();
  });

  it('creates a comment', async () => {
    const comment = await taskService.createComment(auth, taskId, { body: 'First comment' });
    expect(comment.body).toBe('First comment');
    expect(comment.userId).toBe(USER_ID.toString());
  });

  it('lists comments', async () => {
    const comments = await taskService.listComments(auth, taskId);
    expect(comments.length).toBeGreaterThanOrEqual(1);
    expect(comments[0]?.body).toBe('First comment');
  });

  it('rejects empty comment body', async () => {
    await expect(taskService.createComment(auth, taskId, { body: '' })).rejects.toThrow();
  });
});
