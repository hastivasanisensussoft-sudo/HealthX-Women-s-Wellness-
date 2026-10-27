/**
 * Demo Cycle Engine (SRS §10–§12, §19, §59 Module 1).
 *
 * Deterministic and pure. Uses the user's own history — never a fixed 28-day
 * assumption. NOTE: the averaging window, plausible ranges and irregularity
 * threshold below are DEMO PLACEHOLDERS pending decision D-09 (product + medical
 * reviewer sign-off). Every output carries provenance so the UI can label estimates.
 */
import { addDays, diffDays, isBetween } from './dates';
import type { CycleProfile, CyclePhase, ISODate, PeriodLog, Provenance } from './types';

export const CYCLE_RULES = {
  /** D-09 placeholder: number of recent completed cycles averaged. */
  averagingWindow: 6,
  /** D-09 placeholder: cycle-length range (days) the demo treats as plausible. */
  plausibleCycle: { min: 15, max: 60 },
  plausiblePeriod: { min: 1, max: 12 },
  /** D-09 placeholder: max-min spread (days) above which variation is flagged. */
  irregularSpread: 7,
  /** Calendar estimate: ovulation ≈ 14 days before the next period. Not a confirmation. */
  lutealEstimate: 14,
} as const;

export interface DerivedCycle {
  start: ISODate;
  /** Day before the next period start; null for the current cycle. */
  end: ISODate | null;
  length: number | null;
  periodLength: number | null;
  periodId: string;
}

