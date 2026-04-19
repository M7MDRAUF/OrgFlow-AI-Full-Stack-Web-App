import { useEffect, useId, useRef, type JSX, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './utils/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal(props: PropsWithChildren<ModalProps>): JSX.Element | null {
  const { open, onClose, title, footer, size = 'md', closeOnBackdrop = true, children } = props;
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusableSelector =
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const container = containerRef.current;
        if (container === null) return;
        const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (first === undefined || last === undefined) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    const container = containerRef.current;
    if (container !== null) {
      const first = container.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    }
    return () => {
      window.removeEventListener('keydown', handleKey);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={typeof title === 'string' ? titleId : undefined}
      aria-label={typeof title !== 'string' ? 'Dialog' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={containerRef}
        className={cn('w-full rounded-xl bg-white shadow-xl dark:bg-slate-900', sizeClasses[size])}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {title !== undefined && (
          <header
            id={typeof title === 'string' ? titleId : undefined}
            className="border-b border-slate-200 px-5 py-4 text-base font-semibold dark:border-slate-800"
          >
            {title}
          </header>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer !== undefined && (
          <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
