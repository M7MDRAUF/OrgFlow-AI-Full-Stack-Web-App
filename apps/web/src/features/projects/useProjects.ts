// projects-agent — react-query hooks for projects.
import type {
  CreateProjectRequestDto,
  ProjectResponseDto,
  ProjectStatus,
  UpdateProjectRequestDto,
} from '@orgflow/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';

export function useProject(
  id: string | undefined,
): ReturnType<typeof useQuery<ProjectResponseDto | null>> {
  return useQuery<ProjectResponseDto | null>({
    queryKey: [...QUERY_KEYS.projects, id],
    queryFn: async ({ signal }) => {
      if (!id) return null;
      const res = await apiClient.get<{
        success: true;
        data: { project: ProjectResponseDto };
      }>(`/projects/${id}`, { signal });
      return res.data.data.project;
    },
    enabled: id !== undefined,
  });
}

export interface ListProjectsFilters {
  teamId?: string;
  status?: ProjectStatus;
  search?: string;
}

export function useProjects(
  filters?: ListProjectsFilters,
): ReturnType<typeof useQuery<ProjectResponseDto[]>> {
  return useQuery<ProjectResponseDto[]>({
    queryKey: [...QUERY_KEYS.projects, filters ?? {}],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{
        success: true;
        data: { projects: ProjectResponseDto[] };
      }>('/projects', { params: filters, signal });
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      toast.success('Project created');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      toast.success('Project updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      toast.success('Project deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}
