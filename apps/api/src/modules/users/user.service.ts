// Users service — organization-scoped, role-gated in controllers. Owned by org-agent.
import type { UserResponseDto } from '@orgflow/shared-types';
import { Types, type FilterQuery } from 'mongoose';
import type { AuthContext } from '../../middleware/auth-context.js';
import { logAudit } from '../../utils/audit.js';
import { errors } from '../../utils/errors.js';
import { toSkipLimit, type Pagination } from '../../utils/pagination.js';
import { toUserResponseDto } from '../auth/auth.service.js';
import { ProjectModel } from '../projects/project.model.js';
import { TaskModel } from '../tasks/task.model.js';
import { TeamModel } from '../teams/team.model.js';
import { UserModel, type UserDoc, type UserHydrated } from './user.model.js';
import type { ListUsersQuery, UpdateUserInput, UpdateUserStatusInput } from './user.schema.js';

function assertObjectId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw errors.validation(`Invalid ${label}`);
  }
  return new Types.ObjectId(id);
}

/**
 * Build the set of user ids that a member is allowed to "see" in directory-style
 * lookups. Per FR-013/FR-014 (§2.8), a member should only see collaborators they
 * share a project or a task with — not the entire team (BE-H-001).
 */
async function collectMemberVisibleUserIds(
  auth: AuthContext,
  orgId: Types.ObjectId,
  teamId: Types.ObjectId,
): Promise<Types.ObjectId[]> {
  const userObjId = new Types.ObjectId(auth.userId);
  const sharedProjects = await ProjectModel.find({
    organizationId: orgId,
    teamId,
    memberIds: userObjId,
  }).select({ memberIds: 1, createdBy: 1 });

  const sharedTasks = await TaskModel.find({
    organizationId: orgId,
    teamId,
    $or: [{ assignedTo: userObjId }, { createdBy: userObjId }],
  }).select({ assignedTo: 1, createdBy: 1 });

  const visible = new Map<string, Types.ObjectId>();
  const add = (id: Types.ObjectId | null | undefined): void => {
    if (id === null || id === undefined) return;
    const key = id.toString();
    if (!visible.has(key)) visible.set(key, id);
  };

  add(userObjId);
  for (const p of sharedProjects) {
    add(p.createdBy);
    for (const m of p.memberIds) add(m);
  }
  for (const t of sharedTasks) {
    add(t.createdBy);
    add(t.assignedTo);
  }
  return Array.from(visible.values());
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
  pagination: Pagination,
): Promise<{ items: UserResponseDto[]; total: number }> {
  const orgId = new Types.ObjectId(auth.organizationId);
  const filter: FilterQuery<UserDoc> = { organizationId: orgId };

  if (auth.role === 'leader') {
    if (auth.teamId === null) return { items: [], total: 0 };
    filter.teamId = new Types.ObjectId(auth.teamId);
  } else if (auth.role === 'member') {
    if (auth.teamId === null) return { items: [], total: 0 };
    const teamObjId = new Types.ObjectId(auth.teamId);
    const visibleIds = await collectMemberVisibleUserIds(auth, orgId, teamObjId);
    filter.teamId = teamObjId;
    filter._id = { $in: visibleIds };
  } else if (query.teamId !== undefined) {
    filter.teamId = assertObjectId(query.teamId, 'teamId');
  }
  if (query.role !== undefined) filter.role = query.role;
  if (query.status !== undefined) filter.status = query.status;

  const { skip, limit } = toSkipLimit(pagination);
  const [users, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    UserModel.countDocuments(filter),
  ]);
  return { items: users.map(toUserResponseDto), total };
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
    const previousRole = user.role;
    user.role = input.role;
    // F6: role changes are privileged and must leave an audit trail.
    logAudit(auth, {
      action: 'user.role.change',
      resourceId: id,
      meta: { from: previousRole, to: input.role },
    });
  }

  if (input.teamId !== undefined) {
    if (auth.role !== 'admin') throw errors.forbidden('Only admins can change team assignment');
    const previousTeamId = user.teamId?.toString() ?? null;
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
    logAudit(auth, {
      action: 'user.team.change',
      resourceId: id,
      meta: { from: previousTeamId, to: input.teamId },
    });
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
  const previousStatus = user.status;
  user.status = input.status;
  await user.save();
  logAudit(auth, {
    action: 'user.status.change',
    resourceId: id,
    meta: { from: previousStatus, to: input.status },
  });
  return toUserResponseDto(user);
}
