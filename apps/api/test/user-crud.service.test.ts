// qa-agent — TG-B05: User CRUD service tests (update, status change).
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { TaskModel, TaskCommentModel } from '../src/modules/tasks/task.model.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import { ChatLogModel } from '../src/modules/ai/chat/chat-log.model.js';
import { DocumentModel } from '../src/modules/ai/documents/document.model.js';
import * as userService from '../src/modules/users/user.service.js';
import './setup-db.js';

const ORG = new Types.ObjectId();
const TEAM = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();
const MEMBER_ID = new Types.ObjectId();

const adminAuth: AuthContext = {
  userId: ADMIN_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'admin',
};

const memberAuth: AuthContext = {
  userId: MEMBER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'member',
};

beforeAll(async () => {
  await OrganizationModel.create({ _id: ORG, name: 'UserOrg', slug: 'usr' });
  await TeamModel.create({ _id: TEAM, organizationId: ORG, name: 'UTeam', leaderId: ADMIN_ID });
  const base = {
    organizationId: ORG,
    teamId: TEAM,
    status: 'active' as const,
    passwordHash: 'x',
    inviteTokenHash: null,
    inviteExpiresAt: null,
  };
  await UserModel.create([
    { _id: ADMIN_ID, email: 'ucrud-admin@test', displayName: 'UAdmin', role: 'admin', ...base },
    { _id: MEMBER_ID, email: 'ucrud-member@test', displayName: 'UMember', role: 'member', ...base },
  ]);
});

describe('user service CRUD', () => {
  it('admin can update user displayName', async () => {
    const updated = await userService.updateUser(adminAuth, MEMBER_ID.toString(), {
      name: 'Renamed Member',
    });
    expect(updated.name).toBe('Renamed Member');
  });

  it('member can update own displayName', async () => {
    const updated = await userService.updateUser(memberAuth, MEMBER_ID.toString(), {
      name: 'Self Renamed',
    });
    expect(updated.name).toBe('Self Renamed');
  });

  it('member cannot update another user', async () => {
    await expect(
      userService.updateUser(memberAuth, ADMIN_ID.toString(), { name: 'Hacked' }),
    ).rejects.toThrow();
  });

  it('admin can disable a user', async () => {
    const updated = await userService.updateUserStatus(adminAuth, MEMBER_ID.toString(), {
      status: 'disabled',
    });
    expect(updated.status).toBe('disabled');
  });

  it('member cannot change user status', async () => {
    await expect(
      userService.updateUserStatus(memberAuth, ADMIN_ID.toString(), { status: 'disabled' }),
    ).rejects.toThrow();
  });

  it('admin can reactivate a disabled user', async () => {
    const updated = await userService.updateUserStatus(adminAuth, MEMBER_ID.toString(), {
      status: 'active',
    });
    expect(updated.status).toBe('active');
  });

  it('admin can delete a user and trigger full cascade cleanup', async () => {
    const tempUserOid = new Types.ObjectId();
    const tempUserEmail = 'temp-delete-cascade@test';

    // Create temp user
    await UserModel.create({
      _id: tempUserOid,
      organizationId: ORG,
      teamId: TEAM,
      email: tempUserEmail,
      displayName: 'Temp User',
      role: 'member',
      status: 'active',
      passwordHash: 'x',
    });

    // Create a project with temp user in memberIds
    const project = await ProjectModel.create({
      organizationId: ORG,
      teamId: TEAM,
      title: 'Temp Project',
      createdBy: ADMIN_ID,
      memberIds: [tempUserOid],
      status: 'planned',
    });

    // Create a task assigned to temp user
    const task = await TaskModel.create({
      organizationId: ORG,
      teamId: TEAM,
      projectId: project._id,
      title: 'Temp Task',
      assignedTo: tempUserOid,
      createdBy: ADMIN_ID,
      status: 'todo',
      priority: 'medium',
    });

    // Create a task comment by temp user
    const comment = await TaskCommentModel.create({
      organizationId: ORG,
      taskId: task._id,
      userId: tempUserOid,
      body: 'Temp comment',
    });

    // Create a chat log by temp user
    const chatLog = await ChatLogModel.create({
      organizationId: ORG,
      userId: tempUserOid,
      role: 'user',
      content: 'Hello',
      sources: [],
    });

    // Create a document uploaded by temp user
    const doc = await DocumentModel.create({
      organizationId: ORG,
      projectId: project._id,
      teamId: TEAM,
      title: 'Temp Doc',
      originalFilename: 'temp-doc.txt',
      mimeType: 'text/plain',
      uploadedBy: tempUserOid,
      visibility: 'project',
      allowedRoles: ['member'],
    });

    // Delete the user
    await userService.deleteUser(adminAuth, tempUserOid.toString());

    // Assert user is deleted
    const deletedUser = await UserModel.findById(tempUserOid);
    expect(deletedUser).toBeNull();

    // Assert task assignment is nullified
    const updatedTask = await TaskModel.findById(task._id);
    expect(updatedTask?.assignedTo).toBeNull();

    // Assert task comments are deleted
    const updatedComment = await TaskCommentModel.findById(comment._id);
    expect(updatedComment).toBeNull();

    // Assert project memberIds pulled
    const updatedProject = await ProjectModel.findById(project._id);
    expect(updatedProject?.memberIds).not.toContainEqual(tempUserOid);

    // Assert chat logs deleted
    const updatedChatLog = await ChatLogModel.findById(chatLog._id);
    expect(updatedChatLog).toBeNull();

    // Assert document uploadedBy is null
    const updatedDoc = await DocumentModel.findById(doc._id);
    expect(updatedDoc?.uploadedBy).toBeNull();
  });
});
