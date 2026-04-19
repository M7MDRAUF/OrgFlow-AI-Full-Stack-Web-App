// auth-agent — ActivatePage smoke tests.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivatePage } from '../src/features/auth/pages/ActivatePage.js';

vi.mock('../src/features/auth/useAuth.js', () => ({
  useCompleteInvite: vi.fn(),
}));

const { useCompleteInvite } = await import('../src/features/auth/useAuth.js');
const mockedUseCompleteInvite = vi.mocked(useCompleteInvite);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/activate?token=abc123']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function wrapperNoToken({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/activate']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<ActivatePage />', () => {
  it('renders activation form with password inputs', () => {
    mockedUseCompleteInvite.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCompleteInvite>);

    render(<ActivatePage />, { wrapper });
    expect(screen.getByText('Activate your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('shows submit button', () => {
    mockedUseCompleteInvite.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCompleteInvite>);

    render(<ActivatePage />, { wrapper });
    expect(screen.getByRole('button', { name: /set password and sign in/i })).toBeInTheDocument();
  });

  it('shows error on failed activation', () => {
    mockedUseCompleteInvite.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new Error('Token expired'),
    } as unknown as ReturnType<typeof useCompleteInvite>);

    render(<ActivatePage />, { wrapper });
    expect(screen.getByText('Activation failed')).toBeInTheDocument();
    expect(screen.getByText('Token expired')).toBeInTheDocument();
  });

  it('redirects to login when no token is present', () => {
    mockedUseCompleteInvite.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCompleteInvite>);

    render(<ActivatePage />, { wrapper: wrapperNoToken });
    // The component renders <Navigate to="/login" /> — the heading should not be present
    expect(screen.queryByText('Activate your account')).not.toBeInTheDocument();
  });
});
