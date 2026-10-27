import type { ReactNode } from 'react';
import { CloudOff, Info, ShieldAlert, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('card card-pad space-y-3', className)} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i % 2 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
  compact,
}: {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-6' : 'gap-4 py-12', className)}>
      <div className={cn('relative flex items-center justify-center', compact ? 'h-14 w-14' : 'h-20 w-20')}>
        {!compact && <span aria-hidden className="leaf absolute -right-2 -top-1 h-8 w-8 bg-rose-100" />}
        <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-green-50 to-green-100" />
        <span className={cn('relative text-green-700', compact ? '[&_svg]:h-5 [&_svg]:w-5' : '[&_svg]:h-7 [&_svg]:w-7')}>{icon}</span>
      </div>
      <div>
        <p className="font-display text-[17px] font-semibold text-ink-900">{title}</p>
        {body && <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-500">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', body = 'We couldn’t load this. Please try again.', onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
        <CloudOff className="h-7 w-7" />
      </div>
      <div>
        <p className="font-display text-[17px] font-semibold text-ink-900">{title}</p>
        <p className="mt-1 text-sm text-ink-500">{body}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

const noticeTones = {
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', icon: <Info className="h-4 w-4 text-sky-500" /> },
  safety: { box: 'border-lavender-200 bg-lavender-50 text-ink-800', icon: <Stethoscope className="h-4 w-4 text-lavender-600" /> },
  warning: { box: 'border-warning/30 bg-warning-soft text-ink-800', icon: <ShieldAlert className="h-4 w-4 text-warning" /> },
  green: { box: 'border-green-200 bg-green-50 text-green-900', icon: <Info className="h-4 w-4 text-green-600" /> },
};

export function Notice({ tone = 'info', title, children, className, icon }: { tone?: keyof typeof noticeTones; title?: ReactNode; children: ReactNode; className?: string; icon?: ReactNode }) {
  const t = noticeTones[tone];
  return (
    <div className={cn('flex gap-3 rounded-2xl border p-4 text-sm', t.box, className)}>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80">{icon ?? t.icon}</span>
      <div className="min-w-0 leading-relaxed">
        {title && <p className="mb-0.5 font-bold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
