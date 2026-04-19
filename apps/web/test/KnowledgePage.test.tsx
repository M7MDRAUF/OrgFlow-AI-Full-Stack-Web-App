// rag-ingest-agent — KnowledgePage smoke tests.
import type { DocumentResponseDto } from '@orgflow/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KnowledgePage } from '../src/features/ai/KnowledgePage.js';

vi.mock('../src/features/ai/useDocuments.js', () => ({
  useDocuments: vi.fn(),
  useUploadDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteDocument: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../src/features/teams/useTeams.js', () => ({
  useTeams: vi.fn(() => ({ data: [], isLoading: false, isError: false, error: null })),
}));

const { useDocuments } = await import('../src/features/ai/useDocuments.js');
const mockedUseDocuments = vi.mocked(useDocuments);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sampleDocuments: DocumentResponseDto[] = [
  {
    id: 'd1',
    organizationId: 'org1',
    teamId: null,
    projectId: null,
    visibility: 'organization',
    title: 'Employee Handbook',
    originalFilename: 'handbook.pdf',
    mimeType: 'application/pdf',
    uploadedBy: 'u1',
    status: 'indexed',
    allowedRoles: ['admin', 'leader', 'member'],
    chunkCount: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd2',
    organizationId: 'org1',
    teamId: 'tm1',
    projectId: null,
    visibility: 'team',
    title: 'Onboarding Guide',
    originalFilename: 'onboarding.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadedBy: 'u1',
    status: 'parsed',
    allowedRoles: ['admin', 'leader'],
    chunkCount: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<KnowledgePage />', () => {
  it('renders document list with data', () => {
    mockedUseDocuments.mockReturnValue({
      data: sampleDocuments,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocuments>);

    render(<KnowledgePage />, { wrapper });
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
    expect(screen.getByText('Employee Handbook')).toBeInTheDocument();
    expect(screen.getByText('Onboarding Guide')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockedUseDocuments.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocuments>);

    render(<KnowledgePage />, { wrapper });
    expect(screen.getByText('No documents')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    mockedUseDocuments.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useDocuments>);

    const { container } = render(<KnowledgePage />, { wrapper });
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders error state', () => {
    mockedUseDocuments.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Forbidden'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocuments>);

    render(<KnowledgePage />, { wrapper });
    expect(screen.getByText('Failed to load documents')).toBeInTheDocument();
  });

  it('shows upload document button', () => {
    mockedUseDocuments.mockReturnValue({
      data: sampleDocuments,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocuments>);

    render(<KnowledgePage />, { wrapper });
    expect(screen.getByText('Upload document')).toBeInTheDocument();
  });
});
