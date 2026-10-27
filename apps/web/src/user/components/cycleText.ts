import { diffDays, type CycleState } from '@healthx/shared';

/** Headline inside the cycle ring (Mira: "Your period starts in 3 days"), always worded as an estimate. */
export function ringHeadline(cs: CycleState): { kicker: string; big: string; sub: string } {
  if (cs.inPeriod) return { kicker: 'Period', big: `Day ${cs.periodDay}`, sub: `Cycle day ${cs.cycleDay}` };
  if (cs.isLate) return { kicker: 'Period estimate', big: `+${cs.daysLate}d`, sub: 'later than estimated*' };
  if (cs.daysUntilNextPeriod !== null && cs.daysUntilNextPeriod >= 0)
    return { kicker: 'Next period in', big: cs.daysUntilNextPeriod === 0 ? 'Today*' : `~${cs.daysUntilNextPeriod} days*`, sub: `Cycle day ${cs.cycleDay}` };
  return { kicker: 'Cycle day', big: String(cs.cycleDay ?? '—'), sub: 'Log more cycles for estimates' };
}

/** Fertile-window estimate as cycle-day numbers for the ring. */
export function fertileDays(cs: CycleState): { fs: number | null; fe: number | null } {
  if (!cs.fertileWindow || !cs.currentCycleStart) return { fs: null, fe: null };
  return { fs: diffDays(cs.currentCycleStart, cs.fertileWindow.start) + 1, fe: diffDays(cs.currentCycleStart, cs.fertileWindow.end) + 1 };
}
