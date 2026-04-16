import type { HTMLAttributes, JSX, PropsWithChildren, ReactNode } from 'react';
import { cn } from './utils/cn';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
}

export function Card(props: PropsWithChildren<CardProps>): JSX.Element {
  const { title, actions, className, children, ...rest } = props;
  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      {...rest}
    >
      {(title !== undefined || actions !== undefined) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          {title !== undefined && (
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          )}
          {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
