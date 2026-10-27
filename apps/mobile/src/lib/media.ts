import { VIDEOS, type VideoCategory, type VideoKey } from '@healthx/shared';
import type { ImageSourcePropType } from 'react-native';

import { PHOTOS } from './photos';

/**
 * Bundled video previews (free Mixkit clips, see packages/shared/assets/videos/CREDITS.md).
 * Metro needs static require() paths, so each clip is listed here. A missing entry makes the
 * player show its fallback (poster + routine steps) instead of crashing.
 */
const CLIPS: Partial<Record<VideoKey, number>> = {
  'yoga-flow': require('../../../../packages/shared/assets/videos/yoga-flow.mp4'),
  breathing: require('../../../../packages/shared/assets/videos/breathing.mp4'),
  'walk-outdoors': require('../../../../packages/shared/assets/videos/walk-outdoors.mp4'),
  'healthy-cooking': require('../../../../packages/shared/assets/videos/healthy-cooking.mp4'),
  hydration: require('../../../../packages/shared/assets/videos/hydration.mp4'),
  'sleep-winddown': require('../../../../packages/shared/assets/videos/sleep-winddown.mp4'),
  strength: require('../../../../packages/shared/assets/videos/strength.mp4'),
};
const POSTERS: Partial<Record<VideoKey, ImageSourcePropType>> = {
  'yoga-flow': require('../../../../packages/shared/assets/videos/yoga-flow.jpg'),
  breathing: require('../../../../packages/shared/assets/videos/breathing.jpg'),
  'walk-outdoors': require('../../../../packages/shared/assets/videos/walk-outdoors.jpg'),
  'healthy-cooking': require('../../../../packages/shared/assets/videos/healthy-cooking.jpg'),
  hydration: require('../../../../packages/shared/assets/videos/hydration.jpg'),
  'sleep-winddown': require('../../../../packages/shared/assets/videos/sleep-winddown.jpg'),
  strength: require('../../../../packages/shared/assets/videos/strength.jpg'),
};

export const videoSource = (key: VideoKey): number | undefined => CLIPS[key];

/** Poster frame, or the related photo when the frame isn't bundled. */
export const posterSource = (key: VideoKey): ImageSourcePropType => POSTERS[key] ?? PHOTOS[VIDEOS[key].photo];

export const VIDEO_CATEGORY_LABEL: Record<VideoCategory, string> = {
  movement: 'Movement',
  mind: 'Mind & breath',
  nutrition: 'Nutrition',
  hydration: 'Hydration',
  sleep: 'Sleep',
};
