import { VIDEOS, type VideoCategory, type VideoKey } from '@healthx/shared';
import { photo } from './photos';

export const VIDEO_CATEGORY_LABEL: Record<VideoCategory, string> = {
  movement: 'Movement',
  mind: 'Mind & breath',
  nutrition: 'Nutrition',
  hydration: 'Hydration',
  sleep: 'Sleep',
};

// Free Mixkit clips + poster frames — see packages/shared/assets/videos/CREDITS.md.
// A missing file simply resolves to undefined; components then show their fallback.
const clips = import.meta.glob('../../../../packages/shared/assets/videos/*.mp4', { eager: true, import: 'default' }) as Record<string, string>;
const posters = import.meta.glob('../../../../packages/shared/assets/videos/*.jpg', { eager: true, import: 'default' }) as Record<string, string>;

const byName = (files: Record<string, string>) => {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) out[path.split('/').pop()!.replace(/\.\w+$/, '')] = url;
  return out;
};
const CLIP = byName(clips);
const POSTER = byName(posters);

export const videoUrl = (key: VideoKey): string | undefined => CLIP[key];

/** Poster frame of the clip, or the related photo when the frame isn't available. */
export const posterUrl = (key: VideoKey): string | undefined => POSTER[key] ?? photo(VIDEOS[key]?.photo);
