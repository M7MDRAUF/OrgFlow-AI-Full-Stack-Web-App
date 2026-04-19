// Projects service. Scope by org + team. Admin unrestricted within org;
// leaders limited to their team; members see projects they belong to.
import type { ProjectResponseDto } from '@orgflow/shared-types';
import { Types, type FilterQuery } from 'mongoose';
import type { AuthContext } from '../../middleware/auth-context.js';
import { logAudit } from '../../utils/audit.js';
import { errors } from '../../utils/errors.js';
import { toSkipLimit, type Pagination } from '../../utils/pagination.js';
import { TaskCommentModel, TaskModel } from '../tasks/task.model.js';
import { TeamModel } from '../teams/team.model.js';
import { UserModel } from '../users/user.model.js';
import { ProjectModel, type ProjectDoc, type ProjectHydrated } from './project.model.js';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from './project.schema.js';

function assertObjectId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw errors.validation(`Invalid ${label}`);
  return new Types.ObjectId(id);
}

function toDto(doc: ProjectHydrated): ProjectResponseDto {
  return {
    id: doc.id as string,
    organizationId: doc.organizationId.toString(),
    teamId: doc.teamId.toString(),
    title: doc.title,
    description: doc.description,
    createdBy: doc.createdBy.toString(),
    memberIds: doc.memberIds.map((m) => m.toString()),
    status: doc.status,
    startDate: doc.startDate !== null ? doc.startDate.toISOString() : null,
    dueDate: doc.dueDate !== null ? doc.dueDate.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function assertTeamInOrg(
  organizationId: Types.ObjectId,
  teamId: Types.ObjectId,
): Promise<void> {
  const team = await TeamModel.findOne({ _id: teamId, organizationId });
  if (!team) throw errors.notFound('Team not found');
}

async function assertMembersInTeam(
  organizationId: Types.ObjectId,
  teamId: Types.ObjectId,
  memberIds: Types.ObjectId[],
): Promise<void> {
  if (memberIds.length === 0) return;
  // Project members must live in the same team the project belongs to
  // (BE-H-002). Without this check, a leader could "add" a user from a
  // different team to a project — violating team scope safety (§2.8 FR-005).
  const count = await UserModel.countDocuments({
    _id: { $in: memberIds },
    organizationId,
    teamId,
  });
  if (count !== memberIds.length) {
    throw errors.validation('One or more member ids do not belong to this organization and team');
  }
}

function canManageTeam(auth: AuthContext, teamId: Types.ObjectId): boolean {
  if (auth.role === 'admin') return true;
  if (auth.role === 'leader') {
    return auth.teamId !== null && auth.teamId === teamId.toString();
  }
  return false;
}

export async function listProjects(
  auth: AuthContext,
  query: ListProjectsQuery,
  pagination: Pagination,
): Promise<{ items: ProjectResponseDto[]; total: number }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const filter: FilterQuery<ProjectDoc> = { organizationId: orgId };

  if (auth.role === 'admin') {
    if (query.teamId !== undefined) filter.teamId = assertObjectId(query.teamId, 'teamId');
  } else if (auth.role === 'leader') {
    if (auth.teamId === null) return { items: [], total: 0 };
    filter.teamId = new Types.ObjectId(auth.teamId);
  } else {
    // member: their team projects where they are a member, or team matches
    if (auth.teamId === null) return { items: [], total: 0 };
    filter.teamId = new Types.ObjectId(auth.teamId);
    filter.memberIds = new Types.ObjectId(auth.userId);
  }

  if (query.status !== undefined) filter.status = query.status;
  if (query.search !== undefined && query.search.trim() !== '') {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escaped, $options: 'i' };
  }

  const { skip, limit } = toSkipLimit(pagination);
  const [docs, total] = await Promise.all([
    ProjectModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ProjectModel.countDocuments(filter),
  ]);
  return { items: docs.map(toDto), total };
}

