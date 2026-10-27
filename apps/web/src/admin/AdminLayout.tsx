import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CalendarDays, Check, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, CloudOff, FlaskConical, LogOut, Menu, Repeat, Search, Server, ShieldCheck, Timer, UserRound, X } from 'lucide-react';
import { Avatar, Logo, LogoMark } from '@/components/brand/Brand';
import { Button, Popover, useToast } from '@/components/ui';
import { setOfflineDemo } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PERSONA } from './adminData';
import { useAccess, useAdmin } from './adminState';
import { RoleBadge } from './components';
import { maskEmail } from './helpers';
import { findActive, restrictedLabels, visibleNav, type AdminNavSection } from './nav';
import { ALL_ROLES, ROLE_META, SECURITY_NOTE, type StaffRole } from './rbac';

type Hit = { kind: string; label: string; meta?: string; to: string };

/** Topbar search across pages, content, users (masked) and privacy requests — limited to what the role can open. */
function AdminSearch() {
  const { state } = useAdmin();
  const { can } = useAccess();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const t = q.trim().toLowerCase();
  const hits: Hit[] = !t
    ? []
    : [
        ...visibleNav(can)
          .flatMap((s) => (s.children ? s.children.map((c) => ({ label: c.label, to: c.to, section: s.label })) : [{ label: s.label, to: s.to!, section: 'Page' }]))
          .filter((p) => p.label.toLowerCase().includes(t))
          .map((p) => ({ kind: 'Page', label: p.label, meta: p.section, to: p.to })),
        ...(can('view_content') ? state.content.filter((c) => c.title.toLowerCase().includes(t)).map((c) => ({ kind: 'Content', label: c.title, meta: c.status.replace('_', ' '), to: `/admin/content/${c.id}` })) : []),
        ...(can('view_users')
          ? state.users.filter((u) => u.id.toLowerCase().includes(t) || u.name.toLowerCase().includes(t)).map((u) => ({ kind: 'User', label: u.name, meta: `${u.id} · ${maskEmail(u.email)}`, to: `/admin/users?q=${encodeURIComponent(u.id)}` }))
          : []),
        ...(can('process_data_requests') ? state.privacy.filter((r) => r.id.toLowerCase().includes(t)).map((r) => ({ kind: 'Request', label: r.id, meta: r.type.replace('_', ' '), to: '/admin/privacy-requests' })) : []),
      ].slice(0, 7);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (h?: Hit) => {
    if (!h) return;
    nav(h.to);
    setQ('');
    setOpen(false);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(hits[active] ?? hits[0]);
  };

  return (
    <div ref={box} className="relative hidden w-56 md:block xl:w-72">
      <form onSubmit={submit} role="search">
        <label htmlFor="admin-search" className="sr-only">
          Search admin
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          id="admin-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, hits.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Escape') setOpen(false);
          }}
          role="combobox"
          aria-expanded={open && !!t}
          aria-controls="admin-search-results"
          aria-autocomplete="list"
          placeholder="Search users, content…"
          className="h-11 w-full rounded-full border border-ink-100 bg-white pl-10 pr-4 text-sm text-ink-900 shadow-xs placeholder:text-ink-400 focus:border-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/10"
        />
      </form>
      {open && t && (
        <ul id="admin-search-results" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 animate-scale-in overflow-y-auto rounded-3xl border border-ink-100 bg-white p-1.5 shadow-lift">
          {hits.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-ink-500">No matches you can access.</li>
          ) : (
            hits.map((h, i) => (
              <li key={`${h.kind}-${h.to}-${h.label}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(h)} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left', i === active ? 'bg-green-50' : 'hover:bg-green-50')}>
                  <span className="w-16 shrink-0 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-green-700">{h.kind}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-900">{h.label}</span>
                    {h.meta && <span className="block truncate text-xs capitalize text-ink-500">{h.meta}</span>}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Bell with the signed-in role's to-dos (counts only — no user data). */
function TaskBell() {
  const { state } = useAdmin();
  const { can, session } = useAccess();
  const items = [
    can('medical_review') && { label: 'Content awaiting medical review', n: state.content.filter((c) => c.status === 'medical_review').length, to: '/admin/reviews' },
    can('compliance_review') && { label: 'Content awaiting compliance', n: state.content.filter((c) => c.status === 'compliance_review').length, to: '/admin/compliance' },
    can('review_templates') && { label: 'Notification copy to approve', n: state.templates.filter((t) => t.status === 'pending_review').length, to: '/admin/notifications/templates' },
    can('edit_content') && { label: 'My content returned with comments', n: state.content.filter((c) => c.author === session?.name && c.status === 'changes_requested').length, to: '/admin/content' },
    can('process_data_requests') && { label: 'Open privacy requests', n: state.privacy.filter((r) => r.status !== 'completed').length, to: '/admin/privacy-requests' },
    can('manage_support') && { label: 'Open support requests', n: state.support.filter((r) => r.status === 'open').length, to: '/admin/support' },
  ].filter((x): x is { label: string; n: number; to: string } => !!x && x.n > 0);
  const total = items.reduce((a, x) => a + x.n, 0);
  return (
    <Popover
      className="w-[min(320px,calc(100vw-2rem))]"
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Tasks${total ? `, ${total} waiting` : ''}`}
          className={cn('relative flex h-11 w-11 items-center justify-center rounded-full shadow-xs ring-1 transition', open ? 'bg-green-800 text-white ring-green-800' : 'bg-white text-ink-600 ring-ink-100 hover:text-green-800 hover:ring-green-300')}
        >
          <Bell className="h-5 w-5" />
          {total > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{total > 99 ? '99+' : total}</span>}
        </button>
      )}
    >
      {(close) => (
        <div className="p-1.5" role="menu" aria-label="Tasks">
          <p className="px-3 pb-1.5 pt-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-400">Waiting for you</p>
          {items.length === 0 ? (
            <p className="px-3 py-5 text-center text-sm text-ink-500">You’re all caught up.</p>
          ) : (
            items.map((x) => (
              <Link key={x.label} to={x.to} role="menuitem" onClick={close} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-green-50">
                {x.label}
                <span className="num rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-800">{x.n}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </Popover>
  );
}

const RAIL_KEY = 'healthx.admin.rail';

function readRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === '1';
  } catch {
    return false;
  }
}

function P2() {
  return (
    <span title="Phase 2 feature" className="shrink-0 rounded-full bg-lavender-100 px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-lavender-700">
      P2
    </span>
  );
}

function SectionLink({ s, active, rail, onNavigate }: { s: AdminNavSection; active: boolean; rail: boolean; onNavigate?: () => void }) {
  return (
    <Link
      to={s.to!}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={rail ? s.label : undefined}
      className={cn(
        'group/link relative flex items-center gap-3 text-[14px] font-semibold transition',
        rail ? 'h-12 w-12 justify-center rounded-2xl' : 'rounded-full py-1.5 pl-1.5 pr-3',
        active ? 'bg-green-100 text-green-950 shadow-soft' : 'text-white/75 hover:bg-white/[0.06] hover:text-white',
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center transition',
          rail ? 'h-5 w-5' : 'h-9 w-9 rounded-full',
          !rail && (active ? 'surface-reset bg-white text-green-800 shadow-soft' : 'bg-white/[0.07] text-white/70 ring-1 ring-inset ring-white/10 group-hover/link:text-white'),
        )}
      >
        <s.icon className="h-[18px] w-[18px]" />
      </span>
      {!rail && <span className="flex-1 truncate">{s.label}</span>}
      {!rail && s.phase && <P2 />}
      {rail && (
        <span className="surface-reset pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 opacity-0 shadow-lift ring-1 ring-ink-100 transition group-hover/link:opacity-100 group-focus-visible/link:opacity-100">
          {s.label}
        </span>
      )}
    </Link>
  );
}

function SidebarNav({ rail = false, onNavigate, onToggleRail }: { rail?: boolean; onNavigate?: () => void; onToggleRail?: () => void }) {
  const { can, role, session } = useAccess();
  const loc = useLocation();
  const sections = visibleNav(can);
  const restricted = restrictedLabels(can);
  const active = findActive(loc.pathname, sections);
  const activeKey = active.section?.key ?? null;
  const [openKey, setOpenKey] = useState<string | null>(activeKey);
  const [lastActive, setLastActive] = useState(activeKey);
  const scrollRef = useRef<HTMLDivElement>(null);
  if (activeKey !== lastActive) {
    // Auto-expand the section that owns the current page (render-time state sync).
    setLastActive(activeKey);
    setOpenKey(activeKey);
  }

  // Keep the current page's link visible when the expanded sidebar scrolls.
  useEffect(() => {
    if (rail) return;
    const navEl = scrollRef.current;
    const el = navEl?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!navEl || !el) return;
    const n = navEl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.bottom > n.bottom) navEl.scrollTop += r.bottom - n.bottom + 12;
    else if (r.top < n.top) navEl.scrollTop -= n.top - r.top + 12;
  }, [loc.pathname, rail, openKey]);

  return (
    <div className="on-forest relative flex h-full flex-col bg-green-950 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-green-700/30 blur-3xl" />
        <span className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-green-600/15 blur-3xl" />
      </div>
      <div className={cn('relative flex h-[76px] shrink-0 items-center', rail ? 'justify-center px-2' : 'px-5')}>
        {rail ? (
          <Link to="/admin" aria-label="Admin dashboard" onClick={onNavigate}>
            <LogoMark dark className="h-10 w-10" />
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <Logo to="/admin" light tagline={false} />
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-green-200 ring-1 ring-inset ring-white/10">Web Admin</span>
          </div>
        )}
      </div>

      <div ref={scrollRef} className={cn('relative flex flex-1 flex-col', rail ? 'overflow-visible' : 'min-h-0 overflow-y-auto [scrollbar-width:thin]')}>
        {!rail && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-6 pb-3">
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Signed in as</span>
            {role ? <RoleBadge role={role} /> : <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Menu</span>}
          </div>
        )}

        <nav
          className={cn('relative flex-1 pb-4', rail ? 'flex flex-col items-center gap-1.5 overflow-visible px-2 pt-2' : 'space-y-1 px-3')}
          aria-label="Admin"
        >
          {sections.map((s) => {
            const isActive = active.section?.key === s.key;
            if (!s.children) return <SectionLink key={s.key} s={s} active={isActive} rail={rail} onNavigate={onNavigate} />;
            const expanded = openKey === s.key;
            if (rail) {
              return (
                <div key={s.key} className="group/rail relative">
                  <button
                    type="button"
                    aria-label={s.label}
                    aria-haspopup="true"
                    className={cn('flex h-12 w-12 items-center justify-center rounded-2xl transition', isActive ? 'bg-green-100 text-green-950' : 'text-white/65 hover:bg-white/[0.08] hover:text-white')}
                  >
                    <s.icon className="h-5 w-5" />
                  </button>
                  {/* Flyout with the section's pages (hover or keyboard focus). */}
                  <div className="invisible absolute left-full top-0 z-50 pl-3 opacity-0 transition group-focus-within/rail:visible group-focus-within/rail:opacity-100 group-hover/rail:visible group-hover/rail:opacity-100">
                    <div className="surface-reset w-64 rounded-3xl border border-ink-100 bg-white p-2 text-ink-800 shadow-lift">
                      <p className="px-3 pb-1.5 pt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">{s.label}</p>
                      {s.children.map((c) => (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          onClick={onNavigate}
                          className={cn('block rounded-full px-3 py-2 text-[13.5px] font-medium transition', active.leaf?.to === c.to ? 'bg-green-800 text-white' : 'text-ink-700 hover:bg-green-50 hover:text-green-800')}
                        >
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={s.key}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`nav-${s.key}`}
                  onClick={() => setOpenKey(expanded ? null : s.key)}
                  className={cn('group flex w-full items-center gap-3 rounded-full py-1.5 pl-1.5 pr-3 text-left text-[14px] font-semibold transition', isActive ? 'text-white' : 'text-white/75 hover:bg-white/[0.06] hover:text-white')}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition',
                      isActive ? 'bg-green-300 text-green-950' : 'bg-white/[0.07] text-white/70 ring-1 ring-inset ring-white/10 group-hover:text-white',
                    )}
                  >
                    <s.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 truncate">{s.label}</span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/40 transition', expanded && 'rotate-180 text-white/70')} />
                </button>
                {expanded && (
                  <ul id={`nav-${s.key}`} className="mb-1 ml-[23px] mt-1 space-y-0.5 border-l border-white/10 pb-1 pl-3">
                    {s.children.map((c) => {
                      const on = active.leaf?.to === c.to;
                      return (
                        <li key={c.to}>
                          <Link
                            to={c.to}
                            onClick={onNavigate}
                            aria-current={on ? 'page' : undefined}
                            className={cn(
                              'relative block truncate rounded-full px-3 py-2 text-[13.5px] font-medium transition',
                              on ? 'bg-green-100 font-semibold text-green-950 shadow-soft' : 'text-white/65 hover:bg-white/[0.07] hover:text-white',
                            )}
                          >
                            <span aria-hidden className={cn('absolute -left-[16.5px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full', on ? 'bg-green-300 ring-4 ring-green-950' : 'bg-transparent')} />
                            {c.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {rail ? (
          <div className="relative flex justify-center pb-3" title={`Your access: ${role ? ROLE_META[role].label : '—'}. ${SECURITY_NOTE}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/10">
              <ShieldCheck className="h-5 w-5 text-green-300" />
            </span>
          </div>
        ) : (
          <div className="relative mx-3 mb-3 rounded-3xl bg-gradient-to-br from-green-800/90 to-green-900 p-3.5 text-xs leading-relaxed text-white/70 ring-1 ring-inset ring-white/10">
            {session && (
              <Link to="/admin/account" onClick={onNavigate} className="-m-1 mb-2.5 flex items-center gap-2.5 rounded-2xl p-1 hover:bg-white/[0.07]">
                <Avatar name={session.name} size={36} className="ring-green-900" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white">
                    {session.name} <span className="font-medium text-green-200">({ROLE_META[session.role].short})</span>
                  </span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-green-200/75">MFA ✓ · Signed in {new Date(session.signedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              </Link>
            )}
            <p className="flex items-center gap-1.5 font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-green-300" /> Your access · {role ? ROLE_META[role].short : '—'}
            </p>
            {restricted.length > 0 ? (
              <p className="mt-1">
                <span className="font-semibold text-green-50">Restricted:</span> {restricted.join(', ')}.
              </p>
            ) : (
              <p className="mt-1">Full access to every admin section.</p>
            )}
            <p className="mt-1.5 text-[11px] leading-snug text-green-200/60">{SECURITY_NOTE}</p>
          </div>
        )}
      </div>

      {onToggleRail && (
        <div className={cn('relative border-t border-white/10 p-3', rail && 'flex justify-center')}>
          <button
            type="button"
            onClick={onToggleRail}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar to icons'}
            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white', !rail && 'w-full')}
          >
            {rail ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
            {!rail && 'Collapse sidebar'}
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ onSignOut }: { onSignOut: () => void }) {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const toast = useToast();
  const nav = useNavigate();
  const session = state.session!;
  const [switching, setSwitching] = useState(false);

  const switchRole = (role: StaffRole) => {
    const p = PERSONA[role];
    audit('staff.demo_role_switch', p.name, `${ROLE_META[session.role].label} → ${ROLE_META[role].label}`);
    const privileges = role === 'admin' ? (state.staff.find((m) => m.email === p.email)?.privileges ?? []) : [];
    dispatch({ type: 'SIGN_IN', session: { name: p.name, email: p.email, role, privileges, signedInAt: new Date().toISOString() } });
    toast.info(`Demo role: ${ROLE_META[role].label}`, 'Switching roles is a demo-only shortcut.');
    nav('/admin');
  };

  return (
    <Popover
      className="w-[min(300px,calc(100vw-2rem))]"
      trigger={({ toggle, open }) => (
        <button onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label="Profile menu" className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2 shadow-xs ring-1 ring-ink-100 transition hover:ring-green-300 lg:pr-3">
          <Avatar name={session.name} size={36} />
          <span className="hidden text-left leading-tight lg:block">
            <span className="block max-w-[150px] truncate text-sm font-semibold text-ink-900">{session.name}</span>
            <span className="block text-xs font-medium text-ink-500">{ROLE_META[session.role].label}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" />
        </button>
      )}
    >
      {(close) => (
        <div className="p-1.5" role="menu" aria-label="Profile menu">
          <div className="mb-1 flex items-center gap-3 border-b border-ink-100 px-3 pb-3 pt-2">
            <Avatar name={session.name} size={42} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{session.name}</p>
              <p className="truncate text-xs text-ink-500">{session.email}</p>
              <span className="mt-1 inline-flex">
                <RoleBadge role={session.role} />
              </span>
            </div>
          </div>
          {/* Offline demo only — with the API your role comes from your staff account. */}
          {!apiMode && (
            <button type="button" role="menuitem" aria-expanded={switching} onClick={() => setSwitching((v) => !v)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-700 hover:bg-green-50">
              <Repeat className="h-4 w-4 text-ink-400" />
              <span className="flex-1">Switch demo role</span>
              <ChevronRight className={cn('h-4 w-4 text-ink-400 transition', switching && 'rotate-90')} />
            </button>
          )}
          {!apiMode && switching && (
            <div className="mb-1 ml-5 border-l border-ink-100 pl-2">
              {ALL_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="menuitemradio"
                  aria-checked={session.role === r}
                  onClick={() => {
                    close();
                    setSwitching(false);
                    if (r !== session.role) switchRole(r);
                  }}
                  className={cn('flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left text-[13px] hover:bg-green-50', session.role === r ? 'font-semibold text-green-800' : 'text-ink-700')}
                >
                  <span className="flex h-4 w-4 items-center justify-center">{session.role === r && <Check className="h-3.5 w-3.5 text-green-700" />}</span>
                  {ROLE_META[r].label}
                </button>
              ))}
            </div>
          )}
          <Link to="/admin/account" role="menuitem" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-green-50">
            <UserRound className="h-4 w-4 text-ink-400" /> My account
          </Link>
          <Link to="/" role="menuitem" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-green-50">
            <ArrowLeft className="h-4 w-4 text-ink-400" /> Public website
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onSignOut();
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-ink-100 px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger-soft"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </Popover>
  );
}

/**
 * Inactivity sign-out. Activity lives in a ref and expiry is checked every second, but the layout only
 * re-renders when the warning flips; the visible countdowns tick in their own small components.
 */
function useSessionTimeout(timeoutMs: number, onExpire: () => void) {
  const last = useRef(0);
  const [warn, setWarn] = useState(false);
  const warnAt = Math.min(2 * 60 * 1000, timeoutMs / 3);
  useEffect(() => {
    last.current = Date.now();
    const bump = () => {
      last.current = Date.now();
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = window.setInterval(() => {
      const left = timeoutMs - (Date.now() - last.current);
      setWarn(left < warnAt);
      if (left <= 0) onExpire();
    }, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(id);
    };
  }, [onExpire, timeoutMs, warnAt]);
  const remaining = useCallback(() => timeoutMs - (Date.now() - last.current), [timeoutMs]);
  return {
    warn,
    remaining,
    extend: () => {
      last.current = Date.now();
      setWarn(false);
    },
  };
}

/** Re-reads `read` every second (re-rendering only the component that uses it). */
function useTicker(read: () => number) {
  const [value, setValue] = useState(read);
  useEffect(() => {
    setValue(read());
    const id = window.setInterval(() => setValue(read()), 1000);
    return () => window.clearInterval(id);
  }, [read]);
  return value;
}

function SessionChip({ remaining, warn, minutes }: { remaining: () => number; warn: boolean; minutes: number }) {
  const left = useTicker(remaining);
  return (
    <span
      title={`Auto sign-out after ${minutes} minutes of inactivity [ADD A-33]`}
      aria-label={`Session ends in ${mmss(left)} without activity`}
      className={cn('hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs font-medium tabular-nums ring-1 sm:inline-flex', warn ? 'bg-warning-soft text-warning ring-warning/30' : 'bg-white text-ink-600 ring-ink-100')}
    >
      <Timer className="h-3.5 w-3.5" /> {mmss(left)}
    </span>
  );
}

function LiveCountdown({ remaining }: { remaining: () => number }) {
  return <>{mmss(useTicker(remaining))}</>;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const ENV_STYLE = {
  development: 'bg-sky-500 text-white',
  staging: 'bg-butter-300 text-green-950',
  production: 'bg-rose-500 text-white',
} as const;

export function AdminLayout() {
  const { state, audit, apiMode, signOut } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [rail, setRail] = useState(readRail);
  const session = state.session!;
  const timeoutMs = state.settings.sessionTimeoutMin * 60 * 1000;
  const sections = visibleNav(can);
  const active = findActive(loc.pathname, sections);
  const isEditor = /^\/admin\/content\/(?!new$)[^/]+$/.test(loc.pathname);
  const isAccount = loc.pathname === '/admin/account';
  const title = isEditor ? 'Edit content' : active.leaf?.label ?? active.section?.label ?? (isAccount ? 'My account' : 'Admin');
  const crumbs = [active.section?.label, active.leaf && active.section?.children ? active.leaf.label : undefined, isEditor ? 'Editor' : undefined].filter(Boolean) as string[];

  useEffect(() => {
    setDrawer(false);
  }, [loc.pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const toggleRail = () => {
    setRail((r) => {
      try {
        localStorage.setItem(RAIL_KEY, r ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !r;
    });
  };

  const signOutRef = useRef<(reason: 'manual' | 'timeout') => void>(() => undefined);
  useEffect(() => {
    signOutRef.current = (reason) => {
      audit(reason === 'timeout' ? 'staff.session_timeout' : 'staff.logout', session.name);
      void signOut();
      if (reason === 'timeout') toast.info('Signed out after inactivity', `Admin sessions end after ${state.settings.sessionTimeoutMin} minutes without activity.`);
      nav('/admin/login');
    };
  });
  const [onExpire] = useState(() => () => signOutRef.current('timeout'));
  const { warn, remaining, extend } = useSessionTimeout(timeoutMs, onExpire);
  const env = state.settings.environment;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#admin-main" className="sr-only z-[90] rounded-full bg-green-700 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden bg-green-950 transition-[width] duration-200 lg:block', rail ? 'w-[84px]' : 'w-[284px]')}>
        <SidebarNav rail={rail} onToggleRail={toggleRail} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-green-950/50 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[300px] max-w-[86vw] animate-slide-in overflow-hidden rounded-r-[28px] bg-green-950 shadow-lift">
            <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-5 z-10 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <SidebarNav onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className={cn('transition-[padding] duration-200', rail ? 'lg:pl-[84px]' : 'lg:pl-[284px]')}>
        {state.settings.showEnvBanner && (
          <div className={cn('px-4 py-1 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]', ENV_STYLE[env])} role="note">
            {env} environment · demo data
          </div>
        )}
        <header className="sticky top-0 z-20 border-b border-ink-100/70 bg-canvas/80 backdrop-blur-xl">
          <div className="flex h-[76px] items-center gap-2.5 px-4 sm:gap-3 sm:px-6 lg:px-8">
            <button aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink-700 shadow-xs ring-1 ring-ink-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <nav aria-label="Breadcrumb" className="hidden sm:block">
                <ol className="flex min-w-0 items-center gap-1 whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-400">
                  <li className={cn('shrink-0 items-center gap-1', crumbs.length ? 'hidden 2xl:flex' : 'flex')}>
                    <Link to="/admin" className="hover:text-green-700">
                      Web Admin
                    </Link>
                    {crumbs.length > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                  </li>
                  {crumbs.map((c, i) => (
                    <li key={c} className={cn('flex min-w-0 items-center gap-1', i === crumbs.length - 1 && 'shrink-0')}>
                      {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                      <span className={cn('truncate', i === crumbs.length - 1 && 'text-green-700')}>{c}</span>
                    </li>
                  ))}
                </ol>
              </nav>
              <p className="truncate font-display text-[18px] font-semibold leading-tight tracking-[-0.01em] text-ink-900 sm:mt-0.5 sm:text-[20px]">{title}</p>
            </div>
            <AdminSearch />
            <div className="flex shrink-0 items-center gap-2">
              {apiMode ? (
                <span title="Connected to the HealthX API — permissions are enforced by the server" className="hidden items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-900 ring-1 ring-green-200 xl:inline-flex">
                  <Server className="h-3.5 w-3.5" /> Server
                </span>
              ) : (
                <span className="hidden items-center gap-1.5 rounded-full bg-butter-100 px-3 py-1.5 text-xs font-bold text-green-900 ring-1 ring-butter-200 2xl:inline-flex">
                  <FlaskConical className="h-3.5 w-3.5" /> Offline demo
                </span>
              )}
              <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500 ring-1 ring-ink-100 min-[1800px]:inline-flex">
                <CalendarDays className="h-3.5 w-3.5 text-green-700" />
                {today}
              </span>
              <SessionChip remaining={remaining} warn={warn} minutes={state.settings.sessionTimeoutMin} />
              <span className="hidden 2xl:inline-flex">
                <RoleBadge role={session.role} />
              </span>
              <TaskBell />
              <ProfileMenu onSignOut={() => signOutRef.current('manual')} />
            </div>
          </div>
          {warn && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-t border-warning/30 bg-warning-soft px-4 py-2 text-sm text-ink-800 sm:px-6 lg:px-8">
              <span>
                Your admin session will end in{' '}
                <strong>
                  <LiveCountdown remaining={remaining} />
                </strong>{' '}
                due to inactivity.
              </span>
              <Button size="sm" variant="outline" onClick={extend}>
                Stay signed in
              </Button>
            </div>
          )}
        </header>
        {!apiMode && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-butter-100 px-4 py-2 text-center text-sm text-green-950" role="note">
            <span className="inline-flex items-center gap-2">
              <CloudOff className="h-4 w-4 shrink-0" /> Offline demo — permissions are not enforced and data stays in this browser.
            </span>
            <button type="button" onClick={() => setOfflineDemo(false)} className="font-bold text-green-800 underline hover:text-green-950">
              Connect to the HealthX server
            </button>
          </div>
        )}
        <main id="admin-main" className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500 ring-1 ring-ink-100 md:hidden">
            <ShieldCheck className="h-3.5 w-3.5 text-green-700" /> Signed in as {ROLE_META[session.role].label}
          </p>
          <ErrorBoundary resetKey={loc.pathname} compact>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="mx-auto max-w-[1400px] px-4 pb-8 text-xs leading-relaxed text-ink-400 sm:px-6 lg:px-8">
          HealthX Web Admin · {apiMode ? 'connected to the HealthX API (in-memory demo data, resets when the API restarts).' : 'offline demo · all data is simulated.'} {SECURITY_NOTE}
        </footer>
      </div>
    </div>
  );
}
