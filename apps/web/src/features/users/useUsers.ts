// org-agent — react-query hooks for users admin.
import type {
  InviteUserRequestDto,
  InviteUserResponseDto,
  UpdateUserRequestDto,
  UpdateUserStatusRequestDto,
  UserResponseDto,
} from '@orgflow/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';

export interface ListUsersFilters {
  teamId?: string;
  role?: 'admin' | 'leader' | 'member';
  status?: 'pending' | 'active' | 'disabled';
}

export function useUsers(
  filters?: ListUsersFilters,
): ReturnType<typeof useQuery<UserResponseDto[]>> {
  return useQuery<UserResponseDto[]>({
    queryKey: [...QUERY_KEYS.users, filters ?? {}],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{ success: true; data: { users: UserResponseDto[] } }>(
        '/users',
        { params: filters, signal },
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      toast.success('User updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      toast.success('User status updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}

export function useInviteUser(): ReturnType<
  typeof useMutation<InviteUserResponseDto, Error, InviteUserRequestDto>
> {
  const qc = useQueryClient();
  return useMutation<InviteUserResponseDto, Error, InviteUserRequestDto>({
    mutationFn: async (input) => {
      const res = await apiClient.post<{
        success: true;
        data: { user: UserResponseDto; inviteToken: string };
      }>('/auth/invite', input);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      toast.success('Invitation sent');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}