export async function getProject(auth: AuthContext, id: string): Promise<ProjectResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const doc = await ProjectModel.findOne({
    _id: assertObjectId(id, 'projectId'),
    organizationId: orgId,
  });
  if (!doc) throw errors.notFound('Project not found');

  if (auth.role === 'leader' && (auth.teamId === null || auth.teamId !== doc.teamId.toString())) {
    throw errors.forbidden('Project is outside your team');
  }
  if (auth.role === 'member') {
    const belongs =
      auth.teamId !== null &&
      auth.teamId === doc.teamId.toString() &&
      doc.memberIds.some((m) => m.toString() === auth.userId);
    if (!belongs) throw errors.forbidden('You are not a member of this project');
  }
  return toDto(doc);
}

export async function createProject(
  auth: AuthContext,
  input: CreateProjectInput,
): Promise<ProjectResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const teamId = assertObjectId(input.teamId, 'teamId');
  if (!canManageTeam(auth, teamId)) {
    throw errors.forbidden('Only admins or the team leader can create projects for this team');
  }
  await assertTeamInOrg(orgId, teamId);

  const memberIds = (input.memberIds ?? []).map((m) => assertObjectId(m, 'memberId'));
  await assertMembersInTeam(orgId, teamId, memberIds);

  const doc = await ProjectModel.create({
    organizationId: orgId,
    teamId,
    title: input.title,
    description: input.description ?? null,
    createdBy: new Types.ObjectId(auth.userId),
    memberIds,
    status: input.status ?? 'planned',
    startDate: input.startDate !== undefined ? new Date(input.startDate) : null,
    dueDate: input.dueDate !== undefined ? new Date(input.dueDate) : null,
  });
  logAudit(auth, {
    action: 'project.create',
    resourceId: doc.id as string,
    meta: { projectId: doc.id as string, title: doc.title },
  });
  return toDto(doc);
}

export async function updateProject(
  auth: AuthContext,
  id: string,
  input: UpdateProjectInput,
): Promise<ProjectResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const doc = await ProjectModel.findOne({
    _id: assertObjectId(id, 'projectId'),
    organizationId: orgId,
  });
  if (!doc) throw errors.notFound('Project not found');
  if (!canManageTeam(auth, doc.teamId)) {
    throw errors.forbidden('Only admins or the team leader can update this project');
  }

  if (input.title !== undefined) doc.title = input.title;
  if (input.description !== undefined) doc.description = input.description;
  if (input.status !== undefined) doc.status = input.status;
  if (input.startDate !== undefined) {
    doc.startDate = input.startDate === null ? null : new Date(input.startDate);
  }
  if (input.dueDate !== undefined) {
    doc.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
  }
  if (input.memberIds !== undefined) {
    const memberIds = input.memberIds.map((m) => assertObjectId(m, 'memberId'));
    await assertMembersInTeam(orgId, doc.teamId, memberIds);
    doc.memberIds = memberIds;
  }
  await doc.save();
  logAudit(auth, {
    action: 'project.update',
    resourceId: doc.id as string,
    meta: { projectId: doc.id as string },
  });
  return toDto(doc);
}

export async function deleteProject(auth: AuthContext, id: string): Promise<void> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const doc = await ProjectModel.findOne({
    _id: assertObjectId(id, 'projectId'),
    organizationId: orgId,
  });
  if (!doc) throw errors.notFound('Project not found');
  if (auth.role !== 'admin' && !canManageTeam(auth, doc.teamId)) {
    throw errors.forbidden('Only admins or the team leader can delete this project');
  }
  // BUG-001: Cascade-delete tasks and comments belonging to this project
  const projectOid = doc._id;
  const taskIds = await TaskModel.find({ projectId: projectOid }).distinct('_id');
  if (taskIds.length > 0) {
    await TaskCommentModel.deleteMany({ taskId: { $in: taskIds } });
  }
  await TaskModel.deleteMany({ projectId: projectOid });
  await doc.deleteOne();
  logAudit(auth, {
    action: 'project.delete',
    resourceId: doc.id as string,
    meta: { projectId: doc.id as string, title: doc.title },
  });
}
