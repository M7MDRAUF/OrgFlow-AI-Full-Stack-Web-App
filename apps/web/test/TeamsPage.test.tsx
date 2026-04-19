// org-agent — TeamsPage smoke tests.
import type { TeamResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeamsPage } from '../src/features/teams/TeamsPage.js';

vi.mock('../src/features/teams/useTeams.js', () => ({
  useTeams: vi.fn(),
  useCreateTeam: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateTeam: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteTeam: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../src/features/users/useUsers.js', () => ({
  useUsers: vi.fn(() => ({ data: [], isLoading: false, isError: false, error: null })),
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

vi.mock('../src/features/teams/TeamFormModal.js', () => ({
  TeamFormModal: () => null,
}));

vi.mock('../src/features/teams/DeleteTeamModal.js', () => ({
  DeleteTeamModal: () => null,
}));

vi.mock('../src/features/teams/TeamMembersModal.js', () => ({
  TeamMembersModal: () => null,
}));

const { useTeams } = await import('../src/features/teams/useTeams.js');
const mockedUseTeams = vi.mocked(useTeams);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sampleTeams: TeamResponseDto[] = [
  {
    id: 'tm1',
    organizationId: 'org1',
    name: 'Engineering',
    description: 'The eng team.',
    leaderId: 'u1',
    memberCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tm2',
    organizationId: 'org1',
    name: 'Design',
    description: null,
    leaderId: null,
    memberCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<TeamsPage />', () => {
  it('renders team list with data', () => {
    mockedUseTeams.mockReturnValue({
      data: sampleTeams,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeams>);

    render(<TeamsPage />, { wrapper });
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('renders empty state when no teams', () => {
    mockedUseTeams.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeams>);

    render(<TeamsPage />, { wrapper });
    expect(screen.getByText('No teams yet.')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseTeams.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useTeams>);

    const { container } = render(<TeamsPage />, { wrapper });
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders error state', () => {
    mockedUseTeams.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeams>);

    render(<TeamsPage />, { wrapper });
    expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
  });

  it('shows new team button for admin', () => {
    mockedUseTeams.mockReturnValue({
      data: sampleTeams,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeams>);

    render(<TeamsPage />, { wrapper });
    expect(screen.getByText('New team')).toBeInTheDocument();
  });
});
