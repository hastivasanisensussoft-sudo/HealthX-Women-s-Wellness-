/**
 * Pure selectors over AppState: totals, trends, wellness score (§31), rules-based
 * insights (§17, §19, §36, §37), weekly summary (§36), streaks and goal progress.
 * All deterministic — no AI (§37).
 */
import { addDays, diffDays, formatDate, lastNDays, startOfWeek, weekday } from './dates';
import { computeCycleState, type CycleState } from './cycle';
import { COPY } from './copy';
import type { CoachContext } from './coach';
import { energyBand, moodScore } from './catalog';
import type { AppState } from './state';
import type { CheckIn, ISODate, Insight, MoodLevel, WellnessGoal, WellnessWeights } from './types';

// ---------- basics ----------

export const cycleStateOf = (s: AppState): CycleState => computeCycleState(s.periods, s.cycleProfile, s.today);

export const waterOn = (s: AppState, d: ISODate) => s.water.filter((w) => w.date === d).reduce((a, w) => a + w.ml, 0);
export const stepsOn = (s: AppState, d: ISODate) => s.activity.find((a) => a.date === d)?.steps ?? 0;
export const activeMinOn = (s: AppState, d: ISODate) => s.activity.find((a) => a.date === d)?.activeMin ?? 0;
/** Rough average stride (0.75 m) for a walking-distance *estimate*; always shown with "*" / "estimate". */
export const KM_PER_STEP = 0.00075;
export const estimateDistanceKm = (steps: number) => steps * KM_PER_STEP;
export const checkInOn = (s: AppState, d: ISODate): CheckIn | undefined => s.checkIns.find((c) => c.date === d);
export const sleepOn = (s: AppState, d: ISODate) => s.sleep.find((l) => l.date === d);
export const sleepHoursOn = (s: AppState, d: ISODate): number | null => {
  const l = sleepOn(s, d);
  if (l) return Math.round((l.durationMin / 60) * 10) / 10;
  return checkInOn(s, d)?.sleepHours ?? null;
};
export const mealsOn = (s: AppState, d: ISODate) => s.meals.filter((m) => m.date === d);
export const workoutsOn = (s: AppState, d: ISODate) => s.sessions.filter((x) => x.date === d && x.status === 'completed');
export const symptomsOn = (s: AppState, d: ISODate) => s.symptomLogs.filter((l) => l.date === d);

export function nutritionTotals(s: AppState, d: ISODate) {
  return mealsOn(s, d).reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat, fiber: a.fiber + m.fiber }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

/** Demo reference targets for the nutrition dashboard — not individualised advice (§28). */
export const NUTRITION_TARGETS = { kcal: 1900, protein: 70, carbs: 230, fat: 65, fiber: 25 };

export function habitsDueOn(s: AppState, d: ISODate) {
  return s.habits.filter((h) => h.days.length === 0 || h.days.includes(weekday(d)));
}
export function habitDone(s: AppState, habitId: string, d: ISODate) {
  return s.habitCompletions.some((c) => c.habitId === habitId && c.date === d);
}

// ---------- series ----------

export interface DayPoint {
  date: ISODate;
  label: string;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  sleep: number | null;
  water: number;
  steps: number;
  activeMin: number;
  workouts: number;
  symptoms: number;
}

export function dailySeries(s: AppState, days: number, end: ISODate = s.today): DayPoint[] {
  return lastNDays(end, days).map((d) => {
    const c = checkInOn(s, d);
    return {
      date: d,
      label: days <= 7 ? formatDate(d, 'weekday') : formatDate(d, 'short'),
      mood: c ? moodScore(c.mood) : null,
      energy: c?.energy ?? null,
      stress: c?.stress ?? null,
      sleep: sleepHoursOn(s, d),
      water: waterOn(s, d),
      steps: stepsOn(s, d),
      activeMin: activeMinOn(s, d),
      workouts: workoutsOn(s, d).length,
      symptoms: symptomsOn(s, d).length,
    };
  });
}

