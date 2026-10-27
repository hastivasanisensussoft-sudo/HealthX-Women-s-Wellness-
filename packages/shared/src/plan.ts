/**
 * Daily wellness plan (SRS §33) — deterministic, rules-based. AI personalisation
 * of the plan is Phase 3 (§35); this demo never calls an AI.
 *
 * The plan is built from a library of templates. Content Managers edit the library in the Web Admin,
 * a Medical Content Reviewer approves each template, and the API hands the approved ones to the app
 * (`state.managed.planLibrary`). Without a managed library the built-in one below is used; it
 * reproduces the original Phase 1 plan exactly.
 */
import type { AppState } from './state';
import type { GoalKey, ISODate, LifeStageMode, PlanItem } from './types';

/** When a template applies. `goal:<key>` matches an onboarding goal the user selected. */
export type PlanCondition = 'always' | 'low_energy' | 'high_stress' | `goal:${GoalKey}`;
export type PlanSlot = 'hydration' | 'movement' | 'mindfulness' | 'nutrition' | 'sleep' | 'tracking';
export type PlanTemplateStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'retired';

export interface PlanTemplate {
  id: string;
  /** Id of the plan item this template fills. Templates sharing an item id are variants: the first match wins. */
  itemId: string;
  slot: PlanSlot;
  /** `{waterL}` and `{sleepH}` are replaced with the user's own targets. */
  title: string;
  detail: string;
  icon: string;
  when: PlanCondition;
  /** Empty = every life stage. */
  lifeStages: LifeStageMode[];
  order: number;
  /** Ticked automatically from the user's own logs. */
  doneWhen?: 'water_45' | 'habit_breakfast';
  status: PlanTemplateStatus;
  updatedBy: string;
  updatedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string;
}

export const PLAN_SLOTS: { key: PlanSlot; label: string }[] = [
  { key: 'hydration', label: 'Hydration' },
  { key: 'movement', label: 'Movement' },
  { key: 'mindfulness', label: 'Mindfulness' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'tracking', label: 'Tracking' },
];

/** Icons both apps can draw (lucide names in the web and mobile icon maps). */
export const PLAN_ICONS = ['glass-water', 'droplets', 'footprints', 'dumbbell', 'stretch-horizontal', 'person-standing', 'wind', 'leaf', 'smile', 'apple', 'salad', 'utensils', 'moon', 'sun', 'activity', 'heart', 'heart-pulse', 'book-open', 'sprout', 'sparkles'] as const;

export const PLAN_CONDITIONS: { value: PlanCondition; label: string }[] = [
  { value: 'always', label: 'Every day' },
  { value: 'low_energy', label: 'Low energy in today’s check-in (≤ 4/10)' },
  { value: 'high_stress', label: 'Higher stress in today’s check-in (≥ 6/10)' },
  { value: 'goal:improve_fitness', label: 'Goal: improve fitness' },
  { value: 'goal:track_symptoms', label: 'Goal: track symptoms' },
  { value: 'goal:improve_nutrition', label: 'Goal: improve nutrition' },
  { value: 'goal:improve_wellness', label: 'Goal: improve wellness' },
  { value: 'goal:manage_weight', label: 'Goal: manage weight' },
  { value: 'goal:understand_cycle', label: 'Goal: understand my cycle' },
  { value: 'goal:pregnancy_wellness', label: 'Goal: pregnancy wellness' },
  { value: 'goal:perimenopause', label: 'Goal: perimenopause' },
  { value: 'goal:menopause', label: 'Goal: menopause' },
];

const BUILT_IN = 'Built-in Phase 1 copy';

