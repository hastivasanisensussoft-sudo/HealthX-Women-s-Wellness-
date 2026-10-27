import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, classifyDay, formatDate, monthGrid, sameMonth, startOfMonth, type CycleState, type ISODate, type PeriodLog } from '@healthx/shared';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Kind = ReturnType<typeof classifyDay>;
type Band = 'period' | 'predicted' | 'fertile' | null;

const bandOf = (k: Kind): Band =>
  k === 'period' ? 'period' : k === 'predicted_period' ? 'predicted' : k === 'fertile_estimate' || k === 'ovulation_estimate' ? 'fertile' : null;

const BAND_BG: Record<Exclude<Band, null>, string> = {
  period: 'bg-rose-100',
  predicted: 'bg-rose-50',
  fertile: 'bg-fertile-100/80',
};

/**
 * Month calendar with continuous range bands (Mira reference): logged period days are
 * solid blush, predicted period days dashed, the fertile-window ESTIMATE a mint band
 * with a dashed ring on the estimated ovulation day. Dashed = estimate.
 */
export function CycleCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  periods,
  cs,
  today,
  hasLogs,
  showFertile = true,
}: {
  month: ISODate;
  onMonth: (m: ISODate) => void;
  selected: ISODate;
  onSelect: (d: ISODate) => void;
  periods: PeriodLog[];
  cs: CycleState;
  today: ISODate;
  hasLogs: (d: ISODate) => boolean;
  showFertile?: boolean;
}) {
  const grid = monthGrid(month);
  const kindOf = (d: ISODate): Kind => {
    const k = classifyDay(d, periods, cs);
    return !showFertile && (k === 'fertile_estimate' || k === 'ovulation_estimate') ? 'none' : k;
  };
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <button aria-label="Previous month" onClick={() => onMonth(addMonths(month, -1))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-700 ring-1 ring-ink-200 transition hover:text-green-800 hover:ring-green-400">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink-900">{formatDate(month, 'month')}</p>
          {!sameMonth(month, today) && (
            <button onClick={() => onMonth(startOfMonth(today))} className="text-xs font-semibold text-green-700 hover:underline">
              Back to today
            </button>
          )}
        </div>
        <button aria-label="Next month" onClick={() => onMonth(addMonths(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-700 ring-1 ring-ink-200 transition hover:text-green-800 hover:ring-green-400">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-ink-100 pb-2 text-center font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-2 space-y-1.5" role="grid" aria-label={formatDate(month, 'month')}>
        {grid.map((week) => {
          const kinds = week.map(kindOf);
          const bands = kinds.map(bandOf);
          return (
            <div key={week[0]} role="row" className="grid grid-cols-7">
              {week.map((d, i) => {
                const kind = kinds[i];
                const band = bands[i];
                const joinL = band !== null && i > 0 && bands[i - 1] === band;
                const joinR = band !== null && i < 6 && bands[i + 1] === band;
                const inMonth = sameMonth(d, month);
                const isToday = d === today;
                const isSel = d === selected;
                const future = d > today;
                return (
                  <button
                    key={d}
                    role="gridcell"
                    aria-selected={isSel}
                    aria-label={`${formatDate(d, 'long')}${kind !== 'none' ? `, ${kind.replace('_', ' ')}` : ''}`}
                    onClick={() => onSelect(d)}
                    className={cn('group relative flex h-[64px] items-center justify-center focus-visible:ring-0', !inMonth && 'opacity-35')}
                  >
                    {band && (
                      <span
                        aria-hidden
                        className={cn('absolute inset-y-[12px]', BAND_BG[band], joinL ? 'left-0' : 'left-1 rounded-l-full', joinR ? 'right-0' : 'right-1 rounded-r-full')}
                      />
                    )}
                    {isToday && <span className="absolute -top-px font-mono text-[9px] font-medium uppercase leading-none tracking-[0.1em] text-green-700">Today</span>}
                    <span
                      className={cn(
                        'relative flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums transition',
                        kind === 'period' && 'bg-rose-500 text-white shadow-[0_6px_14px_-6px_rgba(223,92,128,.8)]',
                        kind === 'predicted_period' && 'border-2 border-dashed border-rose-300 bg-white/80 text-rose-700',
                        kind === 'fertile_estimate' && 'text-fertile-800',
                        kind === 'ovulation_estimate' && 'border-2 border-dashed border-fertile-600 bg-white text-fertile-800',
                        kind === 'none' && (future ? 'text-ink-400' : 'text-ink-800'),
                        kind === 'none' && 'group-hover:bg-green-50',
                        isToday && kind === 'none' && 'bg-green-50 text-green-800 ring-2 ring-green-700',
                        isSel && 'outline outline-2 outline-offset-2 outline-green-800',
                        'group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-green-500',
                      )}
                    >
                      {Number(d.slice(8))}
                    </span>
                    {hasLogs(d) && <span aria-hidden className={cn('absolute bottom-[4px] h-1 w-1 rounded-full', kind === 'period' ? 'bg-rose-400' : 'bg-green-500/80')} />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-ink-600">
        <Legend sample={<span className="h-3.5 w-3.5 rounded-full bg-rose-500" />} label="Period (logged)" />
        <Legend sample={<span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-rose-300 bg-white" />} label="Predicted period*" />
        {showFertile && <Legend sample={<span className="h-3 w-6 rounded-full bg-fertile-100" />} label="Fertile window estimate*" />}
        {showFertile && <Legend sample={<span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-fertile-600 bg-white" />} label="Ovulation estimate*" />}
        <Legend sample={<span className="h-1.5 w-1.5 rounded-full bg-green-600" />} label="Has logs" />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-400">* Estimates are calendar calculations based on your logs. They cannot confirm ovulation and are not contraception.</p>
    </div>
  );
}

function Legend({ sample, label }: { sample: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-ink-100">
      {sample}
      {label}
    </span>
  );
}
