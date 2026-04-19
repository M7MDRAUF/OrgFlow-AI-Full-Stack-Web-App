// tasks-agent — react-query hooks for tasks + comments.
import type {
  CreateTaskRequestDto,
  TaskCommentResponseDto,
  TaskPriority,
  TaskResponseDto,
  TaskStatus,
  UpdateTaskRequestDto,
} from '@orgflow/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';

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
    queryKey: [...QUERY_KEYS.tasks, filters ?? {}],
    queryFn: async ({ signal }) => {
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
      }>('/tasks', { params, signal });
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      toast.success('Task created');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
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
    // Optimistic update: immediately reflect the change in cache
    // so Kanban drag-drop feels instant.
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.tasks });
      const previous = qc.getQueriesData<TaskResponseDto[]>({ queryKey: QUERY_KEYS.tasks });
      qc.setQueriesData<TaskResponseDto[]>({ queryKey: QUERY_KEYS.tasks }, (old) => {
        if (!old) return old;
        return old.map((t) => {
          if (t.id !== id) return t;
          const merged: TaskResponseDto = { ...t };
          if (input.title !== undefined) merged.title = input.title;
          if (input.description !== undefined) merged.description = input.description;
          if (input.status !== undefined) merged.status = input.status;
          if (input.priority !== undefined) merged.priority = input.priority;
          if (input.dueDate !== undefined) merged.dueDate = input.dueDate;
          if (input.assignedTo !== undefined) merged.assignedTo = input.assignedTo;
          return merged;
        });
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback to snapshot on failure.
      const ctx = context as
        | { previous: [readonly unknown[], TaskResponseDto[] | undefined][] }
        | undefined;
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          qc.setQueryData(key, data);
        }
      }
      toast.error('Failed to update task');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
    onSuccess: () => {
      toast.success('Task updated');
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      toast.success('Task deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}

export function useTaskComments(
  taskId: string | null,
): ReturnType<typeof useQuery<TaskCommentResponseDto[]>> {
  return useQuery<TaskCommentResponseDto[]>({
    queryKey: [...QUERY_KEYS.tasks, 'comments', taskId],
    enabled: taskId !== null,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{
        success: true;
        data: { comments: TaskCommentResponseDto[] };
      }>(`/tasks/${taskId ?? ''}/comments`, { signal });
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
      void qc.invalidateQueries({ queryKey: [...QUERY_KEYS.tasks, 'comments', vars.taskId] });
      toast.success('Comment added');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}
