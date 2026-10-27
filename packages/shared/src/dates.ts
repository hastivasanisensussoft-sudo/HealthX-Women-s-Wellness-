/**
 * Local-calendar date helpers. All dates are `YYYY-MM-DD` strings; arithmetic is
 * done in UTC on the y/m/d parts so DST transitions never shift a day (SRS §70).
 */
import type { ISODate } from './types';

const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

function parts(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** Local Date at noon — safe for display formatting across DST. */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const [y, m, d] = parts(iso);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole days from `a` to `b` (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

export function isBetween(iso: ISODate, start: ISODate, end: ISODate): boolean {
  return iso >= start && iso <= end;
}

export function rangeDays(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Last `n` days ending at `end` (inclusive), oldest first. */
export function lastNDays(end: ISODate, n: number): ISODate[] {
  return rangeDays(addDays(end, -(n - 1)), end);
}

export function weekday(iso: ISODate): number {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Monday-based week start. */
export function startOfWeek(iso: ISODate): ISODate {
  const wd = weekday(iso);
  return addDays(iso, -((wd + 6) % 7));
}

export function startOfMonth(iso: ISODate): ISODate {
  const [y, m] = parts(iso);
  return `${y}-${pad(m)}-01`;
}

export function addMonths(iso: ISODate, n: number): ISODate {
  const [y, m] = parts(iso);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`;
}

export function daysInMonth(iso: ISODate): number {
  const [y, m] = parts(iso);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * 6×7 grid of dates for a month view (Monday first). Cells outside the month are
 * included so the grid is always rectangular.
 */
export function monthGrid(monthISO: ISODate): ISODate[][] {
  const first = startOfMonth(monthISO);
  const gridStart = startOfWeek(first);
  const weeks: ISODate[][] = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)));
  }
  return weeks;
}

export function sameMonth(a: ISODate, b: ISODate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions, locale = 'en-US'): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts);
    fmtCache.set(key, f);
  }
  return f;
}

export function formatDate(iso: ISODate, style: 'short' | 'medium' | 'long' | 'weekday' | 'month' | 'dayMonth' = 'medium'): string {
  const d = fromISODate(iso);
  switch (style) {
    case 'short':
      return fmt({ month: 'short', day: 'numeric' }).format(d);
    case 'dayMonth':
      return fmt({ day: 'numeric', month: 'short' }).format(d);
    case 'long':
      return fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
    case 'weekday':
      return fmt({ weekday: 'short' }).format(d);
    case 'month':
      return fmt({ month: 'long', year: 'numeric' }).format(d);
    default:
      return fmt({ month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  }
}

export function weekdayInitial(iso: ISODate): string {
  return formatDate(iso, 'weekday').charAt(0);
}

export function formatRelativeDays(n: number): string {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function timeAgo(isoDateTime: string, now = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(isoDateTime).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** `HH:mm` → minutes after midnight. */
export function clockToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Sleep duration across midnight. */
export function sleepDuration(bedtime: string, wake: string): number {
  const b = clockToMinutes(bedtime);
  const w = clockToMinutes(wake);
  return w > b ? w - b : 24 * 60 - b + w;
}

export function nowClock(now = new Date()): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function formatClock(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${suffix}`;
}
