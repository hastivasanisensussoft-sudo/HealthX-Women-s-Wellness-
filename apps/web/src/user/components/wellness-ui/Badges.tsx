import { Award, Lock } from 'lucide-react';
import { formatDate, type Badge } from '@healthx/shared';
import { ProgressBar } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';

const MEDAL_TONES = [
  { blob: 'bg-butter-100', leaf: 'bg-rose-100', disc: 'from-butter-200 to-peach-200', icon: 'text-peach-700' },
  { blob: 'bg-green-100', leaf: 'bg-butter-100', disc: 'from-green-100 to-green-300', icon: 'text-green-800' },
  { blob: 'bg-lavender-100', leaf: 'bg-sky-100', disc: 'from-lavender-100 to-rose-200', icon: 'text-lavender-700' },
  { blob: 'bg-sky-100', leaf: 'bg-green-100', disc: 'from-sky-100 to-indigo-200', icon: 'text-indigo-700' },
];

/** Soft illustrated medallion: a blob and a leaf behind a gradient disc; locked badges are dashed outlines. */
export function BadgeMedal({ icon, earned, tone = 0, size = 80 }: { icon: string; earned: boolean; tone?: number; size?: number }) {
  const t = MEDAL_TONES[tone % MEDAL_TONES.length];
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <span className={cn('blob absolute inset-0', earned ? t.blob : 'bg-ink-100/70')} />
      <span className={cn('leaf absolute -right-1 -top-1 h-[34%] w-[34%]', earned ? t.leaf : 'bg-ink-100')} />
      <span
        className={cn(
          'relative flex h-[70%] w-[70%] items-center justify-center rounded-full',
          earned ? cn('bg-gradient-to-br shadow-soft ring-4 ring-white', t.disc, t.icon) : 'border-2 border-dashed border-ink-300 bg-white text-ink-400',
        )}
      >
        <Icon name={icon} className="h-[42%] w-[42%]" />
      </span>
      {!earned && (
        <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-500 shadow-xs ring-1 ring-ink-100">
          <Lock className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  );
}

/** Badge in the gallery (tile) or in a list (row). */
export function BadgeCard({ badge, index, layout = 'tile' }: { badge: Badge; index: number; layout?: 'tile' | 'row' }) {
  const earned = !!badge.earnedAt;
  const status = earned ? (
    <p className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
      <Award className="h-3.5 w-3.5" /> Earned {formatDate(badge.earnedAt!, 'short')}
    </p>
  ) : (
    <div className="w-full">
      <ProgressBar value={badge.progress} height="h-1.5" label={`${badge.title} progress`} />
      <p className="mt-1 font-mono text-[10.5px] text-ink-400">{Math.round(badge.progress * 100)}% there</p>
    </div>
  );
  if (layout === 'row') {
    return (
      <div className={cn('flex items-center gap-4 rounded-3xl p-4 ring-1 ring-inset', earned ? 'bg-white shadow-xs ring-ink-100' : 'bg-ink-50/60 ring-ink-100')}>
        <BadgeMedal icon={badge.icon} earned={earned} tone={index} size={68} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-semibold text-ink-900">{badge.title}</p>
          <p className="mb-1.5 text-sm text-ink-500">{badge.description}</p>
          {status}
        </div>
      </div>
    );
  }
  return (
    <div className={cn('flex h-full flex-col items-center rounded-3xl p-5 text-center ring-1 ring-inset transition', earned ? 'bg-white shadow-card ring-ink-100 hover:-translate-y-0.5' : 'bg-ink-50/60 ring-ink-100')}>
      <BadgeMedal icon={badge.icon} earned={earned} tone={index} size={88} />
      <p className="mt-3 font-display text-[15.5px] font-semibold leading-snug text-ink-900">{badge.title}</p>
      <p className="mt-0.5 flex-1 text-xs leading-relaxed text-ink-500">{badge.description}</p>
      <div className="mt-3 flex w-full justify-center">{status}</div>
    </div>
  );
}
