// tasks-agent — react-query hooks for tasks + comments.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTaskRequestDto,
  TaskCommentResponseDto,
  TaskPriority,
  TaskResponseDto,
  TaskStatus,
  UpdateTaskRequestDto,
} from '@orgflow/shared-types';
import { apiClient } from '../../lib/api-client.js';

const TASKS_QUERY_KEY = ['tasks'] as const;

export interface ListTasksFilters {
  projectId?: string;
  teamId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  mine?: boolean;
}

export function useTasks(
  filters?: ListTasksFilters,
): ReturnType<typeof useQuery<TaskResponseDto[]>> {
  return useQuery<TaskResponseDto[]>({
    queryKey: [...TASKS_QUERY_KEY, filters ?? {}],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.projectId !== undefined) params['projectId'] = filters.projectId;
      if (filters?.teamId !== undefined) params['teamId'] = filters.teamId;
      if (filters?.status !== undefined) params['status'] = filters.status;
      if (filters?.priority !== undefined) params['priority'] = filters.priority;
      if (filters?.assignedTo !== undefined) params['assignedTo'] = filters.assignedTo;
      if (filters?.mine === true) params['mine'] = 'true';
      const res = await apiClient.get<{
        success: true;
        data: { tasks: TaskResponseDto[] };
      }>('/tasks', { params });
      return res.data.data.tasks;
    },
  });
}

export function useCreateTask(): ReturnType<
  typeof useMutation<TaskResponseDto, Error, CreateTaskRequestDto>
> {
  const qc = useQueryClient();
  return useMutation<TaskResponseDto, Error, CreateTaskRequestDto>({
    mutationFn: async (input) => {
      const res = await apiClient.post<{ success: true; data: { task: TaskResponseDto } }>(
        '/tasks',
        input,
      );
      return res.data.data.task;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export interface UpdateTaskVars {
  id: string;
  input: UpdateTaskRequestDto;
}

export function useUpdateTask(): ReturnType<
  typeof useMutation<TaskResponseDto, Error, UpdateTaskVars>
> {
  const qc = useQueryClient();
  return useMutation<TaskResponseDto, Error, UpdateTaskVars>({
    mutationFn: async ({ id, input }) => {
      const res = await apiClient.patch<{ success: true; data: { task: TaskResponseDto } }>(
        `/tasks/${id}`,
        input,
      );
      return res.data.data.task;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useDeleteTask(): ReturnType<typeof useMutation<{ deleted: true }, Error, string>> {
  const qc = useQueryClient();
  return useMutation<{ deleted: true }, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/tasks/${id}`);
      return { deleted: true };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useTaskComments(
  taskId: string | null,
): ReturnType<typeof useQuery<TaskCommentResponseDto[]>> {
  return useQuery<TaskCommentResponseDto[]>({
    queryKey: [...TASKS_QUERY_KEY, 'comments', taskId],
    enabled: taskId !== null,
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: { comments: TaskCommentResponseDto[] };
      }>(`/tasks/${taskId ?? ''}/comments`);
      return res.data.data.comments;
    },
  });
}

export interface CreateCommentVars {
  taskId: string;
  body: string;
}

export function useCreateComment(): ReturnType<
  typeof useMutation<TaskCommentResponseDto, Error, CreateCommentVars>
> {
  const qc = useQueryClient();
  return useMutation<TaskCommentResponseDto, Error, CreateCommentVars>({
    mutationFn: async ({ taskId, body }) => {
      const res = await apiClient.post<{
        success: true;
        data: { comment: TaskCommentResponseDto };
      }>(`/tasks/${taskId}/comments`, { body });
      return res.data.data.comment;
    },
    onSuccess: (_comment, vars) => {
      void qc.invalidateQueries({ queryKey: [...TASKS_QUERY_KEY, 'comments', vars.taskId] });
    },
  });
}
