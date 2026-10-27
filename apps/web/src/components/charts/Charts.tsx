import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { palette } from '@healthx/shared';

/* Evergreen chart theme: quiet ink-400 axes, hairline dashed grid, rounded marks, DM Sans labels, Outfit numbers. */
const FONT_SANS = '"DM Sans Variable", system-ui, sans-serif';
export type ChartTone = 'light' | 'dark';

/** Theme-aware colour from the palette CSS variables (--c- fills/strokes, --t- text), with the static palette value as fallback. */
const triple = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const cssVar = (kind: 'c' | 't', token: string, hex: string) => `rgb(var(--${kind}-${token}, ${triple(hex)}))`;

const THEME = {
  light: {
    tick: cssVar('t', 'ink-400', palette.ink[400]),
    grid: cssVar('c', 'ink-200', palette.ink[200]),
    ref: cssVar('c', 'ink-300', palette.ink[300]),
    refText: cssVar('t', 'ink-600', palette.ink[600]),
    refBg: cssVar('c', 'white', '#FFFFFF'),
    cursor: cssVar('c', 'green-50', palette.green[50]),
    cursorLine: cssVar('c', 'ink-200', palette.ink[200]),
    legend: cssVar('t', 'ink-600', palette.ink[600]),
    dotRing: cssVar('c', 'white', '#FFFFFF'),
  },
  /* On forest and night panels, which stay dark in every theme. */
  dark: { tick: 'rgba(255,255,255,.62)', grid: 'rgba(255,255,255,.12)', ref: 'rgba(255,255,255,.4)', refText: 'rgba(255,255,255,.95)', refBg: 'rgba(255,255,255,.14)', cursor: 'rgba(255,255,255,.07)', cursorLine: 'rgba(255,255,255,.3)', legend: 'rgba(255,255,255,.8)', dotRing: 'rgba(8,45,36,.9)' },
} as const;

