import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Lock, MoreHorizontal, ShieldAlert, type LucideIcon } from 'lucide-react';
import { Badge, ButtonLink, PageHeader, toneClass, type BadgeTone, type Tone } from '@/components/ui';
import { cn } from '@/lib/utils';
import { STATUS_META, SUPPORT_TYPES, type SupportRequest, type WorkflowStatus } from './adminData';
import { useAccess } from './adminState';
import { slaRemaining, type SortDir } from './helpers';
import { findActive, visibleNav } from './nav';
import type { RecordedRole } from './adminData';
import { isStaffRole, recordedRoleLabel, ROLE_META, SECURITY_NOTE, type Capability } from './rbac';

const DOT: Record<BadgeTone, string> = {
  green: 'bg-green-600',
  mint: 'bg-green-500',
  rose: 'bg-rose-500',
  lavender: 'bg-lavender-500',
  peach: 'bg-peach-500',
  sky: 'bg-sky-500',
  indigo: 'bg-indigo-500',
  butter: 'bg-butter-400',
  gray: 'bg-ink-400',
  danger: 'bg-danger',
  warning: 'bg-warning',
  dark: 'bg-green-300',
};

/** Small status pill with a tone dot (workflow, account and request states). */
export function StatusPill({ tone, children, className }: { tone: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <Badge tone={tone} className={cn('whitespace-nowrap', className)} icon={<span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT[tone])} />}>
      {children}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: WorkflowStatus }) {
  const m = STATUS_META[status];
  return <StatusPill tone={m.tone}>{m.label}</StatusPill>;
}

/** Role on a staff row, or recorded on a history/audit entry (entries from before the four-role consolidation keep their old role). */
export function RoleBadge({ role }: { role: RecordedRole }) {
  if (!isStaffRole(role)) return <Badge tone="gray">{recordedRoleLabel(role)}</Badge>;
  return <Badge tone={ROLE_META[role].tone}>{ROLE_META[role].label}</Badge>;
}

/**
 * Admin page heading: the shared `PageHeader` with a mono eyebrow that defaults to the
 * admin section that owns the current page ("Web Admin · Content Management").
 */
export function AdminHeader({ eyebrow, ...props }: ComponentProps<typeof PageHeader>) {
  const { can } = useAccess();
  const { pathname } = useLocation();
  const section = findActive(pathname, visibleNav(can)).section?.label;
  return <PageHeader eyebrow={eyebrow ?? (section && section !== 'Dashboard' ? `Web Admin · ${section}` : 'Web Admin')} {...props} />;
}

/**
 * Deep-evergreen hero panel for a page's key numbers (dashboards, queues, reports).
 * Put `HeroStat` tiles or actions in `aside`; the page title stays the `h1` in the header.
 */
export function AdminHero({ eyebrow, title, children, aside, className }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cn('relative mb-8 overflow-hidden rounded-[34px] bg-forest p-6 text-white shadow-lift sm:p-8', className)}>
      <span aria-hidden className="leaf pointer-events-none absolute -right-12 -top-14 h-48 w-48 bg-white/[0.05]" />
      <span aria-hidden className="leaf-alt pointer-events-none absolute -bottom-16 right-1/3 h-40 w-40 bg-green-400/[0.07]" />
      <div className={cn('relative grid gap-6', aside && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:items-center')}>
        <div className="min-w-0">
          {eyebrow && <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-green-200/85">{eyebrow}</p>}
          <h2 className="mt-2 font-display text-[24px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">{title}</h2>
          {children}
        </div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </section>
  );
}

/** Frosted number tile used inside `AdminHero`. */
export function HeroStat({ label, value, hint, icon, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('glass-dark min-w-0 rounded-2xl px-4 py-3.5', className)}>
      <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-green-100/75">
        {icon}
        <span className="min-w-0 leading-snug">{label}</span>
      </p>
      <p className="num mt-1.5 text-[26px] leading-none text-white">{value}</p>
      {hint && <p className="mt-1.5 text-xs leading-snug text-green-100/70">{hint}</p>}
    </div>
  );
}

