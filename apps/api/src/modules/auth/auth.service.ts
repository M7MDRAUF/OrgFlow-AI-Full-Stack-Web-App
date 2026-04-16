// Auth service — business logic for login, /me, invite, complete-invite.
// Owned by auth-agent (AGENTS.md §4.5).
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import type {
  CompleteInviteResponseDto,
  InviteUserResponseDto,
  LoginResponseDto,
  MeResponseDto,
  UserResponseDto,
} from '@orgflow/shared-types';
import { UserModel, type UserHydrated } from '../users/user.model.js';
import { TeamModel } from '../teams/team.model.js';
import { signAuthToken } from '../../middleware/auth.middleware.js';
import { errors } from '../../utils/errors.js';
import type { CompleteInviteInput, InviteInput, LoginInput } from './auth.schema.js';

const INVITE_TOKEN_BYTES = 32;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function toUserResponseDto(user: UserHydrated): UserResponseDto {
  return {
    id: user.id as string,
    organizationId: user.organizationId.toString(),
    teamId: user.teamId ? user.teamId.toString() : null,
    role: user.role,
    status: user.status,
    name: user.displayName,
    email: user.email,
    avatarUrl: null,
    themePreference: user.themePreference,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function issueToken(user: UserHydrated): string {
  return signAuthToken({
    sub: user.id as string,
    organizationId: user.organizationId.toString(),
    teamId: user.teamId ? user.teamId.toString() : null,
    role: user.role,
  });
}

export async function login(input: LoginInput): Promise<LoginResponseDto> {
  const user = await UserModel.findOne({ email: input.email });
  if (user?.status !== 'active' || user.passwordHash === null) {
    throw errors.unauthenticated('Invalid credentials');
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw errors.unauthenticated('Invalid credentials');
  }
  return { token: issueToken(user), user: toUserResponseDto(user) };
}

export async function getCurrentUser(userId: string): Promise<MeResponseDto> {
  if (!Types.ObjectId.isValid(userId)) {
    throw errors.unauthenticated();
  }
  const user = await UserModel.findById(userId);
  if (!user || user.status === 'disabled') {
    throw errors.unauthenticated();
  }
  return { user: toUserResponseDto(user) };
}

export async function inviteUser(
  organizationId: string,
  input: InviteInput,
): Promise<InviteUserResponseDto> {
  if (!Types.ObjectId.isValid(organizationId)) {
    throw errors.validation('Invalid organization');
  }
  const orgId = new Types.ObjectId(organizationId);

  let teamObjectId: Types.ObjectId | null = null;
  if (input.teamId !== undefined) {
    if (!Types.ObjectId.isValid(input.teamId)) {
      throw errors.validation('Invalid teamId');
    }
    const team = await TeamModel.findOne({
      _id: new Types.ObjectId(input.teamId),
      organizationId: orgId,
    });
    if (!team) {
      throw errors.notFound('Team not found in organization');
    }
    teamObjectId = team._id;
  }

  const existing = await UserModel.findOne({ organizationId: orgId, email: input.email });
  if (existing) {
    throw errors.conflict('User already exists with this email');
  }

  const inviteToken = randomBytes(INVITE_TOKEN_BYTES).toString('hex');
  const tokenHash = hashInviteToken(inviteToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const user = await UserModel.create({
    organizationId: orgId,
    teamId: teamObjectId,
    email: input.email,
    displayName: input.name,
    role: input.role,
    status: 'pending',
    passwordHash: null,
    inviteTokenHash: tokenHash,
    inviteExpiresAt: expiresAt,
  });

  return { user: toUserResponseDto(user), inviteToken };
}

export async function completeInvite(
  input: CompleteInviteInput,
): Promise<CompleteInviteResponseDto> {
  const tokenHash = hashInviteToken(input.token);
  const user = await UserModel.findOne({ inviteTokenHash: tokenHash });
  if (
    user?.status !== 'pending' ||
    user.inviteExpiresAt === null ||
    user.inviteExpiresAt.getTime() < Date.now()
  ) {
    throw errors.unauthenticated('Invite token invalid or expired');
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  user.passwordHash = passwordHash;
  user.status = 'active';
  user.inviteTokenHash = null;
  user.inviteExpiresAt = null;
  await user.save();
  return { token: issueToken(user), user: toUserResponseDto(user) };
}
