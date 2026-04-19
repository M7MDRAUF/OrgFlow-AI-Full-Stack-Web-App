// Seed script — bootstraps an organization with admin/leader/member users,
// a team, a sample project, and a few tasks. Safe to re-run (idempotent by
// email + organization slug). Run via: npm run seed -w @orgflow/api
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import mongoose from 'mongoose';
import { loadEnv } from '../src/app/env.js';
import { DocumentChunkModel } from '../src/modules/ai/documents/document-chunk.model.js';
import { DocumentModel } from '../src/modules/ai/documents/document.model.js';
import { AnnouncementModel } from '../src/modules/announcements/announcement.model.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import { TaskModel } from '../src/modules/tasks/task.model.js';
import { TeamModel } from '../src/modules/teams/team.model.js';
import { UserModel } from '../src/modules/users/user.model.js';

async function run(): Promise<void> {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);
  console.info('Connected to MongoDB');

  const org =
    (await OrganizationModel.findOne({ slug: 'acme' })) ??
    (await OrganizationModel.create({ name: 'Acme Corp', slug: 'acme' }));

  const passwordHash = await bcrypt.hash('Password123!', 10);

  async function upsertUser(
    email: string,
    displayName: string,
    role: 'admin' | 'leader' | 'member',
    teamId: mongoose.Types.ObjectId | null,
  ): Promise<mongoose.Types.ObjectId> {
    const existing = await UserModel.findOne({ email });
    if (existing) return existing._id;
    const created = await UserModel.create({
      organizationId: org._id,
      teamId,
      email,
      displayName,
      role,
      status: 'active',
      passwordHash,
      inviteTokenHash: null,
      inviteExpiresAt: null,
      themePreference: 'system',
    });
    return created._id;
  }

  const adminId = await upsertUser('admin@acme.test', 'Ada Admin', 'admin', null);

  const team =
    (await TeamModel.findOne({ organizationId: org._id, name: 'Platform' })) ??
    (await TeamModel.create({
      organizationId: org._id,
      name: 'Platform',
      description: 'Platform engineering team',
      leaderId: null,
    }));

  const leaderId = await upsertUser('leader@acme.test', 'Leo Leader', 'leader', team._id);
  const memberId = await upsertUser('member@acme.test', 'Mia Member', 'member', team._id);

  if (team.leaderId === null) {
    team.leaderId = leaderId;
    await team.save();
  }

  const project =
    (await ProjectModel.findOne({
      organizationId: org._id,
      teamId: team._id,
      title: 'Onboarding',
    })) ??
    (await ProjectModel.create({
      organizationId: org._id,
      teamId: team._id,
      title: 'Onboarding',
      description: 'Initial platform onboarding project',
      createdBy: adminId,
      memberIds: [leaderId, memberId],
      status: 'active',
      startDate: new Date(),
      dueDate: null,
    }));

  const taskCount = await TaskModel.countDocuments({ projectId: project._id });
  if (taskCount === 0) {
    await TaskModel.insertMany([
      {
        organizationId: org._id,
        teamId: team._id,
        projectId: project._id,
        title: 'Write onboarding docs',
        description: 'Draft the getting-started guide.',
        assignedTo: memberId,
        createdBy: leaderId,
        status: 'todo',
        priority: 'high',
        dueDate: null,
      },
      {
        organizationId: org._id,
        teamId: team._id,
        projectId: project._id,
        title: 'Review RBAC rules',
        description: 'Audit role boundaries across modules.',
        assignedTo: leaderId,
        createdBy: adminId,
        status: 'in-progress',
        priority: 'medium',
        dueDate: null,
      },
      {
        organizationId: org._id,
        teamId: team._id,
        projectId: project._id,
        title: 'Ship initial dashboard',
        description: 'Deliver v1 dashboard.',
        assignedTo: memberId,
        createdBy: leaderId,
        status: 'done',
        priority: 'low',
        dueDate: null,
      },
    ]);
  }

  // --- Announcements ---
  const announcementCount = await AnnouncementModel.countDocuments({ organizationId: org._id });
  if (announcementCount === 0) {
    await AnnouncementModel.insertMany([
      {
        organizationId: org._id,
        createdBy: adminId,
        targetType: 'organization',
        targetId: org._id,
        title: 'Welcome to OrgFlow',
        body: 'This is the first org-wide announcement. Stay tuned for updates!',
        readBy: [],
      },
      {
        organizationId: org._id,
        createdBy: leaderId,
        targetType: 'team',
        targetId: team._id,
        title: 'Sprint kickoff',
        body: 'Platform team: sprint 1 starts today. Check your assigned tasks.',
        readBy: [],
      },
      {
        organizationId: org._id,
        createdBy: adminId,
        targetType: 'user',
        targetId: memberId,
        title: 'Action required',
        body: 'Please complete your onboarding tasks by end of week.',
        readBy: [],
      },
    ]);
  }

  // --- Sample AI documents ---
  const docCount = await DocumentModel.countDocuments({ organizationId: org._id });
  if (docCount === 0) {
    const sampleText =
      'OrgFlow is a team productivity platform. It supports role-based access, Kanban boards, and AI-powered document search.';
    const sampleDoc = await DocumentModel.create({
      organizationId: org._id,
      teamId: null,
      projectId: null,
      visibility: 'organization',
      title: 'OrgFlow Overview',
      originalFilename: 'orgflow-overview.txt',
      mimeType: 'text/plain',
      uploadedBy: adminId,
      status: 'indexed',
      allowedRoles: [],
      chunkCount: 1,
      rawText: sampleText,
      error: null,
    });
    // Deterministic zero-vector embedding (768 dims) for seed data.
    const zeroEmbedding = new Array<number>(768).fill(0);
    await DocumentChunkModel.create({
      documentId: sampleDoc._id,
      organizationId: org._id,
      teamId: null,
      projectId: null,
      visibility: 'organization',
      allowedRoles: [],
      chunkIndex: 0,
      content: sampleText,
      embedding: zeroEmbedding,
    });
  }

  console.info('Seed complete.');
  console.info('Login credentials (password: Password123!):');
  console.info('  admin@acme.test   (admin)');
  console.info('  leader@acme.test  (leader of Platform)');
  console.info('  member@acme.test  (member of Platform)');

  await mongoose.disconnect();
}

run().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