/**
 * KPI stat card for admin pages: label, tinted icon, large tabular value and an optional hint/trend.
 * (Admin suites read the value as the `text-[28px]` span next to the label.)
 */
export function KpiCard({
  label,
  value,
  unit,
  icon,
  tone = 'green',
  hint,
  trend,
  className,
  children,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  trend?: { dir: 'up' | 'down' | 'flat'; text: string };
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('card relative flex flex-col overflow-hidden p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="pt-1 text-sm font-semibold leading-snug text-ink-600">{label}</span>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', toneClass(tone))}>{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-[28px] leading-none text-ink-900">{value}</span>
        {unit && <span className="text-sm font-semibold text-ink-500">{unit}</span>}
      </div>
      {children}
      {(hint || trend) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          {trend && (
            <span className={cn('rounded-full px-2 py-0.5 font-bold', trend.dir === 'up' ? 'bg-green-100 text-green-700' : trend.dir === 'down' ? 'bg-peach-100 text-peach-700' : 'bg-ink-100 text-ink-600')}>{trend.text}</span>
          )}
          {hint}
        </div>
      )}
    </div>
  );
}

/** Filter/search bar card that sits above a data table. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card mb-5 p-4 sm:p-5', className)}>{children}</div>;
}

export function SortHeader<K extends string>({ label, k, active, dir, onSort, className }: { label: string; k: K; active: K; dir: SortDir; onSort: (k: K) => void; className?: string }) {
  const isActive = active === k;
  const I = !isActive ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={cn('px-4 py-3 text-left', className)} aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        onClick={() => onSort(k)}
        className={cn('-mx-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition', isActive ? 'bg-green-100 text-green-800' : 'text-ink-500 hover:text-ink-900')}
      >
        {label}
        <I className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn('whitespace-nowrap px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-500', className)}>
      {children}
    </th>
  );
}

/**
 * Data table container: scrolls sideways so wide tables never widen the page, keeps the header
 * visible (sticky) and gives rows zebra + hover tones. Wrap it in a `Card` with `overflow-hidden`.
 */
