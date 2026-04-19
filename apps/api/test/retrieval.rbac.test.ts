// AI retrieval RBAC regression (E3). Seeds chunks at each visibility level
// and asserts admin / leader / member branches of buildScopeFilter enforce
// §2.8 FR-001/FR-008/FR-015 (AI-H-001).
import { Types } from 'mongoose';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '../src/middleware/auth-context.js';
import {
  DocumentChunkModel,
  type DocumentChunkDoc,
} from '../src/modules/ai/documents/document-chunk.model.js';
import { DocumentModel } from '../src/modules/ai/documents/document.model.js';
import { getEmbeddingDimensions } from '../src/modules/ai/embeddings.js';
import { retrieveChunks } from '../src/modules/ai/retrieval.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import './setup-db.js';

// Mock embedText so tests don't depend on a live Ollama server. The mock
// returns a zero vector of the correct dimensions — sufficient for RBAC
// filter testing where similarity ranking is irrelevant.
vi.mock('../src/modules/ai/embeddings.js', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  const { getEmbeddingDimensions } = orig as {
    getEmbeddingDimensions: () => number;
  };
  return {
    ...orig,
    embedText: vi.fn(() => {
      const dims = getEmbeddingDimensions();
      return Promise.resolve(new Array<number>(dims).fill(0));
    }),
  };
});

const ORG = new Types.ObjectId();
const TEAM_A = new Types.ObjectId();
const TEAM_B = new Types.ObjectId();
const PROJECT_A = new Types.ObjectId();
const PROJECT_B = new Types.ObjectId();
const MEMBER_A = new Types.ObjectId();

function filler(dims: number): number[] {
  // Zero vector — cosine similarity will tie for every chunk; order is
  // irrelevant, we only assert WHICH chunks come back.
  return new Array<number>(dims).fill(0);
}

async function seedDoc(
  title: string,
  visibility: 'organization' | 'team' | 'project',
  teamId: Types.ObjectId | null,
  projectId: Types.ObjectId | null,
): Promise<Types.ObjectId> {
  const doc = await DocumentModel.create({
    organizationId: ORG,
    teamId,
    projectId,
    visibility,
    allowedRoles: [],
    title,
    originalFilename: `${title}.txt`,
    mimeType: 'text/plain',
    uploadedBy: new Types.ObjectId(),
    status: 'indexed',
    chunkCount: 1,
    error: null,
  });
  const dims = getEmbeddingDimensions();
  const chunk: Omit<DocumentChunkDoc, 'createdAt' | 'updatedAt'> = {
    documentId: doc._id,
    organizationId: ORG,
    teamId,
    projectId,
    visibility,
    allowedRoles: [],
    chunkIndex: 0,
    content: `${title} content`,
    embedding: filler(dims),
  };
  await DocumentChunkModel.create(chunk);
  return doc._id;
}

beforeAll(async () => {
  // Org-wide, team-A, team-B, project-A (team A), project-B (team B).
  await seedDoc('org-wide', 'organization', null, null);
  await seedDoc('team-A doc', 'team', TEAM_A, null);
  await seedDoc('team-B doc', 'team', TEAM_B, null);
  await seedDoc('project-A doc', 'project', TEAM_A, PROJECT_A);
  await seedDoc('project-B doc', 'project', TEAM_B, PROJECT_B);

  // Member A is in team A and on project A only.
  await ProjectModel.create({
    _id: PROJECT_A,
    organizationId: ORG,
    teamId: TEAM_A,
    title: 'Project A',
    description: null,
    status: 'active',
    memberIds: [MEMBER_A],
    createdBy: MEMBER_A,
  });
  await ProjectModel.create({
    _id: PROJECT_B,
    organizationId: ORG,
    teamId: TEAM_B,
    title: 'Project B',
    description: null,
    status: 'active',
    memberIds: [],
    createdBy: MEMBER_A,
  });
});

function auth(
  role: 'admin' | 'leader' | 'member',
  teamId: Types.ObjectId | null,
  userId = new Types.ObjectId(),
): AuthContext {
  return {
    userId: userId.toString(),
    organizationId: ORG.toString(),
    teamId: teamId === null ? null : teamId.toString(),
    role,
  };
}

describe('retrieval RBAC (AI-H-001)', () => {
  it('admin sees every visibility in the organization', async () => {
    const chunks = await retrieveChunks(auth('admin', null), 'anything', {}, 20);
    const titles = chunks.map((c) => c.documentTitle).sort();
    expect(titles).toEqual(
      ['org-wide', 'team-A doc', 'team-B doc', 'project-A doc', 'project-B doc'].sort(),
    );
  });

  it('leader sees org + own-team + own-team projects, never other teams', async () => {
    const chunks = await retrieveChunks(auth('leader', TEAM_A), 'anything', {}, 20);
    const titles = chunks.map((c) => c.documentTitle).sort();
    expect(titles).toEqual(['org-wide', 'team-A doc', 'project-A doc'].sort());
    expect(titles).not.toContain('team-B doc');
    expect(titles).not.toContain('project-B doc');
  });

  it('member sees org + own-team + only their own projects', async () => {
    const chunks = await retrieveChunks(auth('member', TEAM_A, MEMBER_A), 'anything', {}, 20);
    const titles = chunks.map((c) => c.documentTitle).sort();
    expect(titles).toEqual(['org-wide', 'team-A doc', 'project-A doc'].sort());
    expect(titles).not.toContain('team-B doc');
    expect(titles).not.toContain('project-B doc');
  });

  it('member in a different team sees only org-wide', async () => {
    const chunks = await retrieveChunks(auth('member', TEAM_B), 'anything', {}, 20);
    const titles = chunks.map((c) => c.documentTitle).sort();
    expect(titles).toEqual(['org-wide', 'team-B doc'].sort());
    expect(titles).not.toContain('project-A doc');
    expect(titles).not.toContain('project-B doc');
  });
});
