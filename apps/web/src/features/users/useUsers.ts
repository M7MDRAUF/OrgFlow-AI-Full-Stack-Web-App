// org-agent — react-query hooks for users admin.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  UpdateUserRequestDto,
  UpdateUserStatusRequestDto,
  UserResponseDto,
} from '@orgflow/shared-types';
import { apiClient } from '../../lib/api-client.js';

const USERS_QUERY_KEY = ['users'] as const;

export interface ListUsersFilters {
  teamId?: string;
  role?: 'admin' | 'leader' | 'member';
  status?: 'pending' | 'active' | 'disabled';
}

export function useUsers(
  filters?: ListUsersFilters,
): ReturnType<typeof useQuery<UserResponseDto[]>> {
  return useQuery<UserResponseDto[]>({
    queryKey: [...USERS_QUERY_KEY, filters ?? {}],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: { users: UserResponseDto[] } }>(
        '/users',
        { params: filters },
      );
      return res.data.data.users;
    },
  });
}

export interface UpdateUserVars {
  id: string;
  input: UpdateUserRequestDto;
}

export function useUpdateUser(): ReturnType<
  typeof useMutation<UserResponseDto, Error, UpdateUserVars>
> {
  const qc = useQueryClient();
  return useMutation<UserResponseDto, Error, UpdateUserVars>({
    mutationFn: async ({ id, input }) => {
      const res = await apiClient.patch<{ success: true; data: { user: UserResponseDto } }>(
        `/users/${id}`,
        input,
      );
      return res.data.data.user;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export interface UpdateUserStatusVars {
  id: string;
  input: UpdateUserStatusRequestDto;
}

export function useUpdateUserStatus(): ReturnType<
  typeof useMutation<UserResponseDto, Error, UpdateUserStatusVars>
> {
  const qc = useQueryClient();
  return useMutation<UserResponseDto, Error, UpdateUserStatusVars>({
    mutationFn: async ({ id, input }) => {
      const res = await apiClient.patch<{ success: true; data: { user: UserResponseDto } }>(
        `/users/${id}/status`,
        input,
      );
      return res.data.data.user;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export interface InviteUserVars {
  name: string;
  email: string;
  role: 'admin' | 'leader' | 'member';
  teamId?: string;
}

export function useInviteUser(): ReturnType<
  typeof useMutation<{ user: UserResponseDto; inviteToken: string }, Error, InviteUserVars>
> {
  const qc = useQueryClient();
  return useMutation<{ user: UserResponseDto; inviteToken: string }, Error, InviteUserVars>({
    mutationFn: async (input) => {
      const res = await apiClient.post<{
        success: true;
        data: { user: UserResponseDto; inviteToken: string };
      }>('/auth/invite', input);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}
