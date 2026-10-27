import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-green-950/45 backdrop-blur-[3px]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-[30px] bg-white shadow-lift outline-none sm:animate-scale-in sm:rounded-3xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl',
        )}
      >
        <span aria-hidden className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-ink-200 sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-4 sm:pt-6">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded-full bg-ink-50 p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto px-6 pb-6 pt-2">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-6 py-4 sm:rounded-b-3xl">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="h-10 rounded-full px-4 text-sm font-semibold text-ink-700 hover:bg-ink-100" onClick={onClose}>
            Cancel
          </button>
          <button
            className={cn('h-10 rounded-full px-5 text-sm font-semibold text-white', danger ? 'bg-danger hover:bg-red-700' : 'bg-green-700 hover:bg-green-800')}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-600">{body}</div>
    </Modal>
  );
}

/** Click-outside dropdown panel anchored to a trigger. */
export function Popover({
  trigger,
  children,
  align = 'right',
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={cn('absolute top-full z-50 mt-2 animate-scale-in overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-lift', align === 'right' ? 'right-0' : 'left-0', className)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-green-950 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lift transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
