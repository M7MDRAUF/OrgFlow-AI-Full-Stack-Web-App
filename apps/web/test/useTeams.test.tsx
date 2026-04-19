import type { TeamResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/api-client.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { apiClient } = await import('../src/lib/api-client.js');
const { useTeams, useCreateTeam } = await import('../src/features/teams/useTeams.js');

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

const sampleTeam: TeamResponseDto = {
  id: 'tm1',
  organizationId: 'org1',
  name: 'Engineering',
  description: 'The engineering team',
  leaderId: 'u1',
  memberCount: 5,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useTeams', () => {
  it('fetches teams from /teams', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { teams: [sampleTeam] } },
    });

    const { result } = renderHook(() => useTeams(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleTeam]);
    expect(mockedGet).toHaveBeenCalledWith(
      '/teams',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

describe('useCreateTeam', () => {
  it('calls POST /teams with the creation payload', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { success: true, data: { team: sampleTeam } },
    });
    // Mock the refetch triggered by invalidateQueries
    mockedGet.mockResolvedValue({
      data: { success: true, data: { teams: [sampleTeam] } },
    });

    const { result } = renderHook(() => useCreateTeam(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Engineering',
        description: 'The engineering team',
      });
    });

    expect(mockedPost).toHaveBeenCalledWith('/teams', {
      name: 'Engineering',
      description: 'The engineering team',
    });
  });
});
