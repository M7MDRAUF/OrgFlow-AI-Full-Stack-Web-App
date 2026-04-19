import type { UserResponseDto } from '@orgflow/shared-types';
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
const { useUsers, useUpdateUser } = await import('../src/features/users/useUsers.js');

const mockedGet = vi.mocked(apiClient.get);
const mockedPatch = vi.mocked(apiClient.patch);

const sampleUser: UserResponseDto = {
  id: 'u1',
  organizationId: 'org1',
  teamId: 't1',
  role: 'member',
  status: 'active',
  name: 'Bob',
  email: 'bob@test.com',
  avatarUrl: null,
  themePreference: 'dark',
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

describe('useUsers', () => {
  it('fetches users from /users', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { users: [sampleUser] } },
    });

    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleUser]);
    expect(mockedGet).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ params: undefined }),
    );
  });

  it('passes filter params to the request', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { users: [] } },
    });

    renderHook(() => useUsers({ role: 'admin' }), { wrapper });

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          params: expect.objectContaining({ role: 'admin' }),
        }),
      ),
    );
  });
});

describe('useUpdateUser', () => {
  it('calls PATCH /users/:id with the update payload', async () => {
    const updated = { ...sampleUser, name: 'Robert' };
    mockedPatch.mockResolvedValueOnce({
      data: { success: true, data: { user: updated } },
    });
    // Mock the refetch triggered by invalidateQueries
    mockedGet.mockResolvedValue({
      data: { success: true, data: { users: [updated] } },
    });

    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'u1', input: { name: 'Robert' } });
    });

    expect(mockedPatch).toHaveBeenCalledWith('/users/u1', { name: 'Robert' });
  });
});
