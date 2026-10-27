import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Bot, CalendarDays, ChevronDown, CreditCard, FlaskConical, LogOut, Menu, Moon, Palette, Search, Settings, ShieldCheck, Sun, User, UserCog, WifiOff, X } from 'lucide-react';
import { useTheme } from '@/theme/themeContext';
import { canUseTheme, DEFAULT_THEME, DEMO, formatDate, themeById, timeAgo, unreadCount } from '@healthx/shared';
import { useAppState, useDispatch, useStore } from '@/store/AppStore';
import { OfflineDemoBanner } from '@/user/components/ApiGate';
import { VerifyEmailBanner } from '@/user/components/VerifyEmailBanner';
import { Avatar, LogoMark } from '@/components/brand/Brand';
import { Popover, Tooltip, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ALL_NAV, appPath } from './nav';
import { MobileTabBar, QuickLogFab, QuickLogSheet } from './QuickLog';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const COLLAPSE_KEY = 'healthx.sidebar.collapsed';

function GlobalSearch() {
  const { articles } = useAppState();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const pages = ALL_NAV.filter((n) => `${n.label} ${n.group} ${n.keywords ?? ''}`.toLowerCase().includes(t)).map((n) => ({ to: n.to, label: n.label, kind: n.group }));
    const arts = articles
      .filter((a) => `${a.title} ${a.topic} ${a.description}`.toLowerCase().includes(t))
      .slice(0, 5)
      .map((a) => ({ to: `/app/learn/${a.id}`, label: a.title, kind: 'Article' }));
    return [...pages, ...arts].slice(0, 8);
  }, [q, articles]);

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) {
            nav(results[0].to);
            setQ('');
            setOpen(false);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Search pages, articles…"
        aria-label="Search pages and articles"
        className="h-11 w-full rounded-full border border-ink-100 bg-white pl-10 pr-4 text-sm shadow-xs placeholder:text-ink-400 focus:border-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/10"
      />
      {open && q && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 animate-scale-in overflow-hidden rounded-3xl border border-ink-100 bg-white p-1.5 shadow-lift">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-ink-500">No results for “{q}”</p>
          ) : (
            results.map((r) => (
              <button
                key={r.to}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  nav(r.to);
                  setQ('');
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-green-50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {r.kind === 'Article' ? <BookOpen className="h-4 w-4 shrink-0 text-ink-400" /> : <Search className="h-4 w-4 shrink-0 text-ink-400" />}
                  <span className="truncate font-medium text-ink-800">{r.label}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-ink-400">{r.kind}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NotificationsMenu() {
  const state = useAppState();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const unread = unreadCount(state);
  return (
    <Popover
      className="w-[min(360px,calc(100vw-2rem))]"
      trigger={({ toggle }) => (
        <button onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-600 shadow-xs ring-1 ring-ink-100 transition hover:text-green-800 hover:ring-green-300">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread}</span>}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="font-bold text-ink-900">Notifications</p>
            {unread > 0 && (
              <button className="text-xs font-semibold text-green-700 hover:underline" onClick={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {state.notifications.slice(0, 5).map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    dispatch({ type: 'MARK_NOTIFICATION_READ', id: n.id });
                    nav(appPath(n.to));
                    close();
                  }}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-green-50"
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-rose-500')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink-800">{n.title}</span>
                    <span className="block text-sm text-ink-500">{n.body}</span>
                    <span className="mt-0.5 block text-xs text-ink-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
            {state.notifications.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-500">You’re all caught up.</li>}
          </ul>
          <Link to="/app/notifications" onClick={close} className="block border-t border-ink-100 px-4 py-3 text-center text-sm font-semibold text-green-700 hover:bg-green-50">
            View all & reminders
          </Link>
        </div>
      )}
    </Popover>
  );
}

function ProfileMenu() {
  const { profile, auth } = useAppState();
  const { signOut } = useStore();
  const nav = useNavigate();
  const items = [
    { to: '/app/profile', label: 'My profile', icon: User },
    { to: '/app/settings', label: 'Preferences & settings', icon: Settings },
    { to: '/app/settings/appearance', label: 'Appearance & theme', icon: Palette },
    { to: '/app/notifications', label: 'Notifications & reminders', icon: Bell },
    { to: '/app/privacy', label: 'Privacy & data', icon: ShieldCheck },
    { to: '/app/subscription', label: 'Subscription & plans', icon: CreditCard },
    { to: '/admin', label: 'Admin panel (staff demo)', icon: UserCog },
  ];
  return (
    <Popover
      className="w-64"
      trigger={({ toggle, open }) => (
        <button onClick={toggle} aria-expanded={open} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2 shadow-xs ring-1 ring-ink-100 transition hover:ring-green-300 md:pr-3" aria-label="Account menu">
          <Avatar name={profile.name} photoKey={profile.avatar} size={36} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-semibold text-ink-900">{profile.name || 'You'}</span>
            <span className="block text-xs font-medium capitalize text-ink-500">{profile.plan} plan</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-ink-400 md:block" />
        </button>
      )}
    >
      {(close) => (
        <div className="p-1.5">
          <div className="mb-1 flex items-center gap-3 border-b border-ink-100 px-3 pb-3 pt-2">
            <Avatar name={profile.name} photoKey={profile.avatar} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{profile.name || 'You'}</p>
              <p className="truncate text-xs text-ink-500">{auth.email ?? profile.email}</p>
            </div>
          </div>
          {items.map((i) => (
            <Link key={i.to} to={i.to} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-green-50">
              <i.icon className="h-4 w-4 text-ink-400" />
              {i.label}
            </Link>
          ))}
          <button
            onClick={async () => {
              close();
              await signOut();
              nav('/login');
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-ink-100 px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-soft"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </Popover>
  );
}

/** Light / dark switch in the top bar (full theme choices live in Settings → Appearance). */
function ThemeToggle() {
  const { dark, prefs, setMode } = useTheme();
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={() => setMode(dark ? 'light' : 'dark')}
        aria-label={label}
        aria-pressed={prefs.mode === 'dark'}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-600 shadow-xs ring-1 ring-ink-100 transition hover:text-green-800 hover:ring-green-300"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    </Tooltip>
  );
}

/** User web application shell: collapsible sidebar (desktop), drawer (tablet/mobile), top bar. */
/** Real connectivity state (mockup M37). With the API, changes can't be saved while offline; the offline demo keeps working. */
function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** A saved premium theme switches back to Evergreen when the plan no longer includes it (e.g. after cancelling). */
function usePremiumThemeGuard() {
  const { phase, state } = useStore();
  const { prefs, setTheme } = useTheme();
  const toast = useToast();
  const plan = state.profile.plan;
  useEffect(() => {
    if (phase !== 'ready') return;
    const t = themeById(prefs.theme);
    if (canUseTheme(t, plan)) return;
    setTheme(DEFAULT_THEME.theme);
    toast.info(`${t.name} theme turned off`, 'Premium themes need the Premium plan, so HealthX is back to Evergreen.');
  }, [phase, plan, prefs.theme, setTheme, toast]);
}

export function AppLayout() {
  usePremiumThemeGuard();
  const online = useOnline();
  const [drawer, setDrawer] = useState(false);
  const [quickLog, setQuickLog] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { today } = useAppState();
  const { mode } = useStore();
  const loc = useLocation();

  useEffect(() => {
    setDrawer(false);
  }, [loc.pathname]);
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only z-[90] rounded-full bg-green-700 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* Desktop sidebar (collapsible) */}
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden bg-green-950 transition-[width] duration-200 lg:block', collapsed ? 'w-[84px]' : 'w-[284px]')}>
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
      </aside>

      {/* Tablet / mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-green-950/50 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[300px] max-w-[86vw] animate-slide-in overflow-hidden rounded-r-[28px] bg-green-950 shadow-lift">
            <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-5 z-10 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[84px]' : 'lg:pl-[284px]')}>
        <header className="sticky top-0 z-20 bg-canvas/80 backdrop-blur-xl">
          <div className="flex h-[76px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-700 shadow-xs ring-1 ring-ink-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/app" aria-label="HealthX dashboard" className="sm:hidden">
              <LogoMark className="h-10 w-10" />
            </Link>
            <div className="hidden flex-1 sm:block">
              <GlobalSearch />
            </div>
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
              {mode === 'demo' ? (
                <span className="hidden items-center gap-1.5 rounded-full bg-butter-100 px-3 py-1.5 text-xs font-bold text-green-900 ring-1 ring-butter-200 xl:inline-flex" title={DEMO.banner}>
                  <FlaskConical className="h-3.5 w-3.5" />
                  Demo data
                </span>
              ) : (
                import.meta.env.DEV && (
                  <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-600 ring-1 ring-ink-100 xl:inline-flex" title="Development API — accounts and data are kept in memory and reset when the server restarts.">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Dev server
                  </span>
                )
              )}
              <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-500 ring-1 ring-ink-100 2xl:inline-flex">
                <CalendarDays className="h-3.5 w-3.5 text-green-700" />
                {formatDate(today, 'long')}
              </span>
              <Tooltip content="AI wellness coach (Phase 2, simulated)">
                <Link
                  to="/app/coach"
                  aria-label="AI wellness coach"
                  className={cn('flex h-11 w-11 items-center justify-center rounded-full shadow-xs ring-1 transition', loc.pathname === '/app/coach' ? 'bg-green-800 text-white ring-green-800' : 'bg-white text-ink-600 ring-ink-100 hover:text-green-800 hover:ring-green-300')}
                >
                  <Bot className="h-5 w-5" />
                </Link>
              </Tooltip>
              <span className="hidden sm:inline-flex">
                <ThemeToggle />
              </span>
              <NotificationsMenu />
              <ProfileMenu />
            </div>
          </div>
          <div className="px-4 pb-3 sm:hidden">
            <GlobalSearch />
          </div>
        </header>
        <OfflineDemoBanner />
        <VerifyEmailBanner />
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-green-900 px-4 py-2 text-center text-sm text-white">
            <WifiOff className="h-4 w-4 shrink-0" /> {mode === 'api' ? 'You’re offline. Changes can’t be saved until you’re back online.' : 'You’re offline. The offline demo keeps working in this browser.'}
          </div>
        )}
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
          <ErrorBoundary resetKey={loc.pathname} compact>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="mx-auto max-w-[1400px] px-4 pb-28 text-xs text-ink-400 sm:px-6 lg:px-8 lg:pb-10">HealthX is a wellness app and does not diagnose or treat medical conditions. In an emergency, contact your local emergency number.</footer>
      </div>

      <QuickLogFab onOpen={() => setQuickLog(true)} />
      <MobileTabBar onQuickLog={() => setQuickLog(true)} />
      <QuickLogSheet open={quickLog} onClose={() => setQuickLog(false)} />
    </div>
  );
}
