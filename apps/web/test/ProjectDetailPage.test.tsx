// Smoke tests for ProjectDetailPage — verifies detail render, loading, and error states.
import type { ProjectResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProjectDetailPage } from '../src/features/projects/ProjectDetailPage.js';

vi.mock('../src/features/projects/useProjects.js', () => ({
  useProject: vi.fn(),
  useProjects: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

vi.mock('../src/features/users/useUsers.js', () => ({
  useUsers: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

const { useProject } = await import('../src/features/projects/useProjects.js');
const mockedUseProject = vi.mocked(useProject);

function renderWithRoute(projectId: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
        <Routes>
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const sampleProject: ProjectResponseDto = {
  id: 'proj-1',
  organizationId: 'org-1',
  teamId: 'team-1',
  title: 'Alpha Project',
  description: 'A sample project.',
  status: 'active',
  createdBy: 'user-1',
  memberIds: ['user-2'],
  startDate: '2024-01-01T00:00:00.000Z',
  dueDate: '2024-06-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('<ProjectDetailPage />', () => {
  it('renders project title and status', () => {
    mockedUseProject.mockReturnValue({
      data: sampleProject,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useProject>);

    renderWithRoute('proj-1');
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseProject.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useProject>);

    const { container } = renderWithRoute('proj-1');
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state when project not found', () => {
    mockedUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Not found'),
    } as ReturnType<typeof useProject>);

    renderWithRoute('missing');
    expect(screen.getByText('Project not found')).toBeInTheDocument();
  });
});
