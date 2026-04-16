// dashboard-agent — react-query hook for role-aware dashboard.
import { useQuery } from '@tanstack/react-query';
import type { DashboardResponseDto } from '@orgflow/shared-types';
import { apiClient } from '../../lib/api-client.js';

export function useDashboard(): ReturnType<typeof useQuery<DashboardResponseDto>> {
  return useQuery<DashboardResponseDto>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: true;
        data: { dashboard: DashboardResponseDto };
      }>('/dashboard');
      return res.data.data.dashboard;
    },
  });
}
