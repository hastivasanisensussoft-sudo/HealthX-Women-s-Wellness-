import { useState, type ReactNode } from 'react';
import { Asterisk, FlaskConical, Server } from 'lucide-react';
import { COPY } from '@healthx/shared';
import { cn } from '@/lib/utils';

const tones = {
  green: 'bg-green-100 text-green-800',
  mint: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  rose: 'bg-rose-100 text-rose-700',
  lavender: 'bg-lavender-100 text-lavender-700',
  peach: 'bg-peach-100 text-peach-700',
  sky: 'bg-sky-100 text-sky-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  butter: 'bg-butter-100 text-green-900',
  gray: 'bg-ink-100 text-ink-600',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  dark: 'bg-green-900 text-white',
};
export type BadgeTone = keyof typeof tones;

export function Badge({ tone = 'green', children, className, icon }: { tone?: BadgeTone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold tracking-[0.005em]', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

/** SRS phase marker for features planned beyond the MVP. */
export function PhaseBadge({ phase, className }: { phase: 2 | 3 | 4; className?: string }) {
  return (
    <Badge tone={phase === 2 ? 'lavender' : phase === 3 ? 'peach' : 'sky'} className={className} icon={<FlaskConical className="h-3 w-3" />}>
      {phase === 2 ? 'Phase 2' : `Phase ${phase} preview`}
    </Badge>
  );
}

/** Marks UI that only simulates something a backend must do. */
export function BackendBadge({ className, label = 'Requires backend — simulated' }: { className?: string; label?: string }) {
  return (
    <Badge tone="gray" className={className} icon={<Server className="h-3 w-3" />}>
      {label}
    </Badge>
  );
}

/** "Estimate*" label with explanation (SRS §11, §12, §67). */
export function EstimateMarker({ className, label = COPY.estimateShort }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        aria-label="What does estimate mean?"
        className="inline-flex items-center gap-0.5 rounded-full bg-lavender-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-lavender-600 hover:bg-lavender-200"
      >
        {label}
        <Asterisk className="h-3 w-3" />
      </button>
      {open && (
        <span className="absolute left-0 top-full z-30 mt-2 w-64 animate-scale-in rounded-xl bg-green-950 p-3 text-xs font-medium normal-case leading-relaxed tracking-normal text-white shadow-lift">
          {COPY.estimate} {COPY.ovulationNotConfirmed}
        </span>
      )}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn('inline-block h-2 w-2 rounded-full', className)} />;
}