/** The original Phase 1 plan, expressed as templates (order = precedence). */
export function defaultPlanLibrary(at = '2026-01-01T00:00:00.000Z'): PlanTemplate[] {
  const t = (p: Omit<PlanTemplate, 'status' | 'updatedBy' | 'updatedAt' | 'reviewedBy' | 'reviewedAt' | 'lifeStages'> & { lifeStages?: LifeStageMode[] }): PlanTemplate => ({
    lifeStages: [],
    ...p,
    status: 'approved',
    updatedBy: BUILT_IN,
    updatedAt: at,
    reviewedBy: null,
    reviewedAt: null,
  });
  return [
    t({ id: 'pt_water', itemId: 'plan_water', slot: 'hydration', title: 'Drink water', detail: '{waterL} L goal · spread it through the day', icon: 'glass-water', when: 'always', order: 10, doneWhen: 'water_45' }),
    t({ id: 'pt_walk_low', itemId: 'plan_walk', slot: 'movement', title: '10-minute gentle walk', detail: 'Low-energy day — keep it light', icon: 'footprints', when: 'low_energy', order: 20 }),
    t({ id: 'pt_walk_fit', itemId: 'plan_walk', slot: 'movement', title: '20-minute walk or workout', detail: 'Any pace that feels good', icon: 'footprints', when: 'goal:improve_fitness', order: 21 }),
    t({ id: 'pt_walk', itemId: 'plan_walk', slot: 'movement', title: '20-minute walk', detail: 'Any pace that feels good', icon: 'footprints', when: 'always', order: 22 }),
    t({ id: 'pt_breathe_stress', itemId: 'plan_breathe', slot: 'mindfulness', title: '5-minute breathing', detail: 'Your stress was higher today', icon: 'wind', when: 'high_stress', order: 30 }),
    t({ id: 'pt_breathe', itemId: 'plan_breathe', slot: 'mindfulness', title: '5-minute breathing', detail: 'A short reset', icon: 'wind', when: 'always', order: 31 }),
    t({ id: 'pt_breakfast', itemId: 'plan_breakfast', slot: 'nutrition', title: 'Healthy breakfast', detail: 'Include some protein and fibre', icon: 'apple', when: 'always', order: 40, doneWhen: 'habit_breakfast' }),
    t({ id: 'pt_sleep', itemId: 'plan_sleep', slot: 'sleep', title: 'Sleep before target time', detail: 'Aim for {sleepH} h tonight', icon: 'moon', when: 'always', order: 50 }),
    t({ id: 'pt_symptoms', itemId: 'plan_symptoms', slot: 'tracking', title: 'Log how your body feels', detail: 'Symptoms take 10 seconds', icon: 'activity', when: 'goal:track_symptoms', order: 60 }),
  ];
}

const DEFAULT_LIBRARY = defaultPlanLibrary();

type PlanInput = Pick<AppState, 'checkIns' | 'profile' | 'habitCompletions' | 'water' | 'waterTargetMl' | 'sleepTargetHours'> & Partial<Pick<AppState, 'managed'>>;

/** Fills `{waterL}` / `{sleepH}` with the user's targets. */
export function fillPlanText(text: string, s: Pick<AppState, 'waterTargetMl' | 'sleepTargetHours'>): string {
  return text.replace(/\{waterL\}/g, (s.waterTargetMl / 1000).toFixed(1)).replace(/\{sleepH\}/g, String(s.sleepTargetHours));
}

export function buildDailyPlan(state: PlanInput, today: ISODate, library: PlanTemplate[] = state.managed?.planLibrary ?? DEFAULT_LIBRARY): PlanItem[] {
  const checkIn = state.checkIns.find((c) => c.date === today);
  const goals = state.profile.goals;
  const waterToday = state.water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
  const matches = (t: PlanTemplate) => {
    if (t.status !== 'approved') return false;
    if (t.lifeStages.length && !t.lifeStages.includes(state.profile.mode)) return false;
    if (t.when === 'always') return true;
    if (t.when === 'low_energy') return !!checkIn && checkIn.energy <= 4;
    if (t.when === 'high_stress') return !!checkIn && (checkIn.stress ?? 0) >= 6;
    return goals.includes(t.when.slice(5) as GoalKey);
  };
  const isDone = (t: PlanTemplate) =>
    t.doneWhen === 'water_45' ? waterToday >= state.waterTargetMl * 0.45 : t.doneWhen === 'habit_breakfast' ? state.habitCompletions.some((c) => c.habitId === 'h_breakfast' && c.date === today) : false;

  const items: PlanItem[] = [];
  for (const t of [...library].sort((a, b) => a.order - b.order)) {
    if (items.some((i) => i.id === t.itemId) || !matches(t)) continue;
    items.push({ id: t.itemId, title: fillPlanText(t.title, state), detail: fillPlanText(t.detail, state), icon: t.icon, done: isDone(t) });
  }
  return items;
}
