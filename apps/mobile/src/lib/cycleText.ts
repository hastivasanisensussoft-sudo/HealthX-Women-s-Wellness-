import { PHASES, formatDate, type CycleState } from '@healthx/shared';

/** Consistent, estimate-labelled wording for cycle summaries (SRS §11, §12, §67). */
export function nextPeriodText(cs: CycleState): string {
  if (!cs.hasData) return 'Log a period to see estimates';
  if (cs.inPeriod) return `Period · day ${cs.periodDay}`;
  if (cs.isLate) return 'Your estimated period date has passed';
  if (cs.daysUntilNextPeriod === null) return 'Keep logging to see estimates';
  if (cs.daysUntilNextPeriod === 0) return 'Period may start today*';
  return `Next period in ~${cs.daysUntilNextPeriod} day${cs.daysUntilNextPeriod === 1 ? '' : 's'}*`;
}

export function phaseText(cs: CycleState): string {
  if (!cs.phase) return cs.isLate ? 'Phase estimate paused' : 'Phase not estimated yet';
  return PHASES[cs.phase].label + (cs.phase === 'menstrual' ? '' : '*');
}

export function nextPeriodDate(cs: CycleState): string | null {
  return cs.nextPeriodStart ? `${formatDate(cs.nextPeriodStart, 'short')}*` : null;
}

export function sourceText(cs: CycleState): string {
  if (cs.lengthSource === 'history') return `Based on your last ${Math.min(cs.completedCycles, 6)} logged cycles`;
  if (cs.lengthSource === 'profile') return 'Based on the typical length you entered';
  return 'Not enough data yet';
}
