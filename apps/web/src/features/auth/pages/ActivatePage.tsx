// Activate page — consumes invite token from ?token=, sets password. Owned by auth-agent.
import { Button, Card, ErrorState, Field, Input } from '@orgflow/ui';
import { useState, type FormEvent, type JSX } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useCompleteInvite } from '../useAuth.js';

// Mirrors apps/api → packages/shared-types → newPasswordSchema:
// min 8 chars, must include at least one letter and one number.
// Keep this regex in sync with that schema.
const PASSWORD_RULE_HINT = 'At least 8 characters, including a letter and a number.';
function validatePasswordRule(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

export function ActivatePage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const complete = useCompleteInvite();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  if (token.length === 0) {
    return <Navigate to="/login" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const rule = validatePasswordRule(password);
    if (rule !== null) {
      setRuleError(rule);
      setMismatch(false);
      return;
    }
    setRuleError(null);
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    complete.mutate(
      { token, password },
      {
        onSuccess: () => {
          navigate('/', { replace: true });
        },
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-6 text-slate-900 dark:text-slate-50">
          Activate your account
        </h1>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="New password" htmlFor="activate-password" hint={PASSWORD_RULE_HINT}>
              <Input
                id="activate-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                invalid={ruleError !== null}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (mismatch) setMismatch(false);
                  if (ruleError !== null) setRuleError(null);
                }}
              />
            </Field>
            <Field label="Confirm password" htmlFor="activate-confirm">
              <Input
                id="activate-confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                invalid={mismatch}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (mismatch) setMismatch(false);
                }}
              />
            </Field>
            {ruleError !== null ? <ErrorState title={ruleError} /> : null}
            {mismatch ? <ErrorState title="Passwords do not match" /> : null}
            {complete.isError ? (
              <ErrorState title="Activation failed" description={complete.error.message} />
            ) : null}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={complete.isPending}
              className="w-full"
            >
              Set password and sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
