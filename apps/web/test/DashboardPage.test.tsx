// Dashboard page — smoke render tests per scope.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DashboardResponseDto } from '@orgflow/shared-types';
import { DashboardPage } from '../src/features/dashboard/DashboardPage.js';

// Mock the query hook to avoid HTTP calls.
vi.mock('../src/features/dashboard/useDashboard.js', () => ({
  useDashboard: vi.fn(),
}));

const { useDashboard } = await import('../src/features/dashboard/useDashboard.js');
const mockedUseDashboard = vi.mocked(useDashboard);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('<DashboardPage />', () => {
  it('renders admin stat cards', () => {
    const data: DashboardResponseDto = {
      scope: 'admin',
      stats: {
        teams: 3,
        users: 11,
        projects: 7,
        tasks: 25,
        tasksTodo: 9,
        tasksInProgress: 5,
        tasksDone: 8,
        tasksOverdue: 3,
      },
      byTeam: [],
    };

    mockedUseDashboard.mockReturnValue({
      data,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useDashboard>);

    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders member stat cards', () => {
    const data: DashboardResponseDto = {
      scope: 'member',
      stats: {
        assignedTotal: 7,
        assignedTodo: 3,
        assignedInProgress: 2,
        assignedDone: 1,
        assignedOverdue: 1,
      },
      upcoming: [],
    };

    mockedUseDashboard.mockReturnValue({
      data,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useDashboard>);

    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useDashboard>);

    const { container } = render(<DashboardPage />, { wrapper });
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockedUseDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network failure'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboard>);

    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
  });
});
