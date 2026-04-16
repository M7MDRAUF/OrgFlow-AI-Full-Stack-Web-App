// Users service — organization-scoped, role-gated in controllers. Owned by org-agent.
import { Types, type FilterQuery } from 'mongoose';
import type { UserResponseDto } from '@orgflow/shared-types';
import { UserModel, type UserDoc, type UserHydrated } from './user.model.js';
import { TeamModel } from '../teams/team.model.js';
import { errors } from '../../utils/errors.js';
import { toUserResponseDto } from '../auth/auth.service.js';
import type { AuthContext } from '../../middleware/auth-context.js';
import type { ListUsersQuery, UpdateUserInput, UpdateUserStatusInput } from './user.schema.js';

function assertObjectId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw errors.validation(`Invalid ${label}`);
  }
  return new Types.ObjectId(id);
}

async function findScopedUser(auth: AuthContext, id: string): Promise<UserHydrated> {
  const objId = assertObjectId(id, 'userId');
  const filter: FilterQuery<UserDoc> = {
    _id: objId,
    organizationId: new Types.ObjectId(auth.organizationId),
  };
  if (auth.role !== 'admin') {
    if (auth.role === 'leader') {
      if (auth.teamId === null) throw errors.forbidden();
      filter.teamId = new Types.ObjectId(auth.teamId);
    } else if (auth.userId !== id) {
      throw errors.forbidden();
    }
  }
  const user = await UserModel.findOne(filter);
  if (!user) throw errors.notFound('User not found');
  return user;
}

export async function listUsers(
  auth: AuthContext,
  query: ListUsersQuery,
): Promise<UserResponseDto[]> {
  const filter: FilterQuery<UserDoc> = {
    organizationId: new Types.ObjectId(auth.organizationId),
  };
  if (auth.role === 'leader') {
    if (auth.teamId === null) return [];
    filter.teamId = new Types.ObjectId(auth.teamId);
  } else if (auth.role === 'member') {
    if (auth.teamId === null) return [];
    filter.teamId = new Types.ObjectId(auth.teamId);
  } else if (query.teamId !== undefined) {
    filter.teamId = assertObjectId(query.teamId, 'teamId');
  }
  if (query.role !== undefined) filter.role = query.role;
  if (query.status !== undefined) filter.status = query.status;

  const users = await UserModel.find(filter).sort({ createdAt: -1 });
  return users.map(toUserResponseDto);
}

export async function getUser(auth: AuthContext, id: string): Promise<UserResponseDto> {
  const user = await findScopedUser(auth, id);
  return toUserResponseDto(user);
}

export async function updateUser(
  auth: AuthContext,
  id: string,
  input: UpdateUserInput,
): Promise<UserResponseDto> {
  const user = await findScopedUser(auth, id);
  const isSelf = auth.userId === id;

  if (input.name !== undefined) user.displayName = input.name;
  if (input.themePreference !== undefined) user.themePreference = input.themePreference;

  if (input.role !== undefined) {
    if (auth.role !== 'admin') throw errors.forbidden('Only admins can change roles');
    user.role = input.role;
  }

  if (input.teamId !== undefined) {
    if (auth.role !== 'admin') throw errors.forbidden('Only admins can change team assignment');
    if (input.teamId === null) {
      user.teamId = null;
    } else {
      const teamObjId = assertObjectId(input.teamId, 'teamId');
      const team = await TeamModel.findOne({
        _id: teamObjId,
        organizationId: new Types.ObjectId(auth.organizationId),
      });
      if (!team) throw errors.notFound('Team not found');
      user.teamId = teamObjId;
    }
  }

  // Members may only update their own themePreference/name.
  if (!isSelf && auth.role === 'member') {
    throw errors.forbidden();
  }

  await user.save();
  return toUserResponseDto(user);
}

export async function updateUserStatus(
  auth: AuthContext,
  id: string,
  input: UpdateUserStatusInput,
): Promise<UserResponseDto> {
  if (auth.role !== 'admin') throw errors.forbidden('Only admins can change user status');
  const user = await findScopedUser(auth, id);
  user.status = input.status;
  await user.save();
  return toUserResponseDto(user);
}
