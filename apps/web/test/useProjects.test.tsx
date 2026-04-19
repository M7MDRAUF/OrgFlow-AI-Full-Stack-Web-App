import type { ProjectResponseDto } from '@orgflow/shared-types';
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
const { useProjects, useCreateProject } = await import('../src/features/projects/useProjects.js');

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

const sampleProject: ProjectResponseDto = {
  id: 'p1',
  organizationId: 'org1',
  teamId: 't1',
  title: 'Alpha Project',
  description: null,
  createdBy: 'u1',
  memberIds: ['u1', 'u2'],
  status: 'active',
  startDate: null,
  dueDate: null,
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

describe('useProjects', () => {
  it('fetches projects from /projects', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { projects: [sampleProject] } },
    });

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleProject]);
    expect(mockedGet).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({ params: undefined }),
    );
  });
});

describe('useCreateProject', () => {
  it('calls POST /projects with the creation payload', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { success: true, data: { project: sampleProject } },
    });
    // Mock the refetch triggered by invalidateQueries
    mockedGet.mockResolvedValue({
      data: { success: true, data: { projects: [sampleProject] } },
    });

    const { result } = renderHook(() => useCreateProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        teamId: 't1',
        title: 'Alpha Project',
      });
    });

    expect(mockedPost).toHaveBeenCalledWith('/projects', {
      teamId: 't1',
      title: 'Alpha Project',
    });
  });
});
