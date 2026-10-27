import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  breadcrumbs,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
  /** Small mono label above the title (e.g. the section name). */
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[36px]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1">
            {it.to ? (
              <Link to={it.to} className="hover:text-green-700">
                {it.label}
              </Link>
            ) : (
              <span className="text-ink-600">{it.label}</span>
            )}
            {i < items.length - 1 && <ChevronRight className="h-3 w-3" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('no-scrollbar flex gap-2 overflow-x-auto p-0.5', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn('pill-tab', value === t.value ? 'pill-tab-on' : 'pill-tab-off')}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn('rounded-full px-1.5 text-xs font-bold', value === t.value ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Tabs that are real routes (each sub-page has its own URL). */
export function RouteTabs({ tabs, className, label = 'Section pages' }: { tabs: { to: string; label: ReactNode; end?: boolean }[]; className?: string; label?: string }) {
  return (
    <nav aria-label={label} className={cn('no-scrollbar mb-7 flex gap-2 overflow-x-auto p-0.5', className)}>
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end ?? true}
          className={({ isActive }) => cn('pill-tab', isActive ? 'pill-tab-on' : 'pill-tab-off')}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Pagination({ page, pages, onChange, total, label = 'items' }: { page: number; pages: number; onChange: (p: number) => void; total?: number; label?: string }) {
  if (pages <= 1 && total === undefined) return null;
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {total !== undefined && (
        <p className="text-sm text-ink-500">
          {total} {label} · page {page} of {pages}
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 hover:border-green-400 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
          .map((p, i, arr) => (
            <span key={p} className="flex items-center">
              {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-ink-400">…</span>}
              <button
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn('h-9 min-w-9 rounded-full px-3 text-sm font-semibold', p === page ? 'bg-green-800 text-white' : 'text-ink-600 hover:bg-ink-100')}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 hover:border-green-400 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="input pl-10 pr-9" />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-ink-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
