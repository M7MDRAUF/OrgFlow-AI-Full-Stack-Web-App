// org-agent — Team service tests. Verifies RBAC for create/update/delete
// and org-scoped listing.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import * as teamService from '../src/modules/teams/team.service.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const PG = { page: 1, pageSize: 100 };

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
    { _id: ADMIN_ID, email: 'adm-t@test', displayName: 'Admin', role: 'admin', ...userBase },
    { _id: MEMBER_ID, email: 'mem-t@test', displayName: 'Member', role: 'member', ...userBase },
  ]);
  await TeamModel.create({
    _id: TEAM,
    organizationId: ORG,
    name: 'Existing',
    description: null,
    leaderId: null,
  });
});

describe('team service', () => {
  it('admin can create a team', async () => {
    const team = await teamService.createTeam(adminAuth, { name: 'New Team' });
    expect(team.name).toBe('New Team');
    expect(team.organizationId).toBe(ORG.toString());
  });

  it('member cannot create a team', async () => {
    await expect(teamService.createTeam(memberAuth, { name: 'Fail' })).rejects.toThrow(
      'Only admins can create teams',
    );
  });

  it('listTeams returns org-scoped teams', async () => {
    const { items: teams } = await teamService.listTeams(adminAuth, PG);
    expect(teams.length).toBeGreaterThanOrEqual(2);
    for (const t of teams) {
      expect(t.organizationId).toBe(ORG.toString());
    }
  });

  it('admin can update a team', async () => {
    const updated = await teamService.updateTeam(adminAuth, TEAM.toString(), {
      name: 'Renamed',
    });
    expect(updated.name).toBe('Renamed');
  });

  it('member cannot update a team', async () => {
    await expect(
      teamService.updateTeam(memberAuth, TEAM.toString(), { name: 'Nope' }),
    ).rejects.toThrow('Only admins can update teams');
  });

  it('rejects duplicate team name', async () => {
    await expect(teamService.createTeam(adminAuth, { name: 'Renamed' })).rejects.toThrow(
      'already exists',
    );
  });

  it('admin cannot delete team with members', async () => {
    await expect(teamService.deleteTeam(adminAuth, TEAM.toString())).rejects.toThrow(
      'still has members',
    );
  });
});
