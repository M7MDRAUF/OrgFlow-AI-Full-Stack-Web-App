// qa-agent — TG-F03: delete mutation hook tests.
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
const toast = (await import('react-hot-toast')).default;
const { useDeleteProject } = await import('../src/features/projects/useProjects.js');
const { useDeleteTask } = await import('../src/features/tasks/useTasks.js');
const { useDeleteAnnouncement } = await import('../src/features/announcements/useAnnouncements.js');

const mockedDelete = vi.mocked(apiClient.delete);

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

describe('useDeleteProject', () => {
  it('calls DELETE /projects/:id and shows success toast', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { success: true } });
    const { result } = renderHook(() => useDeleteProject(), { wrapper });

    act(() => {
      result.current.mutate('p1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedDelete).toHaveBeenCalledWith('/projects/p1');
    expect(toast.success).toHaveBeenCalledWith('Project deleted');
  });

  it('shows error toast on failure', async () => {
    mockedDelete.mockRejectedValueOnce(new Error('Forbidden'));
    const { result } = renderHook(() => useDeleteProject(), { wrapper });

    act(() => {
      result.current.mutate('p1');
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('useDeleteTask', () => {
  it('calls DELETE /tasks/:id', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { success: true } });
    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    act(() => {
      result.current.mutate('t1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedDelete).toHaveBeenCalledWith('/tasks/t1');
  });
});

describe('useDeleteAnnouncement', () => {
  it('calls DELETE /announcements/:id', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { success: true } });
    const { result } = renderHook(() => useDeleteAnnouncement(), { wrapper });

    act(() => {
      result.current.mutate('a1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedDelete).toHaveBeenCalledWith('/announcements/a1');
  });
});
