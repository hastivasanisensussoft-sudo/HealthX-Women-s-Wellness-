/** Static catalogues from the SRS (goals §8, symptoms §13–§14, moods §16, workouts §26, content §38). */
import type {
  ContentCategory,
  ContentType,
  Flow,
  GoalKey,
  LifeStage,
  MoodLevel,
  NotificationType,
  Severity,
  SymptomCategory,
  SymptomDef,
  WorkoutCategory,
  CyclePhase,
} from './types';

export const GOALS: { key: GoalKey; label: string; description: string; icon: string; phase: 1 | 2 | 3 }[] = [
  { key: 'understand_cycle', label: 'Understand my cycle', description: 'Period tracking, estimates and cycle education', icon: 'calendar-heart', phase: 1 },
  { key: 'improve_wellness', label: 'Improve wellness', description: 'Daily check-ins, habits and gentle routines', icon: 'sparkles', phase: 1 },
  { key: 'track_symptoms', label: 'Track symptoms', description: 'Spot recurring patterns across your cycle', icon: 'activity', phase: 1 },
  { key: 'improve_fitness', label: 'Improve fitness', description: 'Workouts, steps and movement goals', icon: 'dumbbell', phase: 1 },
  { key: 'improve_nutrition', label: 'Improve nutrition', description: 'Meals, protein, fibre and hydration', icon: 'salad', phase: 2 },
  { key: 'manage_weight', label: 'Manage weight', description: 'Balanced habits — no crash diets', icon: 'scale', phase: 2 },
  { key: 'fertility_awareness', label: 'Fertility awareness', description: 'Cycle signs and fertile-window estimates', icon: 'flower', phase: 3 },
  { key: 'pregnancy_wellness', label: 'Pregnancy wellness', description: 'Week-by-week wellness education', icon: 'baby', phase: 3 },
  { key: 'perimenopause', label: 'Perimenopause', description: 'Cycle changes, hot flashes, sleep and mood', icon: 'sun-moon', phase: 3 },
  { key: 'menopause', label: 'Menopause', description: 'Symptoms, strength, sleep and bone health', icon: 'leaf', phase: 3 },
];

export const FLOWS: { key: Flow; label: string; drops: number }[] = [
  { key: 'light', label: 'Light', drops: 1 },
  { key: 'medium', label: 'Medium', drops: 2 },
  { key: 'heavy', label: 'Heavy', drops: 3 },
  { key: 'very_heavy', label: 'Very heavy', drops: 4 },
];

export const SEVERITIES: { key: Severity; label: string }[] = [
  { key: 'mild', label: 'Mild' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'severe', label: 'Severe' },
];

export const SYMPTOM_CATEGORIES: { key: SymptomCategory; label: string }[] = [
  { key: 'physical', label: 'Physical' },
  { key: 'digestive', label: 'Digestive' },
  { key: 'skin', label: 'Skin' },
  { key: 'emotional', label: 'Emotional' },
  { key: 'energy', label: 'Energy' },
  { key: 'life_stage', label: 'Life stage' },
];

/**
 * Unified symptom catalogue (§14 categories + §13 period symptoms, see D-30).
 * `icon` keys are mapped to icon components in each app.
 */
export const SYMPTOMS: SymptomDef[] = [
  { id: 'cramps', label: 'Cramps', category: 'physical', icon: 'zap' },
  { id: 'headache', label: 'Headache', category: 'physical', icon: 'brain' },
  { id: 'fatigue', label: 'Fatigue', category: 'physical', icon: 'battery-low' },
  { id: 'bloating', label: 'Bloating', category: 'physical', icon: 'circle-dot' },
  { id: 'breast_tenderness', label: 'Breast tenderness', category: 'physical', icon: 'heart' },
  { id: 'back_pain', label: 'Back pain', category: 'physical', icon: 'person-standing' },
  { id: 'nausea', label: 'Nausea', category: 'digestive', icon: 'waves' },
  { id: 'constipation', label: 'Constipation', category: 'digestive', icon: 'circle-slash' },
  { id: 'diarrhea', label: 'Diarrhea', category: 'digestive', icon: 'droplets' },
  { id: 'appetite_changes', label: 'Appetite changes', category: 'digestive', icon: 'utensils' },
  { id: 'acne', label: 'Acne', category: 'skin', icon: 'sparkle' },
  { id: 'dry_skin', label: 'Dry skin', category: 'skin', icon: 'sun' },
  { id: 'oily_skin', label: 'Oily skin', category: 'skin', icon: 'droplet' },
  { id: 'irritability', label: 'Irritability', category: 'emotional', icon: 'flame' },
  { id: 'sadness', label: 'Sadness', category: 'emotional', icon: 'cloud-rain' },
  { id: 'anxiety', label: 'Anxiety', category: 'emotional', icon: 'wind' },
  { id: 'calm', label: 'Calm', category: 'emotional', icon: 'leaf' },
  { id: 'mood_swings', label: 'Mood swings', category: 'emotional', icon: 'shuffle' },
  { id: 'energy_low', label: 'Low energy', category: 'energy', icon: 'battery-low' },
  { id: 'energy_medium', label: 'Medium energy', category: 'energy', icon: 'battery-medium' },
  { id: 'energy_high', label: 'High energy', category: 'energy', icon: 'battery-full' },
  { id: 'hot_flash', label: 'Hot flash', category: 'life_stage', icon: 'thermometer' },
  { id: 'night_sweats', label: 'Night sweats', category: 'life_stage', icon: 'moon' },
];

