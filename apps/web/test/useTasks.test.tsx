import type { TaskResponseDto } from '@orgflow/shared-types';
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
const { useTasks, useUpdateTask } = await import('../src/features/tasks/useTasks.js');

const mockedGet = vi.mocked(apiClient.get);
const mockedPatch = vi.mocked(apiClient.patch);

const sampleTask: TaskResponseDto = {
  id: 't1',
  projectId: 'p1',
  teamId: 'tm1',
  organizationId: 'org1',
  title: 'Fix login bug',
  description: null,
  status: 'todo',
  priority: 'high',
  assignedTo: 'u1',
  dueDate: null,
  overdue: false,
  createdBy: 'u2',
  commentCount: 0,
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

describe('useTasks', () => {
  it('fetches tasks from /tasks', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { tasks: [sampleTask] } },
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleTask]);
    expect(mockedGet).toHaveBeenCalledWith('/tasks', expect.objectContaining({ params: {} }));
  });

  it('passes filter params to the request', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { tasks: [] } },
    });

    renderHook(() => useTasks({ projectId: 'p1', status: 'todo' }), {
      wrapper,
    });

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({
          params: expect.objectContaining({
            projectId: 'p1',
            status: 'todo',
          }),
        }),
      ),
    );
  });
});

describe('useUpdateTask', () => {
  it('calls PATCH /tasks/:id with the update payload', async () => {
    const updated = { ...sampleTask, title: 'Updated title' };
    mockedPatch.mockResolvedValueOnce({
      data: { success: true, data: { task: updated } },
    });
    // Mock the refetch triggered by invalidateQueries
    mockedGet.mockResolvedValue({
      data: { success: true, data: { tasks: [updated] } },
    });

    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 't1',
        input: { title: 'Updated title' },
      });
    });

    expect(mockedPatch).toHaveBeenCalledWith('/tasks/t1', {
      title: 'Updated title',
    });
  });
});