export function TableShell({ children, minWidth = 860 }: { children: ReactNode; minWidth?: number }) {
  return (
    // `relative` makes this the containing block, so sr-only/absolute children can't widen the page.
    <div className="scrollbar-thin relative -mx-px overflow-x-auto lg:max-h-[calc(100vh-7rem)]">
      <table
        className="w-full border-separate border-spacing-0 text-sm text-ink-700 [&_tbody_tr:nth-child(even)]:bg-ink-50/50 [&_tbody_tr:hover]:bg-green-50/80 [&_tbody_tr]:transition-colors [&_td]:border-b [&_td]:border-ink-100/80 [&_tbody_tr:last-child_td]:border-b-0 [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[1] [&_thead_th]:border-b [&_thead_th]:border-ink-100 [&_thead_th]:bg-canvas"
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function Restricted({ cap }: { cap: Capability }) {
  const { role, whoCan } = useAccess();
  return (
    <div className="card relative mx-auto mt-10 max-w-lg overflow-hidden p-8 text-center">
      <span aria-hidden className="leaf absolute -right-6 -top-6 h-24 w-24 bg-rose-50" />
      <span aria-hidden className="leaf-alt absolute -bottom-8 -left-8 h-24 w-24 bg-green-50" />
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-green-100 text-green-700 ring-8 ring-green-50/60">
        <Lock className="h-7 w-7" />
      </div>
      <p className="eyebrow relative mt-5">Web Admin · Permissions</p>
      <h2 className="relative mt-1.5 font-display text-[24px] font-semibold tracking-[-0.015em] text-ink-900">Access restricted</h2>
      <p className="relative mt-2 text-[15px] leading-relaxed text-ink-500">
        You’re signed in as <strong className="text-ink-800">{role ? ROLE_META[role].label : 'guest'}</strong>. This area needs: <strong className="text-ink-800">{whoCan(cap)}</strong>.
      </p>
      <p className="relative mt-4 rounded-2xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-500">{SECURITY_NOTE}</p>
      <ButtonLink to="/admin" variant="secondary" size="sm" className="relative mt-6">
        Back to dashboard
      </ButtonLink>
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-ink-200 bg-white px-3 font-sans text-sm font-medium normal-case tracking-normal text-ink-800 shadow-xs focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-500/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SimulatedNote({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-ink-400">{children}</p>;
}

/** Shown wherever the current role sees a page read-only. */
export function ReadOnlyBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-ink-700">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-indigo-500 shadow-xs">
        <Eye className="h-4 w-4" />
      </span>
      <span className="pt-0.5">{children ?? 'Read-only for your role — edit controls are hidden.'}</span>
    </div>
  );
}

/** SLA chip for support requests: on track / due soon (<12h) / breached. */
export function SlaChip({ request }: { request: SupportRequest }) {
  if (request.status === 'resolved') return <StatusPill tone="gray">Resolved</StatusPill>;
  const left = slaRemaining(request.createdAt, SUPPORT_TYPES[request.type].slaHours);
  if (left < 0) return <StatusPill tone="danger">Breached {Math.round(-left)}h</StatusPill>;
  if (left < 12) return <StatusPill tone="warning">Due in {Math.max(1, Math.round(left))}h</StatusPill>;
  return <StatusPill tone="mint">On track · {Math.round(left)}h</StatusPill>;
}

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * Per-row "⋯" action menu. Rendered in a portal so table scroll containers never
 * clip it; keyboard accessible (Arrow/Home/End/Escape/Tab) and closes on outside
 * click, scroll or resize.
 */
export function RowActions({ label, actions }: { label: string; actions: (RowAction | false | null | undefined)[] }) {
  const items = actions.filter(Boolean) as RowAction[];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    // The menu is fixed to its button: close when a scroll/resize actually moves the button, not for
    // unrelated scrolling elsewhere (toast stack, sidebar, layout adjustments after a background refresh).
    const anchor = btn.current?.getBoundingClientRect();
    const close = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r || !anchor || Math.abs(r.top - anchor.top) > 1 || Math.abs(r.left - anchor.left) > 1) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    const raf = requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>('[role=menuitem]:not([disabled])')?.focus());
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const h = items.length * 40 + 12;
      const up = r.bottom + h + 8 > window.innerHeight && r.top - h - 4 > 0;
      setPos({ top: up ? r.top - h - 4 : r.bottom + 4, left: Math.max(8, Math.min(window.innerWidth - 232, r.right - 224)) });
    }
    setOpen((o) => !o);
  };

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const els = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not([disabled])') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      btn.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      els[els.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  if (!items.length) {
    return (
      <button type="button" disabled aria-label={`No actions available for ${label}`} title="No actions available for your role" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-300">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    );
  }

  return (
    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        ref={btn}
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={cn('flex h-9 w-9 items-center justify-center rounded-full text-ink-500 ring-1 ring-transparent transition hover:bg-white hover:text-green-800 hover:ring-ink-100', open && 'bg-white text-green-800 ring-green-200')}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={`Actions for ${label}`}
            onKeyDown={onMenuKey}
            className="fixed z-[90] w-56 animate-scale-in rounded-2xl border border-ink-100 bg-white p-1.5 shadow-lift"
            style={{ top: pos.top, left: pos.left }}
          >
            {items.map((a) => (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                disabled={a.disabled}
                onClick={() => {
                  setOpen(false);
                  a.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium outline-none transition disabled:cursor-not-allowed disabled:opacity-40',
                  a.danger ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft' : 'text-ink-700 hover:bg-green-50 focus:bg-green-50',
                )}
              >
                {a.icon && <a.icon className={cn('h-4 w-4 shrink-0', a.danger ? 'text-danger' : 'text-ink-400')} />}
                {a.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** The mandatory "frontend checks are not security" note. */
export function SecurityNote({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-xs leading-relaxed text-ink-500', className)}>
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      {SECURITY_NOTE}
    </p>
  );
}
