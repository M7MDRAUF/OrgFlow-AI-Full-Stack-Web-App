// NotFound (404) page. Shown for any unmatched route below the auth shell.
import type { JSX } from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        404
      </p>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Page not found</h1>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        The page you tried to open does not exist or is no longer available.
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
