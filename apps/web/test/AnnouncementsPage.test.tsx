// notes-agent — Announcements page smoke tests.
import type { AnnouncementResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnnouncementsPage } from '../src/features/announcements/AnnouncementsPage.js';

vi.mock('../src/features/announcements/useAnnouncements.js', () => ({
  useAnnouncements: vi.fn(),
  useCreateAnnouncement: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteAnnouncement: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useMarkAnnouncementRead: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateAnnouncement: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../src/features/teams/useTeams.js', () => ({
  useTeams: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../src/features/users/useUsers.js', () => ({
  useUsers: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../src/features/auth/storage.js', () => ({
  authStorage: {
    getProfile: vi.fn(() => ({
      userId: 'u1',
      organizationId: 'org1',
      role: 'admin',
      displayName: 'Admin',
      email: 'admin@test',
    })),
    getToken: vi.fn(() => 'tok'),
  },
}));

const { useAnnouncements } = await import('../src/features/announcements/useAnnouncements.js');
const mockedUseAnnouncements = vi.mocked(useAnnouncements);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sampleAnnouncements: AnnouncementResponseDto[] = [
  {
    id: 'a1',
    organizationId: 'org1',
    title: 'Server maintenance',
    body: 'Planned downtime Saturday.',
    targetType: 'organization',
    targetId: 'org1',
    createdBy: 'u1',
    readByCurrentUser: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a2',
    organizationId: 'org1',
    title: 'Team standup moved',
    body: 'Now at 10am.',
    targetType: 'team',
    targetId: 'tm1',
    createdBy: 'u2',
    readByCurrentUser: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('<AnnouncementsPage />', () => {
  it('renders announcements list', () => {
    mockedUseAnnouncements.mockReturnValue({
      data: sampleAnnouncements,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAnnouncements>);

    render(<AnnouncementsPage />, { wrapper });
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Server maintenance')).toBeInTheDocument();
    expect(screen.getByText('Team standup moved')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockedUseAnnouncements.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAnnouncements>);

    render(<AnnouncementsPage />, { wrapper });
    expect(screen.getByText('No announcements')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseAnnouncements.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useAnnouncements>);

    const { container } = render(<AnnouncementsPage />, { wrapper });
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders error state with retry', () => {
    mockedUseAnnouncements.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('API down'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAnnouncements>);

    render(<AnnouncementsPage />, { wrapper });
    expect(screen.getByText('Failed to load announcements')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows "New announcement" button for admin', () => {
    mockedUseAnnouncements.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAnnouncements>);

    render(<AnnouncementsPage />, { wrapper });
    expect(screen.getByText('New announcement')).toBeInTheDocument();
  });
});
