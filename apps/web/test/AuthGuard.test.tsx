// Regression tests for AuthGuard / RoleGuard (FE-C-004 / FE-L-004).
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthGuard, RoleGuard } from '../src/features/auth/AuthGuard.js';
import { authStorage, type AuthProfile } from '../src/features/auth/storage.js';
import { queryClient } from '../src/lib/query-client.js';

function renderAt(path: string, element: JSX.Element) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>LOGIN</p>} />
          <Route path="/" element={<p>HOME</p>} />
          <Route path="/protected" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const memberProfile: AuthProfile = {
  userId: 'u1',
  organizationId: 'o1',
  teamId: 't1',
  role: 'member',
  displayName: 'Member',
  email: 'm@x.com',
};

describe('AuthGuard', () => {
  beforeEach(() => {
    authStorage.clear();
  });
  afterEach(() => {
    authStorage.clear();
  });

  it('redirects to /login when no token is present', () => {
    renderAt(
      '/protected',
      <AuthGuard>
        <p>SECRET</p>
      </AuthGuard>,
    );
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('allows rendering when a token is present', () => {
    authStorage.set('token-xyz', memberProfile);
    renderAt(
      '/protected',
      <AuthGuard>
        <p>SECRET</p>
      </AuthGuard>,
    );
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });
});

describe('RoleGuard (FE-L-004 403 page)', () => {
  beforeEach(() => {
    authStorage.set('tok', memberProfile);
  });
  afterEach(() => {
    authStorage.clear();
  });

  it('renders the 403 page when role is insufficient', () => {
    renderAt(
      '/protected',
      <RoleGuard minRole="admin">
        <p>ADMIN_ONLY</p>
      </RoleGuard>,
    );
    expect(screen.getByRole('heading', { name: /do not have access/i })).toBeInTheDocument();
    expect(screen.queryByText('ADMIN_ONLY')).not.toBeInTheDocument();
  });

  it('allows rendering when role meets the minimum', () => {
    renderAt(
      '/protected',
      <RoleGuard minRole="member">
        <p>OK</p>
      </RoleGuard>,
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });
});
