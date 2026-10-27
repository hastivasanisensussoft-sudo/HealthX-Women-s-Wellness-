import {
  Activity,
  Asterisk,
  BedDouble,
  BellRing,
  Blocks,
  BookOpen,
  BookOpenCheck,
  Bot,
  CalendarHeart,
  ChartLine,
  Droplets,
  Dumbbell,
  Fingerprint,
  Flag,
  Flower2,
  LayoutDashboard,
  Lock,
  Salad,
  ShieldCheck,
  Smile,
  Stethoscope,
  Sun,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { COPY, type PhotoKey, type VideoKey } from '@healthx/shared';
import type { TileTone } from '@/components/ui/Section';

/** Mini illustration shown with a module (see `visuals.tsx`). */
export type ModuleVisualKind =
  | 'ring'
  | 'mood'
  | 'checkin'
  | 'stages'
  | 'steps'
  | 'plate'
  | 'water'
  | 'sleep'
  | 'habits'
  | 'goals'
  | 'chart'
  | 'coach'
  | 'article'
  | 'community'
  | 'reminders'
  | 'privacy'
  | 'admin';

export type ModuleGroupKey = 'cycle' | 'daily' | 'growth' | 'trust';

export interface SiteModule {
  id: string;
  group: ModuleGroupKey;
  icon: LucideIcon;
  title: string;
  short: string;
  body: string;
  points: string[];
  tone: TileTone;
  /** SRS phase for features beyond the MVP (shown with PhaseBadge). */
  phase?: 2 | 3 | 4;
  /** Simulated in this frontend (no real backend/AI). */
  simulated?: boolean;
  photo: PhotoKey;
  /** object-position for the photo (keeps faces in frame). */
  position?: string;
  video?: VideoKey;
  visual: ModuleVisualKind;
}

export const MODULE_GROUPS: { key: ModuleGroupKey; label: string; title: string; body: string }[] = [
  { key: 'cycle', label: 'Cycle & body', title: 'Know your cycle and how you feel', body: 'Periods, symptoms, mood and daily check-ins — with every estimate clearly marked.' },
  { key: 'daily', label: 'Daily wellness', title: 'Small daily habits that add up', body: 'Movement, food, water, sleep and habits in one gentle routine.' },
  { key: 'growth', label: 'Goals & insights', title: 'See what supports you', body: 'Goals, weekly reports, education and a simulated coach — patterns, never diagnoses.' },
  { key: 'trust', label: 'Privacy & teams', title: 'Built on consent and care', body: 'Reminders you control, full data controls and a reviewed content workflow.' },
];

export const MODULES: SiteModule[] = [
  {
    id: 'cycle',
    group: 'cycle',
    icon: CalendarHeart,
    title: 'Cycle & period tracking',
    short: 'Log your period and flow in a tap. Estimates learn from your history and are always marked *.',
    body: 'Log period start and end, flow and notes, then see where you are in your cycle on a calendar that shows logged days and clearly marked estimates. HealthX never assumes a 28-day cycle.',
    points: ['Flow, symptoms and notes for each day', 'Calendar with logged and estimated days', 'Cycle length and period history', 'Every estimate marked with *'],
    tone: 'rose',
    photo: 'hero-woman',
    position: '50% 22%',
    visual: 'ring',
  },
  {
    id: 'symptoms',
    group: 'cycle',
    icon: Smile,
    title: 'Symptoms & mood',
    short: 'Friendly mood faces, energy and stress sliders, and a symptom library you can extend.',
    body: 'Track physical, digestive, skin and emotional symptoms with severity, alongside mood, energy and stress — and add your own custom symptoms.',
    points: ['Mood faces with 1–10 energy and stress', 'Physical, digestive, skin and emotional symptoms', 'Custom symptoms with severity', 'Patterns shown across your cycle'],
    tone: 'lavender',
    photo: 'period-comfort',
    visual: 'mood',
  },
  {
    id: 'check-in',
    group: 'cycle',
    icon: Sun,
    title: 'Daily check-ins',
    short: 'A check-in that takes under 30 seconds and shapes a gentle plan for your day.',
    body: 'Rate your sleep, mood, energy and stress in one short flow. Your answers shape a small, doable wellness plan for the day.',
    points: ['Done in under 30 seconds', 'Feeds your daily wellness plan', 'Streaks that celebrate consistency', 'Edit any day later'],
    tone: 'green',
    photo: 'herbal-tea',
    visual: 'checkin',
  },
  {
    id: 'life-stage-modes',
    group: 'cycle',
    icon: Flower2,
    title: 'Fertility awareness & life stages',
    short: 'Learn your cycle signs, with modes for pregnancy, perimenopause and menopause.',
    body: `Log fertility-awareness observations and switch to life-stage modes for pregnancy, perimenopause and menopause, with reviewed education. ${COPY.fertilityAwareness}`,
    points: ['Your own observations, shown as estimates*', 'Pregnancy, perimenopause and menopause modes', 'Never presented as contraception', 'Designed to sit alongside your clinician'],
    tone: 'peach',
    phase: 3,
    photo: 'pregnant-woman',
    visual: 'stages',
  },
  {
    id: 'fitness',
    group: 'daily',
    icon: Dumbbell,
    title: 'Fitness & workouts',
    short: 'Home workouts, yoga, walking and strength routines for every level — with video previews.',
    body: 'Browse workouts by category and level, follow guided sessions with a timer, and see your steps and weekly activity at a glance.',
    points: ['Workout library by category and level', 'Guided sessions with a timer', 'Steps and weekly activity', 'Video previews of each routine'],
    tone: 'green',
    photo: 'pilates-mat',
    video: 'yoga-flow',
    visual: 'steps',
  },
  {
    id: 'nutrition',
    group: 'daily',
    icon: Salad,
    title: 'Nutrition',
    short: 'Balanced-plate meal logging, including vegetarian and Indian meals.',
    body: 'Log meals and see calories, protein, carbs, fat and fibre against gentle daily targets — balanced habits, never crash diets.',
    points: ['Calories, protein, carbs, fat and fibre', 'Vegetarian and Indian meal ideas', 'Balanced habits, never crash diets', 'Recipe video previews'],
    tone: 'peach',
    phase: 2,
    photo: 'nutrition-bowl',
    video: 'healthy-cooking',
    visual: 'plate',
  },
  {
    id: 'hydration',
    group: 'daily',
    icon: Droplets,
    title: 'Hydration',
    short: 'A realistic water target, one-tap logging and a streak that keeps you going.',
    body: 'Set a daily water target that suits you, add a glass in one tap and keep a gentle streak going, with reminders only if you want them.',
    points: ['Quick-add glasses', 'Daily progress and streaks', 'Reminder times you choose'],
    tone: 'sky',
    photo: 'water',
    video: 'hydration',
    visual: 'water',
  },
  {
    id: 'sleep',
    group: 'daily',
    icon: BedDouble,
    title: 'Sleep',
    short: 'Bedtime, wake time and sleep quality, measured against your own target.',
    body: 'Log bedtime, wake time, quality and night waking, and compare your sleep with your own target over the week.',
    points: ['Duration compared with your target', 'Sleep quality and night waking', 'Wind-down routine previews'],
    tone: 'indigo',
    phase: 2,
    photo: 'sleep',
    video: 'sleep-winddown',
    visual: 'sleep',
  },
  {
    id: 'habits',
    group: 'daily',
    icon: Activity,
    title: 'Habits',
    short: 'Small daily habits with streaks and gentle nudges — never guilt.',
    body: 'Build the habits that matter to you, tick them off each day and watch a streak calendar fill up at your own pace.',
    points: ['Build your own habits', 'Streak calendar', 'Nudges you control'],
    tone: 'butter',
    photo: 'journaling',
    visual: 'habits',
  },
  {
    id: 'goals',
    group: 'growth',
    icon: Target,
    title: 'Goals & plans',
    short: 'Realistic daily goals and a wellness plan that adapts to your check-in.',
    body: 'Set small, realistic goals, see your progress through the day and follow a daily wellness plan built from your latest check-in.',
    points: ['Daily goals with progress', 'A plan built from your check-in', 'Achievements and badges (Phase 2)'],
    tone: 'green',
    photo: 'woman-running',
    visual: 'goals',
  },
  {
    id: 'insights',
    group: 'growth',
    icon: ChartLine,
    title: 'Insights & reports',
    short: 'Weekly reports and observed patterns in plain language — never a diagnosis.',
    body: 'A rules-based insights engine points out recurring patterns in what you log, and your weekly report brings cycle, activity, sleep, water and mood together.',
    points: ['Observed patterns, not diagnoses', 'Weekly wellness report', 'Wellness Score — an engagement metric', 'Progress charts and trends'],
    tone: 'lavender',
    photo: 'meditation',
    visual: 'chart',
  },
  {
    id: 'learn',
    group: 'growth',
    icon: BookOpen,
    title: 'Learning library & FAQ',
    short: 'Short, friendly articles and answers to the questions women ask most.',
    body: 'Read about cycles, body, mind, nutrition and every life stage. Each article goes through medical review before it is published, and the FAQ answers the most-asked questions.',
    points: ['Cycle, body, mind and nutrition', 'Fertility, pregnancy and life-stage education', 'Most-asked questions', 'Search, filters and bookmarks'],
    tone: 'sky',
    photo: 'south-asian-woman',
    visual: 'article',
  },
  {
    id: 'coach',
    group: 'growth',
    icon: Bot,
    title: 'AI wellness coach',
    short: 'A simulated coach that shares general education and points you to care when it matters.',
    body: `${COPY.aiDisclaimer} In this demo the coach is simulated — no real AI service is connected.`,
    points: ['General wellness education', 'Declines diagnosis and medication advice', 'Redirects emergencies to medical care', 'Uses your logs only with your consent'],
    tone: 'lavender',
    phase: 2,
    simulated: true,
    photo: 'portrait-curly',
    visual: 'coach',
  },
  {
    id: 'community',
    group: 'growth',
    icon: Users,
    title: 'Community',
    short: 'A moderated space for support groups and shared experiences, previewed today.',
    body: 'Topic-based groups where women can share experiences and support each other, with moderation and reporting built in from the start.',
    points: ['Topic-based support groups', 'Moderation and reporting', 'Preview only in this release'],
    tone: 'rose',
    phase: 4,
    photo: 'friends-group',
    visual: 'community',
  },
  {
    id: 'privacy',
    group: 'trust',
    icon: Lock,
    title: 'Privacy & data controls',
    short: 'See every consent, export your data or delete your account at any time.',
    body: `Every optional use of your data is off until you turn it on. Export a copy of your data or delete your account whenever you like. ${COPY.employerPrivacy}`,
    points: ['Consents you can change anytime', 'Export your data', 'Delete your account and data', 'Never sold, never shared with employers'],
    tone: 'green',
    photo: 'nature-leaves',
    visual: 'privacy',
  },
  {
    id: 'notifications',
    group: 'trust',
    icon: BellRing,
    title: 'Notifications & reminders',
    short: 'Choose each reminder, use discreet mode on your lock screen and set quiet hours.',
    body: 'Turn each reminder type on or off, choose times that suit you, set quiet hours and use discreet mode so no health details appear on your lock screen.',
    points: ['Choose each reminder type', 'Discreet mode hides details', 'Quiet hours'],
    tone: 'butter',
    photo: 'woman-tea',
    visual: 'reminders',
  },
  {
    id: 'web-admin',
    group: 'trust',
    icon: LayoutDashboard,
    title: 'Web Admin for content teams',
    short: 'Content managers, medical reviewers and admins publish education through a review workflow.',
    body: 'Content Managers draft articles, Medical Content Reviewers check accuracy and safety wording, and Admins publish and look after support. Staff never see individual cycle or health records.',
    points: ['Draft → medical review → publish', 'Support queue for contact requests', 'Two-step verification and an audit log', 'No access to individual health records'],
    tone: 'indigo',
    photo: 'doctor-consult',
    visual: 'admin',
  },
];

export const LIFE_STAGES: { photo: PhotoKey; title: string; body: string; phase?: 3 }[] = [
  { photo: 'south-asian-woman', title: 'Reproductive years', body: 'Cycle education, symptoms, mood, movement and nutrition.' },
  { photo: 'journaling', title: 'Fertility awareness', body: 'Learn your cycle signs — never presented as contraception.', phase: 3 },
  { photo: 'pregnant-woman', title: 'Pregnancy wellness', body: 'Week-by-week wellness education alongside your prenatal care.', phase: 3 },
  { photo: 'mature-woman', title: 'Perimenopause', body: 'Cycle changes, hot flushes, sleep and mood tracking.', phase: 3 },
  { photo: 'senior-woman-active', title: 'Menopause', body: 'Strength, sleep and bone-health education and routines.', phase: 3 },
];

export const TRUST_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShieldCheck, title: 'Private by design', body: 'Consent first. Export or delete your data anytime.' },
  { icon: Asterisk, title: 'Honest estimates', body: 'Every prediction is marked * — never a fixed 28 days.' },
  { icon: BookOpenCheck, title: 'Reviewed education', body: 'Articles go through a medical-review workflow.' },
  { icon: Flower2, title: 'Every life stage', body: 'From your first period through menopause.' },
];

