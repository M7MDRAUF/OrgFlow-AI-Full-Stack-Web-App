import type { JSX, ReactNode } from 'react';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState(props: EmptyStateProps): JSX.Element {
  const { title, description, action, icon } = props;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      {icon !== undefined && <div className="text-slate-400">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {description !== undefined && (
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action !== undefined && <div className="pt-1">{action}</div>}
    </div>
  );
}
