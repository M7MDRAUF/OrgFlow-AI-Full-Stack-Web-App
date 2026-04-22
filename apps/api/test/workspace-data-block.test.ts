// rag-chat-agent — buildWorkspaceDataBlock must resolve assignee/leader
// ObjectIds to human display names so the assistant never echoes raw 24-char
// hex ids back to the user (the "stupid answer" regression).
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { buildWorkspaceDataBlock } from '../src/modules/ai/chat/workspace-data-tool.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import { TaskModel } from '../src/modules/tasks/task.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const ORG = new Types.ObjectId();
const TEAM = new Types.ObjectId();
const LEADER_ID = new Types.ObjectId();
const MEMBER_ID = new Types.ObjectId();
const PROJECT_ID = new Types.ObjectId();
const TASK_ID = new Types.ObjectId();

beforeAll(async () => {
  await TeamModel.create({
    _id: TEAM,
    organizationId: ORG,
    name: 'Platform',
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
    { _id: LEADER_ID, email: 'lead@test', displayName: 'Lina Leader', role: 'leader', ...userBase },
    { _id: MEMBER_ID, email: 'memb@test', displayName: 'Mark Member', role: 'member', ...userBase },
  ]);
  await ProjectModel.create({
    _id: PROJECT_ID,
    organizationId: ORG,
    teamId: TEAM,
    title: 'WS Data Project',
    description: null,
    createdBy: LEADER_ID,
    memberIds: [MEMBER_ID],
    status: 'active',
    startDate: null,
    dueDate: null,
  });
  await TaskModel.create({
    _id: TASK_ID,
    organizationId: ORG,
    teamId: TEAM,
    projectId: PROJECT_ID,
    title: 'Review RBAC rules',
    description: null,
    status: 'todo',
    priority: 'medium',
    assignedTo: MEMBER_ID,
    createdBy: LEADER_ID,
    dueDate: null,
  });
});

const leaderAuth: AuthContext = {
  userId: LEADER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM.toString(),
  role: 'leader',
};

describe('buildWorkspaceDataBlock — name resolution', () => {
  it('resolves task assignee ObjectId to display name', async () => {
    const block = await buildWorkspaceDataBlock(leaderAuth, { entity: 'tasks', filter: 'all' });
    expect(block.text).toContain('Mark Member');
    expect(block.text).not.toContain(MEMBER_ID.toString());
  });

  it('resolves team leader ObjectId to display name', async () => {
    const block = await buildWorkspaceDataBlock(leaderAuth, { entity: 'teams', filter: 'all' });
    expect(block.text).toContain('Lina Leader');
    expect(block.text).not.toContain(LEADER_ID.toString());
  });
});
