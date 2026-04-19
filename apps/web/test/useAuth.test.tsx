import type { LoginResponseDto, MeResponseDto, UserResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/api-client.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

vi.mock('../src/features/auth/storage.js', () => ({
  authStorage: {
    getToken: vi.fn(() => 'test-token'),
    getProfile: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { apiClient } = await import('../src/lib/api-client.js');
const { authStorage } = await import('../src/features/auth/storage.js');
const { useLogin, useLogout, useMe } = await import('../src/features/auth/useAuth.js');

const mockedApiClient = vi.mocked(apiClient);
const mockedAuthStorage = vi.mocked(authStorage);

const sampleUser: UserResponseDto = {
  id: 'u1',
  organizationId: 'org1',
  teamId: 't1',
  role: 'admin',
  status: 'active',
  name: 'Alice',
  email: 'alice@test.com',
  avatarUrl: null,
  themePreference: 'system',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuthStorage.getToken.mockReturnValue('test-token');
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMe', () => {
  it('fetches the current user when a token is present', async () => {
    const meResponse: MeResponseDto = { user: sampleUser };
    mockedApiClient.get.mockResolvedValueOnce({
      data: { success: true, data: meResponse },
    });

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(meResponse);
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('does not fetch when no token is present', async () => {
    mockedAuthStorage.getToken.mockReturnValue(null);

    const { result } = renderHook(() => useMe(), { wrapper });

    // Wait a tick then verify query is idle
    await new Promise((r) => {
      setTimeout(r, 50);
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedApiClient.get).not.toHaveBeenCalled();
  });
});

describe('useLogin', () => {
  it('calls apiClient.post with login credentials', async () => {
    const loginResponse: LoginResponseDto = {
      token: 'jwt-token',
      user: sampleUser,
    };
    mockedApiClient.post.mockResolvedValueOnce({
      data: { success: true, data: loginResponse },
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    await result.current.mutateAsync({
      email: 'alice@test.com',
      password: 'secret',
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'alice@test.com',
      password: 'secret',
    });
  });

  it('stores token and profile in authStorage on success', async () => {
    const loginResponse: LoginResponseDto = {
      token: 'jwt-token',
      user: sampleUser,
    };
    mockedApiClient.post.mockResolvedValueOnce({
      data: { success: true, data: loginResponse },
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    await result.current.mutateAsync({
      email: 'alice@test.com',
      password: 'secret',
    });

    expect(mockedAuthStorage.set).toHaveBeenCalledWith(
      'jwt-token',
      expect.objectContaining({ userId: 'u1', role: 'admin' }),
    );
  });
});

describe('useLogout', () => {
  it('clears auth storage', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper });
    await result.current();

    expect(mockedAuthStorage.clear).toHaveBeenCalled();
  });

  it('removes the Authorization header from the API client', async () => {
    Object.assign(apiClient.defaults.headers.common, {
      Authorization: 'Bearer old',
    });

    const { result } = renderHook(() => useLogout(), { wrapper });
    await result.current();

    expect(apiClient.defaults.headers.common).not.toHaveProperty('Authorization');
  });
});
