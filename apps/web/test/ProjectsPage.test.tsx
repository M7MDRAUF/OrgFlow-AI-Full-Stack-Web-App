// projects-agent — ProjectsPage smoke tests.
import type { ProjectResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectsPage } from '../src/features/projects/ProjectsPage.js';

vi.mock('../src/features/projects/useProjects.js', () => ({
  useProjects: vi.fn(),
}));

vi.mock('../src/features/teams/useTeams.js', () => ({
  useTeams: vi.fn(() => ({ data: [], isLoading: false, isError: false, error: null })),
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

vi.mock('../src/lib/use-debounced-value.js', () => ({
  useDebouncedValue: vi.fn((v: string) => v),
}));

vi.mock('../src/features/projects/ProjectFormModal.js', () => ({
  ProjectFormModal: () => null,
}));

vi.mock('../src/features/projects/DeleteProjectModal.js', () => ({
  DeleteProjectModal: () => null,
}));

const { useProjects } = await import('../src/features/projects/useProjects.js');
const mockedUseProjects = vi.mocked(useProjects);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const sampleProjects: ProjectResponseDto[] = [
  {
    id: 'p1',
    organizationId: 'org1',
    teamId: 'tm1',
    title: 'Website Redesign',
    description: null,
    createdBy: 'u1',
    memberIds: ['u1', 'u2'],
    status: 'active',
    startDate: null,
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    organizationId: 'org1',
    teamId: 'tm1',
    title: 'API Migration',
    description: 'Move to v2.',
    createdBy: 'u1',
    memberIds: ['u1'],
    status: 'planned',
    startDate: null,
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<ProjectsPage />', () => {
  it('renders project list with data', () => {
    mockedUseProjects.mockReturnValue({
      data: sampleProjects,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjects>);

    render(<ProjectsPage />, { wrapper });
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Website Redesign')).toBeInTheDocument();
    expect(screen.getByText('API Migration')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockedUseProjects.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjects>);

    render(<ProjectsPage />, { wrapper });
    expect(screen.getByText('No projects')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseProjects.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProjects>);

    const { container } = render(<ProjectsPage />, { wrapper });
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders error state', () => {
    mockedUseProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjects>);

    render(<ProjectsPage />, { wrapper });
    expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
  });

  it('shows new project button for admin', () => {
    mockedUseProjects.mockReturnValue({
      data: sampleProjects,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjects>);

    render(<ProjectsPage />, { wrapper });
    expect(screen.getByText('New project')).toBeInTheDocument();
  });
});
