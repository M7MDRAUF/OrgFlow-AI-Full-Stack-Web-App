// tasks-agent — Kanban board smoke tests: rendering columns, loading, error, role-aware filters.
import type { ProjectResponseDto, TaskResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KanbanPage } from '../src/features/tasks/KanbanPage.js';

// Mock hooks
vi.mock('../src/features/tasks/useTasks.js', () => ({
  useTasks: vi.fn(),
  useUpdateTask: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../src/features/projects/useProjects.js', () => ({
  useProjects: vi.fn(),
}));

vi.mock('../src/features/auth/storage.js', () => ({
  authStorage: {
    getProfile: vi.fn(),
    getToken: vi.fn().mockReturnValue('tok'),
    setToken: vi.fn(),
    setProfile: vi.fn(),
    clear: vi.fn(),
  },
}));

const { useTasks } = await import('../src/features/tasks/useTasks.js');
const { useProjects } = await import('../src/features/projects/useProjects.js');
const { authStorage } = await import('../src/features/auth/storage.js');
const mockedUseTasks = vi.mocked(useTasks);
const mockedUseProjects = vi.mocked(useProjects);
const mockedGetProfile = vi.mocked(authStorage.getProfile);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sampleTasks: TaskResponseDto[] = [
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't2',
    projectId: 'p1',
    teamId: 'tm1',
    organizationId: 'org1',
    title: 'Deploy staging',
    description: null,
    status: 'in-progress',
    priority: 'medium',
    assignedTo: null,
    dueDate: null,
    overdue: false,
    createdBy: 'u2',
    commentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't3',
    projectId: 'p1',
    teamId: 'tm1',
    organizationId: 'org1',
    title: 'Write tests',
    description: null,
    status: 'done',
    priority: 'low',
    assignedTo: 'u1',
    dueDate: null,
    overdue: false,
    createdBy: 'u2',
    commentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('<KanbanPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to admin profile (no mine filter)
    mockedGetProfile.mockReturnValue({
      userId: 'u1',
      displayName: 'Admin',
      email: 'a@b',
      role: 'admin',
      organizationId: 'org1',
      teamId: 'tm1',
    });
  });

  it('renders three columns with task cards', () => {
    mockedUseProjects.mockReturnValue({
      data: [] as ProjectResponseDto[],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useProjects>);

    mockedUseTasks.mockReturnValue({
      data: sampleTasks,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<KanbanPage />, { wrapper });
    expect(screen.getByText('Kanban')).toBeInTheDocument();
    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();

    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Deploy staging')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    mockedUseProjects.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProjects>);

    mockedUseTasks.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useTasks>);

    const { container } = render(<KanbanPage />, { wrapper });
    // Skeleton renders an animated placeholder div
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows error state with retry', () => {
    mockedUseProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProjects>);

    mockedUseTasks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network failure'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<KanbanPage />, { wrapper });
    expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty state in columns when no tasks', () => {
    mockedUseProjects.mockReturnValue({
      data: [] as ProjectResponseDto[],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useProjects>);

    mockedUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<KanbanPage />, { wrapper });
    // Each column should show "No tasks" empty state
    const empties = screen.getAllByText('No tasks');
    expect(empties.length).toBe(3);
  });

  it('defaults mine-only on for members', () => {
    mockedGetProfile.mockReturnValue({
      userId: 'u1',
      displayName: 'M',
      email: 'm@b',
      role: 'member',
      organizationId: 'org1',
      teamId: 'tm1',
    });
    mockedUseProjects.mockReturnValue({
      data: [] as ProjectResponseDto[],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useProjects>);
    mockedUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<KanbanPage />, { wrapper });
    const checkbox = screen.getByRole('checkbox', { name: /my tasks only/i });
    expect(checkbox).toBeChecked();
  });

  it('defaults mine-only off for leaders', () => {
    mockedGetProfile.mockReturnValue({
      userId: 'u2',
      displayName: 'L',
      email: 'l@b',
      role: 'leader',
      organizationId: 'org1',
      teamId: 'tm1',
    });
    mockedUseProjects.mockReturnValue({
      data: [] as ProjectResponseDto[],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useProjects>);
    mockedUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<KanbanPage />, { wrapper });
    const checkbox = screen.getByRole('checkbox', { name: /my tasks only/i });
    expect(checkbox).not.toBeChecked();
  });
});
