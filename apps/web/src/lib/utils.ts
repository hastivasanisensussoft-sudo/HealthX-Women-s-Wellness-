import { useEffect, useState } from 'react';

export { clsx as cn } from 'clsx';

/**
 * Simulated network latency for the frontend-only demo. Replace call sites with
 * real API requests when the NestJS backend exists.
 */
export function simulate<T>(value: T, ms = 700, fail = false): Promise<T> {
  return new Promise((resolve, reject) => setTimeout(() => (fail ? reject(new Error('Simulated network error')) : resolve(value)), ms));
}

/** Brief skeleton state on first mount so loading states are visible in the demo. */
export function useDemoLoading(ms = 450): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

export function formatMl(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)} L` : `${ml} ml`;
}

export function formatHours(h: number | null | undefined): string {
  if (h === null || h === undefined) return '—';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h ${mm}m` : `${hh}h`;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'HX'
  );
}

export function paginate<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { items: items.slice((p - 1) * size, p * size), page: p, pages, total: items.length };
}
