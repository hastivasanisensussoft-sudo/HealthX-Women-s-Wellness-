import { useId, type ReactNode } from 'react';
import { palette } from '@healthx/shared';
import { cv, surfaceVar, tv } from '@/theme/engine';

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

export interface CycleRingProps {
  cycleLength: number;
  periodLength: number;
  currentDay: number | null;
  fertileStart?: number | null; // cycle day numbers (estimates)
  fertileEnd?: number | null;
  size?: number;
  stroke?: number;
  showLabels?: boolean;
  children?: ReactNode;
}

/**
 * Cycle wheel (Mira / Moonly references): blush period arc, sky follicular, a dashed
 * mint fertile-window ESTIMATE arc, lavender luteal, and a white knob for today.
 * Dashed = estimate, everywhere in HealthX.
 */
export function CycleRing({ cycleLength, periodLength, currentDay, fertileStart, fertileEnd, size = 280, stroke = 20, showLabels = true, children }: CycleRingProps) {
  const gid = useId().replace(/:/g, '');
  const pad = showLabels ? 34 : 8;
  const vb = size;
  const cx = vb / 2;
  const cy = vb / 2;
  const r = vb / 2 - pad - stroke / 2;
  const len = Math.max(cycleLength, 1);
  const per = 360 / len;
  const gap = Math.min(3, per * 0.35); // small breathing space between phases
  const dayStart = (d: number) => (d - 1) * per;
  const dayEnd = (d: number) => d * per;
  const day = currentDay ? Math.min(currentDay, len) : null;
  const marker = day ? polar(cx, cy, r, dayStart(day) + per / 2) : null;
  const pLen = Math.min(periodLength, len);
  const fs = fertileStart && fertileStart > pLen ? fertileStart : null;
  const fe = fs && fertileEnd && fertileEnd >= fs ? Math.min(fertileEnd, len) : null;

  const seg = (start: number, end: number, color: string, extra?: Record<string, string | number>) =>
    end - start > gap * 2 ? <path d={arc(cx, cy, r, start + gap, end - gap)} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" {...extra} /> : null;

  const label = (text: string, startDay: number, endDay: number, color: string) => {
    if (endDay < startDay) return null;
    const mid = (dayStart(startDay) + dayEnd(endDay)) / 2;
    const p = polar(cx, cy, r + stroke / 2 + 17, mid);
    return (
      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={10.5} fontWeight={500} style={{ fill: color, letterSpacing: '0.12em', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
        {text}
      </text>
    );
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={`${gid}-period`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.rose[300]} />
            <stop offset="100%" stopColor={palette.rose[500]} />
          </linearGradient>
          <radialGradient id={`${gid}-core`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" style={{ stopColor: surfaceVar }} />
            <stop offset="100%" style={{ stopColor: cv('green', 50) }} />
          </radialGradient>
        </defs>
        {/* soft inner disc + track */}
        <circle cx={cx} cy={cy} r={r - stroke / 2 - 6} fill={`url(#${gid}-core)`} />
        <circle cx={cx} cy={cy} r={r} fill="none" style={{ stroke: cv('ink', 100) }} strokeWidth={stroke} opacity={0.7} />
        {/* phases */}
        {seg(dayEnd(pLen), fs ? dayStart(fs) : 360, palette.sky[200])}
        {fe && fe < len && seg(dayEnd(fe), 360, palette.lavender[200])}
        {fs && fe && seg(dayStart(fs), dayEnd(fe), palette.green[300], { strokeDasharray: '9 6' })}
        {seg(0, dayEnd(pLen), `url(#${gid}-period)`)}
        {/* day ticks */}
        {Array.from({ length: len }, (_, i) => {
          const p = polar(cx, cy, r - stroke / 2 - 9, dayStart(i + 1) + per / 2);
          return <circle key={i} cx={p.x} cy={p.y} r={i + 1 === day ? 0 : 1.3} style={{ fill: cv('ink', 300) }} />;
        })}
        {marker && (
          <g>
            <circle cx={marker.x} cy={marker.y} r={stroke / 2 + 6} strokeWidth={3} style={{ fill: surfaceVar, stroke: cv('green', 800), filter: 'drop-shadow(0 3px 6px rgb(var(--c-green-900) / 0.25))' }} />
            <circle cx={marker.x} cy={marker.y} r={4.5} style={{ fill: cv('green', 800) }} />
          </g>
        )}
        {showLabels && (
          <>
            {label('PERIOD', 1, pLen, tv('rose', 600))}
            {fs && fe && label('FERTILE*', fs, fe, tv('fertile', 700))}
            {fs && label('FOLLICULAR', pLen + 1, Math.max(pLen + 1, fs - 1), tv('sky', 600))}
            {fe && fe < len && label('LUTEAL', fe + 1, len, tv('lavender', 600))}
          </>
        )}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}
