// rag-ingest-agent — Document service listing and deletion RBAC tests.
// Tests listDocuments scope filtering and deleteDocument permissions.
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import { DocumentChunkModel } from '../src/modules/ai/documents/document-chunk.model.js';
import { DocumentModel } from '../src/modules/ai/documents/document.model.js';
import * as docService from '../src/modules/ai/documents/document.service.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import './setup-db.js';

const PG = { page: 1, pageSize: 100 };

const ORG = new Types.ObjectId();
const TEAM_A = new Types.ObjectId();
const TEAM_B = new Types.ObjectId();
const PROJECT_A = new Types.ObjectId();
const ADMIN_ID = new Types.ObjectId();
const LEADER_A_ID = new Types.ObjectId();
const MEMBER_A_ID = new Types.ObjectId();
const MEMBER_B_ID = new Types.ObjectId();

const adminAuth: AuthContext = {
  userId: ADMIN_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM_A.toString(),
  role: 'admin',
};
const leaderAAuth: AuthContext = {
  userId: LEADER_A_ID.toString(),
  organizationId: ORG.toString(),
  teamId: TEAM_A.toString(),
  role: 'leader',
};
const memberAAuth: AuthContext = {
  userId: MEMBER_A_ID.toString(),
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

let orgDocId: string;
let teamDocId: string;
let projectDocId: string;
let adminOnlyDocId: string;

const userBase = {
  organizationId: ORG,
  status: 'active' as const,
  passwordHash: 'x',
  inviteTokenHash: null,
  inviteExpiresAt: null,
  themePreference: 'system' as const,
};

beforeAll(async () => {
  await OrganizationModel.create({ _id: ORG, name: 'Ing Org', slug: 'ing-org' });
  await TeamModel.create([
    {
      _id: TEAM_A,
      organizationId: ORG,
      name: 'Ing Team A',
      description: null,
      leaderId: LEADER_A_ID,
    },
    { _id: TEAM_B, organizationId: ORG, name: 'Ing Team B', description: null, leaderId: null },
  ]);
  await UserModel.create([
    {
      _id: ADMIN_ID,
      email: 'ing-admin@t',
      displayName: 'Admin',
      role: 'admin',
      teamId: TEAM_A,
      ...userBase,
    },
    {
      _id: LEADER_A_ID,
      email: 'ing-leader@t',
      displayName: 'LeaderA',
      role: 'leader',
      teamId: TEAM_A,
      ...userBase,
    },
    {
      _id: MEMBER_A_ID,
      email: 'ing-memA@t',
      displayName: 'MemA',
      role: 'member',
      teamId: TEAM_A,
      ...userBase,
    },
    {
      _id: MEMBER_B_ID,
      email: 'ing-memB@t',
      displayName: 'MemB',
      role: 'member',
      teamId: TEAM_B,
      ...userBase,
    },
  ]);
  await ProjectModel.create({
    _id: PROJECT_A,
    organizationId: ORG,
    teamId: TEAM_A,
    title: 'Ing Project',
    description: null,
    createdBy: ADMIN_ID,
    memberIds: [MEMBER_A_ID],
    status: 'active',
    startDate: null,
    dueDate: null,
  });

  // Seed documents directly (bypassing upload which needs parsers/embeddings)
  const orgDoc = await DocumentModel.create({
    organizationId: ORG,
    teamId: null,
    projectId: null,
    visibility: 'organization',
    title: 'Org Doc',
    originalFilename: 'org.pdf',
    mimeType: 'application/pdf',
    uploadedBy: ADMIN_ID,
    status: 'indexed',
    allowedRoles: [],
    chunkCount: 1,
    error: null,
  });
  orgDocId = orgDoc.id as string;

  const teamDoc = await DocumentModel.create({
    organizationId: ORG,
    teamId: TEAM_A,
    projectId: null,
    visibility: 'team',
    title: 'Team A Doc',
    originalFilename: 'team.pdf',
    mimeType: 'application/pdf',
    uploadedBy: LEADER_A_ID,
    status: 'indexed',
    allowedRoles: [],
    chunkCount: 1,
    error: null,
  });
  teamDocId = teamDoc.id as string;

  const projectDoc = await DocumentModel.create({
    organizationId: ORG,
    teamId: TEAM_A,
    projectId: PROJECT_A,
    visibility: 'project',
    title: 'Project Doc',
    originalFilename: 'proj.txt',
    mimeType: 'text/plain',
    uploadedBy: ADMIN_ID,
    status: 'indexed',
    allowedRoles: [],
    chunkCount: 1,
    error: null,
  });
  projectDocId = projectDoc.id as string;

  // Document restricted to admin role only
  const adminOnly = await DocumentModel.create({
    organizationId: ORG,
    teamId: null,
    projectId: null,
    visibility: 'organization',
    title: 'Admin Only Doc',
    originalFilename: 'admin-only.pdf',
    mimeType: 'application/pdf',
    uploadedBy: ADMIN_ID,
    status: 'indexed',
    allowedRoles: ['admin'],
    chunkCount: 1,
    error: null,
  });
  adminOnlyDocId = adminOnly.id as string;

  // Add a chunk for the team doc so delete cascading can be tested
  await DocumentChunkModel.create({
    documentId: teamDoc._id,
    organizationId: ORG,
    teamId: TEAM_A,
    projectId: null,
    visibility: 'team',
    allowedRoles: [],
    chunkIndex: 0,
    content: 'chunk text',
    embedding: [],
  });
});

describe('document listing scope', () => {
  it('admin sees all documents in the org', async () => {
    const { items: docs } = await docService.listDocuments(adminAuth, {}, PG);
    const titles = docs.map((d) => d.title);
    expect(titles).toContain('Org Doc');
    expect(titles).toContain('Team A Doc');
    expect(titles).toContain('Project Doc');
    expect(titles).toContain('Admin Only Doc');
  });

  it('leader sees org docs + own team docs + own team project docs', async () => {
    const { items: docs } = await docService.listDocuments(leaderAAuth, {}, PG);
    const titles = docs.map((d) => d.title);
    expect(titles).toContain('Org Doc');
    expect(titles).toContain('Team A Doc');
    expect(titles).toContain('Project Doc');
  });

  it('member sees org docs + own team docs + own project docs', async () => {
    const { items: docs } = await docService.listDocuments(memberAAuth, {}, PG);
    const titles = docs.map((d) => d.title);
    expect(titles).toContain('Org Doc');
    expect(titles).toContain('Team A Doc');
    expect(titles).toContain('Project Doc');
  });

  it('member in different team cannot see Team A docs', async () => {
    const { items: docs } = await docService.listDocuments(memberBAuth, {}, PG);
    const titles = docs.map((d) => d.title);
    expect(titles).toContain('Org Doc');
    expect(titles).not.toContain('Team A Doc');
    expect(titles).not.toContain('Project Doc');
  });

  it('allowedRoles filter prevents non-admin from seeing admin-only docs', async () => {
    const { items: docs } = await docService.listDocuments(memberAAuth, {}, PG);
    const titles = docs.map((d) => d.title);
    expect(titles).not.toContain('Admin Only Doc');
  });

  it('visibility query filter narrows results', async () => {
    const { items: docs } = await docService.listDocuments(adminAuth, { visibility: 'team' }, PG);
    expect(docs.every((d) => d.visibility === 'team')).toBe(true);
  });
});

describe('document getDocument scope', () => {
  it('admin can view any org document', async () => {
    const doc = await docService.getDocument(adminAuth, projectDocId);
    expect(doc.title).toBe('Project Doc');
  });

  it('member cannot view admin-only doc', async () => {
    await expect(docService.getDocument(memberAAuth, adminOnlyDocId)).rejects.toThrow(
      'You cannot view this document',
    );
  });

  it('member in team B cannot view team A doc', async () => {
    await expect(docService.getDocument(memberBAuth, teamDocId)).rejects.toThrow(
      'You cannot view this document',
    );
  });
});

describe('document deletion RBAC', () => {
  it('member cannot delete documents', async () => {
    await expect(docService.deleteDocument(memberAAuth, orgDocId)).rejects.toThrow(
      'Members cannot delete',
    );
  });

  it('leader cannot delete org-wide documents', async () => {
    await expect(docService.deleteDocument(leaderAAuth, orgDocId)).rejects.toThrow(
      'Leaders cannot delete organization documents',
    );
  });

  it('leader can delete own team documents and cascades chunks', async () => {
    const chunksBefore = await DocumentChunkModel.countDocuments({
      documentId: new Types.ObjectId(teamDocId),
    });
    expect(chunksBefore).toBeGreaterThanOrEqual(1);

    const result = await docService.deleteDocument(leaderAAuth, teamDocId);
    expect(result.deleted).toBe(true);

    const chunksAfter = await DocumentChunkModel.countDocuments({
      documentId: new Types.ObjectId(teamDocId),
    });
    expect(chunksAfter).toBe(0);
  });

  it('admin can delete any document', async () => {
    const result = await docService.deleteDocument(adminAuth, projectDocId);
    expect(result.deleted).toBe(true);
  });
});
