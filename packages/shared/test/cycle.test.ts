/**
 * Cycle engine and date maths (SRS §69 unit tests, §70 critical cycle-engine cases):
 * regular, irregular, short, long, missing, multiple, edited and deleted periods, leap years,
 * month boundaries, time zones / DST and historical data. Estimates only — never confirmation.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  addMonths,
  classifyDay,
  computeCycleState,
  createEmptyState,
  CYCLE_RULES,
  daysInMonth,
  diffDays,
  monthGrid,
  projectedPeriods,
  reducer,
  sleepDuration,
  startOfWeek,
  validatePeriodRange,
  type CycleProfile,
  type PeriodLog,
} from '../src/index';

const NO_PROFILE: CycleProfile = { lastPeriodStart: null, typicalCycleLength: null, typicalPeriodLength: null, regularity: 'not_sure' };
let seq = 0;
/** Periods starting on each date, each `len` days long (ended). */
const periods = (starts: string[], len = 5): PeriodLog[] =>
  starts.map((start) => ({ id: `p${++seq}`, start, end: addDays(start, len - 1), flowByDay: { [start]: 'medium' } }));
/** Start dates spaced by the given cycle lengths. */
const startsFrom = (first: string, lengths: number[]) => lengths.reduce((acc, n) => [...acc, addDays(acc[acc.length - 1], n)], [first]);

// ---------------------------------------------------------------- dates

test('dates: month and year boundaries', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(diffDays('2026-01-25', '2026-02-05'), 11);
  assert.equal(addMonths('2026-11-15', 2), '2027-01-01');
  assert.equal(addMonths('2026-01-15', -1), '2025-12-01');
  assert.equal(startOfWeek('2026-11-01'), '2026-10-26', 'weeks start on Monday, across a month boundary');
});

test('dates: leap years', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(addDays('2027-02-28', 1), '2027-03-01', '2027 is not a leap year');
  assert.equal(daysInMonth('2028-02-10'), 29);
  assert.equal(daysInMonth('2100-02-10'), 28, '2100 is not a leap year');
  assert.equal(daysInMonth('2000-02-10'), 29, '2000 is');
  assert.equal(diffDays('2028-02-01', '2028-03-01'), 29);
});

test('dates: DST changes never shift a day (whatever the process time zone)', () => {
  // US DST starts 2026-03-08, EU 2026-03-29; both end in autumn (2026-10-25 EU, 2026-11-01 US).
  for (const [a, b] of [
    ['2026-03-07', '2026-03-09'],
    ['2026-03-28', '2026-03-30'],
    ['2026-10-24', '2026-10-26'],
    ['2026-10-31', '2026-11-02'],
  ]) {
    assert.equal(diffDays(a, b), 2, `${a} → ${b}`);
    assert.equal(addDays(a, 2), b);
  }
  assert.equal(sleepDuration('23:30', '07:00'), 450, 'sleep across midnight');
  assert.equal(monthGrid('2026-03-01').flat().length, 42);
});

// ---------------------------------------------------------------- cycle engine

test('regular cycles: average from history, next period estimated, high confidence', () => {
  const starts = startsFrom('2026-05-01', [28, 28, 28, 28, 28]);
  const today = addDays(starts[starts.length - 1], 10);
  const s = computeCycleState(periods(starts), NO_PROFILE, today);
  assert.equal(s.avgCycleLength, 28);
  assert.equal(s.lengthSource, 'history');
  assert.equal(s.lengthProvenance, 'estimated');
  assert.equal(s.cycleDay, 11);
  assert.equal(s.nextPeriodStart, addDays(starts[starts.length - 1], 28));
  assert.equal(s.isRegular, true);
  assert.equal(s.confidence, 'high');
  assert.equal(s.estimatedOvulation, addDays(s.nextPeriodStart!, -CYCLE_RULES.lutealEstimate), 'a calendar estimate');
});

test('no fixed 28-day assumption: a 33-day history predicts 33 days', () => {
  const starts = startsFrom('2026-03-01', [33, 33, 33, 33]);
  const s = computeCycleState(periods(starts), { ...NO_PROFILE, typicalCycleLength: 28 }, addDays(starts[starts.length - 1], 3));
  assert.equal(s.avgCycleLength, 33);
  assert.equal(s.nextPeriodStart, addDays(starts[starts.length - 1], 33));
});

test('irregular cycles: wide spread is flagged as irregular with lower confidence', () => {
  const starts = startsFrom('2026-01-05', [24, 38, 27, 41, 30]);
  const s = computeCycleState(periods(starts), NO_PROFILE, addDays(starts[starts.length - 1], 5));
  assert.ok(s.spread! > CYCLE_RULES.irregularSpread);
  assert.equal(s.isRegular, false);
  assert.notEqual(s.confidence, 'high');
});

test('short and long cycles are averaged; implausible gaps are left out of the average', () => {
  const short = startsFrom('2026-04-01', [21, 22, 21]);
  assert.equal(computeCycleState(periods(short), NO_PROFILE, addDays(short[3], 2)).avgCycleLength, 21);
  const long = startsFrom('2026-01-01', [40, 42, 41]);
  assert.equal(computeCycleState(periods(long), NO_PROFILE, addDays(long[3], 2)).avgCycleLength, 41);
  // A 90-day gap (e.g. untracked months) isn't a plausible single cycle: it's excluded.
  const gap = startsFrom('2026-01-01', [30, 90, 30]);
  assert.equal(computeCycleState(periods(gap), NO_PROFILE, addDays(gap[3], 2)).avgCycleLength, 30);
});

