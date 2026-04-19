// org-agent — UsersPage smoke tests.
import type { UserResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from '../src/features/users/UsersPage.js';

vi.mock('../src/features/users/useUsers.js', () => ({
  useUsers: vi.fn(),
  useUpdateUser: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../src/features/teams/useTeams.js', () => ({
  useTeams: vi.fn(() => ({ data: [], isLoading: false, isError: false, error: null })),
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

vi.mock('../src/features/users/EditUserModal.js', () => ({
  EditUserModal: () => null,
}));

vi.mock('../src/features/users/InviteUserModal.js', () => ({
  InviteUserModal: () => null,
}));

const { useUsers } = await import('../src/features/users/useUsers.js');
const mockedUseUsers = vi.mocked(useUsers);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sampleUsers: UserResponseDto[] = [
  {
    id: 'u1',
    organizationId: 'org1',
    teamId: 'tm1',
    role: 'admin',
    status: 'active',
    name: 'Alice Admin',
    email: 'alice@test.com',
    avatarUrl: null,
    themePreference: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'u2',
    organizationId: 'org1',
    teamId: 'tm1',
    role: 'member',
    status: 'pending',
    name: 'Bob Member',
    email: 'bob@test.com',
    avatarUrl: null,
    themePreference: 'dark',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<UsersPage />', () => {
  it('renders user list with data', () => {
    mockedUseUsers.mockReturnValue({
      data: sampleUsers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UsersPage />, { wrapper });
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Member')).toBeInTheDocument();
  });

  it('renders empty message when no users match filters', () => {
    mockedUseUsers.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UsersPage />, { wrapper });
    expect(screen.getByText('No users match these filters.')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUsers>);

    const { container } = render(<UsersPage />, { wrapper });
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders error state', () => {
    mockedUseUsers.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Unauthorized'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UsersPage />, { wrapper });
    expect(screen.getByText('Failed to load users')).toBeInTheDocument();
  });

  it('shows invite user button for admin', () => {
    mockedUseUsers.mockReturnValue({
      data: sampleUsers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUsers>);

    render(<UsersPage />, { wrapper });
    expect(screen.getByText('Invite user')).toBeInTheDocument();
  });
});
