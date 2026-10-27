/**
 * Wellness score, streaks, goals and subscription logic (SRS §69 unit tests). The score is an
 * engagement metric: missing parts are left out and the remaining weights re-normalised (D-06).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  canUseTheme,
  checkInStreak,
  createEmptyState,
  DEFAULT_WEIGHTS,
  goalProgress,
  reducer,
  startOfWeek,
  THEMES,
  waterStreak,
  wellnessScore,
  type AppState,
} from '../src/index';

const TODAY = '2026-10-21'; // a Wednesday
const base = (): AppState => createEmptyState(TODAY);
const act = (s: AppState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s);

test('wellness score: with nothing logged only hydration counts (0 ml of the target), everything else is missing', () => {
  const w = wellnessScore({ ...base(), habits: [] });
  assert.equal(w.score, 0);
  assert.deepEqual(w.missing.sort(), ['activity', 'habits', 'mood', 'nutrition', 'sleep']);
});

test('wellness score: missing components are excluded and weights re-normalised', () => {
  // Only hydration (100%) and mood (good = 82) are known today.
  let s = { ...base(), habits: [] };
  s = act(s, { type: 'ADD_WATER', ml: s.waterTargetMl }, { type: 'SAVE_CHECKIN', checkIn: { date: TODAY, mood: 'good', energy: 7, symptomIds: [] } });
  const w = wellnessScore(s);
  assert.deepEqual(w.missing.sort(), ['activity', 'habits', 'nutrition', 'sleep']);
  const expected = Math.round((100 * DEFAULT_WEIGHTS.hydration + 82 * DEFAULT_WEIGHTS.mood) / (DEFAULT_WEIGHTS.hydration + DEFAULT_WEIGHTS.mood));
  assert.equal(w.score, expected);
});

test('wellness score: configured weights change the result (§31)', () => {
  let s = { ...base(), habits: [] };
  s = act(s, { type: 'ADD_WATER', ml: s.waterTargetMl }, { type: 'SAVE_CHECKIN', checkIn: { date: TODAY, mood: 'low', energy: 3, symptomIds: [] } });
  const hydrationHeavy = wellnessScore(s, TODAY, { ...DEFAULT_WEIGHTS, hydration: 90, mood: 10 }).score!;
  const moodHeavy = wellnessScore(s, TODAY, { ...DEFAULT_WEIGHTS, hydration: 10, mood: 90 }).score!;
  assert.ok(hydrationHeavy > moodHeavy, `${hydrationHeavy} > ${moodHeavy}`);
  assert.ok(hydrationHeavy <= 100 && moodHeavy >= 0);
});

test('streaks: consecutive days ending today (or yesterday if today is not done yet)', () => {
  let s = base();
  for (const n of [1, 2, 3]) s = act(s, { type: 'ADD_WATER', ml: s.waterTargetMl, date: addDays(TODAY, -n) });
  assert.equal(waterStreak(s), 3, 'today not done yet → counts from yesterday');
  s = act(s, { type: 'ADD_WATER', ml: s.waterTargetMl, date: TODAY });
  assert.equal(waterStreak(s), 4);
  s = act(s, { type: 'ADD_WATER', ml: 100, date: addDays(TODAY, -5) });
  assert.equal(waterStreak(s), 4, 'a gap ends the streak; a small amount is not a goal met');
  for (const n of [0, 1]) s = act(s, { type: 'SAVE_CHECKIN', checkIn: { date: addDays(TODAY, -n), mood: 'neutral', energy: 5, symptomIds: [] } });
  assert.equal(checkInStreak(s), 2);
});

test('goals: daily and weekly progress, capped at 100%, completed goals show 100%', () => {
  let s = act(base(), { type: 'SET_STEPS', date: TODAY, steps: 4000 });
  s = act(s, { type: 'ADD_GOAL', goal: { title: 'Walk', metric: 'steps', target: 8000, unit: 'steps', period: 'daily' } });
  const steps = s.goals[s.goals.length - 1];
  assert.equal(goalProgress(s, steps).pct, 0.5);
  s = act(s, { type: 'SET_STEPS', date: TODAY, steps: 12000 });
  assert.equal(goalProgress(s, steps).pct, 1, 'never above 100%');

  // Workouts count Monday → today only.
  const monday = startOfWeek(TODAY);
  s = act(
    s,
    { type: 'LOG_WORKOUT', session: { title: 'Yoga', category: 'yoga', durationMin: 20, date: monday, status: 'completed' } },
    { type: 'LOG_WORKOUT', session: { title: 'Walk', category: 'walking', durationMin: 30, date: addDays(monday, -1), status: 'completed' } },
    { type: 'LOG_WORKOUT', session: { title: 'Run', category: 'cardio', durationMin: 5, date: TODAY, status: 'abandoned' } },
    { type: 'ADD_GOAL', goal: { title: '3 workouts', metric: 'workouts', target: 3, unit: 'sessions', period: 'weekly' } },
  );
  const weekly = s.goals[s.goals.length - 1];
  assert.equal(goalProgress(s, weekly).value, 1, 'last week and abandoned sessions don’t count');
  s = act(s, { type: 'UPDATE_GOAL', id: weekly.id, patch: { status: 'completed' } });
  assert.equal(goalProgress(s, s.goals.find((g) => g.id === weekly.id)!).pct, 1);
});

test('subscription logic: Premium themes need the Premium plan; the plan follows SET_PLAN', () => {
  const premium = THEMES.filter((t) => t.premium);
  const free = THEMES.filter((t) => !t.premium);
  assert.equal(premium.length, 3);
  assert.equal(free.length, 3);
  for (const t of free) assert.ok(canUseTheme(t, 'free'));
  for (const t of premium) {
    assert.equal(canUseTheme(t, 'free'), false);
    assert.ok(canUseTheme(t, 'premium'));
  }
  let s = base();
  assert.equal(s.profile.plan, 'free');
  s = act(s, { type: 'SET_PLAN', plan: 'premium' });
  assert.equal(s.profile.plan, 'premium');
  s = act(s, { type: 'SET_PLAN', plan: 'free' });
  assert.equal(s.profile.plan, 'free');
});