export interface CycleState {
  hasData: boolean;
  today: ISODate;
  currentCycleStart: ISODate | null;
  cycleDay: number | null;
  avgCycleLength: number | null;
  avgPeriodLength: number | null;
  /** Where the average came from (SRS §12). */
  lengthProvenance: Provenance | null;
  lengthSource: 'history' | 'profile' | 'none';
  nextPeriodStart: ISODate | null;
  nextPeriodEnd: ISODate | null;
  daysUntilNextPeriod: number | null;
  isLate: boolean;
  daysLate: number;
  inPeriod: boolean;
  periodDay: number | null;
  phase: CyclePhase | null;
  estimatedOvulation: ISODate | null;
  fertileWindow: { start: ISODate; end: ISODate } | null;
  spread: number | null;
  isRegular: boolean | null;
  confidence: 'low' | 'medium' | 'high';
  completedCycles: number;
  cycles: DerivedCycle[];
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function sortPeriods(periods: PeriodLog[]): PeriodLog[] {
  return [...periods].sort((a, b) => (a.start < b.start ? -1 : 1));
}

export function periodLength(p: PeriodLog, today: ISODate): number {
  return diffDays(p.start, p.end ?? today) + 1;
}

/** A cycle runs from one period start to the day before the next. */
export function deriveCycles(periods: PeriodLog[], today: ISODate): DerivedCycle[] {
  const sorted = sortPeriods(periods);
  return sorted.map((p, i) => {
    const next = sorted[i + 1];
    const length = next ? diffDays(p.start, next.start) : null;
    return {
      start: p.start,
      end: next ? addDays(next.start, -1) : null,
      length,
      periodLength: p.end ? periodLength(p, today) : null,
      periodId: p.id,
    };
  });
}

function plausible(n: number, r: { min: number; max: number }) {
  return n >= r.min && n <= r.max;
}

export function computeCycleState(periods: PeriodLog[], profile: CycleProfile, today: ISODate): CycleState {
  const cycles = deriveCycles(periods.filter((p) => p.start <= today), today);
  const completed = cycles.filter((c) => c.length !== null && plausible(c.length, CYCLE_RULES.plausibleCycle));
  const recent = completed.slice(-CYCLE_RULES.averagingWindow);
  const lengths = recent.map((c) => c.length as number);
  const periodLens = cycles
    .map((c) => c.periodLength)
    .filter((n): n is number => n !== null && plausible(n, CYCLE_RULES.plausiblePeriod))
    .slice(-CYCLE_RULES.averagingWindow);

  let avgCycleLength: number | null = null;
  let lengthSource: CycleState['lengthSource'] = 'none';
  let lengthProvenance: Provenance | null = null;
  if (lengths.length > 0) {
    avgCycleLength = Math.round(mean(lengths));
    lengthSource = 'history';
    lengthProvenance = 'estimated';
  } else if (profile.typicalCycleLength) {
    avgCycleLength = profile.typicalCycleLength;
    lengthSource = 'profile';
    lengthProvenance = 'user_entered';
  }

  const avgPeriodLength = periodLens.length
    ? Math.round(mean(periodLens))
    : profile.typicalPeriodLength ?? null;

  const current = cycles[cycles.length - 1];
  const currentCycleStart = current?.start ?? profile.lastPeriodStart ?? null;

  const spread = lengths.length >= 3 ? Math.max(...lengths) - Math.min(...lengths) : null;
  const isRegular = spread === null ? (profile.regularity === 'not_sure' ? null : profile.regularity === 'regular') : spread <= CYCLE_RULES.irregularSpread;

  const base: CycleState = {
    hasData: currentCycleStart !== null,
    today,
    currentCycleStart,
    cycleDay: null,
    avgCycleLength,
    avgPeriodLength,
    lengthProvenance,
    lengthSource,
    nextPeriodStart: null,
    nextPeriodEnd: null,
    daysUntilNextPeriod: null,
    isLate: false,
    daysLate: 0,
    inPeriod: false,
    periodDay: null,
    phase: null,
    estimatedOvulation: null,
    fertileWindow: null,
    spread,
    isRegular,
    confidence: lengths.length >= 4 && isRegular ? 'high' : lengths.length >= 2 ? 'medium' : 'low',
    completedCycles: completed.length,
    cycles,
  };

  if (!currentCycleStart) return base;

  const cycleDay = diffDays(currentCycleStart, today) + 1;
  const currentPeriod = sortPeriods(periods).filter((p) => p.start <= today).pop();
  const periodEnd = currentPeriod
    ? currentPeriod.end ?? addDays(currentPeriod.start, (avgPeriodLength ?? 5) - 1)
    : null;
  const inPeriod = !!currentPeriod && currentPeriod.start === currentCycleStart && !!periodEnd && today <= periodEnd;

  base.cycleDay = cycleDay;
  base.inPeriod = inPeriod;
  base.periodDay = inPeriod ? cycleDay : null;

  if (!avgCycleLength) {
    base.phase = inPeriod ? 'menstrual' : null;
    return base;
  }

  const nextPeriodStart = addDays(currentCycleStart, avgCycleLength);
  const daysUntil = diffDays(today, nextPeriodStart);
  const estimatedOvulation = addDays(nextPeriodStart, -CYCLE_RULES.lutealEstimate);
  const fertileWindow = { start: addDays(estimatedOvulation, -5), end: addDays(estimatedOvulation, 1) };

  base.nextPeriodStart = nextPeriodStart;
  base.nextPeriodEnd = addDays(nextPeriodStart, (avgPeriodLength ?? 5) - 1);
  base.daysUntilNextPeriod = daysUntil;
  base.isLate = daysUntil < 0;
  base.daysLate = daysUntil < 0 ? -daysUntil : 0;
  base.estimatedOvulation = estimatedOvulation;
  base.fertileWindow = fertileWindow;

  if (inPeriod) base.phase = 'menstrual';
  else if (base.isLate) base.phase = null;
  else if (isBetween(today, fertileWindow.start, fertileWindow.end)) base.phase = 'ovulatory';
  else if (today < fertileWindow.start) base.phase = 'follicular';
  else base.phase = 'luteal';

  return base;
}

export type DayKind = 'period' | 'predicted_period' | 'fertile_estimate' | 'ovulation_estimate' | 'none';

/** Classifies a calendar day for the cycle calendar. Logged days always win over estimates. */
export function classifyDay(day: ISODate, periods: PeriodLog[], state: CycleState): DayKind {
  for (const p of periods) {
    const end = p.end ?? (p.start <= state.today ? state.today : p.start);
    if (isBetween(day, p.start, end)) return 'period';
  }
  if (state.nextPeriodStart && state.nextPeriodEnd && isBetween(day, state.nextPeriodStart, state.nextPeriodEnd) && day >= state.today) {
    return 'predicted_period';
  }
  if (state.estimatedOvulation === day) return 'ovulation_estimate';
  if (state.fertileWindow && isBetween(day, state.fertileWindow.start, state.fertileWindow.end)) return 'fertile_estimate';
  return 'none';
}

/** Projects future estimated periods (for multi-month calendar views). */
export function projectedPeriods(state: CycleState, count = 3): { start: ISODate; end: ISODate }[] {
  if (!state.nextPeriodStart || !state.avgCycleLength) return [];
  const out: { start: ISODate; end: ISODate }[] = [];
  for (let i = 0; i < count; i++) {
    const start = addDays(state.nextPeriodStart, i * state.avgCycleLength);
    out.push({ start, end: addDays(start, (state.avgPeriodLength ?? 5) - 1) });
  }
  return out;
}

export function validatePeriodRange(
  start: ISODate,
  end: ISODate | null,
  periods: PeriodLog[],
  today: ISODate,
  ignoreId?: string,
): string | null {
  if (start > today) return "A period start can't be in the future.";
  if (end && end < start) return 'The end date must be on or after the start date.';
  if (end && end > today) return "The end date can't be in the future.";
  const len = diffDays(start, end ?? start) + 1;
  if (len > CYCLE_RULES.plausiblePeriod.max) return `That's longer than ${CYCLE_RULES.plausiblePeriod.max} days — please check the dates.`;
  for (const p of periods) {
    if (p.id === ignoreId) continue;
    const pEnd = p.end ?? today;
    if (start <= pEnd && (end ?? start) >= p.start) return 'These dates overlap a period you already logged.';
  }
  return null;
}
