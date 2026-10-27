import { Droplet } from 'lucide-react';
import { addDays, diffDays, formatDate, type Flow, type ISODate, type Severity } from '@healthx/shared';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Friendly date chooser: Today / Yesterday / 2 days ago chips plus a date field (keeps the field's id for labels and tests). */
export function DateQuickPick({ id, value, onChange, today, label = 'Date', days = 3, className }: { id: string; value: ISODate; onChange: (d: ISODate) => void; today: ISODate; label?: string; days?: number; className?: string }) {
  const quick = Array.from({ length: days }, (_, i) => addDays(today, -i));
  const name = (d: ISODate) => {
    const n = diffDays(d, today);
    return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`;
  };
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Quick ${label.toLowerCase()}`}>
          {quick.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={value === d}
              onClick={() => onChange(d)}
              className={cn('inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold transition', value === d ? 'bg-green-800 text-white shadow-soft' : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-green-300')}
            >
              {name(d)}
            </button>
          ))}
        </div>
        <Input id={id} type="date" max={today} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className="h-11 w-[176px]" />
      </div>
      <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-400" aria-live="polite">
        {value ? formatDate(value, 'long') : 'Choose a date'}
      </p>
    </div>
  );
}

const FLOW_TINT: Record<Flow, string> = {
  light: 'from-rose-50 to-white',
  medium: 'from-rose-100/80 to-rose-50',
  heavy: 'from-rose-200/70 to-rose-100/70',
  very_heavy: 'from-rose-300/60 to-rose-200/60',
};

/** Flow option with drop icons — a tinted card chip that deepens with flow. */
export function FlowChip({ flow, label, drops, selected, onClick, compact }: { flow: Flow; label: string; drops: number; selected: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b text-sm font-semibold transition',
        compact ? 'min-h-[60px] px-2 py-2' : 'min-h-[84px] px-2 py-3',
        FLOW_TINT[flow],
        selected ? 'text-rose-700 ring-2 ring-rose-500 ring-offset-2' : 'text-ink-700 ring-1 ring-inset ring-rose-100 hover:ring-rose-300',
      )}
    >
      <span className="flex gap-0.5 text-rose-500" aria-hidden>
        {Array.from({ length: drops }).map((_, i) => (
          <Droplet key={i} className={cn('fill-current', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        ))}
      </span>
      {label}
    </button>
  );
}

const SEV_LEVEL: Record<Severity, number> = { mild: 1, moderate: 2, severe: 3 };
const SEV_COLOR: Record<Severity, string> = { mild: 'bg-green-500', moderate: 'bg-peach-500', severe: 'bg-rose-500' };

/** Three small bars that show severity at a glance (decorative; the label carries the meaning). */
export function SeverityDots({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex items-end gap-[2px]', className)}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn('w-[3px] rounded-full', i <= SEV_LEVEL[severity] ? SEV_COLOR[severity] : 'bg-ink-200')} style={{ height: 4 + i * 3 }} />
      ))}
    </span>
  );
}
