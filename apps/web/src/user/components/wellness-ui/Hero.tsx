import type { ReactNode } from 'react';
import { palette } from '@healthx/shared';
import { Leaf } from '@/components/brand/Brand';
import { cn } from '@/lib/utils';
import { themeColor } from './theme';

export type HeroTone = 'forest' | 'night' | 'sky' | 'wash' | 'peach';

const TONES: Record<HeroTone, string> = {
  forest: 'bg-forest text-white',
  night: 'bg-indigo-700 text-white',
  sky: 'bg-gradient-to-br from-sky-50 via-white to-green-50 text-ink-900 ring-1 ring-inset ring-sky-100',
  wash: 'bg-wash text-ink-900 ring-1 ring-inset ring-green-100',
  peach: 'bg-gradient-to-br from-peach-50 via-white to-butter-50 text-ink-900 ring-1 ring-inset ring-peach-100',
};

const LEAF: Record<HeroTone, string> = {
  forest: themeColor('green-300', palette.green[300]),
  night: themeColor('indigo-300', palette.indigo[300]),
  sky: themeColor('sky-100', palette.sky[100]),
  wash: themeColor('rose-100', palette.rose[100]),
  peach: themeColor('peach-100', palette.peach[100]),
};

/** Hero panel for a screen's key metric (forest, night sky or soft washes), with an optional drifting leaf. */
export function HeroPanel({ tone = 'forest', className, children, leaf = true, moon = true, label }: { tone?: HeroTone; className?: string; children: ReactNode; leaf?: boolean; /** Night tone only: draw the corner moon (pass false and place <NightMoon> yourself). */ moon?: boolean; label?: string }) {
  const dark = tone === 'forest' || tone === 'night';
  return (
    <section aria-label={label} className={cn('relative isolate overflow-hidden rounded-[34px] p-5 shadow-lift sm:p-8', TONES[tone], className)}>
      {tone === 'night' && <NightSky moon={moon} />}
      {leaf && <Leaf className={cn('pointer-events-none absolute -right-10 -top-12 -z-10 h-48 w-48 rotate-12', dark ? 'opacity-15' : 'opacity-60')} color={LEAF[tone]} />}
      {children}
    </section>
  );
}

const STARS = [
  [8, 14, 2],
  [18, 62, 1.5],
  [27, 28, 2.5],
  [36, 80, 1.5],
  [44, 10, 1.5],
  [52, 44, 2],
  [61, 72, 1.5],
  [70, 22, 2],
  [78, 54, 1.5],
  [86, 84, 2],
  [93, 36, 1.5],
  [12, 90, 1.5],
  [57, 92, 1.5],
] as const;

/** Soft glows, twinkling stars and a crescent moon for night (sleep) panels. */
export function NightSky({ moon = true }: { moon?: boolean }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-indigo-400/50 blur-3xl" />
      <span className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-lavender-400/30 blur-3xl" />
      <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-green-950/55 to-transparent" />
      {STARS.map(([x, y, s], i) => (
        <span key={i} className="absolute animate-pulse-soft rounded-full bg-current text-white" style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, opacity: 0.35 + (i % 3) * 0.2, animationDelay: `${i * 0.37}s` }} />
      ))}
      {moon && <NightMoon className="absolute right-6 top-6 h-20 w-20 sm:right-10 sm:top-8 sm:h-24 sm:w-24" />}
    </span>
  );
}

/** Glowing crescent moon (decorative). */
export function NightMoon({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('pointer-events-none', className)}>
      <span className="absolute inset-[-12%] rounded-full bg-current text-butter-100 opacity-20 blur-xl" />
      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        <path d="M62 14 A36 36 0 1 0 86 66 A28 28 0 1 1 62 14 Z" className="fill-current text-butter-200" />
      </svg>
    </span>
  );
}

/** Small stat block for hero panels — frosted on dark heroes, white on light ones. */
export function HeroStat({
  label,
  value,
  unit,
  hint,
  icon,
  dark,
  dense,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  dark?: boolean;
  /** Tighter on phones (for three-across rows): smaller padding and number, icon and hint from `sm` up. */
  dense?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 rounded-3xl', dense ? 'p-3 sm:p-4' : 'p-4', dark ? 'glass-dark' : 'bg-white/85 shadow-soft ring-1 ring-inset ring-white backdrop-blur', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('font-mono text-[10.5px] uppercase tracking-[0.14em]', dense ? 'leading-tight sm:truncate' : 'truncate', dark ? 'text-white/70' : 'text-ink-500')}>{label}</p>
        {icon && <span className={cn('h-8 w-8 shrink-0 items-center justify-center rounded-full', dense ? 'hidden sm:flex' : 'flex', dark ? 'bg-white/10 text-white' : 'bg-white text-green-700 shadow-xs')}>{icon}</span>}
      </div>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1">
        <span className={cn('num leading-none', dense ? 'text-[21px] sm:text-[26px]' : 'text-[26px]', dark ? 'text-white' : 'text-ink-900')}>{value}</span>
        {unit && <span className={cn('font-semibold', dense ? 'text-xs sm:text-sm' : 'text-sm', dark ? 'text-white/70' : 'text-ink-500')}>{unit}</span>}
      </p>
      {hint && <p className={cn('mt-1 text-xs leading-snug', dense && 'hidden sm:block', dark ? 'text-white/70' : 'text-ink-500')}>{hint}</p>}
    </div>
  );
}

/** Mono eyebrow + Outfit title used inside hero panels. */
export function HeroHeading({ eyebrow, title, sub, dark, eyebrowClass }: { eyebrow: ReactNode; title: ReactNode; sub?: ReactNode; dark?: boolean; eyebrowClass?: string }) {
  return (
    <div className="min-w-0">
      <p className={cn('font-mono text-[11.5px] uppercase tracking-[0.16em]', eyebrowClass ?? (dark ? 'text-green-200' : 'text-green-700'))}>{eyebrow}</p>
      <div className={cn('mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[34px]', dark ? 'text-white' : 'text-ink-900')}>{title}</div>
      {sub && <p className={cn('mt-2 max-w-md text-[15px] leading-relaxed', dark ? 'text-white/75' : 'text-ink-600')}>{sub}</p>}
    </div>
  );
}
