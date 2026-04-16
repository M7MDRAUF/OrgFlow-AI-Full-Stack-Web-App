// org-agent — react-query hooks for teams admin.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTeamRequestDto,
  TeamResponseDto,
  UpdateTeamRequestDto,
} from '@orgflow/shared-types';
import { apiClient } from '../../lib/api-client.js';

const TEAMS_QUERY_KEY = ['teams'] as const;

export function useTeams(): ReturnType<typeof useQuery<TeamResponseDto[]>> {
  return useQuery<TeamResponseDto[]>({
    queryKey: TEAMS_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: { teams: TeamResponseDto[] } }>(
        '/teams',
      );
      return res.data.data.teams;
    },
  });
}

export function useCreateTeam(): ReturnType<
  typeof useMutation<TeamResponseDto, Error, CreateTeamRequestDto>
> {
  const qc = useQueryClient();
  return useMutation<TeamResponseDto, Error, CreateTeamRequestDto>({
    mutationFn: async (input) => {
      const res = await apiClient.post<{ success: true; data: { team: TeamResponseDto } }>(
        '/teams',
        input,
      );
      return res.data.data.team;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
    },
  });
}

export interface UpdateTeamVars {
  id: string;
  input: UpdateTeamRequestDto;
}

export function useUpdateTeam(): ReturnType<
  typeof useMutation<TeamResponseDto, Error, UpdateTeamVars>
> {
  const qc = useQueryClient();
  return useMutation<TeamResponseDto, Error, UpdateTeamVars>({
    mutationFn: async ({ id, input }) => {
      const res = await apiClient.patch<{ success: true; data: { team: TeamResponseDto } }>(
        `/teams/${id}`,
        input,
      );
      return res.data.data.team;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
    },
  });
}

export function useDeleteTeam(): ReturnType<typeof useMutation<{ deleted: true }, Error, string>> {
  const qc = useQueryClient();
  return useMutation<{ deleted: true }, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/teams/${id}`);
      return { deleted: true };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
