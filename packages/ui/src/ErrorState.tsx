import type { JSX, ReactNode } from 'react';

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function ErrorState(props: ErrorStateProps): JSX.Element {
  const { title = 'Something went wrong', description, action } = props;
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-300 bg-rose-50 p-8 text-center dark:border-rose-800 dark:bg-rose-950/40"
    >
      <h3 className="text-base font-semibold text-rose-800 dark:text-rose-200">{title}</h3>
      {description !== undefined && (
        <p className="max-w-md text-sm text-rose-700 dark:text-rose-300">{description}</p>
      )}
      {action !== undefined && <div className="pt-1">{action}</div>}
    </div>
  );
}
