/** Domain types for the HealthX frontend demo. Mirrors SRS §45/§46 entities. */

/** Local calendar date, `YYYY-MM-DD`. Never a UTC timestamp (SRS §70 DST/timezone safety). */
export type ISODate = string;
/** Local wall-clock time, `HH:mm`. */
export type ClockTime = string;

/** SRS §12 — every derived value says where it came from. */
export type Provenance = 'estimated' | 'user_entered' | 'validated';

export type Flow = 'light' | 'medium' | 'heavy' | 'very_heavy';
export type MoodLevel = 'excellent' | 'good' | 'neutral' | 'low' | 'very_low';
export type Severity = 'mild' | 'moderate' | 'severe';
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export type Regularity = 'regular' | 'irregular' | 'not_sure';
export type LifeStageMode = 'cycle' | 'pregnancy' | 'perimenopause' | 'menopause';
export type Plan = 'free' | 'premium';
export type Units = 'metric' | 'imperial';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type GoalKey =
  | 'understand_cycle'
  | 'improve_wellness'
  | 'track_symptoms'
  | 'improve_fitness'
  | 'improve_nutrition'
  | 'manage_weight'
  | 'fertility_awareness'
  | 'pregnancy_wellness'
  | 'perimenopause'
  | 'menopause';

export type SymptomCategory = 'physical' | 'digestive' | 'skin' | 'emotional' | 'energy' | 'life_stage';

export type WorkoutCategory =
  | 'strength'
  | 'walking'
  | 'yoga'
  | 'mobility'
  | 'cardio'
  | 'pilates'
  | 'stretching'
  | 'meditation';

export type ContentCategory = 'cycle' | 'fitness' | 'nutrition' | 'mental_wellness' | 'life_stages' | 'skin';
export type LifeStage = 'all' | 'reproductive' | 'fertility' | 'pregnancy' | 'perimenopause' | 'menopause';
export type ContentType = 'article' | 'video' | 'infographic' | 'faq' | 'podcast' | 'program';
export type ContentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export type NotificationType = 'cycle' | 'habit' | 'hydration' | 'workout' | 'content' | 'report';

/** Keys of photos in packages/shared/assets/photos (apps map keys → files). */
export type PhotoKey =
  | 'hero-woman'
  | 'woman-tea'
  | 'yoga-home'
  | 'healthy-food'
  | 'water'
  | 'sleep'
  | 'journaling'
  | 'meditation'
  | 'walking-outdoors'
  | 'mature-woman'
  | 'senior-woman-active'
  | 'pregnant-woman'
  | 'friends-group'
  | 'doctor-consult'
  | 'strength-training'
  | 'stretching'
  | 'nutrition-bowl'
  | 'south-asian-woman'
  | 'cozy-comfort'
  | 'avatar-1'
  | 'avatar-2'
  | 'avatar-3'
  | 'avatar-4'
  | 'portrait-curly'
  | 'portrait-indian'
  | 'woman-running'
  | 'pilates-mat'
  | 'fresh-fruit'
  | 'herbal-tea'
  | 'woman-reading'
  | 'period-comfort'
  | 'friends-yoga'
  | 'nature-leaves';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  dob: ISODate;
  country: string;
  timezone: string;
  language: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  avatar?: PhotoKey;
  goals: GoalKey[];
  units: Units;
  mode: LifeStageMode;
  plan: Plan;
  memberSince: ISODate;
}

/** SRS §10 cycle profile. */
export interface CycleProfile {
  lastPeriodStart: ISODate | null;
  typicalCycleLength: number | null;
  typicalPeriodLength: number | null;
  regularity: Regularity;
}

/** SRS §46 Period (+ per-day flow, see D-23). */
export interface PeriodLog {
  id: string;
  start: ISODate;
  /** null while the period is ongoing. */
  end: ISODate | null;
  flowByDay: Record<ISODate, Flow>;
  notes?: string;
}

export interface SymptomDef {
  id: string;
  label: string;
  category: SymptomCategory;
  /** Icon key, mapped to an icon component per platform. */
  icon: string;
  custom?: boolean;
  /** Pre-selected severity when this (custom) symptom is picked. */
  defaultSeverity?: Severity;
}

/** SRS §46 SymptomLog. */
export interface SymptomLog {
  id: string;
  symptomId: string;
  date: ISODate;
  severity: Severity;
  notes?: string;
}

/**
 * SRS §32 daily check-in. Energy/stress/anxiety are 1–10 (D-28). Stress, anxiety
 * and sleep are optional (§16 "Optional: stress level, anxiety level"; D-05) so
 * mood or stress can be logged on their own without inventing other values.
 */
export interface CheckIn {
  date: ISODate;
  mood: MoodLevel;
  energy: number;
  stress?: number;
  anxiety?: number;
  sleepHours?: number;
  symptomIds: string[];
  /** "What's affecting your mood?" chips (MOOD_FACTORS keys). */
  moodFactors?: string[];
  note?: string;
}

export interface WaterLog {
  id: string;
  date: ISODate;
  time: ClockTime;
  ml: number;
}

