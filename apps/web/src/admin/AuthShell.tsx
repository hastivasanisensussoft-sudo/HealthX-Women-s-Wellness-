import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Smartphone, UserCog } from 'lucide-react';
import type { PhotoKey } from '@healthx/shared';
import { Logo } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';

const POINTS = [
  { icon: Smartphone, t: 'Multi-factor authentication for every staff role (§47, D-33)' },
  { icon: UserCog, t: 'Four roles from SRS §6 — enforced by the HealthX API (mock checks in the offline demo)' },
  { icon: ShieldCheck, t: 'Health logs hidden by default; every action is audited' },
];

/**
 * Split staff sign-in layout: a photo side with a forest gradient and the Web Admin promise
 * (desktop), a photo band on phones, and the form column on the canvas.
 */
export function AuthShell({ photo, position, children }: { photo: PhotoKey; position?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-green-950 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start">
        <Photo photo={photo} alt="" shape="none" priority kenBurns position={position} className="!absolute inset-0 h-full w-full" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-green-950 via-green-950/80 to-green-950/30" />
        <div className="relative flex h-full flex-col p-10 xl:p-12">
          <Logo to="/" light />
          <div className="mt-auto max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-butter-300 px-3 py-1 text-xs font-bold text-green-950">
              <ShieldCheck className="h-3.5 w-3.5" /> Staff only
            </span>
            <p className="mt-5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-green-200/85">HealthX Women’s Wellness</p>
            <p className="mt-2 font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.02em]">HealthX Web Admin</p>
            <p className="mt-3 text-[15.5px] leading-relaxed text-white/80">Manage evidence-based content, users and platform configuration — with privacy built in.</p>
            <ul className="mt-8 space-y-2.5 text-sm">
              {POINTS.map(({ icon: I, t }) => (
                <li key={t} className="glass-dark flex items-center gap-3 rounded-2xl px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <I className="h-4 w-4 text-green-200" />
                  </span>
                  <span className="text-white/90">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col px-4 py-5 sm:px-10 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <span className="lg:hidden">
            <Logo to="/" tagline={false} />
          </span>
          <Link to="/" className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-500 hover:bg-white hover:text-green-700">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
        </div>
        <div className="relative mt-4 overflow-hidden rounded-[28px] bg-green-950 text-white lg:hidden">
          <Photo photo={photo} alt="" shape="none" position={position} className="!absolute inset-0 h-full w-full" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-green-950 via-green-950/80 to-green-950/20" />
          <div className="relative px-5 py-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-butter-300 px-2.5 py-0.5 text-[11px] font-bold text-green-950">
              <ShieldCheck className="h-3 w-3" /> Staff only
            </span>
            <p className="mt-2 font-display text-[22px] font-semibold leading-tight">HealthX Web Admin</p>
            <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-white/80">MFA for every staff role. Every action is audited.</p>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