const axisProps = (tone: ChartTone) => ({ tickLine: false, axisLine: false, tick: { fill: THEME[tone].tick, fontSize: 12, fontFamily: FONT_SANS }, tickMargin: 8 }) as const;
const gridProps = (tone: ChartTone) => ({ vertical: false, stroke: THEME[tone].grid, strokeDasharray: '4 6' }) as const;
const compact = (v: number) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${v}`);
const MARGIN = { top: 12, right: 8, left: -6, bottom: 0 };

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { name: string; value: number | null; color: string; payload?: { fill?: string } }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[132px] rounded-2xl border border-ink-100 bg-white/95 px-3.5 py-2.5 shadow-lift backdrop-blur">
      {label && <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">{label}</p>}
      <div className="space-y-1">
        {payload.map((p) => (
          <p key={p.name} className="flex items-center gap-2 text-[13px] text-ink-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: p.color ?? p.payload?.fill }} />
            <span className="flex-1">{p.name}</span>
            <span className="font-display text-[15px] font-semibold tabular-nums text-ink-900">
              {p.value ?? '—'}
              {unit && p.value !== null ? <span className="ml-0.5 text-xs font-medium text-ink-500">{unit.trim()}</span> : null}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

/** Pill label for target lines ("Target", "Goal"), drawn in SVG at the right end of the line. */
function TargetLabel({ viewBox, text, tone }: { viewBox?: { x: number; y: number; width: number }; text: string; tone: ChartTone }) {
  if (!viewBox) return null;
  const w = Math.round(text.length * 6.4 + 16);
  const x = viewBox.x + viewBox.width - w - 2;
  const y = viewBox.y < 32 ? viewBox.y + 4 : viewBox.y - 22;
  return (
    <g>
      <rect x={x} y={y} width={w} height={18} rx={9} fill={THEME[tone].refBg} stroke={THEME[tone].ref} strokeWidth={1} />
      <text x={x + w / 2} y={y + 12.5} textAnchor="middle" fontSize={11} fontWeight={600} fontFamily={FONT_SANS} fill={THEME[tone].refText}>
        {text}
      </text>
    </g>
  );
}

const legendProps = (tone: ChartTone) =>
  ({
    iconType: 'circle',
    iconSize: 9,
    wrapperStyle: { fontSize: 12.5, fontFamily: FONT_SANS, paddingTop: 10 },
    formatter: (v: string) => <span style={{ color: THEME[tone].legend, fontWeight: 600, marginRight: 6 }}>{v}</span>,
  }) as const;

export interface Series {
  key: string;
  name: string;
  color: string;
}

export function AreaTrend({
  data,
  xKey = 'label',
  series,
  height = 240,
  unit,
  yDomain,
  target,
  tone = 'light',
}: {
  data: object[];
  xKey?: string;
  series: Series[];
  height?: number;
  unit?: string;
  yDomain?: [number | 'auto', number | 'auto'];
  target?: { value: number; label: string };
  /** `dark` for charts placed on forest or night panels. */
  tone?: ChartTone;
}) {
  const t = THEME[tone];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={MARGIN}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}-${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={tone === 'dark' ? 0.45 : 0.26} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...gridProps(tone)} />
        <XAxis dataKey={xKey} {...axisProps(tone)} minTickGap={16} />
        <YAxis {...axisProps(tone)} domain={yDomain ?? ['auto', 'auto']} width={44} tickFormatter={compact} />
        <Tooltip cursor={{ stroke: t.cursorLine, strokeDasharray: '4 4' }} content={<ChartTooltip unit={unit} />} />
        {target && <ReferenceLine y={target.value} stroke={t.ref} strokeDasharray="5 5" label={<TargetLabel text={target.label} tone={tone} />} />}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.75}
            strokeLinecap="round"
            fill={`url(#g-${s.key}-${tone})`}
            connectNulls
            dot={false}
            activeDot={{ r: 5.5, fill: s.color, stroke: t.dotRing, strokeWidth: 3 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineTrend({
  data,
  xKey = 'label',
  series,
  height = 240,
  unit,
  yDomain,
  tone = 'light',
}: {
  data: object[];
  xKey?: string;
  series: Series[];
  height?: number;
  unit?: string;
  yDomain?: [number | 'auto', number | 'auto'];
  tone?: ChartTone;
}) {
  const t = THEME[tone];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={MARGIN}>
        <CartesianGrid {...gridProps(tone)} />
        <XAxis dataKey={xKey} {...axisProps(tone)} minTickGap={16} />
        <YAxis {...axisProps(tone)} domain={yDomain ?? ['auto', 'auto']} width={44} tickFormatter={compact} />
        <Tooltip cursor={{ stroke: t.cursorLine, strokeDasharray: '4 4' }} content={<ChartTooltip unit={unit} />} />
        {series.length > 1 && <Legend {...legendProps(tone)} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.75}
            strokeLinecap="round"
            dot={{ r: 3, fill: s.color, stroke: t.dotRing, strokeWidth: 1.5 }}
            activeDot={{ r: 5.5, fill: s.color, stroke: t.dotRing, strokeWidth: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarTrend({
  data,
  xKey = 'label',
  series,
  height = 240,
  unit,
  target,
  highlight,
  stacked,
  tone = 'light',
}: {
  data: object[];
  xKey?: string;
  series: Series[];
  height?: number;
  unit?: string;
  target?: { value: number; label: string };
  /** Returns a highlight colour for a datum, e.g. to flag an irregular cycle. */
  highlight?: (d: Record<string, unknown>) => string | undefined;
  stacked?: boolean;
  tone?: ChartTone;
}) {
  const t = THEME[tone];
  const radiusOf = (si: number): [number, number, number, number] => (!stacked ? [10, 10, 10, 10] : si === series.length - 1 ? [8, 8, 0, 0] : si === 0 ? [0, 0, 8, 8] : [0, 0, 0, 0]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={MARGIN} barCategoryGap={series.length > 1 && !stacked ? '22%' : '30%'} barGap={4}>
        <CartesianGrid {...gridProps(tone)} />
        <XAxis dataKey={xKey} {...axisProps(tone)} minTickGap={8} />
        <YAxis {...axisProps(tone)} width={44} tickFormatter={compact} />
        <Tooltip cursor={{ fill: t.cursor, radius: 12 } as object} content={<ChartTooltip unit={unit} />} />
        {target && <ReferenceLine y={target.value} stroke={t.ref} strokeDasharray="5 5" label={<TargetLabel text={target.label} tone={tone} />} ifOverflow="extendDomain" />}
        {series.length > 1 && <Legend {...legendProps(tone)} />}
        {series.map((s, si) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={radiusOf(si)} stackId={stacked ? 'a' : undefined} maxBarSize={series.length > 1 && !stacked ? 18 : 30}>
            {highlight && data.map((d, i) => <Cell key={i} fill={highlight(d as Record<string, unknown>) ?? s.color} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 200, inner = 58, outer = 82, children }: { data: { name: string; value: number; color: string }[]; height?: number; inner?: number; outer?: number; children?: ReactNode }) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={inner} outerRadius={outer} paddingAngle={4} cornerRadius={8} stroke="none" startAngle={90} endAngle={-270}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {children && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}

/** Tiny inline sparkline for stat cards. */
export function Sparkline({ values, color = palette.green[500], height = 36 }: { values: (number | null)[]; color?: string; height?: number }) {
  const data = values.map((v, i) => ({ i, v }));
  const id = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 3, right: 2, left: 2, bottom: 1 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2.25} strokeLinecap="round" fill={`url(#${id})`} connectNulls dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
