// useAuth hook — react-query wrappers for login + session + invite completion.
// Owned by auth-agent.
import type {
  CompleteInviteRequestDto,
  CompleteInviteResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  MeResponseDto,
  UserResponseDto,
} from '@orgflow/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';
import { authStorage, type AuthProfile } from './storage.js';

function toProfile(user: UserResponseDto): AuthProfile {
  return {
    userId: user.id,
    organizationId: user.organizationId,
    teamId: user.teamId,
    role: user.role,
    displayName: user.name,
    email: user.email,
  };
}

export function useMe(): ReturnType<typeof useQuery<MeResponseDto>> {
  return useQuery<MeResponseDto>({
    queryKey: QUERY_KEYS.me,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{ success: true; data: MeResponseDto }>('/auth/me', {
        signal,
      });
      return res.data.data;
    },
    enabled: authStorage.getToken() !== null,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin(): ReturnType<
  typeof useMutation<LoginResponseDto, Error, LoginRequestDto>
> {
  const qc = useQueryClient();
  return useMutation<LoginResponseDto, Error, LoginRequestDto>({
    mutationFn: async (input) => {
      const res = await apiClient.post<{ success: true; data: LoginResponseDto }>(
        '/auth/login',
        input,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      authStorage.set(data.token, toProfile(data.user));
      qc.setQueryData<MeResponseDto>(QUERY_KEYS.me, { user: data.user });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Login failed');
    },
  });
}

export function useCompleteInvite(): ReturnType<
  typeof useMutation<CompleteInviteResponseDto, Error, CompleteInviteRequestDto>
> {
  const qc = useQueryClient();
  return useMutation<CompleteInviteResponseDto, Error, CompleteInviteRequestDto>({
    mutationFn: async (input) => {
      const res = await apiClient.post<{ success: true; data: CompleteInviteResponseDto }>(
        '/auth/complete-invite',
        input,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      authStorage.set(data.token, toProfile(data.user));
      qc.setQueryData<MeResponseDto>(QUERY_KEYS.me, { user: data.user });
      toast.success('Account setup complete');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}

export function useLogout(): () => Promise<void> {
  const qc = useQueryClient();
  return async () => {
    // H-019: cancel any in-flight queries before clearing the cache so they
    // cannot write post-logout data back into a new session. Remove the
    // Authorization header from the shared axios instance so requests made
    // before the redirect completes are not still signing with the old token.
    await qc.cancelQueries();
    qc.clear();
    authStorage.clear();
    delete apiClient.defaults.headers.common.Authorization;
    toast.success('Logged out');
  };
}
