// qa-agent — TG-B05: User CRUD service tests (update, status change).
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
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
});
