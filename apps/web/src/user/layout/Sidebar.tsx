import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronsLeft, ChevronsRight, Crown, Wind } from 'lucide-react';
import { useAppState } from '@/store/AppStore';
import { Logo, LogoMark } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { cn } from '@/lib/utils';
import { matchNav, NAV_GROUPS, type NavGroup } from './nav';

const OPEN_KEY = 'healthx.sidebar.open';

function loadOpen(): string[] {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function PhasePill({ phase, active, light }: { phase: 2 | 3 | 4; active?: boolean; light?: boolean }) {
  return (
    <span
      title={phase === 2 ? 'Phase 2 feature' : `Phase ${phase} preview`}
      className={cn(
        'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9.5px] font-medium',
        active ? 'bg-green-900/10 text-green-900' : light ? (phase === 2 ? 'bg-lavender-100 text-lavender-700' : phase === 3 ? 'bg-peach-100 text-peach-700' : 'bg-sky-100 text-sky-700') : 'bg-white/10 text-white/70',
      )}
    >
      P{phase}
    </span>
  );
}

function GroupLinks({ group, activeTo, onNavigate, flyout }: { group: NavGroup; activeTo?: string; onNavigate?: () => void; flyout?: boolean }) {
  return (
    <ul className={cn(flyout ? 'space-y-0.5' : 'ml-[23px] mt-1 space-y-0.5 border-l border-white/10 pb-1 pl-3')}>
      {group.items.map((item) => {
        const active = item.to === activeTo;
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-2 rounded-full px-3 py-2 text-[13.5px] font-medium transition',
                flyout
                  ? active
                    ? 'bg-green-800 text-white'
                    : 'text-ink-700 hover:bg-green-50 hover:text-green-800'
                  : active
                    ? 'bg-green-100 font-semibold text-green-950 shadow-[0_6px_16px_-8px_rgba(0,0,0,.5)]'
                    : 'text-white/65 hover:bg-white/[0.07] hover:text-white',
              )}
            >
              {!flyout && <span className={cn('absolute -left-[16.5px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full', active ? 'bg-green-300 ring-4 ring-green-950' : 'bg-transparent')} />}
              <span className="min-w-0 flex-1 truncate" title={item.label}>
                {item.label}
              </span>
              {item.phase && <PhasePill phase={item.phase} active={active && !flyout} light={flyout} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * User web app sidebar (deep evergreen panel): 8 expandable groups (accordion),
 * active-route highlighting, desktop icon-rail collapse with flyout submenus.
 */
export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const { profile } = useAppState();
  const active = matchNav(pathname);
  const [open, setOpen] = useState<string[]>(() => {
    const saved = loadOpen();
    return active && !saved.includes(active.groupId) ? [...saved, active.groupId] : saved.length ? saved : active ? [active.groupId] : ['overview'];
  });
  const baseId = useId();
  const navRef = useRef<HTMLElement>(null);

  // Always reveal the group that contains the current page.
  useEffect(() => {
    if (active && !open.includes(active.groupId)) setOpen((o) => [...o, active.groupId]);
  }, [active, open]);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    } catch {
      /* storage unavailable */
    }
  }, [open]);

  // Keep the current page's link visible when the expanded nav scrolls.
  useEffect(() => {
    if (collapsed) return;
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!nav || !el) return;
    const n = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.bottom > n.bottom) nav.scrollTop += r.bottom - n.bottom + 12;
    else if (r.top < n.top) nav.scrollTop -= n.top - r.top + 12;
  }, [pathname, collapsed]);

  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <div className="on-forest relative flex h-full flex-col bg-green-950 text-white">
      {/* Glows clip in their own layer so the collapsed rail's flyouts can extend past the sidebar. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-green-700/30 blur-3xl" />
        <span className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-green-600/15 blur-3xl" />
      </div>
      <div className={cn('relative flex h-[76px] shrink-0 items-center', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
        {collapsed ? (
          <Link to="/app" aria-label="HealthX dashboard" onClick={onNavigate}>
            <LogoMark dark className="h-10 w-10" />
          </Link>
        ) : (
          <Logo to="/app" light />
        )}
      </div>

      <nav
        ref={navRef}
        aria-label="Main navigation"
        className={cn('relative flex-1 pb-4', collapsed ? 'overflow-visible px-3' : 'overflow-y-auto px-3 [scrollbar-color:rgba(255,255,255,.18)_transparent] [scrollbar-width:thin]')}
      >
        {!collapsed && <p className="px-3 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Menu</p>}
        <ul className="space-y-1">
          {NAV_GROUPS.map((g) => {
            const isActiveGroup = active?.groupId === g.id;
            const isOpen = open.includes(g.id);
            const panelId = `${baseId}-${g.id}`;
            if (collapsed) {
              return (
                <li key={g.id} className="group/fly relative">
                  <Link
                    to={g.items[0].to}
                    onClick={onNavigate}
                    aria-label={g.label}
                    className={cn('flex h-12 w-full items-center justify-center rounded-2xl transition', isActiveGroup ? 'bg-green-100 text-green-950' : 'text-white/65 hover:bg-white/[0.08] hover:text-white')}
                  >
                    <g.icon className="h-5 w-5" />
                  </Link>
                  {/* Flyout: shows the group name + its pages on hover or keyboard focus */}
                  <div className="invisible absolute left-full top-0 z-50 pl-3 opacity-0 transition group-focus-within/fly:visible group-focus-within/fly:opacity-100 group-hover/fly:visible group-hover/fly:opacity-100">
                    <div className="surface-reset w-64 rounded-3xl border border-ink-100 bg-white p-2 shadow-lift">
                      <p className="px-3 pb-1.5 pt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">{g.label}</p>
                      <GroupLinks group={g} activeTo={active?.to} onNavigate={onNavigate} flyout />
                    </div>
                  </div>
                </li>
              );
            }
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className={cn('group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left text-[14px] font-semibold transition', isActiveGroup ? 'text-white' : 'text-white/75 hover:bg-white/[0.06] hover:text-white')}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition',
                      isActiveGroup ? 'bg-green-300 text-green-950' : 'bg-white/[0.07] text-white/70 ring-1 ring-inset ring-white/10 group-hover:text-white',
                    )}
                  >
                    <g.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 truncate">{g.label}</span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/40 transition', isOpen && 'rotate-180 text-white/70')} />
                </button>
                <div id={panelId} hidden={!isOpen}>
                  <GroupLinks group={g} activeTo={active?.to} onNavigate={onNavigate} />
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="relative mx-3 mb-3 hidden [@media(min-height:940px)]:block">
          {profile.plan === 'free' ? (
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-green-900 p-4 ring-1 ring-inset ring-white/10">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-butter-300" />
                <p className="text-sm font-semibold">HealthX Premium</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/65">Advanced insights, AI coach and personalised programs.</p>
              <Link to="/app/subscription" onClick={onNavigate} className="mt-3 inline-flex h-8 items-center rounded-full bg-butter-300 px-3.5 text-xs font-bold text-green-950 hover:bg-butter-400">
                Explore plans
              </Link>
            </div>
          ) : (
            <Link to="/app/stress" onClick={onNavigate} className="group relative block overflow-hidden rounded-3xl">
              <Photo photo="meditation" alt="" shape="none" className="h-28 w-full" imgClassName="transition duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-green-950/85 to-transparent" />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                <Wind className="h-4 w-4" /> Take a breathing break
              </span>
            </Link>
          )}
        </div>
      )}

      {onToggleCollapsed && (
        <div className={cn('relative border-t border-white/10 p-3', collapsed && 'flex justify-center')}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white', !collapsed && 'w-full')}
          >
            {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
            {!collapsed && 'Collapse sidebar'}
          </button>
        </div>
      )}
    </div>
  );
}
