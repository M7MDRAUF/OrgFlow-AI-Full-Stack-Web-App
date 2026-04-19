// notes-agent — Announcement targeting, RBAC, update, and read-state tests.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import * as announcementService from '../src/modules/announcements/announcement.service.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const PG = { page: 1, pageSize: 100 };

const ORG = new Types.ObjectId();
const TEAM_A = new Types.ObjectId();
const TEAM_B = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();
const LEADER_ID = new Types.ObjectId();
const MEMBER_ID = new Types.ObjectId();
const MEMBER_B_ID = new Types.ObjectId();

const adminAuth: AuthContext = {
  userId: ADMIN_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM_A.toString(),
  role: 'admin',
};

const leaderAuth: AuthContext = {
  userId: LEADER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM_A.toString(),
  role: 'leader',
};

const memberAuth: AuthContext = {
  userId: MEMBER_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM_A.toString(),
  role: 'member',
};

const memberBAuth: AuthContext = {
  userId: MEMBER_B_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM_B.toString(),
  role: 'member',
};

const userBase = {
  organizationId: ORG,
  status: 'active' as const,
  passwordHash: 'x',
  inviteTokenHash: null,
  inviteExpiresAt: null,
  themePreference: 'system' as const,
};

beforeAll(async () => {
  await OrganizationModel.create({ _id: ORG, name: 'Test Org', slug: 'test-org-ann' });
  await TeamModel.create([
    { _id: TEAM_A, organizationId: ORG, name: 'Team A', description: null, leaderId: LEADER_ID },
    { _id: TEAM_B, organizationId: ORG, name: 'Team B', description: null, leaderId: null },
  ]);
  await UserModel.create([
    {
      _id: ADMIN_ID,
      email: 'ann-admin@t',
      displayName: 'Admin',
      role: 'admin',
      teamId: TEAM_A,
      ...userBase,
    },
    {
      _id: LEADER_ID,
      email: 'ann-leader@t',
      displayName: 'Leader',
      role: 'leader',
      teamId: TEAM_A,
      ...userBase,
    },
    {
      _id: MEMBER_ID,
      email: 'ann-member@t',
      displayName: 'Member',
      role: 'member',
      teamId: TEAM_A,
      ...userBase,
    },
    {
      _id: MEMBER_B_ID,
      email: 'ann-memberb@t',
      displayName: 'MemberB',
      role: 'member',
      teamId: TEAM_B,
      ...userBase,
    },
  ]);
});

describe('announcement service — create RBAC', () => {
  it('admin can post org-wide announcement', async () => {
    const dto = await announcementService.createAnnouncement(adminAuth, {
      targetType: 'organization',
      targetId: ORG.toString(),
      title: 'Org-wide',
      body: 'Important update for all',
    });
    expect(dto.targetType).toBe('organization');
    expect(dto.readByCurrentUser).toBe(true);
  });

  it('leader cannot post org-wide announcement', async () => {
    await expect(
      announcementService.createAnnouncement(leaderAuth, {
        targetType: 'organization',
        targetId: ORG.toString(),
        title: 'Fail',
        body: 'Should be forbidden',
      }),
    ).rejects.toThrow('Leaders cannot post organization-wide announcements');
  });

  it('leader can post to own team', async () => {
    const dto = await announcementService.createAnnouncement(leaderAuth, {
      targetType: 'team',
      targetId: TEAM_A.toString(),
      title: 'Team A Note',
      body: 'Leader posting to own team',
    });
    expect(dto.targetType).toBe('team');
    expect(dto.targetId).toBe(TEAM_A.toString());
  });

  it('leader cannot post to another team', async () => {
    await expect(
      announcementService.createAnnouncement(leaderAuth, {
        targetType: 'team',
        targetId: TEAM_B.toString(),
        title: 'Fail',
        body: 'Wrong team',
      }),
    ).rejects.toThrow('Leaders can only post to their own team');
  });

  it('member cannot create announcements', async () => {
    await expect(
      announcementService.createAnnouncement(memberAuth, {
        targetType: 'team',
        targetId: TEAM_A.toString(),
        title: 'Fail',
        body: 'Members should not create',
      }),
    ).rejects.toThrow('Members cannot create announcements');
  });
});

describe('announcement service — targeting visibility', () => {
  it('member sees org-wide + own team + own user announcements', async () => {
    // create user-targeted announcement to memberAuth
    await announcementService.createAnnouncement(adminAuth, {
      targetType: 'user',
      targetId: MEMBER_ID.toString(),
      title: 'DM to member',
      body: 'Private message',
    });

    const { items: list } = await announcementService.listAnnouncements(memberAuth, {}, PG);
    const titles = list.map((a) => a.title);
    expect(titles).toContain('Org-wide');
    expect(titles).toContain('Team A Note');
    expect(titles).toContain('DM to member');
  });

  it('memberB in team B does NOT see team A announcements', async () => {
    const { items: list } = await announcementService.listAnnouncements(memberBAuth, {}, PG);
    const titles = list.map((a) => a.title);
    expect(titles).toContain('Org-wide');
    expect(titles).not.toContain('Team A Note');
    expect(titles).not.toContain('DM to member');
  });
});

describe('announcement service — update', () => {
  let announcementId: string;

  it('author can update their announcement', async () => {
    const created = await announcementService.createAnnouncement(leaderAuth, {
      targetType: 'team',
      targetId: TEAM_A.toString(),
      title: 'Before Edit',
      body: 'Original body text',
    });
    announcementId = created.id;
    const updated = await announcementService.updateAnnouncement(leaderAuth, announcementId, {
      title: 'After Edit',
    });
    expect(updated.title).toBe('After Edit');
    expect(updated.body).toBe('Original body text');
  });

  it('non-author non-admin cannot update', async () => {
    await expect(
      announcementService.updateAnnouncement(memberAuth, announcementId, { title: 'Nope' }),
    ).rejects.toThrow('Only the author or an admin can edit');
  });

  it('admin can update any announcement', async () => {
    const updated = await announcementService.updateAnnouncement(adminAuth, announcementId, {
      body: 'Admin override',
    });
    expect(updated.body).toBe('Admin override');
  });
});

describe('announcement service — read state', () => {
  it('marking as read sets readByCurrentUser', async () => {
    const { items: list } = await announcementService.listAnnouncements(memberAuth, {}, PG);
    const unread = list.find((a) => !a.readByCurrentUser);
    expect(unread).toBeDefined();
    const marked = await announcementService.markAnnouncementRead(memberAuth, unread!.id);
    expect(marked.readByCurrentUser).toBe(true);
  });

  it('unreadOnly filter works', async () => {
    // mark all read for member
    const { items: all } = await announcementService.listAnnouncements(memberAuth, {}, PG);
    for (const a of all) {
      if (!a.readByCurrentUser) {
        await announcementService.markAnnouncementRead(memberAuth, a.id);
      }
    }
    const { items: unreadList } = await announcementService.listAnnouncements(
      memberAuth,
      {
        unreadOnly: true,
      },
      PG,
    );
    expect(unreadList.length).toBe(0);
  });
});
