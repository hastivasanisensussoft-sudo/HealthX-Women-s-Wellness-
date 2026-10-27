/**
 * Life-stage calculations (SRS §22–§25) and pattern views (§17, §18). All outputs are estimates or
 * observed patterns, labelled as such in the apps — never a diagnosis.
 *
 * D-21 (decided 2026-10-27): the pregnancy week is counted from the first day of the last period the
 * person saved; the due date is shown as an estimate (last period + 40 weeks); the care provider
 * confirms dates. Switching to pregnancy mode saves the newest known period start as that date; from
 * then on the saved date is used (the person can correct it, and later bleeding logs don't move it). D-36 (decided 2026-10-27): the perimenopause dashboard shows the share of target
 * over the last 7 days.
 */
import { moodScore } from './catalog';
import { cycleStateOf, sleepHoursOn, stepsOn } from './selectors';
import type { AppState } from './state';
import { addDays, diffDays, lastNDays, startOfWeek } from './dates';
import type { CyclePhase, ISODate } from './types';

// ---------------------------------------------------------------- pregnancy (D-21)

export interface PregnancyEstimate {
  /** First day of the last period the estimate is counted from. */
  lastPeriodStart: ISODate;
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3;
  /** Last period + 40 weeks — an estimate; the care provider confirms the due date. */
  dueDate: ISODate;
  daysToDue: number;
  /** More than 42 weeks since that date: the saved date probably needs updating. */
  outOfRange: boolean;
}

/** Latest of the saved last-period date and the newest logged period start (never in the future). */
export function lastPeriodStartOf(s: Pick<AppState, 'periods' | 'cycleProfile' | 'today'>): ISODate | null {
  const logged = s.periods.map((p) => p.start).filter((d) => d <= s.today);
  const candidates = [...logged, s.cycleProfile.lastPeriodStart].filter((d): d is ISODate => !!d && d <= s.today);
  return candidates.length ? candidates.sort().slice(-1)[0] : null;
}

/** The date the pregnancy week counts from: in pregnancy mode the saved date, otherwise (a preview) the newest known start. */
export function pregnancyStartOf(s: Pick<AppState, 'periods' | 'cycleProfile' | 'today' | 'profile'>): ISODate | null {
  const saved = s.cycleProfile.lastPeriodStart;
  if (s.profile.mode === 'pregnancy' && saved && saved <= s.today) return saved;
  return lastPeriodStartOf(s);
}

export function pregnancyEstimate(s: Pick<AppState, 'periods' | 'cycleProfile' | 'today' | 'profile'>): PregnancyEstimate | null {
  const lmp = pregnancyStartOf(s);
  if (!lmp) return null;
  const total = diffDays(lmp, s.today);
  const weeks = Math.floor(total / 7);
  const dueDate = addDays(lmp, 280);
  return {
    lastPeriodStart: lmp,
    weeks,
    days: total % 7,
    trimester: weeks < 14 ? 1 : weeks < 28 ? 2 : 3,
    dueDate,
    daysToDue: diffDays(s.today, dueDate),
    outOfRange: weeks > 42,
  };
}

// ---------------------------------------------------------------- perimenopause dashboard (D-36)

export interface StageMetric {
  /** 0–100, or null when nothing was logged in the window. */
  pct: number | null;
  /** Plain explanation of how the number was worked out. */
  basis: string;
}

export interface StageDashboard {
  days: number;
  sleep: StageMetric;
  energy: StageMetric;
  mood: StageMetric;
  activity: StageMetric;
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

/** Share of target over the last `days` days (D-36). Days with nothing logged are left out, not counted as misses. */
export function stageDashboard(s: AppState, days = 7): StageDashboard {
  const window = lastNDays(s.today, days);
  const nights = window.map((d) => sleepHoursOn(s, d)).filter((h): h is number => h !== null);
  const metNights = nights.filter((h) => h >= s.sleepTargetHours).length;
  const checks = window.map((d) => s.checkIns.find((c) => c.date === d)).filter((c) => !!c);
  const stepDays = window.filter((d) => s.activity.some((a) => a.date === d));
  const metSteps = stepDays.filter((d) => stepsOn(s, d) >= s.stepTarget).length;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    days,
    sleep: { pct: pct(metNights, nights.length), basis: `${metNights} of ${nights.length} logged nights at or above your ${s.sleepTargetHours} h goal` },
    energy: { pct: checks.length ? Math.round((avg(checks.map((c) => c!.energy)) / 10) * 100) : null, basis: checks.length ? `Average check-in energy ${avg(checks.map((c) => c!.energy)).toFixed(1)} / 10` : 'No check-ins this week' },
    mood: { pct: checks.length ? Math.round((avg(checks.map((c) => moodScore(c!.mood))) / 5) * 100) : null, basis: checks.length ? `Average mood ${avg(checks.map((c) => moodScore(c!.mood))).toFixed(1)} / 5 across ${checks.length} check-ins` : 'No check-ins this week' },
    activity: { pct: pct(metSteps, stepDays.length), basis: `${metSteps} of ${stepDays.length} days with steps at or above ${s.stepTarget.toLocaleString('en-US')}` },
  };
}