/** Subset offered in the period logger (§13). */
export const PERIOD_SYMPTOM_IDS = [
  'cramps',
  'headache',
  'back_pain',
  'bloating',
  'breast_tenderness',
  'fatigue',
  'nausea',
  'acne',
  'appetite_changes',
];

export const MOODS: { key: MoodLevel; label: string; score: number; emoji: string }[] = [
  { key: 'excellent', label: 'Excellent', score: 5, emoji: '😄' },
  { key: 'good', label: 'Good', score: 4, emoji: '🙂' },
  { key: 'neutral', label: 'Neutral', score: 3, emoji: '😐' },
  { key: 'low', label: 'Low', score: 2, emoji: '😔' },
  { key: 'very_low', label: 'Very low', score: 1, emoji: '😢' },
];

export const moodScore = (m: MoodLevel) => MOODS.find((x) => x.key === m)?.score ?? 3;
export const moodLabel = (m: MoodLevel) => MOODS.find((x) => x.key === m)?.label ?? m;

/** D-28: store 1–10, derive Low/Medium/High bands for display and rules. */
export function energyBand(v: number): 'low' | 'medium' | 'high' {
  if (v <= 4) return 'low';
  if (v <= 7) return 'medium';
  return 'high';
}

export const WORKOUT_CATEGORIES: { key: WorkoutCategory; label: string; icon: string }[] = [
  { key: 'strength', label: 'Strength', icon: 'dumbbell' },
  { key: 'walking', label: 'Walking', icon: 'footprints' },
  { key: 'yoga', label: 'Yoga', icon: 'flower-2' },
  { key: 'mobility', label: 'Mobility', icon: 'move' },
  { key: 'cardio', label: 'Cardio', icon: 'heart-pulse' },
  { key: 'pilates', label: 'Pilates', icon: 'circle-dot' },
  { key: 'stretching', label: 'Stretching', icon: 'stretch-horizontal' },
  { key: 'meditation', label: 'Meditation', icon: 'brain' },
];

export const CONTENT_CATEGORIES: { key: ContentCategory; label: string; topics: string[]; icon: string }[] = [
  { key: 'cycle', label: 'Cycle', topics: ['Period basics', 'Cycle phases', 'Symptoms'], icon: 'calendar-heart' },
  { key: 'fitness', label: 'Fitness', topics: ['Strength', 'Cardio', 'Mobility'], icon: 'dumbbell' },
  { key: 'nutrition', label: 'Nutrition', topics: ['Balanced meals', 'Protein', 'Fibre', 'Hydration'], icon: 'salad' },
  { key: 'mental_wellness', label: 'Mental wellness', topics: ['Stress', 'Relaxation', 'Mindfulness'], icon: 'brain' },
  { key: 'life_stages', label: 'Life stages', topics: ['Reproductive years', 'Fertility awareness', 'Pregnancy', 'Perimenopause', 'Menopause'], icon: 'sprout' },
  { key: 'skin', label: 'Skin', topics: ['Skin & cycle'], icon: 'sparkles' },
];

export const LIFE_STAGES: { key: LifeStage; label: string }[] = [
  { key: 'all', label: 'All stages' },
  { key: 'reproductive', label: 'Reproductive years' },
  { key: 'fertility', label: 'Fertility awareness' },
  { key: 'pregnancy', label: 'Pregnancy' },
  { key: 'perimenopause', label: 'Perimenopause' },
  { key: 'menopause', label: 'Menopause' },
];

