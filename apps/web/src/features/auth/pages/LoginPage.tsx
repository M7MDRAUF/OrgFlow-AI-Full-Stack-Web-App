// Login page — email + password form. Redirects to prior location (or /) on
// success. Owned by auth-agent (AGENTS.md §4.5).
import { Button, Card, ErrorState, Field, Input } from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../storage.js';
import { useLogin } from '../useAuth.js';

interface LocationState {
  from?: { pathname?: string } | string;
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (authStorage.getToken() !== null) {
    return <Navigate to="/" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    login.mutate(
      { organizationSlug, email, password },
      {
        onSuccess: () => {
          // BUG-LOW-1: handle both state.from (string or {pathname}) and ?from= query param.
          const raw: unknown = location.state;
          let redirectTo: string | undefined;
          if (typeof raw === 'object' && raw !== null && 'from' in raw) {
            const fromVal = (raw as LocationState).from;
            if (typeof fromVal === 'string') {
              redirectTo = fromVal;
            } else if (typeof fromVal?.pathname === 'string') {
              redirectTo = fromVal.pathname;
            }
          }
          if (redirectTo === undefined || redirectTo === '') {
            redirectTo = new URLSearchParams(location.search).get('from') ?? '/';
          }
          navigate(redirectTo, { replace: true });
        },
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-6 text-slate-900 dark:text-slate-50">
          OrgFlow AI
        </h1>
        <Card title="Sign in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Organization" htmlFor="login-org-slug">
              <Input
                id="login-org-slug"
                type="text"
                autoComplete="organization"
                required
                placeholder="your-org-slug"
                value={organizationSlug}
                onChange={(e) => {
                  setOrganizationSlug(e.target.value);
                }}
              />
            </Field>
            <Field label="Email" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </Field>
            {login.isError ? (
              <ErrorState title="Sign in failed" description={login.error.message} />
            ) : null}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={login.isPending}
              className="w-full"
            >
              Sign in
            </Button>
            <p className="text-sm text-center text-slate-600 dark:text-slate-400">
              Have an invite?{' '}
              <Link to="/activate" className="text-brand-600 hover:underline">
                Activate your account
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
