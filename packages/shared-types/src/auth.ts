// Auth DTOs — owned by contracts-agent. Consumed by auth-agent (api + web).
import type { UserResponseDto } from './user.js';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  token: string;
  user: UserResponseDto;
}

export interface MeResponseDto {
  user: UserResponseDto;
}

export interface InviteUserRequestDto {
  email: string;
  name: string;
  role: 'admin' | 'leader' | 'member';
  teamId?: string;
}

export interface InviteUserResponseDto {
  user: UserResponseDto;
  inviteToken: string;
}

export interface CompleteInviteRequestDto {
  token: string;
  password: string;
}

export interface CompleteInviteResponseDto {
  token: string;
  user: UserResponseDto;
}
