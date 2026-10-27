import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronRight, Instagram, Linkedin, LogIn, Menu, ShieldCheck, Smartphone, Stethoscope, X, Youtube } from 'lucide-react';
import { COPY } from '@healthx/shared';
import { Leaf, Logo, SparkleShape } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { ButtonLink } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Public website navigation (SRS public area). */
const SITE_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={cn('sticky top-0 z-50 border-b transition duration-300', scrolled || open ? 'border-ink-100 bg-white/90 backdrop-blur-xl' : 'border-transparent bg-white')}>
      <div className="mx-auto flex h-[74px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo to="/" />
        <nav className="hidden items-center gap-0.5 rounded-full bg-ink-50 p-1 ring-1 ring-inset ring-ink-100 xl:flex" aria-label="Primary">
          {SITE_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn('rounded-full px-4 py-2 text-[14.5px] font-semibold transition', isActive ? 'bg-green-50 text-green-800 shadow-soft ring-1 ring-inset ring-green-200/70' : 'text-ink-600 hover:bg-white hover:text-green-800')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">
          <ButtonLink to="/admin/login" variant="outline" size="sm" leftIcon={<LogIn className="h-4 w-4" />}>
            Staff login
          </ButtonLink>
          <ButtonLink to="/get-the-app" variant="primary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Get the app
          </ButtonLink>
        </div>
        <div className="flex items-center gap-2 xl:hidden">
          <ButtonLink to="/get-the-app" size="sm" className="hidden sm:inline-flex">
            Get the app
          </ButtonLink>
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
            onClick={() => setOpen((o) => !o)}
            className={cn('flex h-11 w-11 items-center justify-center rounded-full transition', open ? 'bg-green-800 text-white' : 'bg-ink-50 text-ink-800 ring-1 ring-inset ring-ink-100 hover:bg-green-50')}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="site-mobile-menu" className="max-h-[calc(100dvh-74px)] animate-fade-up overflow-y-auto border-t border-ink-100 bg-white px-4 pb-6 pt-3 xl:hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-2xl">
            <ul className="space-y-1">
              {SITE_LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      cn('flex min-h-[52px] items-center justify-between rounded-2xl px-4 font-display text-[18px] font-semibold transition', isActive ? 'bg-green-50 text-green-800' : 'text-ink-800 hover:bg-ink-50')
                    }
                  >
                    {l.label}
                    <ChevronRight className="h-4 w-4 text-ink-400" />
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ButtonLink to="/admin/login" variant="outline" size="lg" leftIcon={<LogIn className="h-4 w-4" />}>
                Staff login
              </ButtonLink>
              <ButtonLink to="/get-the-app" size="lg" leftIcon={<Smartphone className="h-4 w-4" />}>
                Get the app
              </ButtonLink>
            </div>
          </nav>
          <div className="mx-auto mt-4 flex max-w-2xl items-center gap-3 rounded-3xl bg-sage/70 p-3">
            <Photo photo="portrait-curly" alt="" shape="arch" position="50% 25%" className="h-16 w-14 shrink-0" />
            <p className="text-sm leading-snug text-ink-700">
              <b className="font-semibold text-green-900">Private by design.</b> Estimates are always marked *, and you can export or delete your data anytime.
            </p>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const cols = [
    { title: 'Product', links: [['Features', '/features'], ['How it works', '/how-it-works'], ['Life stages', '/features#life-stages'], ['Pricing', '/pricing']] },
    { title: 'Company', links: [['About HealthX', '/about'], ['Contact us', '/contact'], ['HealthX Business', '/pricing#business'], ['Staff admin', '/admin/login']] },
    { title: 'Help', links: [['FAQ', '/faq'], ['Get the app', '/get-the-app'], ['Contact support', '/contact'], ['Staff login', '/admin/login']] },
    { title: 'Legal', links: [['Privacy policy', '/privacy-policy'], ['Terms of use', '/terms'], ['Medical disclaimer', '#disclaimer'], ['Privacy requests', '/contact?topic=privacy']] },
  ];
  return (
    <footer className="relative isolate mt-6 overflow-hidden bg-green-950 text-white">
      <Leaf className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rotate-12 text-green-300/10" color="currentColor" vein={false} />
      <Leaf className="pointer-events-none absolute -bottom-28 -left-20 -z-10 h-72 w-72 -rotate-[24deg] text-butter-300/5" color="currentColor" vein={false} />
      <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <Logo light />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/70">A calm, privacy-first home for your cycle, body and everyday wellness — across every stage of life.</p>
            <p className="mt-4 font-script text-[24px] font-bold text-butter-300">your body, your rhythm</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['iPhone', 'Android'].map((p) => (
                <Link key={p} to="/get-the-app" className="glass-dark inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white transition hover:bg-white/10">
                  <Smartphone className="h-4 w-4 text-butter-300" />
                  Get it on {p}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              {(
                [
                  [Instagram, 'Instagram'],
                  [Youtube, 'YouTube'],
                  [Linkedin, 'LinkedIn'],
                ] as const
              ).map(([Icon, label]) => (
                <span key={label} title={`${label} — coming soon`} aria-label={`${label} (coming soon)`} role="img" className="flex h-10 w-10 cursor-default items-center justify-center rounded-full bg-white/10 text-white/80">
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-green-300">{c.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith('#') ? (
                        <a href={href} className="text-[15px] text-white/75 transition hover:text-white">
                          {label}
                        </a>
                      ) : (
                        <Link to={href} className="text-[15px] text-white/75 transition hover:text-white">
                          {label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 grid gap-3 md:grid-cols-[1fr_auto]">
          <div id="disclaimer" className="glass-dark flex gap-3 rounded-3xl p-5 text-sm leading-relaxed text-white/75">
            <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-butter-300" />
            <p>
              <strong className="text-white">Medical disclaimer.</strong> {COPY.notDiagnostic} {COPY.emergency}
            </p>
          </div>
          <div className="glass-dark flex items-center gap-3 rounded-3xl p-5 text-sm text-white/75">
            <ShieldCheck className="h-5 w-5 shrink-0 text-butter-300" />
            <p className="max-w-[260px]">{COPY.employerPrivacy}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <p className="inline-flex items-center gap-2">
            <SparkleShape className="h-3 w-3 text-butter-300" color="currentColor" />© {new Date().getFullYear()} HealthX. All rights reserved.
          </p>
          <p>Frontend demo build — sample data only.</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(t);
  }, [pathname, hash]);
  return (
    <div className="bg-white">
      <a href="#main" className="sr-only z-[60] rounded-full bg-green-800 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
