// projects-agent — react-query hooks for projects.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProjectRequestDto,
  ProjectResponseDto,
  ProjectStatus,
  UpdateProjectRequestDto,
} from '@orgflow/shared-types';
import { apiClient } from '../../lib/api-client.js';

const PROJECTS_QUERY_KEY = ['projects'] as const;

export interface ListProjectsFilters {
  teamId?: string;
  status?: ProjectStatus;
}

export function useProjects(
  filters?: ListProjectsFilters,
): ReturnType<typeof useQuery<ProjectResponseDto[]>> {
  return useQuery<ProjectResponseDto[]>({
    queryKey: [...PROJECTS_QUERY_KEY, filters ?? {}],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: { projects: ProjectResponseDto[] };
      }>('/projects', { params: filters });
      return res.data.data.projects;
    },
  });
}

export function useCreateProject(): ReturnType<
  typeof useMutation<ProjectResponseDto, Error, CreateProjectRequestDto>
> {
  const qc = useQueryClient();
  return useMutation<ProjectResponseDto, Error, CreateProjectRequestDto>({
    mutationFn: async (input) => {
      const res = await apiClient.post<{ success: true; data: { project: ProjectResponseDto } }>(
        '/projects',
        input,
      );
      return res.data.data.project;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export interface UpdateProjectVars {
  id: string;
  input: UpdateProjectRequestDto;
}

export function useUpdateProject(): ReturnType<
  typeof useMutation<ProjectResponseDto, Error, UpdateProjectVars>
> {
  const qc = useQueryClient();
  return useMutation<ProjectResponseDto, Error, UpdateProjectVars>({
    mutationFn: async ({ id, input }) => {
      const res = await apiClient.patch<{
        success: true;
        data: { project: ProjectResponseDto };
      }>(`/projects/${id}`, input);
      return res.data.data.project;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useDeleteProject(): ReturnType<
  typeof useMutation<{ deleted: true }, Error, string>
> {
  const qc = useQueryClient();
  return useMutation<{ deleted: true }, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/projects/${id}`);
      return { deleted: true };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