export const PRINCIPLES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Fingerprint, title: 'Privacy first', body: 'Women’s health data is deeply personal. We collect only what’s needed, ask for explicit consent and give you full control.' },
  { icon: BookOpenCheck, title: 'Evidence-based', body: 'Health education is reviewed by qualified professionals before it’s published.' },
  { icon: Stethoscope, title: 'Non-diagnostic', body: 'HealthX shares estimates and observed patterns — never diagnoses. We help you decide when to talk to a professional.' },
  { icon: Target, title: 'Personalised', body: 'Your dashboard, content and plan adapt to the goals you choose and the data you share.' },
  { icon: Blocks, title: 'Modular', body: 'Cycle, wellness, fitness, nutrition and insights are reusable modules that grow into one connected platform.' },
];

/** Illustrative sample stories — placeholders until real, consented member feedback exists. No ratings or counts. */
export const STORIES: { avatar: PhotoKey; name: string; context: string; quote: string }[] = [
  { avatar: 'avatar-3', name: 'Priya', context: 'Working professional', quote: 'The daily check-in genuinely takes seconds. Seeing my energy dip before my period, laid out calmly, made planning my week easier.' },
  { avatar: 'avatar-2', name: 'Mei', context: 'New to working out', quote: 'It never tells me what my hormones are “doing”. It just helps me notice how I feel, and gives me short workouts I can do at home.' },
  { avatar: 'avatar-4', name: 'Helen', context: 'Perimenopause', quote: 'Finally an app that doesn’t assume a 28-day cycle. Tracking sleep and changes helped me prepare for a conversation with my doctor.' },
];

