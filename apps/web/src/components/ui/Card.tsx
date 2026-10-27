import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-inset ring-green-100">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate font-display text-[17px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardLink({ to, children = 'View all' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex shrink-0 items-center gap-1 rounded-full px-1 text-sm font-semibold text-green-700 hover:text-green-900">
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

const tones = {
  green: 'bg-green-50 text-green-700',
  rose: 'bg-rose-50 text-rose-600',
  lavender: 'bg-lavender-50 text-lavender-600',
  peach: 'bg-peach-50 text-peach-600',
  sky: 'bg-sky-50 text-sky-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  butter: 'bg-butter-50 text-butter-600',
};
export type Tone = keyof typeof tones;
export const toneClass = (t: Tone) => tones[t];

export function StatCard({
  label,
  value,
  unit,
  icon,
  tone = 'green',
  hint,
  trend,
  className,
  children,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  trend?: { dir: 'up' | 'down' | 'flat'; text: string };
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cn('card-pad flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-600">{label}</span>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', tones[tone])}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        {/* 28px: admin-api.mjs finds stat values by this class. */}
        <span className="num text-[28px] leading-none text-ink-900">{value}</span>
        {unit && <span className="text-sm font-semibold text-ink-500">{unit}</span>}
      </div>
      {children}
      {(hint || trend) && (
        <div className="flex items-center gap-2 text-xs text-ink-500">
          {trend && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-bold',
                trend.dir === 'up' && 'bg-green-100 text-green-700',
                trend.dir === 'down' && 'bg-peach-100 text-peach-600',
                trend.dir === 'flat' && 'bg-ink-100 text-ink-600',
              )}
            >
              {trend.text}
            </span>
          )}
          {hint}
        </div>
      )}
    </Card>
  );
}
