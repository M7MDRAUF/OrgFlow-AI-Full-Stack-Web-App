import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { DocumentModel } from '../src/modules/ai/documents/document.model.js';
import * as userService from '../src/modules/users/user.service.js';
import * as docService from '../src/modules/ai/documents/document.service.js';
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

beforeAll(async () => {
  await OrganizationModel.create({ _id: ORG, name: 'CascadeOrg', slug: 'cas' });
  await TeamModel.create({ _id: TEAM, organizationId: ORG, name: 'CTeam', leaderId: ADMIN_ID });
  const base = {
    organizationId: ORG,
    teamId: TEAM,
    status: 'active' as const,
    passwordHash: 'x',
    inviteTokenHash: null,
    inviteExpiresAt: null,
  };
  await UserModel.create([
    { _id: ADMIN_ID, email: 'cascade-admin@test', displayName: 'CAdmin', role: 'admin', ...base },
    {
      _id: MEMBER_ID,
      email: 'cascade-member@test',
      displayName: 'CMember',
      role: 'member',
      ...base,
    },
  ]);
});

describe('Document delete user cascade regression (BUG-CRITICAL-001)', () => {
  it('correctly handles list and fetch of documents after uploader is deleted', async () => {
    // 1. Create a document uploaded by the member
    const doc = await DocumentModel.create({
      organizationId: ORG,
      teamId: TEAM,
      projectId: null,
      visibility: 'team',
      title: 'Cascade Test Doc',
      originalFilename: 'cascade.txt',
      mimeType: 'text/plain',
      uploadedBy: MEMBER_ID,
      status: 'indexed',
      allowedRoles: [],
      chunkCount: 1,
      error: null,
    });

    // 2. Delete the member user to trigger the cascade uploader nullification
    await userService.deleteUser(adminAuth, MEMBER_ID.toString());

    // 3. Assert uploader is indeed set to null in database
    const dbDoc = await DocumentModel.findById(doc._id);
    expect(dbDoc).not.toBeNull();
    expect(dbDoc!.uploadedBy).toBeNull();

    // 4. Assert listing the documents is safe and does not crash
    const listResult = await docService.listDocuments(adminAuth, {}, { page: 1, pageSize: 10 });
    expect(listResult.items.length).toBeGreaterThanOrEqual(1);
    const listedDoc = listResult.items.find((item) => item.id === doc._id.toString());
    expect(listedDoc).toBeDefined();
    expect(listedDoc!.uploadedBy).toBeNull();

    // 5. Assert fetching the single document is safe and does not crash
    const fetchedDoc = await docService.getDocument(adminAuth, doc._id.toString());
    expect(fetchedDoc).toBeDefined();
    expect(fetchedDoc.uploadedBy).toBeNull();
  });
});
