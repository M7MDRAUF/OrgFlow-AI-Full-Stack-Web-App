import type { AnnouncementResponseDto } from '@orgflow/shared-types';
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
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { apiClient } = await import('../src/lib/api-client.js');
const { useAnnouncements, useUnreadAnnouncementCount } =
  await import('../src/features/announcements/useAnnouncements.js');

const mockedGet = vi.mocked(apiClient.get);

const sampleAnnouncement: AnnouncementResponseDto = {
  id: 'a1',
  organizationId: 'org1',
  createdBy: 'u1',
  targetType: 'organization',
  targetId: 'org1',
  title: 'Company Update',
  body: 'Important news for everyone.',
  readByCurrentUser: false,
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

describe('useAnnouncements', () => {
  it('fetches announcements from /announcements', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: { announcements: [sampleAnnouncement] },
      },
    });

    const { result } = renderHook(() => useAnnouncements(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleAnnouncement]);
    expect(mockedGet).toHaveBeenCalledWith(
      '/announcements',
      expect.objectContaining({ params: {} }),
    );
  });
});

describe('useUnreadAnnouncementCount', () => {
  it('fetches unread count from /announcements/unread-count', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { count: 3 } },
    });

    const { result } = renderHook(() => useUnreadAnnouncementCount(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
    expect(mockedGet).toHaveBeenCalledWith(
      '/announcements/unread-count',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
