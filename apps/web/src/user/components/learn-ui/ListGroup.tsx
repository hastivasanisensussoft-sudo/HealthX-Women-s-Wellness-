import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { TileTone } from '@/components/ui';
import { cn } from '@/lib/utils';
import { TONE_SOFT } from './tones';

/** Tinted rounded icon disc used at the start of list rows. */
export function RowIcon({ tone = 'green', size = 'md', children, className }: { tone?: TileTone; size?: 'sm' | 'md'; children: ReactNode; className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center ring-1 ring-inset', size === 'sm' ? 'h-10 w-10 rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]' : 'h-11 w-11 rounded-2xl [&_svg]:h-5 [&_svg]:w-5', TONE_SOFT[tone], className)}>
      {children}
    </span>
  );
}

/** Grouped list card (settings style): small heading above a white card of divided rows. */
export function ListGroup({
  title,
  eyebrow,
  action,
  footer,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={cn('min-w-0', className)} aria-labelledby={id && title ? `${id}-title` : undefined}>
      {(title || eyebrow) && (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="font-display text-[18px] font-semibold tracking-[-0.01em] text-ink-900">
                {title}
              </h2>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="card divide-y divide-ink-100 overflow-hidden">{children}</div>
      {footer && <div className="mt-2.5 px-1 text-xs leading-relaxed text-ink-400">{footer}</div>}
    </section>
  );
}

/** One row of a ListGroup: icon, label + hint, optional right-hand control; a link or button when `to` / `onClick` is set. */
export function ListRow({
  icon,
  tone = 'green',
  label,
  hint,
  right,
  to,
  onClick,
  className,
  stack,
}: {
  icon?: ReactNode;
  tone?: TileTone;
  label: ReactNode;
  hint?: ReactNode;
  right?: ReactNode;
  to?: string;
  onClick?: () => void;
  className?: string;
  /** Put the right-hand control under the text on phones. */
  stack?: boolean;
}) {
  const nav = !!(to || onClick);
  const body = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3.5">
        {icon && <RowIcon tone={tone}>{icon}</RowIcon>}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug text-ink-900">{label}</span>
          {hint && <span className="mt-0.5 block text-sm leading-snug text-ink-500">{hint}</span>}
        </span>
      </span>
      {right && <span className={cn('flex shrink-0 items-center gap-2', stack && 'pl-[58px] sm:pl-0')}>{right}</span>}
      {nav && <ChevronRight className="h-5 w-5 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-green-700" aria-hidden />}
    </>
  );
  const cls = cn('group flex min-h-[68px] w-full gap-3 px-5 py-3.5 text-left sm:px-6', stack ? 'flex-col sm:flex-row sm:items-center' : 'items-center', nav && 'transition hover:bg-green-50/50', className);
  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}
