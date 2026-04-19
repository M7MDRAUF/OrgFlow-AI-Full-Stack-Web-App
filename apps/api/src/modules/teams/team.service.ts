// Teams service. Admin CRUD; leaders/members can list teams in their org.
import type { TeamResponseDto } from '@orgflow/shared-types';
import { Types } from 'mongoose';
import type { AuthContext } from '../../middleware/auth-context.js';
import { logAudit } from '../../utils/audit.js';
import { errors } from '../../utils/errors.js';
import { toSkipLimit, type Pagination } from '../../utils/pagination.js';
import { ProjectModel } from '../projects/project.model.js';
import { UserModel } from '../users/user.model.js';
import { TeamModel, type TeamHydrated } from './team.model.js';
import type { CreateTeamInput, UpdateTeamInput } from './team.schema.js';

function assertObjectId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw errors.validation(`Invalid ${label}`);
  }
  return new Types.ObjectId(id);
}

function toTeamResponseDto(team: TeamHydrated, memberCount: number): TeamResponseDto {
  return {
    id: team.id as string,
    organizationId: team.organizationId.toString(),
    name: team.name,
    description: team.description,
    leaderId: team.leaderId ? team.leaderId.toString() : null,
    memberCount,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

async function validateLeader(
  organizationId: Types.ObjectId,
  leaderId: string,
): Promise<Types.ObjectId> {
  const leaderObjId = assertObjectId(leaderId, 'leaderId');
  const leader = await UserModel.findOne({ _id: leaderObjId, organizationId });
  if (!leader) throw errors.notFound('Leader user not found');
  return leaderObjId;
}

// RBAC design decision: All roles (admin, leader, member) may list teams within
// their organization. Members need team context for UI selectors (e.g. project
// and task forms). Data is org-scoped so no cross-org leak occurs.
export async function listTeams(
  auth: AuthContext,
  pagination: Pagination,
): Promise<{ items: TeamResponseDto[]; total: number }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const filter = { organizationId: orgId };
  const { skip, limit } = toSkipLimit(pagination);
  const [teams, total] = await Promise.all([
    TeamModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    TeamModel.countDocuments(filter),
  ]);
  // BUG-009: Batch member counts in a single aggregation instead of N+1 queries.
  const teamIds = teams.map((t) => t._id);
  const countAgg = await UserModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { teamId: { $in: teamIds } } },
    { $group: { _id: '$teamId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(countAgg.map((c) => [c._id.toString(), c.count]));
  const items = teams.map((t) => toTeamResponseDto(t, countMap.get(t._id.toString()) ?? 0));
  return { items, total };
}

export async function getTeam(auth: AuthContext, id: string): Promise<TeamResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const team = await TeamModel.findOne({
    _id: assertObjectId(id, 'teamId'),
    organizationId: orgId,
  });
  if (!team) throw errors.notFound('Team not found');
  const memberCount = await UserModel.countDocuments({ teamId: team._id });
  return toTeamResponseDto(team, memberCount);
}

export async function createTeam(
  auth: AuthContext,
  input: CreateTeamInput,
): Promise<TeamResponseDto> {
  if (auth.role !== 'admin') throw errors.forbidden('Only admins can create teams');
  const orgId = new Types.ObjectId(auth.organizationId);
  const existing = await TeamModel.findOne({ organizationId: orgId, name: input.name });
  if (existing) throw errors.conflict('Team with this name already exists');

  let leaderObjId: Types.ObjectId | null = null;
  if (input.leaderId !== undefined) {
    leaderObjId = await validateLeader(orgId, input.leaderId);
  }
  const team = await TeamModel.create({
    organizationId: orgId,
    name: input.name,
    description: input.description ?? null,
    leaderId: leaderObjId,
  });
  logAudit(auth, {
    action: 'team.create',
    resourceId: team.id as string,
    meta: { teamId: team.id as string, teamName: team.name },
  });
  const memberCount = await UserModel.countDocuments({ teamId: team._id });
  return toTeamResponseDto(team, memberCount);
}

export async function updateTeam(
  auth: AuthContext,
  id: string,
  input: UpdateTeamInput,
): Promise<TeamResponseDto> {
  if (auth.role !== 'admin') throw errors.forbidden('Only admins can update teams');
  const orgId = new Types.ObjectId(auth.organizationId);
  const team = await TeamModel.findOne({
    _id: assertObjectId(id, 'teamId'),
    organizationId: orgId,
  });
  if (!team) throw errors.notFound('Team not found');

  if (input.name !== undefined) team.name = input.name;
  if (input.description !== undefined) team.description = input.description;
  if (input.leaderId !== undefined) {
    if (input.leaderId === null) {
      team.leaderId = null;
    } else {
      team.leaderId = await validateLeader(orgId, input.leaderId);
    }
  }
  await team.save();
  logAudit(auth, {
    action: 'team.update',
    resourceId: team.id as string,
    meta: { teamId: team.id as string },
  });
  const memberCount = await UserModel.countDocuments({ teamId: team._id });
  return toTeamResponseDto(team, memberCount);
}

export async function deleteTeam(auth: AuthContext, id: string): Promise<void> {
  if (auth.role !== 'admin') throw errors.forbidden('Only admins can delete teams');
  const orgId = new Types.ObjectId(auth.organizationId);
  const teamObjId = assertObjectId(id, 'teamId');

  const team = await TeamModel.findOne({ _id: teamObjId, organizationId: orgId });
  if (!team) throw errors.notFound('Team not found');

  // H-003: reject deletion if the team still has members or projects.
  const [hasMembers, hasProjects] = await Promise.all([
    UserModel.exists({ teamId: teamObjId }),
    ProjectModel.exists({ teamId: teamObjId, organizationId: orgId }),
  ]);
  if (hasMembers !== null || hasProjects !== null) {
    throw errors.validation(
      'Cannot delete a team that still has members or projects. Reassign them first.',
    );
  }

  await team.deleteOne();
  logAudit(auth, {
    action: 'team.delete',
    resourceId: team.id as string,
    meta: { teamId: team.id as string, teamName: team.name },
  });
}