export interface SleepLog {
  date: ISODate; // the morning the user woke up
  bedtime: ClockTime;
  wake: ClockTime;
  durationMin: number;
  quality: 1 | 2 | 3 | 4 | 5;
  wakings: number;
  source: 'manual' | 'apple_health' | 'health_connect';
}

export interface ActivityDay {
  date: ISODate;
  steps: number;
  activeMin: number;
  source: 'manual' | 'apple_health' | 'health_connect';
}

export interface Exercise {
  name: string;
  detail: string;
}

export interface Workout {
  id: string;
  title: string;
  category: WorkoutCategory;
  durationMin: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  equipment: 'none' | 'mat' | 'dumbbells' | 'band';
  location: 'home' | 'gym' | 'outdoors';
  description: string;
  exercises: Exercise[];
  photo: PhotoKey;
  kcalEstimate: number;
}

export interface WorkoutSession {
  id: string;
  workoutId?: string;
  title: string;
  category: WorkoutCategory;
  durationMin: number;
  date: ISODate;
  status: 'completed' | 'abandoned';
}

export interface MealLog {
  id: string;
  date: ISODate;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Habit {
  id: string;
  title: string;
  icon: string;
  category: 'hydration' | 'movement' | 'mindfulness' | 'nutrition' | 'sleep';
  /** 0 = Sunday … 6 = Saturday. Empty = every day. */
  days: number[];
}

export interface HabitCompletion {
  habitId: string;
  date: ISODate;
}

export interface WellnessGoal {
  id: string;
  title: string;
  metric: 'steps' | 'workouts' | 'water' | 'sleep' | 'checkins' | 'mindful';
  target: number;
  unit: string;
  period: 'daily' | 'weekly';
  createdAt: ISODate;
  status: 'active' | 'completed' | 'paused';
}

export interface PlanItem {
  id: string;
  title: string;
  detail: string;
  icon: string;
  done: boolean;
}

export type InsightTone = 'positive' | 'suggestion' | 'pattern' | 'attention';

export interface Insight {
  id: string;
  ruleId: string;
  title: string;
  body: string;
  tone: InsightTone;
  category: 'cycle' | 'sleep' | 'activity' | 'hydration' | 'mood' | 'nutrition';
  /** SRS phase the rule belongs to (2 = advanced insights / premium). */
  phase: 1 | 2;
  date: ISODate;
  ctaLabel?: string;
  ctaTo?: string;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  category: ContentCategory;
  topic: string;
  lifeStage: LifeStage;
  type: ContentType;
  readMin: number;
  author: string;
  reviewer: string;
  reviewDate: ISODate;
  publishedAt: ISODate;
  updatedAt: ISODate;
  version: number;
  status: ContentStatus;
  language: string;
  references: string[];
  photo: PhotoKey;
  body: string[];
  /** Library tags, e.g. "Quick Help". FAQ items use type 'faq'. */
  tags?: string[];
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO datetime
  read: boolean;
  to?: string;
}

export interface NotificationPref {
  enabled: boolean;
  time: ClockTime;
}

export interface NotificationPrefs {
  types: Record<NotificationType, NotificationPref>;
  /** [ADD A-08] generic lock-screen text. */
  discreet: boolean;
  /** [ADD A-09] */
  quietHours: { enabled: boolean; from: ClockTime; to: ClockTime };
}

export interface Reminder {
  id: string;
  title: string;
  type: NotificationType;
  time: ClockTime;
  /** One-off date, or undefined for daily. */
  date?: ISODate;
  enabled: boolean;
}

export interface Consent {
  id: 'health_processing' | 'analytics' | 'ai_personalization' | 'health_integrations' | 'notifications';
  label: string;
  description: string;
  required: boolean;
  granted: boolean;
  version: string;
  updatedAt: ISODate;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: ISODate;
  progress: number; // 0..1
}

/** SRS §21 — all user-entered, never "confirmed ovulation". */
export interface FertilityLog {
  date: ISODate;
  bbtCelsius?: number;
  mucus?: 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg_white';
  ovulationTest?: 'negative' | 'positive' | 'not_sure';
}

export interface HealthConnection {
  id: 'apple_health' | 'health_connect' | 'wearable';
  label: string;
  connected: boolean;
  lastSync?: string;
  dataTypes: string[];
  phase: 2 | 3;
}

export interface ActivityFeedItem {
  id: string;
  at: string; // ISO datetime
  kind: 'period' | 'symptom' | 'checkin' | 'water' | 'workout' | 'sleep' | 'meal' | 'habit' | 'goal' | 'content';
  text: string;
}

export interface WellnessWeights {
  activity: number;
  sleep: number;
  hydration: number;
  nutrition: number;
  habits: number;
  mood: number;
}

/** Phase 4 — moderated community (SRS §64). Posts are personal experiences, not advice. */
export interface CommunityPost {
  id: string;
  group: string;
  author: string;
  initials: string;
  at: string; // ISO datetime
  text: string;
  likes: number;
  comments: number;
  liked?: boolean;
  reported?: boolean;
  mine?: boolean;
}
