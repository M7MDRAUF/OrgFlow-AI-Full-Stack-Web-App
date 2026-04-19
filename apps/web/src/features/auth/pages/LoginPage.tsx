// Login page — email + password form. Redirects to prior location (or /) on
// success. Owned by auth-agent (AGENTS.md §4.5).
import { Button, Card, ErrorState, Field, Input } from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../storage.js';
import { useLogin } from '../useAuth.js';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (authStorage.getToken() !== null) {
    return <Navigate to="/" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          const raw: unknown = location.state;
          let redirectTo = '/';
          if (
            typeof raw === 'object' &&
            raw !== null &&
            'from' in raw &&
            typeof (raw as LocationState).from?.pathname === 'string'
          ) {
            redirectTo = (raw as LocationState).from?.pathname ?? '/';
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
