import type { PhotoKey, VideoKey, Workout, WorkoutCategory } from '@healthx/shared';

/**
 * Library display photos: a few workouts share the same catalogue photo, so the web library
 * swaps in a related licensed photo to keep a page of cards varied. Unknown ids keep `w.photo`.
 */
const WORKOUT_PHOTO: Record<string, PhotoKey> = {
  w_cardio_hiit: 'woman-running',
  w_pilates_core: 'pilates-mat',
  w_stretch_evening: 'friends-yoga',
  w_walk_mindful: 'nature-leaves',
};
export const workoutPhoto = (w: Workout): PhotoKey => WORKOUT_PHOTO[w.id] ?? w.photo;

const CATEGORY_VIDEO: Record<WorkoutCategory, VideoKey> = {
  strength: 'strength',
  walking: 'walk-outdoors',
  yoga: 'yoga-flow',
  mobility: 'yoga-flow',
  cardio: 'walk-outdoors',
  pilates: 'yoga-flow',
  stretching: 'yoga-flow',
  meditation: 'breathing',
};
/** The guided video preview that best matches a workout. */
export const workoutVideo = (w: Workout): VideoKey => (w.id === 'w_meditation_sleep' ? 'sleep-winddown' : CATEGORY_VIDEO[w.category]);

const GROUP_PHOTO: Record<string, PhotoKey> = {
  Fitness: 'strength-training',
  Nutrition: 'nutrition-bowl',
  Menopause: 'mature-woman',
  Yoga: 'friends-yoga',
  Running: 'woman-running',
  Sleep: 'woman-reading',
};
export const groupPhoto = (group: string): PhotoKey => GROUP_PHOTO[group] ?? 'friends-group';

const LEVEL_BARS = { beginner: 1, intermediate: 2, advanced: 3 } as const;
export const levelBars = (level: Workout['level']) => LEVEL_BARS[level];
