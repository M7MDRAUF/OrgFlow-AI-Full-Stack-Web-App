import { forwardRef, type ForwardedRef, type JSX, type SelectHTMLAttributes } from 'react';
import { cn } from './utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  invalid?: boolean;
}

function SelectImpl(props: SelectProps, ref: ForwardedRef<HTMLSelectElement>): JSX.Element {
  const { options, invalid = false, className, ...rest } = props;
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900',
        invalid
          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700',
        className,
      )}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(SelectImpl);
Select.displayName = 'Select';
