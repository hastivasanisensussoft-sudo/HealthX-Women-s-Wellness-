import { addDays, fromISODate, type ISODate } from '@healthx/shared';
import { cn } from '@/lib/utils';

export type StripMark = 'period' | 'predicted' | 'fertile' | 'ovulation' | null;

const MARK: Record<Exclude<StripMark, null>, string> = {
  period: 'bg-rose-500',
  predicted: 'border border-dashed border-rose-400 bg-white',
  fertile: 'bg-fertile-400',
  ovulation: 'border border-dashed border-fertile-700 bg-white',
};

const dayName = (d: ISODate) => fromISODate(d).toLocaleDateString('en', { weekday: 'short' });

/**
 * Seven-day strip (Mira reference): weekday over date, the selected day in a soft
 * green pill, today underlined, and a dot for period / fertile-window estimates.
 */
export function WeekStrip({
  start,
  selected,
  today,
  onSelect,
  markOf,
  hasLogs,
  className,
  tone = 'light',
}: {
  /** First day shown. */
  start: ISODate;
  selected: ISODate;
  today: ISODate;
  onSelect?: (d: ISODate) => void;
  markOf?: (d: ISODate) => StripMark;
  hasLogs?: (d: ISODate) => boolean;
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div role="group" aria-label="This week" className={cn('grid grid-cols-7 gap-1', className)}>
      {days.map((d) => {
        const sel = d === selected;
        const isToday = d === today;
        const mark = markOf?.(d) ?? null;
        const future = d > today;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect?.(d)}
            aria-pressed={sel}
            aria-label={`${fromISODate(d).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? ', today' : ''}`}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl px-1 py-2 transition',
              tone === 'light' && (sel ? 'bg-green-100 text-green-900 ring-1 ring-green-200' : 'text-ink-600 hover:bg-green-50'),
              tone === 'dark' && (sel ? 'bg-white text-green-900' : 'text-white/80 hover:bg-white/10'),
            )}
          >
            <span className={cn('font-mono text-[10.5px] uppercase tracking-[0.1em]', tone === 'light' && !sel && 'text-ink-400')}>{dayName(d)}</span>
            <span className={cn('num text-[18px] leading-none', future && !sel && tone === 'light' && 'text-ink-400', isToday && !sel && 'underline decoration-2 underline-offset-4 decoration-green-500')}>{Number(d.slice(8))}</span>
            <span className="flex h-2 items-center gap-0.5">
              {mark && <span className={cn('h-2 w-2 rounded-full', MARK[mark], tone === 'dark' && !sel && mark === 'ovulation' && 'border-fertile-300 bg-transparent', tone === 'dark' && !sel && mark === 'predicted' && 'bg-transparent')} />}
              {hasLogs?.(d) && !mark && <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'dark' ? 'bg-white/70' : 'bg-green-600')} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
