// qa-agent — Organization service tests. Verifies getCurrentOrganization
// and updateCurrentOrganization RBAC enforcement + org-scoped access.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import * as orgService from '../src/modules/organizations/organization.service.js';
import './setup-db.js';

const ORG_ID = new Types.ObjectId();
const OTHER_ORG_ID = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();
const LEADER_ID = new Types.ObjectId();
const MEMBER_ID = new Types.ObjectId();
const TEAM_ID = new Types.ObjectId();

const adminAuth: AuthContext = {
  userId: ADMIN_ID.toString(),
  organizationId: ORG_ID.toString(),
  teamId: TEAM_ID.toString(),
  role: 'admin',
};

const leaderAuth: AuthContext = {
  userId: LEADER_ID.toString(),
  organizationId: ORG_ID.toString(),
  teamId: TEAM_ID.toString(),
  role: 'leader',
};

const memberAuth: AuthContext = {
  userId: MEMBER_ID.toString(),
  organizationId: ORG_ID.toString(),
  teamId: TEAM_ID.toString(),
  role: 'member',
};

beforeAll(async () => {
  await OrganizationModel.create([
    { _id: ORG_ID, name: 'Test Org', slug: 'test-org' },
    { _id: OTHER_ORG_ID, name: 'Other Org', slug: 'other-org' },
  ]);
});

describe('getCurrentOrganization', () => {
  it('returns the organization for an admin', async () => {
    const org = await orgService.getCurrentOrganization(adminAuth);
    expect(org.id).toBe(ORG_ID.toString());
    expect(org.name).toBe('Test Org');
    expect(org.slug).toBe('test-org');
    expect(org.createdAt).toBeDefined();
    expect(org.updatedAt).toBeDefined();
  });

  it('returns the organization for a member', async () => {
    const org = await orgService.getCurrentOrganization(memberAuth);
    expect(org.id).toBe(ORG_ID.toString());
    expect(org.name).toBe('Test Org');
  });

  it('returns the organization for a leader', async () => {
    const org = await orgService.getCurrentOrganization(leaderAuth);
    expect(org.id).toBe(ORG_ID.toString());
  });

  it('throws not found for non-existent organization', async () => {
    const badAuth: AuthContext = {
      userId: ADMIN_ID.toString(),
      organizationId: new Types.ObjectId().toString(),
      teamId: null,
      role: 'admin',
    };
    await expect(orgService.getCurrentOrganization(badAuth)).rejects.toThrow(
      'Organization not found',
    );
  });
});

describe('updateCurrentOrganization', () => {
  it('admin can update the organization name', async () => {
    const updated = await orgService.updateCurrentOrganization(adminAuth, { name: 'Renamed Org' });
    expect(updated.name).toBe('Renamed Org');
    expect(updated.id).toBe(ORG_ID.toString());
  });

  it('leader cannot update the organization', async () => {
    await expect(
      orgService.updateCurrentOrganization(leaderAuth, { name: 'Fail' }),
    ).rejects.toThrow('Only admins can update the organization');
  });

  it('member cannot update the organization', async () => {
    await expect(
      orgService.updateCurrentOrganization(memberAuth, { name: 'Fail' }),
    ).rejects.toThrow('Only admins can update the organization');
  });

  it('throws not found when org does not exist', async () => {
    const badAuth: AuthContext = {
      userId: ADMIN_ID.toString(),
      organizationId: new Types.ObjectId().toString(),
      teamId: null,
      role: 'admin',
    };
    await expect(orgService.updateCurrentOrganization(badAuth, { name: 'Nope' })).rejects.toThrow(
      'Organization not found',
    );
  });

  it('preserves slug after name update', async () => {
    const org = await orgService.getCurrentOrganization(adminAuth);
    expect(org.slug).toBe('test-org');
  });

  it('update with empty input is a no-op', async () => {
    const before = await orgService.getCurrentOrganization(adminAuth);
    const after = await orgService.updateCurrentOrganization(adminAuth, {});
    expect(after.name).toBe(before.name);
  });
});
