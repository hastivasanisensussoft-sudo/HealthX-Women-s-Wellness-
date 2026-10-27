import type { Article, ContentCategory, LifeStageMode, NotificationType, VideoKey } from '@healthx/shared';
import type { TileTone } from '@/components/ui';

/** Fixed data colours (design system §2) for library topics, notification types and life-stage modes. */
export const CATEGORY_TONE: Record<ContentCategory, TileTone> = {
  cycle: 'rose',
  fitness: 'green',
  nutrition: 'peach',
  mental_wellness: 'lavender',
  life_stages: 'indigo',
  skin: 'butter',
};

export const NOTIF_TONE: Record<NotificationType, TileTone> = {
  cycle: 'rose',
  habit: 'lavender',
  hydration: 'sky',
  workout: 'green',
  content: 'peach',
  report: 'indigo',
};

/** Soft icon disc / tile classes per tone (tint ≤ 100, *-700 text). */
export const TONE_SOFT: Record<TileTone, string> = {
  green: 'bg-green-50 text-green-700 ring-green-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  lavender: 'bg-lavender-50 text-lavender-700 ring-lavender-100',
  peach: 'bg-peach-50 text-peach-700 ring-peach-100',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  butter: 'bg-butter-100 text-green-900 ring-butter-200',
};

/** ChipToggle supports a subset of tones. */
export const CHIP_TONE: Record<TileTone, 'green' | 'rose' | 'lavender' | 'peach' | 'sky'> = {
  green: 'green',
  rose: 'rose',
  lavender: 'lavender',
  peach: 'peach',
  sky: 'sky',
  indigo: 'lavender',
  butter: 'peach',
};

export const MODE_LABEL: Record<LifeStageMode, string> = {
  cycle: 'Cycle tracking',
  pregnancy: 'Pregnancy mode',
  perimenopause: 'Perimenopause mode',
  menopause: 'Menopause mode',
};

/** Closest guided-routine video for a library item, or null when nothing fits (cycle basics, FAQs about care). */
export function videoFor(a: Article): VideoKey | null {
  const t = `${a.id} ${a.topic} ${a.title}`.toLowerCase();
  if (/sleep|wind-down|asleep/.test(t)) return 'sleep-winddown';
  if (/breath|stress|relax|mindful|sitali|mood/.test(t)) return 'breathing';
  if (/hydrat|water/.test(t)) return 'hydration';
  if (/strength|bone/.test(t)) return 'strength';
  if (/cardio|walk/.test(t)) return 'walk-outdoors';
  if (/mobility|neck|stretch|tension|yoga|cramp/.test(t)) return 'yoga-flow';
  if (a.category === 'nutrition') return 'healthy-cooking';
  return null;
}