export const PHASES: Record<CyclePhase, { label: string; short: string; description: string; tips: string[] }> = {
  menstrual: {
    label: 'Menstrual phase',
    short: 'Period',
    description:
      'The lining of the uterus is shed. Some people notice cramps, fatigue or lower energy — everyone is different.',
    tips: ['Rest when you need to', 'Warmth can feel soothing', 'Gentle movement such as walking or stretching'],
  },
  follicular: {
    label: 'Follicular phase (estimated)',
    short: 'Follicular',
    description:
      'Begins on the first day of your period and continues until ovulation. Many people report rising energy, but your own pattern matters most.',
    tips: ['Try a new workout if you feel like it', 'Keep meals balanced', 'Notice how your energy changes'],
  },
  ovulatory: {
    label: 'Ovulatory window (estimated)',
    short: 'Ovulatory window',
    description:
      'A calendar estimate of when ovulation may happen. Calendar estimates cannot confirm ovulation and are not a form of contraception.',
    tips: ['Track how you feel', 'Stay hydrated', 'Remember: this is an estimate'],
  },
  luteal: {
    label: 'Luteal phase (estimated)',
    short: 'Luteal',
    description:
      'The days after ovulation and before your next period. Some people notice bloating, breast tenderness or mood changes.',
    tips: ['Prioritise consistent sleep', 'Gentle movement can help', 'Log symptoms to spot your patterns'],
  },
};

export const NOTIFICATION_TYPES: { key: NotificationType; label: string; example: string; icon: string }[] = [
  { key: 'cycle', label: 'Cycle', example: 'Your estimated period may begin soon.', icon: 'calendar-heart' },
  { key: 'habit', label: 'Daily check-in', example: 'Time for your daily wellness check-in.', icon: 'smile' },
  { key: 'hydration', label: 'Hydration', example: "You are behind today's hydration goal.", icon: 'glass-water' },
  { key: 'workout', label: 'Workout', example: 'Your scheduled workout is ready.', icon: 'dumbbell' },
  { key: 'content', label: 'Content', example: 'New wellness article available.', icon: 'book-open' },
  { key: 'report', label: 'Weekly report', example: 'Your weekly summary is ready.', icon: 'bar-chart-3' },
];

export const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Singapore', 'Germany'];
export const LANGUAGES = ['English', 'हिन्दी (Hindi)', 'ગુજરાતી (Gujarati)', 'Español', 'Français'];
export const TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'America/Los_Angeles', 'Australia/Sydney', 'Asia/Dubai', 'Asia/Singapore'];

export const WATER_PRESETS_ML = [150, 250, 350, 500];

/** Mood log — "What's affecting your mood?" (mockup M17). Icon keys exist on web + mobile. */
export const MOOD_FACTORS: { key: string; label: string; icon: string }[] = [
  { key: 'work', label: 'Work', icon: 'brain' },
  { key: 'sleep', label: 'Sleep', icon: 'moon' },
  { key: 'family', label: 'Family', icon: 'heart' },
  { key: 'exercise', label: 'Exercise', icon: 'activity' },
  { key: 'weather', label: 'Weather', icon: 'cloud-rain' },
  { key: 'social', label: 'Friends', icon: 'smile' },
  { key: 'health', label: 'Health', icon: 'heart-pulse' },
  { key: 'cycle', label: 'Cycle', icon: 'calendar-heart' },
];

/** Icons offered when creating a custom symptom (mockup M16). */
export const CUSTOM_SYMPTOM_ICONS = ['brain', 'flame', 'thermometer', 'zap', 'moon', 'droplet', 'heart-pulse', 'sparkles'];

/** Library — "Filter by medium and time" (mockup M26/M27). */
export const LIBRARY_MEDIA: { key: 'article' | 'audio' | 'video'; label: string; types: ContentType[] }[] = [
  { key: 'audio', label: 'Audio', types: ['podcast'] },
  { key: 'video', label: 'Video', types: ['video'] },
  { key: 'article', label: 'Article', types: ['article', 'faq', 'infographic'] },
];
export const LIBRARY_DURATIONS: { key: string; label: string; min: number; max: number }[] = [
  { key: 'lt5', label: '<5 min', min: 0, max: 4 },
  { key: '10', label: '10 min', min: 5, max: 10 },
  { key: '15', label: '15 min', min: 11, max: 15 },
  { key: '20', label: '20 min', min: 16, max: 20 },
  { key: '30', label: '30 min', min: 21, max: 999 },
];
export const QUICK_HELP = 'Quick Help';

/** Phase 4 community groups (mockup M-Community). */
export const COMMUNITY_GROUPS = ['Fitness', 'Nutrition', 'Menopause', 'Yoga', 'Running', 'Sleep'];
