/** Non-component admin helpers (kept separate so component files stay fast-refresh friendly). */
import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export function useSort<T, G extends Record<string, (t: T) => string | number>>(items: T[], initial: keyof G & string, getters: G, initialDir: SortDir = 'asc') {
  type K = keyof G & string;
  const [key, setKey] = useState<K>(initial);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const getter = getters[key];
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [items, getter, dir]);
  const toggle = (k: K) => {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setKey(k);
      setDir('asc');
    }
  };
  return { sorted, key, dir, toggle };
}

export function formatBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`;
  return `${n} B`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** RFC 4180-ish CSV with quoted cells, downloaded as a real file. */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Hours remaining on an SLA (negative = breached). */
export function slaRemaining(createdAt: string, slaHours: number, now = Date.now()): number {
  return slaHours - (now - new Date(createdAt).getTime()) / 3_600_000;
}

/** Privacy-by-default display of an email: first two characters + domain (pr***@example.com). */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}

/** Whole days from now until the end of `dateISO` (YYYY-MM-DD); negative when overdue. */
export function daysUntil(dateISO: string, now = new Date()): number {
  const d = new Date(`${dateISO}T23:59:59`);
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}
