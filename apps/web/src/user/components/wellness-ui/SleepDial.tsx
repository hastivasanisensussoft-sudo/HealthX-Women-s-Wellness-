import { Moon, Sun } from 'lucide-react';
import { clockToMinutes, formatClock } from '@healthx/shared';
import { cn, formatMinutes } from '@/lib/utils';

const LABELS = [
  { min: 0, text: '12a' },
  { min: 360, text: '6a' },
  { min: 720, text: '12p' },
  { min: 1080, text: '6p' },
];

/** 24-hour clock dial: the arc runs from bedtime to wake time (midnight at the top). */
export function SleepDial({ bedtime, wake, size = 232, className }: { bedtime: string; wake: string; size?: number; className?: string }) {
  const b = clockToMinutes(bedtime);
  const w = clockToMinutes(wake);
  const valid = Number.isFinite(b) && Number.isFinite(w);
  const dur = valid ? (w - b + 1440) % 1440 : 0;
  const c = size / 2;
  const r = c - 34;
  const pt = (min: number, rr = r) => {
    const a = (min / 1440) * Math.PI * 2 - Math.PI / 2;
    return [c + rr * Math.cos(a), c + rr * Math.sin(a)] as const;
  };
  const [x1, y1] = pt(b);
  const [x2, y2] = pt(w);
  const arc = `M ${x1} ${y1} A ${r} ${r} 0 ${dur > 720 ? 1 : 0} 1 ${x2} ${y2}`;
  const marker = (x: number, y: number) => ({ left: `${(x / size) * 100}%`, top: `${(y / size) * 100}%` });
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }} role="img" aria-label={valid ? `Sleep window ${formatClock(bedtime)} to ${formatClock(wake)}, ${formatMinutes(dur)}` : 'Sleep window not set'}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={c} cy={c} r={r + 24} className="fill-indigo-50/60" />
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={16} className="stroke-white" />
        {Array.from({ length: 24 }).map((_, i) => {
          const [ax, ay] = pt(i * 60, r - 14);
          const [bx, by] = pt(i * 60, r - (i % 6 === 0 ? 21 : 18));
          return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} strokeWidth={i % 6 === 0 ? 2 : 1.25} strokeLinecap="round" className={i % 6 === 0 ? 'stroke-ink-400' : 'stroke-ink-200'} />;
        })}
        {valid && dur > 0 && <path d={arc} fill="none" strokeWidth={16} strokeLinecap="round" className="stroke-indigo-400" />}
        {valid && dur > 0 && <path d={arc} fill="none" strokeWidth={5} strokeLinecap="round" className="stroke-lavender-200" opacity={0.7} />}
        {LABELS.map((l) => {
          const [lx, ly] = pt(l.min, r + 22);
          return (
            <text key={l.min} x={lx} y={ly + 3.5} textAnchor="middle" fontSize={10} className="fill-ink-500 font-mono">
              {l.text}
            </text>
          );
        })}
      </svg>
      {valid && (
        <>
          <span className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-indigo-600 shadow-soft ring-2 ring-indigo-200" style={marker(x1, y1)}>
            <Moon className="h-4 w-4" />
          </span>
          <span className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-butter-500 shadow-soft ring-2 ring-butter-200" style={marker(x2, y2)}>
            <Sun className="h-4 w-4" />
          </span>
        </>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-400">Asleep</p>
        <p className="num mt-0.5 text-[26px] leading-none text-ink-900">{valid ? formatMinutes(dur) : '—'}</p>
      </div>
    </div>
  );
}
