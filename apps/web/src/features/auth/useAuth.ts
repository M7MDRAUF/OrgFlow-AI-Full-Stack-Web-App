// useAuth hook — react-query wrappers for login + session + invite completion.
// Owned by auth-agent.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CompleteInviteRequestDto,
  CompleteInviteResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  MeResponseDto,
  UserResponseDto,
} from '@orgflow/shared-types';
import { apiClient } from '../../lib/api-client.js';
import { authStorage, type AuthProfile } from './storage.js';

const ME_QUERY_KEY = ['auth', 'me'] as const;

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
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: MeResponseDto }>('/auth/me');
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
      qc.setQueryData<MeResponseDto>(ME_QUERY_KEY, { user: data.user });
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
      qc.setQueryData<MeResponseDto>(ME_QUERY_KEY, { user: data.user });
    },
  });
}

export function useLogout(): () => void {
  const qc = useQueryClient();
  return () => {
    authStorage.clear();
    qc.removeQueries({ queryKey: ME_QUERY_KEY });
  };
}
