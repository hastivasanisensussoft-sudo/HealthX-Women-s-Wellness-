import { cn } from '@/lib/utils';

type Seg = { key: string; label: string; from: number; to: number; cls: string; estimate?: boolean };

/**
 * Horizontal range band of one cycle (Mira reference): period, follicular, the dashed
 * fertile-window ESTIMATE and luteal days, with a marker for today. Dashed = estimate.
 */
export function PhaseTimeline({
  cycleLength,
  periodLength,
  currentDay,
  fertileStart,
  fertileEnd,
  dark,
  className,
}: {
  cycleLength: number;
  periodLength: number;
  currentDay: number | null;
  fertileStart: number | null;
  fertileEnd: number | null;
  dark?: boolean;
  className?: string;
}) {
  const len = Math.max(cycleLength, 1);
  const p = Math.min(periodLength, len);
  const fs = fertileStart && fertileStart > p ? fertileStart : null;
  const fe = fs && fertileEnd && fertileEnd >= fs ? Math.min(fertileEnd, len) : null;
  const segs: Seg[] = [{ key: 'period', label: 'Period', from: 1, to: p, cls: 'bg-rose-400' }];
  if (fs && fe) {
    if (fs - 1 > p) segs.push({ key: 'follicular', label: 'Follicular*', from: p + 1, to: fs - 1, cls: dark ? 'bg-sky-300/80' : 'bg-sky-200' });
    segs.push({ key: 'fertile', label: 'Fertile window*', from: fs, to: fe, cls: '', estimate: true });
    if (fe < len) segs.push({ key: 'luteal', label: 'Luteal*', from: fe + 1, to: len, cls: dark ? 'bg-lavender-300/80' : 'bg-lavender-200' });
  } else if (len > p) segs.push({ key: 'rest', label: 'Rest of cycle*', from: p + 1, to: len, cls: dark ? 'bg-white/20' : 'bg-ink-100' });
  const pct = (d: number) => ((d - 1) / len) * 100;
  const day = currentDay ? Math.min(currentDay, len) : null;
  const summary = segs.map((s) => `${s.label.replace('*', '')} days ${s.from}–${s.to}`).join(', ');
  return (
    <div className={className}>
      <div role="img" aria-label={`Cycle of about ${len} days: ${summary}${day ? `. Today is cycle day ${day}.` : '.'} Shapes marked * are estimates.`} className="relative pt-7">
        {day && (
          <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${Math.min(96, Math.max(4, pct(day) + 50 / len))}%` }} aria-hidden>
            <span className={cn('block rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em]', dark ? 'bg-white text-green-900' : 'bg-green-800 text-white')}>Day {day}</span>
          </span>
        )}
        <div className="flex h-4 gap-1">
          {segs.map((s) => (
            <span
              key={s.key}
              title={`${s.label} · days ${s.from}–${s.to}`}
              className={cn('h-full rounded-full', s.cls, s.estimate && (dark ? 'border-2 border-dashed border-green-300 bg-green-300/20' : 'border-2 border-dashed border-green-500 bg-green-100'))}
              style={{ flexGrow: s.to - s.from + 1, flexBasis: 0 }}
            />
          ))}
        </div>
        {day && <span aria-hidden className={cn('absolute top-[22px] h-[26px] w-[3px] -translate-x-1/2 rounded-full', dark ? 'bg-white' : 'bg-green-900')} style={{ left: `${pct(day) + 50 / len}%` }} />}
        <div aria-hidden className={cn('mt-2 flex justify-between font-mono text-[10.5px]', dark ? 'text-white/55' : 'text-ink-400')}>
          <span>Day 1</span>
          <span>Day {Math.round(len / 2)}</span>
          <span>Day {len}</span>
        </div>
      </div>
      <ul className={cn('mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold', dark ? 'text-white/80' : 'text-ink-600')}>
        {segs.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn('h-2.5 w-4 rounded-full', s.estimate ? (dark ? 'border-[1.5px] border-dashed border-green-300' : 'border-[1.5px] border-dashed border-green-500 bg-green-100') : s.cls)} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
