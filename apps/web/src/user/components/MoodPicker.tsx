import { useRef, type KeyboardEvent } from 'react';
import { MOODS, type MoodLevel } from '@healthx/shared';
import { MoodFace } from '@/components/brand/Brand';
import { cn } from '@/lib/utils';

const HALO: Record<MoodLevel, string> = {
  excellent: 'bg-green-100',
  good: 'bg-sky-100',
  neutral: 'bg-butter-100',
  low: 'bg-peach-100',
  very_low: 'bg-lavender-100',
};

const SIZES = {
  lg: { face: 'h-11 w-11 sm:h-16 sm:w-16', btn: 'px-0.5 py-3 sm:px-1 sm:py-4', label: 'text-[11px] sm:text-[13px]', gap: 'gap-1 sm:gap-3' },
  md: { face: 'h-10 w-10 sm:h-[52px] sm:w-[52px]', btn: 'px-0.5 py-2.5 sm:px-1 sm:py-3', label: 'text-[11px] sm:text-xs', gap: 'gap-1 sm:gap-2' },
  sm: { face: 'h-9 w-9 sm:h-10 sm:w-10', btn: 'px-0.5 py-2', label: 'text-[10.5px] sm:text-[11px]', gap: 'gap-1 sm:gap-1.5' },
} as const;

/** Mood selector with friendly character faces (SRS §16, §58). Arrow keys move between faces. */
export function MoodPicker({ value, onChange, size = 'md' }: { value: MoodLevel | null; onChange: (m: MoodLevel) => void; size?: 'sm' | 'md' | 'lg' }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const s = SIZES[size];
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + MOODS.length) % MOODS.length;
    onChange(MOODS[next].key);
    refs.current[next]?.focus();
  };
  const selectedIndex = MOODS.findIndex((m) => m.key === value);
  return (
    <div role="radiogroup" aria-label="Mood" className={cn('grid grid-cols-5', s.gap)}>
      {MOODS.map((m, i) => {
        const on = value === m.key;
        return (
          <button
            key={m.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (selectedIndex === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(m.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'group flex min-w-0 flex-col items-center gap-1.5 rounded-3xl transition duration-200 sm:gap-2',
              s.btn,
              on ? 'bg-white shadow-card ring-2 ring-green-600' : 'bg-white/60 ring-1 ring-inset ring-ink-100 hover:-translate-y-0.5 hover:bg-white hover:ring-green-200',
            )}
          >
            <span className={cn('relative flex items-center justify-center rounded-full p-1 transition duration-300 sm:p-1.5', on ? HALO[m.key] : 'bg-transparent')}>
              <MoodFace mood={m.key} size={64} className={cn('transition duration-300', s.face, on ? 'scale-105' : 'opacity-90 grayscale-[35%] group-hover:grayscale-0')} />
            </span>
            <span className={cn('max-w-full truncate font-semibold leading-tight', s.label, on ? 'text-green-800' : 'text-ink-600')}>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
