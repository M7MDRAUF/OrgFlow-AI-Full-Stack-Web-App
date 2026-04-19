// notes-agent — react-query hooks for announcements with targeting + read-state.
import type {
  AnnouncementResponseDto,
  CreateAnnouncementRequestDto,
  UnreadCountDto,
  UpdateAnnouncementRequestDto,
} from '@orgflow/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';

export interface ListAnnouncementsFilters {
  unreadOnly?: boolean;
}

export function useAnnouncements(
  filters?: ListAnnouncementsFilters,
): ReturnType<typeof useQuery<AnnouncementResponseDto[]>> {
  return useQuery<AnnouncementResponseDto[]>({
    queryKey: [...QUERY_KEYS.announcements, filters ?? {}],
    queryFn: async ({ signal }) => {
      const params: Record<string, string> = {};
      if (filters?.unreadOnly === true) params['unreadOnly'] = 'true';
      const res = await apiClient.get<{
        success: true;
        data: { announcements: AnnouncementResponseDto[] };
      }>('/announcements', { params, signal });
      return res.data.data.announcements;
    },
  });
}

export function useCreateAnnouncement(): ReturnType<
  typeof useMutation<AnnouncementResponseDto, Error, CreateAnnouncementRequestDto>
> {
  const qc = useQueryClient();
  return useMutation<AnnouncementResponseDto, Error, CreateAnnouncementRequestDto>({
    mutationFn: async (input: CreateAnnouncementRequestDto) => {
      const res = await apiClient.post<{
        success: true;
        data: { announcement: AnnouncementResponseDto };
      }>('/announcements', input);
      return res.data.data.announcement;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.announcements });
      toast.success('Announcement created');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}

export interface UpdateAnnouncementVars {
  id: string;
  input: UpdateAnnouncementRequestDto;
}

export function useUpdateAnnouncement(): ReturnType<
  typeof useMutation<AnnouncementResponseDto, Error, UpdateAnnouncementVars>
> {
  const qc = useQueryClient();
  return useMutation<AnnouncementResponseDto, Error, UpdateAnnouncementVars>({
    mutationFn: async (args: UpdateAnnouncementVars) => {
      const res = await apiClient.patch<{
        success: true;
        data: { announcement: AnnouncementResponseDto };
      }>(`/announcements/${args.id}`, args.input);
      return res.data.data.announcement;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.announcements });
      toast.success('Announcement updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}

export function useDeleteAnnouncement(): ReturnType<
  typeof useMutation<{ deleted: true }, Error, string>
> {
  const qc = useQueryClient();
  return useMutation<{ deleted: true }, Error, string>({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: true; data: { deleted: true } }>(
        `/announcements/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.announcements });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
      toast.success('Announcement deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}

export function useMarkAnnouncementRead(): ReturnType<
  typeof useMutation<AnnouncementResponseDto, Error, string>
> {
  const qc = useQueryClient();
  return useMutation<AnnouncementResponseDto, Error, string>({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{
        success: true;
        data: { announcement: AnnouncementResponseDto };
      }>(`/announcements/${id}/read`);
      return res.data.data.announcement;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.announcements });
    },
  });
}

export function useUnreadAnnouncementCount(): ReturnType<typeof useQuery<number>> {
  return useQuery<number>({
    queryKey: [...QUERY_KEYS.unreadCount],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{
        success: true;
        data: UnreadCountDto;
      }>('/announcements/unread-count', { signal });
      return res.data.data.count;
    },
    refetchInterval: 60_000,
  });
}
