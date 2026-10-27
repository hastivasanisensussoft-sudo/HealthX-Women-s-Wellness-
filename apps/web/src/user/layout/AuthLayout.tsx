import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Asterisk, ShieldCheck, Stethoscope } from 'lucide-react';
import type { PhotoKey } from '@healthx/shared';
import { Leaf, LeafPair, Logo, MoodFace } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { useStore } from '@/store/AppStore';
import { OfflineDemoBanner } from '@/user/components/ApiGate';

const TRUST = [
  { icon: ShieldCheck, label: 'Private by design' },
  { icon: Asterisk, label: 'Estimates always marked' },
  { icon: Stethoscope, label: 'Non-diagnostic' },
];

/**
 * Split auth layout (Mira reference): an evergreen panel with an arch portrait, leaves and a short
 * reassuring message beside a clean form card. Phones get a compact header image above the card.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  eyebrow,
  image = 'portrait-curly',
  position = '50% 22%',
  message = 'Tracking takes seconds. Understanding yourself gets gentler with every day you log.',
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
  image?: PhotoKey;
  position?: string;
  message?: string;
}) {
  const { mode } = useStore();
  return (
    <>
      <OfflineDemoBanner />
      <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-4 lg:p-4">
        <aside className="bg-forest relative isolate hidden min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[34px] p-10 text-white lg:flex xl:p-12">
          <Leaf className="pointer-events-none absolute -bottom-20 -left-16 -z-10 h-72 w-72 -rotate-12 text-green-300/10" color="currentColor" vein={false} />
          <Leaf className="pointer-events-none absolute -right-16 top-24 -z-10 h-56 w-56 rotate-[110deg] text-butter-300/10" color="currentColor" vein={false} />
          <div className="flex items-center justify-between">
            <Logo light />
            <Link to="/" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          </div>
          <div className="my-auto flex justify-center py-10">
            <div className="relative w-full max-w-[300px]">
              <LeafPair className="-left-14 -top-10 h-44 w-44" />
              <Photo photo={image} alt="" shape="arch" priority position={position} className="relative aspect-[4/5] w-full bg-butter-300 ring-[6px] ring-white/10" />
              <div aria-hidden className="glass absolute -right-12 bottom-12 flex animate-float items-center gap-3 rounded-2xl p-3 pr-4 text-ink-900 shadow-lift">
                <MoodFace mood="good" size={40} />
                <span>
                  <span className="block text-sm font-bold">How are you today?</span>
                  <span className="block text-xs text-ink-500">Check in under 30 seconds</span>
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-script text-[30px] font-bold leading-none text-butter-300">your wellness, your way</p>
            <p className="mt-3 max-w-md font-display text-[26px] font-semibold leading-snug tracking-[-0.01em]">{message}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {TRUST.map((t) => (
                <li key={t.label} className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/85">
                  <t.icon className="h-3.5 w-3.5 text-butter-300" /> {t.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col lg:min-h-0">
          <div className="bg-forest relative isolate overflow-hidden px-5 pb-16 pt-4 text-white lg:hidden">
            <Leaf className="pointer-events-none absolute -right-10 -top-10 -z-10 h-40 w-40 rotate-45 text-green-300/10" color="currentColor" vein={false} />
            <div className="flex items-center justify-between">
              <Logo light />
              <Link to="/" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white/80 hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" /> Home
              </Link>
            </div>
            <div className="mx-auto mt-5 flex max-w-[480px] items-center gap-4">
              <div className="relative h-[108px] w-[86px] shrink-0">
                <LeafPair className="-left-5 -top-4 h-16 w-16" />
                <Photo photo={image} alt="" shape="arch" priority position={position} className="relative h-full w-full bg-butter-300 ring-4 ring-white/10" />
              </div>
              <div className="min-w-0">
                <p className="font-script text-[22px] font-bold leading-none text-butter-300">your wellness, your way</p>
                <p className="mt-1.5 text-[15px] font-medium leading-snug text-white/85">{message}</p>
              </div>
            </div>
          </div>

          <main className="relative -mt-10 flex flex-1 flex-col px-4 pb-6 sm:px-8 lg:mt-0 lg:px-10 lg:pb-4 lg:pt-6">
            <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col lg:justify-center lg:py-8">
              <div className="animate-fade-up rounded-[30px] bg-white p-6 shadow-card ring-1 ring-ink-100 sm:p-9">
                {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-green-950 sm:text-[34px]">{title}</h1>
                {subtitle && <p className="mt-2 text-[15.5px] leading-relaxed text-ink-500">{subtitle}</p>}
                <div className="mt-7">{children}</div>
              </div>
              {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
            </div>
            <p className="mx-auto mt-6 flex max-w-[480px] items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-ink-400">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
              {mode === 'api'
                ? import.meta.env.DEV
                  ? 'Development server — accounts are real but kept in memory and reset when the server restarts.'
                  : 'Your account and data are protected on the HealthX server.'
                : 'Offline demo — no real accounts are created and nothing leaves your browser.'}
            </p>
          </main>
        </div>
      </div>
    </>
  );
}

export function SocialButtons({ onSocial }: { onSocial: (provider: 'Apple' | 'Google') => void }) {
  const cls = 'flex h-12 items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 transition hover:bg-ink-50 hover:ring-ink-300';
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={() => onSocial('Apple')} className={cls}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
          <path d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-1.9-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.9-1.7 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.3-.9-2.3-3.9ZM14 5.2c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z" />
        </svg>
        Apple
      </button>
      <button type="button" onClick={() => onSocial('Google')} className={cls}>
        {/* Google's four-colour mark is a brand asset, kept in its own colours. */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1Z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
        </svg>
        Google
      </button>
    </div>
  );
}

export function OrDivider({ label = 'or continue with email' }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-400">
      <span className="h-px flex-1 bg-ink-100" />
      {label}
      <span className="h-px flex-1 bg-ink-100" />
    </div>
  );
}
