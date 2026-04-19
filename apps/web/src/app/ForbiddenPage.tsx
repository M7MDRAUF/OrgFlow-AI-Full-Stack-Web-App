// Forbidden (403) page. Shown when a RoleGuard denies access. Replaces the
// silent redirect that previously hid permission failures (FE-L-004).
import type { JSX } from 'react';
import { Link } from 'react-router-dom';

export function ForbiddenPage(): JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
        403
      </p>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
        You do not have access to this page
      </h1>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        Your current role cannot view this section. If you believe this is an error, contact an
        administrator.
      </p>
      <Link
        to="/"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
