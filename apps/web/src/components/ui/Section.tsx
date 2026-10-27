import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Section heading used across app and website: mono eyebrow, Outfit title, optional action. */
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  as: As = 'h2',
  size = 'md',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
  size?: 'md' | 'lg';
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <As className={cn('font-display font-semibold tracking-[-0.015em] text-ink-900', size === 'lg' ? 'text-[26px] sm:text-[30px]' : 'text-[20px]')}>{title}</As>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TILE_TONES = {
  green: { box: 'from-green-50 to-green-100/80 ring-green-100', icon: 'text-green-700', sub: 'text-green-800/70' },
  rose: { box: 'from-rose-50 to-rose-100/80 ring-rose-100', icon: 'text-rose-600', sub: 'text-rose-700/70' },
  lavender: { box: 'from-lavender-50 to-lavender-100/80 ring-lavender-100', icon: 'text-lavender-600', sub: 'text-lavender-700/70' },
  peach: { box: 'from-peach-50 to-peach-100/80 ring-peach-100', icon: 'text-peach-600', sub: 'text-peach-700/70' },
  sky: { box: 'from-sky-50 to-sky-100/80 ring-sky-100', icon: 'text-sky-600', sub: 'text-sky-700/70' },
  indigo: { box: 'from-indigo-50 to-indigo-100/80 ring-indigo-100', icon: 'text-indigo-600', sub: 'text-indigo-700/70' },
  butter: { box: 'from-butter-50 to-butter-100 ring-butter-200/60', icon: 'text-butter-600', sub: 'text-green-900/60' },
} as const;
export type TileTone = keyof typeof TILE_TONES;

/** Tinted quick-action tile (Myflo "Mood / Cramps / Drugs" cards): icon in a white disc, label, hint. */
export function IconTile({
  icon,
  label,
  hint,
  tone = 'green',
  to,
  onClick,
  className,
  badge,
}: {
  icon: ReactNode;
  label: string;
  hint?: ReactNode;
  tone?: TileTone;
  to?: string;
  onClick?: () => void;
  className?: string;
  badge?: ReactNode;
}) {
  const t = TILE_TONES[tone];
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft', t.icon)}>{icon}</span>
        {badge}
      </span>
      <span className="mt-4 block font-display text-[16px] font-semibold leading-tight text-ink-900">{label}</span>
      {hint && <span className={cn('mt-0.5 block text-[13px] leading-snug', t.sub)}>{hint}</span>}
    </>
  );
  const cls = cn('group block min-w-0 rounded-3xl bg-gradient-to-br p-4 text-left ring-1 ring-inset transition duration-200 hover:-translate-y-0.5 hover:shadow-card', t.box, className);
  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Horizontal snap carousel with arrow buttons (desktop) and swipe (touch). */
export function HScroll({ children, label, className, itemClass }: { children: ReactNode; label: string; className?: string; itemClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * Math.max(240, ref.current.clientWidth * 0.8), behavior: 'smooth' });
  return (
    <div className={cn('relative', className)}>
      <div ref={ref} role="region" aria-label={label} className={cn('snap-row', itemClass)}>
        {children}
      </div>
      <button
        type="button"
        aria-label={`Scroll ${label} left`}
        onClick={() => scroll(-1)}
        className="absolute -left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-700 shadow-card ring-1 ring-ink-100 transition hover:text-green-800 sm:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label={`Scroll ${label} right`}
        onClick={() => scroll(1)}
        className="absolute -right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-700 shadow-card ring-1 ring-ink-100 transition hover:text-green-800 sm:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

/** "See all →" text link used next to section titles. */
export function MoreLink({ to, children = 'See all' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-900">
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
