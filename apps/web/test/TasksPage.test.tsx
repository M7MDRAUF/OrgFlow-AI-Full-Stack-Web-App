// tasks-agent — TasksPage smoke tests.
import type { TaskResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TasksPage } from '../src/features/tasks/TasksPage.js';

vi.mock('../src/features/tasks/useTasks.js', () => ({
  useTasks: vi.fn(),
  useUpdateTask: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../src/features/projects/useProjects.js', () => ({
  useProjects: vi.fn(() => ({ data: [], isLoading: false, isError: false, error: null })),
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

vi.mock('../src/features/tasks/TaskDetailModal.js', () => ({
  TaskDetailModal: () => null,
}));

vi.mock('../src/features/tasks/TaskFormModal.js', () => ({
  TaskFormModal: () => null,
}));

const { useTasks } = await import('../src/features/tasks/useTasks.js');
const mockedUseTasks = vi.mocked(useTasks);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
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
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<TasksPage />', () => {
  it('renders task list with data', () => {
    mockedUseTasks.mockReturnValue({
      data: sampleTasks,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<TasksPage />, { wrapper });
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Deploy staging')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockedUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<TasksPage />, { wrapper });
    expect(screen.getByText('No tasks')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseTasks.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useTasks>);

    const { container } = render(<TasksPage />, { wrapper });
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders error state', () => {
    mockedUseTasks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Server error'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<TasksPage />, { wrapper });
    expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
  });

  it('shows new task button for admin', () => {
    mockedUseTasks.mockReturnValue({
      data: sampleTasks,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<TasksPage />, { wrapper });
    expect(screen.getByText('New task')).toBeInTheDocument();
  });
});
