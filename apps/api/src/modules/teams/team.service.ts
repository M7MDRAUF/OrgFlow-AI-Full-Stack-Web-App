// Teams service. Admin CRUD; leaders/members can list teams in their org.
import { Types } from 'mongoose';
import type { TeamResponseDto } from '@orgflow/shared-types';
import { TeamModel, type TeamHydrated } from './team.model.js';
import { UserModel } from '../users/user.model.js';
import { errors } from '../../utils/errors.js';
import type { AuthContext } from '../../middleware/auth-context.js';
import type { CreateTeamInput, UpdateTeamInput } from './team.schema.js';

function assertObjectId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw errors.validation(`Invalid ${label}`);
  }
  return new Types.ObjectId(id);
}

async function toTeamResponseDto(team: TeamHydrated): Promise<TeamResponseDto> {
  const memberCount = await UserModel.countDocuments({ teamId: team._id });
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

export async function listTeams(auth: AuthContext): Promise<TeamResponseDto[]> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const teams = await TeamModel.find({ organizationId: orgId }).sort({ name: 1 });
  return Promise.all(teams.map(toTeamResponseDto));
}

export async function getTeam(auth: AuthContext, id: string): Promise<TeamResponseDto> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const team = await TeamModel.findOne({
    _id: assertObjectId(id, 'teamId'),
    organizationId: orgId,
  });
  if (!team) throw errors.notFound('Team not found');
  return toTeamResponseDto(team);
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
  return toTeamResponseDto(team);
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
  return toTeamResponseDto(team);
}

export async function deleteTeam(auth: AuthContext, id: string): Promise<void> {
  if (auth.role !== 'admin') throw errors.forbidden('Only admins can delete teams');
  const orgId = new Types.ObjectId(auth.organizationId);
  const teamObjId = assertObjectId(id, 'teamId');
  const team = await TeamModel.findOneAndDelete({ _id: teamObjId, organizationId: orgId });
  if (!team) throw errors.notFound('Team not found');
  // Detach users from deleted team.
  await UserModel.updateMany({ teamId: teamObjId }, { $set: { teamId: null } });
}
