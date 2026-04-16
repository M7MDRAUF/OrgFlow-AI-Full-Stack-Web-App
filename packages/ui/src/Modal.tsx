import { useEffect, type JSX, type PropsWithChildren, type ReactNode } from 'react';
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

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Dialog'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={cn('w-full rounded-xl bg-white shadow-xl dark:bg-slate-900', sizeClasses[size])}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {title !== undefined && (
          <header className="border-b border-slate-200 px-5 py-4 text-base font-semibold dark:border-slate-800">
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
