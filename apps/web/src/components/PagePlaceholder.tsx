import type { JSX, ReactNode } from 'react';
import { Card } from '@orgflow/ui';

export function PagePlaceholder(props: { title: string; description?: ReactNode }): JSX.Element {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">{props.title}</h1>
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {props.description ?? 'Coming online in a later milestone.'}
        </p>
      </Card>
    </div>
  );
}
