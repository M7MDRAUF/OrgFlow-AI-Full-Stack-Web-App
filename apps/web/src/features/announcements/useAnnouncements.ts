// notes-agent — react-query hooks for announcements with targeting + read-state.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnnouncementResponseDto,
  CreateAnnouncementRequestDto,
  UpdateAnnouncementRequestDto,
} from '@orgflow/shared-types';
import { apiClient } from '../../lib/api-client.js';

const ANNOUNCEMENTS_QUERY_KEY = ['announcements'] as const;

export interface ListAnnouncementsFilters {
  unreadOnly?: boolean;
}

export function useAnnouncements(
  filters?: ListAnnouncementsFilters,
): ReturnType<typeof useQuery<AnnouncementResponseDto[]>> {
  return useQuery<AnnouncementResponseDto[]>({
    queryKey: [...ANNOUNCEMENTS_QUERY_KEY, filters ?? {}],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.unreadOnly === true) params['unreadOnly'] = 'true';
      const res = await apiClient.get<{
        success: true;
        data: { announcements: AnnouncementResponseDto[] };
      }>('/announcements', { params });
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
      void qc.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
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
      void qc.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
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
      void qc.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
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
      void qc.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
    },
  });
}
