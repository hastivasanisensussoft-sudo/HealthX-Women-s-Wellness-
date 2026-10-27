import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type CyclePoint = { key: string; label: string; range: string; length: number; irregular: boolean };

/**
 * Cycle-length line (Myflo "Cycle history" reference): one 2px line over a soft band for
 * your usual range (average ± 4 days). Cycles outside the band get a lavender column and a
 * "Differs" label — an observed pattern, never a diagnosis. Points are focusable and show a
 * tooltip on hover or focus; the logged-cycles list beside it is the table view.
 */
export function CycleLengthChart({ points, avg, height = 240, className }: { points: CyclePoint[]; avg: number; height?: number; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(520);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { l: 34, r: 24, t: 30, b: 30 };
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const vals = points.map((p) => p.length);
  const lo = Math.floor(Math.min(...vals, avg - 4) - 2);
  const hi = Math.ceil(Math.max(...vals, avg + 4) + 2);
  const y = (v: number) => pad.t + ih - ((v - lo) / Math.max(1, hi - lo)) * ih;
  const step = points.length > 1 ? iw / (points.length - 1) : 0;
  const x = (i: number) => pad.l + (points.length > 1 ? i * step : iw / 2);
  const tickStep = Math.max(1, Math.ceil((hi - lo) / 4));
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / tickStep) * tickStep; v <= hi; v += tickStep) ticks.push(v);
  const colW = points.length > 1 ? Math.max(18, Math.min(34, step * 0.7)) : 34;
  const every = Math.max(1, Math.ceil((points.length * 52) / iw));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.length)}`).join(' ');
  const last = points.length - 1;
  const a = active !== null ? points[active] : null;

  return (
    <div ref={wrap} className={cn('relative', className)}>
      <svg width={w} height={height} role="group" aria-label={`Cycle length by cycle. Your average is ${avg} days; the shaded band is your usual range, ${avg - 4} to ${avg + 4} days.`} className="block overflow-visible">
        <rect x={pad.l} y={y(avg + 4)} width={iw} height={Math.max(0, y(avg - 4) - y(avg + 4))} rx={10} className="fill-green-50" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} strokeWidth={1} className="stroke-ink-100" />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} className="fill-ink-400 font-mono">
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          p.irregular ? (
            <g key={`col-${p.key}`}>
              <rect x={x(i) - colW / 2} y={pad.t - 22} width={colW} height={ih + 22} rx={colW / 2} className="fill-lavender-50" />
              {/* Neighbouring labels would collide on narrow charts: label only the first of a run. */}
              {(step >= 52 || i === 0 || !points[i - 1].irregular) && (
                <text x={x(i)} y={pad.t - 10} textAnchor="middle" fontSize={10} className="fill-ink-500 font-mono">
                  Differs
                </text>
              )}
            </g>
          ) : null,
        )}
        <line x1={pad.l} x2={w - pad.r} y1={y(avg)} y2={y(avg)} strokeWidth={1} className="stroke-ink-300" />
        {points.length > 1 && <path d={path} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-green-500" />}
        {points.map((p, i) => (
          <circle key={`dot-${p.key}`} cx={x(i)} cy={y(p.length)} r={active === i ? 6.5 : 5} strokeWidth={2} className={cn('stroke-white transition-all', p.irregular ? 'fill-lavender-500' : 'fill-green-600')} />
        ))}
        {last >= 0 && (
          <text x={x(last)} y={y(points[last].length) - 12} textAnchor="middle" fontSize={11.5} fontWeight={600} className="fill-ink-700">
            {points[last].length}d
          </text>
        )}
        {points.map((p, i) =>
          i % every === 0 || i === last ? (
            <text key={`x-${p.key}`} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} className="fill-ink-400">
              {p.label}
            </text>
          ) : null,
        )}
        {points.map((p, i) => (
          <circle
            key={`hit-${p.key}`}
            cx={x(i)}
            cy={y(p.length)}
            r={16}
            fill="transparent"
            tabIndex={0}
            role="img"
            aria-label={`${p.range}: ${p.length}-day cycle${p.irregular ? ', differs from your usual range (observed pattern)' : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="cursor-pointer outline-none"
          />
        ))}
        {active !== null && <circle cx={x(active)} cy={y(points[active].length)} r={11} fill="none" strokeWidth={2} className="pointer-events-none stroke-green-600/40" />}
      </svg>
      {a && active !== null && (
        <div className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs shadow-lift" style={{ left: Math.min(Math.max(x(active), 90), w - 90), top: y(a.length) - 14 }}>
          <p className="font-semibold text-ink-900">{a.range}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-ink-600">
            <span aria-hidden className={cn('h-2 w-2 rounded-full', a.irregular ? 'bg-lavender-500' : 'bg-green-600')} />
            {a.length}-day cycle
          </p>
          {a.irregular && <p className="mt-0.5 text-ink-500">{a.length > avg ? `${a.length - avg} days longer` : `${avg - a.length} days shorter`} than your average · observed pattern</p>}
        </div>
      )}
    </div>
  );
}
