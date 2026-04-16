import { forwardRef, type InputHTMLAttributes, type ForwardedRef, type JSX } from 'react';
import { cn } from './utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

function InputImpl(props: InputProps, ref: ForwardedRef<HTMLInputElement>): JSX.Element {
  const { invalid = false, className, ...rest } = props;
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900',
        invalid
          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700',
        className,
      )}
      {...rest}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(InputImpl);
Input.displayName = 'Input';
