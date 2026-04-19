// org-agent — react-query hooks for teams admin.
import type {
  CreateTeamRequestDto,
  TeamResponseDto,
  UpdateTeamRequestDto,
} from '@orgflow/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';

export function useTeams(): ReturnType<typeof useQuery<TeamResponseDto[]>> {
  return useQuery<TeamResponseDto[]>({
    queryKey: QUERY_KEYS.teams,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{ success: true; data: { teams: TeamResponseDto[] } }>(
        '/teams',
        { signal },
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.teams });
      toast.success('Team created');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.teams });
      toast.success('Team updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.teams });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      toast.success('Team deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}
