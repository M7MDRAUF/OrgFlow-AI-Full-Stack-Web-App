// org-agent — E5 regression. Members must not see the whole team directory;
// they must only see themselves + collaborators they share a project/task with
// (BE-H-001 + FR-013/FR-014 §2.8). Cross-team users on a shared project must
// still be hidden because the team filter dominates.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import { TaskModel } from '../src/modules/tasks/task.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { listUsers } from '../src/modules/users/user.service.js';
import './setup-db.js';

const PG = { page: 1, pageSize: 100 };

const ORG = new Types.ObjectId();
const TEAM_A = new Types.ObjectId();
const TEAM_B = new Types.ObjectId();

const MEMBER_A = new Types.ObjectId(); // the viewer
const COLLAB_SAME_TEAM = new Types.ObjectId(); // same team + shared project → visible
const LONELY_SAME_TEAM = new Types.ObjectId(); // same team, no shared resource → hidden
const CROSS_TEAM = new Types.ObjectId(); // team B but on the shared project → hidden
const TASK_COLLAB = new Types.ObjectId(); // same team, shares a task → visible
const ADMIN_OTHER_TEAM = new Types.ObjectId(); // admin in team B → hidden for member

async function seedUser(
  _id: Types.ObjectId,
  teamId: Types.ObjectId,
  role: 'admin' | 'leader' | 'member',
  email: string,
): Promise<void> {
  await UserModel.create({
    _id,
    organizationId: ORG,
    teamId,
    email,
    displayName: email,
    role,
    status: 'active',
    passwordHash: 'x',
    inviteTokenHash: null,
    inviteExpiresAt: null,
    themePreference: 'system',
  });
}

beforeAll(async () => {
  await Promise.all([
    seedUser(MEMBER_A, TEAM_A, 'member', 'a@test'),
    seedUser(COLLAB_SAME_TEAM, TEAM_A, 'member', 'collab@test'),
    seedUser(LONELY_SAME_TEAM, TEAM_A, 'member', 'lonely@test'),
    seedUser(TASK_COLLAB, TEAM_A, 'member', 'taskmate@test'),
    seedUser(CROSS_TEAM, TEAM_B, 'member', 'xteam@test'),
    seedUser(ADMIN_OTHER_TEAM, TEAM_B, 'admin', 'otheradmin@test'),
  ]);

  // Shared project in team A with MEMBER_A + COLLAB_SAME_TEAM; cross-team user
  // is also listed as a member (valid data shape, policy must hide them via
  // the teamId filter).
  const sharedProject = await ProjectModel.create({
    organizationId: ORG,
    teamId: TEAM_A,
    title: 'shared',
    description: null,
    createdBy: MEMBER_A,
    memberIds: [MEMBER_A, COLLAB_SAME_TEAM, CROSS_TEAM],
    status: 'active',
    startDate: null,
    dueDate: null,
  });

  // Lonely project — same team but MEMBER_A is NOT a member; must not leak.
  await ProjectModel.create({
    organizationId: ORG,
    teamId: TEAM_A,
    title: 'lonely',
    description: null,
    createdBy: LONELY_SAME_TEAM,
    memberIds: [LONELY_SAME_TEAM],
    status: 'active',
    startDate: null,
    dueDate: null,
  });

  // Task bridging MEMBER_A and TASK_COLLAB in team A.
  await TaskModel.create({
    organizationId: ORG,
    teamId: TEAM_A,
    projectId: sharedProject._id,
    title: 'bridge',
    description: null,
    status: 'todo',
    priority: 'medium',
    assignedTo: TASK_COLLAB,
    createdBy: MEMBER_A,
    dueDate: null,
  });
});

function auth(
  role: 'admin' | 'member',
  teamId: Types.ObjectId | null,
  userId: Types.ObjectId,
): AuthContext {
  return {
    userId: userId.toString(),
    organizationId: ORG.toString(),
    teamId: teamId === null ? null : teamId.toString(),
    role,
  };
}

describe('listUsers member scope (E5)', () => {
  it('member sees self + same-team project collaborators + same-team task collaborators only', async () => {
    const { items: visible } = await listUsers(auth('member', TEAM_A, MEMBER_A), {}, PG);
    const ids = visible.map((u) => u.id).sort();
    const expected = [
      MEMBER_A.toString(),
      COLLAB_SAME_TEAM.toString(),
      TASK_COLLAB.toString(),
    ].sort();
    expect(ids).toStrictEqual(expected);
  });

  it('member cannot see same-team users with no shared project/task', async () => {
    const { items: visible } = await listUsers(auth('member', TEAM_A, MEMBER_A), {}, PG);
    expect(visible.map((u) => u.id)).not.toContain(LONELY_SAME_TEAM.toString());
  });

  it('member cannot see cross-team users even if listed on a shared project', async () => {
    const { items: visible } = await listUsers(auth('member', TEAM_A, MEMBER_A), {}, PG);
    expect(visible.map((u) => u.id)).not.toContain(CROSS_TEAM.toString());
    expect(visible.map((u) => u.id)).not.toContain(ADMIN_OTHER_TEAM.toString());
  });

  it('admin sees all users in the organization regardless of team', async () => {
    const { items: visible } = await listUsers(auth('admin', null, MEMBER_A), {}, PG);
    const ids = new Set(visible.map((u) => u.id));
    expect(ids.has(MEMBER_A.toString())).toBe(true);
    expect(ids.has(CROSS_TEAM.toString())).toBe(true);
    expect(ids.has(ADMIN_OTHER_TEAM.toString())).toBe(true);
    expect(ids.has(LONELY_SAME_TEAM.toString())).toBe(true);
  });
});
