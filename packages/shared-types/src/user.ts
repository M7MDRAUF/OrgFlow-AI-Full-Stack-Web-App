import type { UserRole, UserStatus } from './roles.js';

export interface UserResponseDto {
  id: string;
  organizationId: string;
  teamId: string | null;
  role: UserRole;
  status: UserStatus;
  name: string;
  email: string;
  avatarUrl: string | null;
  themePreference: 'light' | 'dark' | 'system';
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Superseded by InviteUserRequestDto — invite flow is used instead of direct creation. */
export interface CreateUserRequestDto {
  name: string;
  email: string;
  role: UserRole;
  teamId?: string;
}

export interface UpdateUserRequestDto {
  name?: string;
  role?: UserRole;
  teamId?: string | null;
  themePreference?: 'light' | 'dark' | 'system';
}

export interface UpdateUserStatusRequestDto {
  status: UserStatus;
}