export function symptomFrequency(s: AppState, days = 90) {
  const from = addDays(s.today, -days);
  const counts = new Map<string, number>();
  s.symptomLogs.filter((l) => l.date >= from).forEach((l) => counts.set(l.symptomId, (counts.get(l.symptomId) ?? 0) + 1));
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: s.symptomDefs.find((d) => d.id === id)?.label ?? id, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------- streaks ----------

/** Consecutive days (ending today or yesterday) where `pred` holds. */
export function streak(s: AppState, pred: (d: ISODate) => boolean): number {
  let d = pred(s.today) ? s.today : addDays(s.today, -1);
  let n = 0;
  while (pred(d) && n < 400) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
export const waterStreak = (s: AppState) => streak(s, (d) => waterOn(s, d) >= s.waterTargetMl);
export const checkInStreak = (s: AppState) => streak(s, (d) => !!checkInOn(s, d));

// ---------- goals ----------

export function goalProgress(s: AppState, g: WellnessGoal): { value: number; pct: number; label: string } {
  const weekDays = lastNDays(s.today, diffDays(startOfWeek(s.today), s.today) + 1);
  let value = 0;
  switch (g.metric) {
    case 'steps':
      value = stepsOn(s, s.today);
      break;
    case 'water':
      value = waterOn(s, s.today);
      break;
    case 'sleep':
      value = sleepHoursOn(s, addDays(s.today, 0)) ?? sleepHoursOn(s, addDays(s.today, -1)) ?? 0;
      break;
    case 'workouts':
      value = weekDays.reduce((a, d) => a + workoutsOn(s, d).length, 0);
      break;
    case 'checkins':
      value = weekDays.filter((d) => checkInOn(s, d)).length;
      break;
    case 'mindful':
      value = weekDays.filter((d) => habitDone(s, 'h_breathe', d)).length;
      break;
  }
  const pct = g.status === 'completed' ? 1 : Math.min(1, value / g.target);
  const fmt = (n: number) => (g.metric === 'water' ? `${(n / 1000).toFixed(1)} L` : g.metric === 'steps' ? n.toLocaleString() : `${n}`);
  return { value, pct, label: `${fmt(value)} / ${fmt(g.target)}${g.metric === 'water' || g.metric === 'steps' ? '' : ' ' + g.unit}` };
}

// ---------- wellness score (§31) ----------

export interface ScoreComponent {
  key: keyof WellnessWeights;
  label: string;
  value: number | null;
  weight: number;
}
export interface WellnessScore {
  score: number | null;
  components: ScoreComponent[];
  missing: (keyof WellnessWeights)[];
}

const MOOD_POINTS: Record<MoodLevel, number> = { excellent: 100, good: 82, neutral: 62, low: 40, very_low: 22 };

/**
 * Engagement metric, NOT a medical score (§31). Missing components are excluded and
 * the remaining weights re-normalised (D-06 option B). Sub-score formulas are demo
 * placeholders pending product definition.
 */
export function wellnessScore(s: AppState, d: ISODate = s.today, weights: WellnessWeights = s.weights): WellnessScore {
  const steps = stepsOn(s, d);
  const activeMin = activeMinOn(s, d);
  const sleepH = sleepHoursOn(s, d) ?? sleepHoursOn(s, addDays(d, -1));
  const water = waterOn(s, d);
  const nut = nutritionTotals(s, d);
  const due = habitsDueOn(s, d);
  const c = checkInOn(s, d) ?? checkInOn(s, addDays(d, -1));

  const sleepScore = (h: number) => (h >= 7 && h <= 9 ? 100 : h < 7 ? Math.max(0, 100 - (7 - h) * 22) : Math.max(0, 100 - (h - 9) * 15));
  const raw: Record<keyof WellnessWeights, number | null> = {
    activity: s.activity.some((a) => a.date === d) ? Math.round(Math.min(1, steps / s.stepTarget) * 65 + Math.min(1, activeMin / 30) * 35) : null,
    sleep: sleepH === null ? null : Math.round(sleepScore(sleepH)),
    hydration: Math.round(Math.min(1, water / s.waterTargetMl) * 100),
    nutrition: nut.kcal > 0 ? Math.round(Math.min(1, nut.protein / 70) * 50 + Math.min(1, nut.fiber / 25) * 50) : null,
    habits: due.length ? Math.round((due.filter((h) => habitDone(s, h.id, d)).length / due.length) * 100) : null,
    mood: c ? MOOD_POINTS[c.mood] : null,
  };
  const labels: Record<keyof WellnessWeights, string> = {
    activity: 'Activity',
    sleep: 'Sleep',
    hydration: 'Hydration',
    nutrition: 'Nutrition',
    habits: 'Habits',
    mood: 'Mood',
  };
  const components = (Object.keys(weights) as (keyof WellnessWeights)[]).map((k) => ({ key: k, label: labels[k], value: raw[k], weight: weights[k] }));
  const present = components.filter((x) => x.value !== null && x.weight > 0);
  const wsum = present.reduce((a, x) => a + x.weight, 0);
  const score = wsum > 0 ? Math.round(present.reduce((a, x) => a + (x.value as number) * x.weight, 0) / wsum) : null;
  return { score, components, missing: components.filter((x) => x.value === null).map((x) => x.key) };
}

export function wellnessScoreSeries(s: AppState, days = 14) {
  return lastNDays(s.today, days).map((d) => ({ date: d, label: formatDate(d, 'short'), score: wellnessScore(s, d).score }));
}

// ---------- insights engine (§37) ----------

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export function computeInsights(s: AppState, opts: { includeDismissed?: boolean } = {}): Insight[] {
  const out: Insight[] = [];
  const cs = cycleStateOf(s);
  const last3 = [1, 2, 3].map((n) => addDays(s.today, -n));

  // R1 (§37 example): sleep < target AND energy low FOR 3 days → sleep consistency suggestion
  const r1 = last3.every((d) => {
    const h = sleepHoursOn(s, d);
    const c = checkInOn(s, d);
    return h !== null && h < s.sleepTargetHours && !!c && energyBand(c.energy) === 'low';
  });
  if (r1) {
    out.push({
      id: `r1_${s.today}`,
      ruleId: 'sleep_energy_3d',
      title: 'A steadier sleep routine may help',
      body: `For the last 3 days you slept less than your ${s.sleepTargetHours} h target and rated your energy as low. Try a consistent bedtime tonight.`,
      tone: 'suggestion',
      category: 'sleep',
      phase: 1,
      date: s.today,
      ctaLabel: 'Open sleep',
      ctaTo: '/sleep',
    });
  }

  // R2 (§36): energy higher on activity days
  const days30 = lastNDays(addDays(s.today, -1), 30);
  const withW = days30.filter((d) => workoutsOn(s, d).length && checkInOn(s, d)).map((d) => checkInOn(s, d)!.energy);
  const withoutW = days30.filter((d) => !workoutsOn(s, d).length && checkInOn(s, d)).map((d) => checkInOn(s, d)!.energy);
  if (withW.length >= 4 && withoutW.length >= 4 && avg(withW) - avg(withoutW) >= 0.8) {
    out.push({
      id: `r2_${s.today}`,
      ruleId: 'activity_energy',
      title: 'Movement and energy',
      body: 'Your energy ratings were higher on days when you completed activity.',
      tone: 'pattern',
      category: 'activity',
      phase: 1,
      date: s.today,
      ctaLabel: 'See workouts',
      ctaTo: '/fitness',
    });
  }

  // R3 (§66): consistent activity this week
  const week = lastNDays(s.today, 7);
  const sessionsThisWeek = week.reduce((a, d) => a + workoutsOn(s, d).length, 0);
  if (sessionsThisWeek >= 2) {
    out.push({
      id: `r3_${s.today}`,
      ruleId: 'activity_consistency',
      title: 'Nice consistency',
      body: `Your activity has been consistent this week — ${sessionsThisWeek} workouts logged.`,
      tone: 'positive',
      category: 'activity',
      phase: 1,
      date: s.today,
    });
  }

  // R4: hydration goal met on 5+ of the last 7 days
  const metDays = lastNDays(addDays(s.today, -1), 7).filter((d) => waterOn(s, d) >= s.waterTargetMl).length;
  if (metDays >= 4) {
    out.push({
      id: `r4_${s.today}`,
      ruleId: 'hydration_week',
      title: 'Hydration on track',
      body: `You reached your water goal on ${metDays} of the last 7 days.`,
      tone: 'positive',
      category: 'hydration',
      phase: 1,
      date: s.today,
    });
  }

  // R5 (§17, Phase 2 advanced): lower energy in the days before a period, across recent cycles
  const completed = cs.cycles.filter((c) => c.length !== null).slice(-3);
  const nextStarts = completed.map((c) => addDays(c.start, c.length as number));
  const pre: number[] = [];
  const rest: number[] = [];
  s.checkIns.forEach((c) => {
    const isPre = nextStarts.some((ns) => {
      const dd = diffDays(c.date, ns);
      return dd >= 1 && dd <= 3;
    });
    (isPre ? pre : rest).push(c.energy);
  });
  if (pre.length >= 5 && avg(rest) - avg(pre) >= 1.2) {
    out.push({
      id: `r5_${s.today}`,
      ruleId: 'pre_period_energy',
      title: 'A pattern across your cycles',
      body: 'You recorded lower energy during the days preceding your period in several recent cycles.',
      tone: 'pattern',
      category: 'cycle',
      phase: 2,
      date: s.today,
      ctaLabel: 'View cycle',
      ctaTo: '/cycle',
    });
  }

  // R6 (§19, Phase 2 advanced): cycle-length variation — never a diagnosis
  if (cs.spread !== null && cs.isRegular === false) {
    out.push({
      id: `r6_${s.today}`,
      ruleId: 'cycle_variation',
      title: 'Cycle lengths are varying',
      body: `${COPY.irregular} ${COPY.concern}`,
      tone: 'attention',
      category: 'cycle',
      phase: 2,
      date: s.today,
    });
  }

  // Rules an Admin switched off in the Web Admin (§37) produce nothing.
  const off = s.managed?.disabledRules ?? [];
  const active = off.length ? out.filter((i) => !off.includes(i.ruleId)) : out;
  return opts.includeDismissed ? active : active.filter((i) => !s.dismissedInsights.includes(i.id));
}

// ---------- weekly summary (§36, rules-based) ----------

export interface WeeklySummary {
  start: ISODate;
  end: ISODate;
  cycleDay: number | null;
  /** Estimated phase today (calendar estimate). */
  phase: CycleState['phase'];
  steps: number;
  workouts: number;
  avgSleep: number | null;
  hydrationPct: number;
  moodSummary: string;
  avgEnergy: number | null;
  checkIns: number;
  pattern: string | null;
  focus: string;
  days: { date: ISODate; label: string; steps: number; water: number; sleep: number | null; energy: number | null }[];
}

/** Report over the `n` days ending at `end` — 7 for weekly; 30 (monthly) or the current cycle also work. */
export function weeklySummary(s: AppState, end: ISODate = s.today, n = 7): WeeklySummary {
  const days = lastNDays(end, n);
  const cs = cycleStateOf(s);
  const sleeps = days.map((d) => sleepHoursOn(s, d)).filter((x): x is number => x !== null);
  const checks = days.map((d) => checkInOn(s, d)).filter((c): c is CheckIn => !!c);
  const positive = checks.filter((c) => c.mood === 'good' || c.mood === 'excellent').length;
  const water = days.reduce((a, d) => a + Math.min(1, waterOn(s, d) / s.waterTargetMl), 0) / days.length;
  const insights = computeInsights(s, { includeDismissed: true });
  const avgSleep = sleeps.length ? Math.round(avg(sleeps) * 10) / 10 : null;
  return {
    start: days[0],
    end,
    cycleDay: cs.cycleDay,
    phase: cs.phase,
    steps: days.reduce((a, d) => a + stepsOn(s, d), 0),
    workouts: days.reduce((a, d) => a + workoutsOn(s, d).length, 0),
    avgSleep,
    hydrationPct: Math.round(water * 100),
    moodSummary: !checks.length ? 'Not enough check-ins' : positive / checks.length >= 0.6 ? 'Mostly positive' : positive / checks.length >= 0.35 ? 'Mixed' : 'Mostly low',
    avgEnergy: checks.length ? Math.round(avg(checks.map((c) => c.energy)) * 10) / 10 : null,
    checkIns: checks.length,
    pattern: insights.find((i) => i.ruleId === 'activity_energy')?.body ?? insights.find((i) => i.tone === 'pattern')?.body ?? null,
    focus: avgSleep !== null && avgSleep < s.sleepTargetHours ? 'Maintain consistent sleep.' : water < 0.7 ? 'Spread water through the day.' : 'Keep up your movement routine.',
    days: days.map((d) => ({
      date: d,
      label: formatDate(d, n <= 7 ? 'weekday' : 'short'),
      steps: stepsOn(s, d),
      water: waterOn(s, d),
      sleep: sleepHoursOn(s, d),
      energy: checkInOn(s, d)?.energy ?? null,
    })),
  };
}

/** What the coach may use from the person's logs — only with AI-personalisation consent (§35). */
export function coachContextOf(s: AppState): CoachContext | null {
  if (!s.consents.find((c) => c.id === 'ai_personalization')?.granted) return null;
  const w = weeklySummary(s);
  return { avgSleepHours: w.avgSleep, sleepTargetHours: s.sleepTargetHours, avgEnergy: w.avgEnergy, hydrationPct: w.hydrationPct, workouts7d: w.workouts };
}

export function unreadCount(s: AppState) {
  return s.notifications.filter((n) => !n.read).length;
}
