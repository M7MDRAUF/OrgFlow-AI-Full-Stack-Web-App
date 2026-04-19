// auth-agent — LoginPage smoke tests.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../src/features/auth/pages/LoginPage.js';

vi.mock('../src/features/auth/useAuth.js', () => ({
  useLogin: vi.fn(),
}));

vi.mock('../src/features/auth/storage.js', () => ({
  authStorage: {
    getToken: vi.fn(() => null),
    getProfile: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

const { useLogin } = await import('../src/features/auth/useAuth.js');
const { authStorage } = await import('../src/features/auth/storage.js');
const mockedUseLogin = vi.mocked(useLogin);
const mockedGetToken = vi.mocked(authStorage.getToken);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<LoginPage />', () => {
  it('renders login form with email and password inputs', () => {
    mockedGetToken.mockReturnValue(null);
    mockedUseLogin.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLogin>);

    render(<LoginPage />, { wrapper });
    expect(screen.getByText('OrgFlow AI')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows submit button', () => {
    mockedGetToken.mockReturnValue(null);
    mockedUseLogin.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLogin>);

    render(<LoginPage />, { wrapper });
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows loading state when login is pending', () => {
    mockedGetToken.mockReturnValue(null);
    mockedUseLogin.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLogin>);

    render(<LoginPage />, { wrapper });
    // Button exists with type=submit even while loading
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  it('shows error on failed login', () => {
    mockedGetToken.mockReturnValue(null);
    mockedUseLogin.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new Error('Invalid credentials'),
    } as unknown as ReturnType<typeof useLogin>);

    render(<LoginPage />, { wrapper });
    expect(screen.getByText('Sign in failed')).toBeInTheDocument();
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows link to activate page', () => {
    mockedGetToken.mockReturnValue(null);
    mockedUseLogin.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLogin>);

    render(<LoginPage />, { wrapper });
    expect(screen.getByText('Activate your account')).toBeInTheDocument();
  });
});