export const FAQS: [string, string][] = [
  ['Is HealthX a medical app?', `No. ${COPY.notDiagnostic}`],
  ['How are period predictions made?', `Predictions use the periods you log (or the typical lengths you enter) and are always labelled as estimates. ${COPY.estimate} HealthX never assumes a fixed 28-day cycle.`],
  ['Can I use HealthX for contraception?', `${COPY.notContraception} ${COPY.ovulationNotConfirmed} Talk with a qualified healthcare professional about contraception options.`],
  ['What if my cycle is irregular?', 'HealthX works with irregular cycles. Estimates simply become less certain, and the app can show you when your recent cycle lengths vary more than before — without diagnosing anything.'],
  ['Who can see my data?', `Only you. You control optional consents, can export your data or delete your account at any time. ${COPY.employerPrivacy}`],
  ['Does it support perimenopause and menopause?', 'Yes — dedicated perimenopause and menopause wellness modes (symptoms, sleep, mood, strength and education) are on our roadmap and previewed in the app today.'],
];

export const HOW_STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Flag, title: 'Choose your goals', body: 'Cycle, wellness, fitness, nutrition or a life stage — pick as many as you like.' },
  { icon: ShieldCheck, title: 'Set your privacy', body: 'Agree to the essentials and switch optional features on only if you want them.' },
  { icon: Smile, title: 'Check in, in seconds', body: 'Log your period, mood, energy and symptoms with a few taps each day.' },
  { icon: ChartLine, title: 'See your patterns', body: 'Weekly reports and observed patterns show what supports you.' },
];

/** Tinted panel and icon-disc classes per module tone. */
export const TONE_PANEL: Record<TileTone, string> = {
  green: 'from-green-50 to-green-100/80',
  rose: 'from-rose-50 to-rose-100/80',
  lavender: 'from-lavender-50 to-lavender-100/80',
  peach: 'from-peach-50 to-peach-100/80',
  sky: 'from-sky-50 to-sky-100/80',
  indigo: 'from-indigo-50 to-indigo-100/80',
  butter: 'from-butter-50 to-butter-100',
};
export const TONE_ICON: Record<TileTone, string> = {
  green: 'bg-green-50 text-green-700 ring-green-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  lavender: 'bg-lavender-50 text-lavender-600 ring-lavender-100',
  peach: 'bg-peach-50 text-peach-600 ring-peach-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  butter: 'bg-butter-50 text-butter-600 ring-butter-200/70',
};
