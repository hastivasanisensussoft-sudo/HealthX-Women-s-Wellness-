import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  color = 'rgb(var(--c-green-500))',
  track = 'rgb(var(--c-green-100))',
  children,
  className,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, className, color = 'bg-green-500', track = 'bg-green-100', height = 'h-2.5', label }: { value: number; className?: string; color?: string; track?: string; height?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn('w-full overflow-hidden rounded-full', track, height, className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-700', color)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}
