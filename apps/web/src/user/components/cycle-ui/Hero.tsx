import type { ReactNode } from 'react';
import { palette } from '@healthx/shared';
import { Leaf } from '@/components/brand/Brand';
import { cn } from '@/lib/utils';

type HeroTone = 'forest' | 'wash' | 'blush';

const TONES: Record<HeroTone, string> = {
  forest: 'bg-forest text-white shadow-lift',
  wash: 'bg-wash text-ink-900 ring-1 ring-inset ring-white shadow-card',
  blush: 'bg-gradient-to-br from-rose-50 via-white to-lavender-50 text-ink-900 ring-1 ring-inset ring-rose-100/70 shadow-card',
};

/** Rounded hero panel for a page's key metric (forest on dark, sage wash or blush on light). */
export function HeroPanel({ tone = 'forest', className, children, label }: { tone?: HeroTone; className?: string; children: ReactNode; label?: string }) {
  return (
    <section aria-label={label} className={cn('relative isolate overflow-hidden rounded-[34px] p-5 sm:p-8', TONES[tone], className)}>
      <Leaf className="pointer-events-none absolute -right-10 -top-12 -z-10 h-48 w-48 rotate-12 opacity-[0.14]" color={tone === 'forest' ? palette.green[300] : palette.green[200]} />
      <Leaf className="pointer-events-none absolute -bottom-16 left-[38%] -z-10 h-40 w-40 -rotate-[100deg] opacity-[0.12]" color={tone === 'forest' ? palette.green[400] : palette.rose[200]} vein={false} />
      {children}
    </section>
  );
}

/** Small stat tile used inside hero panels (glass on forest, white on light). */
export function HeroStat({ label, value, hint, icon, dark, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-3xl p-3.5 sm:p-4', dark ? 'bg-white/[0.07] ring-1 ring-inset ring-white/15' : 'bg-white/85 shadow-soft ring-1 ring-inset ring-white backdrop-blur', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('truncate font-mono text-[10.5px] uppercase tracking-[0.12em]', dark ? 'text-green-200' : 'text-ink-500')}>{label}</p>
        {icon && <span className={cn('hidden h-8 w-8 shrink-0 items-center justify-center rounded-full xl:flex', dark ? 'bg-white/10 text-white' : 'bg-green-50 text-green-700')}>{icon}</span>}
      </div>
      <p className={cn('num mt-1.5 text-[24px] leading-none sm:text-[26px]', dark ? 'text-white' : 'text-ink-900')}>{value}</p>
      {hint && <p className={cn('mt-1.5 text-xs leading-snug', dark ? 'text-white/65' : 'text-ink-500')}>{hint}</p>}
    </div>
  );
}

/** Numbered step with a connector line, used for calm one-card flows (check-in, custom symptom). */
export function StepSection({ n, title, hint, done, optional, children, last, className }: { n: number; title: ReactNode; hint?: ReactNode; done?: boolean; optional?: boolean; children: ReactNode; last?: boolean; className?: string }) {
  const disc = (cls: string) => (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center rounded-full font-mono font-medium transition', cls, done ? 'bg-green-700 text-white shadow-soft' : 'bg-white text-green-800 ring-2 ring-inset ring-green-200')}>
      {done ? '✓' : n}
    </span>
  );
  return (
    <section className={cn('relative flex gap-4', !last && 'border-b border-ink-100 pb-6 sm:border-0 sm:pb-0', className)}>
      {/* Phones: the number sits beside the title so the content gets the full width. */}
      <div className="hidden shrink-0 flex-col items-center sm:flex">
        {disc('h-9 w-9 text-sm')}
        {!last && <span aria-hidden className={cn('mt-2 w-0.5 flex-1 rounded-full', done ? 'bg-green-200' : 'bg-ink-100')} />}
      </div>
      <div className={cn('min-w-0 flex-1', !last && 'sm:pb-8')}>
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1">
          {disc('h-7 w-7 text-xs sm:hidden')}
          <h2 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
          {optional && <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">Optional</span>}
          {hint && <p className="w-full text-sm text-ink-500">{hint}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
