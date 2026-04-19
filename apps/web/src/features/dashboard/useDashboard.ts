// dashboard-agent — react-query hook for role-aware dashboard.
import type { DashboardResponseDto } from '@orgflow/shared-types';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';

export function useDashboard(): ReturnType<typeof useQuery<DashboardResponseDto>> {
  return useQuery<DashboardResponseDto>({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{
        success: true;
        data: { dashboard: DashboardResponseDto };
      }>('/dashboard', { signal });
      return res.data.data.dashboard;
    },
  });
}
