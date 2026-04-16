import type { JSX } from 'react';
import { cn } from './utils/cn';

export interface SkeletonProps {
  className?: string;
  rounded?: boolean;
}

export function Skeleton(props: SkeletonProps): JSX.Element {
  const { className, rounded = true } = props;
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200 dark:bg-slate-800',
        rounded && 'rounded-md',
        className,
      )}
      aria-hidden="true"
    />
  );
}