test('missing data: profile fallback is labelled user-entered; nothing known → no estimate', () => {
  const profile: CycleProfile = { lastPeriodStart: '2026-10-01', typicalCycleLength: 30, typicalPeriodLength: 4, regularity: 'regular' };
  const s = computeCycleState([], profile, '2026-10-10');
  assert.equal(s.lengthSource, 'profile');
  assert.equal(s.lengthProvenance, 'user_entered');
  assert.equal(s.nextPeriodStart, '2026-10-31');
  assert.equal(s.confidence, 'low');
  const none = computeCycleState([], NO_PROFILE, '2026-10-10');
  assert.equal(none.hasData, false);
  assert.equal(none.nextPeriodStart, null);
  assert.equal(none.phase, null);
});

test('missed period: a late period clears the phase instead of guessing', () => {
  const starts = startsFrom('2026-06-01', [28, 28, 28]);
  const today = addDays(starts[3], 35);
  const s = computeCycleState(periods(starts), NO_PROFILE, today);
  assert.equal(s.isLate, true);
  assert.equal(s.daysLate, 7);
  assert.equal(s.phase, null);
});

test('multiple logged periods: order of input does not matter; future-dated logs are ignored', () => {
  const starts = startsFrom('2026-05-01', [29, 29, 29, 29]);
  const today = addDays(starts[4], 4);
  const ordered = computeCycleState(periods(starts), NO_PROFILE, today);
  const shuffled = computeCycleState(periods([...starts].reverse()), NO_PROFILE, today);
  assert.equal(shuffled.avgCycleLength, ordered.avgCycleLength);
  assert.equal(shuffled.nextPeriodStart, ordered.nextPeriodStart);
  const withFuture = computeCycleState([...periods(starts), ...periods([addDays(today, 3)])], NO_PROFILE, today);
  assert.equal(withFuture.currentCycleStart, starts[4]);
});

test('historical data: only the most recent cycles are averaged', () => {
  const starts = startsFrom('2025-01-01', [40, 40, 40, 40, 28, 28, 28, 28, 28, 28]);
  const s = computeCycleState(periods(starts), NO_PROFILE, addDays(starts[starts.length - 1], 2));
  assert.equal(s.avgCycleLength, 28, `averages the last ${CYCLE_RULES.averagingWindow} completed cycles`);
  assert.equal(s.completedCycles, 10);
});

test('edited and deleted periods change the estimate (through the app reducer)', () => {
  const today = '2026-10-20';
  let st = createEmptyState(today);
  for (const start of ['2026-07-01', '2026-07-29', '2026-08-26', '2026-09-23']) st = reducer(st, { type: 'ADD_PERIOD', start, end: addDays(start, 4), flow: 'medium' });
  const before = computeCycleState(st.periods, st.cycleProfile, today);
  assert.equal(before.avgCycleLength, 28);
  const last = st.periods.find((p) => p.start === '2026-09-23')!;
  st = reducer(st, { type: 'UPDATE_PERIOD', id: last.id, start: '2026-09-27', end: '2026-10-01' });
  const edited = computeCycleState(st.periods, st.cycleProfile, today);
  assert.equal(edited.currentCycleStart, '2026-09-27');
  assert.notEqual(edited.nextPeriodStart, before.nextPeriodStart);
  st = reducer(st, { type: 'DELETE_PERIOD', id: last.id });
  const deleted = computeCycleState(st.periods, st.cycleProfile, today);
  assert.equal(deleted.currentCycleStart, '2026-08-26');
  assert.equal(deleted.isLate, true, 'without the latest period the next one is overdue');
});

test('calendar: logged days win over estimates; future periods are projected', () => {
  const starts = startsFrom('2026-06-01', [28, 28, 28, 28]);
  const ps = periods(starts);
  const today = addDays(starts[4], 2);
  const s = computeCycleState(ps, NO_PROFILE, today);
  assert.equal(classifyDay(starts[4], ps, s), 'period');
  assert.equal(classifyDay(s.nextPeriodStart!, ps, s), 'predicted_period');
  assert.equal(classifyDay(s.estimatedOvulation!, ps, s), 'ovulation_estimate');
  assert.equal(classifyDay(s.fertileWindow!.start, ps, s), 'fertile_estimate');
  const next3 = projectedPeriods(s, 3);
  assert.deepEqual(next3.map((p) => diffDays(starts[4], p.start)), [28, 56, 84]);
});

test('period validation: future, reversed, overlapping and over-long ranges are refused', () => {
  const ps = periods(['2026-10-01']);
  const today = '2026-10-20';
  assert.match(validatePeriodRange('2026-10-25', null, ps, today) ?? '', /future/);
  assert.match(validatePeriodRange('2026-10-10', '2026-10-08', ps, today) ?? '', /on or after/);
  assert.ok(validatePeriodRange('2026-10-03', '2026-10-06', ps, today), 'overlaps an existing period');
  assert.match(validatePeriodRange('2026-09-01', '2026-09-20', ps, today) ?? '', /longer than/);
  assert.equal(validatePeriodRange('2026-10-12', '2026-10-15', ps, today), null);
});
