import type { JSX, ReactNode, TextareaHTMLAttributes } from 'react';
import { cloneElement, forwardRef, isValidElement, type ForwardedRef } from 'react';
import { cn } from './utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

function TextareaImpl(props: TextareaProps, ref: ForwardedRef<HTMLTextAreaElement>): JSX.Element {
  const { invalid = false, className, ...rest } = props;
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900',
        invalid
          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700',
        className,
      )}
      {...rest}
    />
  );
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(TextareaImpl);
Textarea.displayName = 'Textarea';

export interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export function Field(props: FieldProps): JSX.Element {
  const { label, htmlFor, hint, error, children } = props;
  const errorId = error !== undefined ? `${htmlFor}-error` : undefined;
  const hintId = error === undefined && hint !== undefined ? `${htmlFor}-hint` : undefined;
  const describedBy = errorId ?? hintId;

  // If the child is a valid React element and we have an error/hint id, inject
  // `aria-describedby` so screen readers announce the associated message.
  const child =
    describedBy !== undefined && isValidElement<Record<string, unknown>>(children)
      ? cloneElement(children, { 'aria-describedby': describedBy })
      : children;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {child}
      {error !== undefined ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface BadgeProps {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge(props: BadgeProps): JSX.Element {
  const { children, tone = 'default' } = props;
  const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
    default: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    danger: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