// ---------------------------------------------------------------- symptom series

/** Logs per day for the given symptoms over the last `days` days (oldest first). */
export function dailySymptomCounts(s: AppState, symptomIds: string[], days = 7): { date: ISODate; count: number; bySymptom: Record<string, number> }[] {
  return lastNDays(s.today, days).map((date) => {
    const logs = s.symptomLogs.filter((l) => l.date === date && symptomIds.includes(l.symptomId));
    const bySymptom = Object.fromEntries(symptomIds.map((id) => [id, logs.filter((l) => l.symptomId === id).length]));
    return { date, count: logs.length, bySymptom };
  });
}

/** Symptom logs per week (Monday-based) for the last `weeks` weeks — a trend over time, not just totals. */
export function weeklySymptomTrend(s: AppState, weeks = 8, symptomId?: string): { weekStart: ISODate; count: number }[] {
  const thisWeek = startOfWeek(s.today);
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(thisWeek, (i - weeks + 1) * 7);
    const end = addDays(weekStart, 6);
    const count = s.symptomLogs.filter((l) => l.date >= weekStart && l.date <= end && (!symptomId || l.symptomId === symptomId)).length;
    return { weekStart, count };
  });
}

// ---------------------------------------------------------------- patterns by estimated phase (§17)

export interface PhasePattern {
  phase: CyclePhase;
  days: number;
  avgEnergy: number | null;
  avgMood: number | null;
  symptomLogs: number;
}

/**
 * Average energy, mood and symptom count by ESTIMATED phase across recent completed cycles.
 * Phases come from calendar estimates (period days logged; ovulation ≈ 14 days before the next period),
 * so this describes observed patterns only.
 */
export function phasePatterns(s: AppState, cycles = 4): PhasePattern[] {
  const cs = cycleStateOf(s);
  const done = cs.cycles.filter((c) => c.length !== null && c.end !== null).slice(-cycles);
  const buckets: Record<CyclePhase, { days: number; energy: number[]; mood: number[]; symptoms: number }> = {
    menstrual: { days: 0, energy: [], mood: [], symptoms: 0 },
    follicular: { days: 0, energy: [], mood: [], symptoms: 0 },
    ovulatory: { days: 0, energy: [], mood: [], symptoms: 0 },
    luteal: { days: 0, energy: [], mood: [], symptoms: 0 },
  };
  for (const c of done) {
    const length = c.length as number;
    const periodLen = c.periodLength ?? 5;
    const ovulationDay = length - 14; // calendar estimate, 1-based day index
    for (let day = 1; day <= length; day++) {
      const date = addDays(c.start, day - 1);
      const phase: CyclePhase = day <= periodLen ? 'menstrual' : day >= ovulationDay - 5 && day <= ovulationDay + 1 ? 'ovulatory' : day < ovulationDay - 5 ? 'follicular' : 'luteal';
      const b = buckets[phase];
      b.days += 1;
      const ci = s.checkIns.find((x) => x.date === date);
      if (ci) {
        b.energy.push(ci.energy);
        b.mood.push(moodScore(ci.mood));
      }
      b.symptoms += s.symptomLogs.filter((l) => l.date === date).length;
    }
  }
  const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  return (Object.keys(buckets) as CyclePhase[]).map((phase) => ({ phase, days: buckets[phase].days, avgEnergy: mean(buckets[phase].energy), avgMood: mean(buckets[phase].mood), symptomLogs: buckets[phase].symptoms }));
}

/** How sure the cycle estimate is, in words the app can show (§12: estimate vs user-entered vs certainty). */
export function estimateBasis(s: AppState): { label: string; detail: string } {
  const cs = cycleStateOf(s);
  if (!cs.hasData || !cs.avgCycleLength) return { label: 'No estimate yet', detail: 'Log a period or add your typical cycle length to see estimates.' };
  const source =
    cs.lengthSource === 'history'
      ? `Based on your last ${Math.min(cs.completedCycles, 6)} logged cycle${cs.completedCycles === 1 ? '' : 's'}`
      : 'Based on the typical cycle length you entered';
  const level = cs.confidence === 'high' ? 'Higher confidence' : cs.confidence === 'medium' ? 'Medium confidence' : 'Lower confidence';
  return { label: level, detail: `${source}. Still an estimate — it can't confirm ovulation.` };
}
