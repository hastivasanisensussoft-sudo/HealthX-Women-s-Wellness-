import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Asterisk, ShieldCheck, Stethoscope } from 'lucide-react';
import type { PhotoKey } from '@healthx/shared';
import { Leaf, LeafPair, Logo, MoodFace } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';

const TRUST = [
  { icon: ShieldCheck, label: 'Private by design' },
  { icon: Asterisk, label: 'Estimates always marked' },
  { icon: Stethoscope, label: 'Non-diagnostic' },
];

/**
 * Account-link pages (password reset, email confirmation, magic-link hand-off). People use HealthX in the
 * mobile app; the links in its emails open these pages on the web.
 *
 * Split auth layout (Mira reference): an evergreen panel with an arch portrait, leaves and a short
 * reassuring message beside a clean form card. Phones get a compact header image above the card.
 */
export function AccountLayout({
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
  return (
    <>
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
              {import.meta.env.DEV ? 'Development server — accounts are real but kept in memory and reset when the server restarts.' : 'Your account and data are protected on the HealthX server.'}
            </p>
          </main>
        </div>
      </div>
    </>
  );
}
