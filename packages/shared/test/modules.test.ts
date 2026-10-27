/**
 * Life-stage estimates, the 7-day stage dashboard, insight rules, the weekly summary, coach safety,
 * the workout and meal builders and notification consent (SRS §17, §22–§25, §34, §37, §41, §69).
 * Pregnancy week from the last period (D-21) and share-of-target dashboard (D-36) were decided 2026-10-27.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  buildMealPlan,
  buildWorkoutSession,
  coachContextOf,
  computeInsights,
  createEmptyState,
  dailySymptomCounts,
  groceryList,
  MEAL_IDEAS,
  normalizeNotificationPrefs,
  pregnancyEstimate,
  reducer,
  reminderPlan,
  simulateCoachReply,
  splitMinutes,
  stageDashboard,
  weeklySummary,
  type AppState,
  type NotificationPrefs,
} from '../src/index';

const TODAY = '2026-10-21';
const base = (): AppState => createEmptyState(TODAY);
const act = (s: AppState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s);
const sleep = (date: string, hours: number) => ({ type: 'LOG_SLEEP' as const, log: { date, bedtime: '23:00', wake: '07:00', durationMin: Math.round(hours * 60), quality: 3 as const, wakings: 0, source: 'manual' as const } });
const checkIn = (date: string, energy: number, mood: 'excellent' | 'good' | 'neutral' | 'low' | 'very_low' = 'neutral') => ({ type: 'SAVE_CHECKIN' as const, checkIn: { date, mood, energy, symptomIds: [] } });
const withConsent = (s: AppState, id: string, granted: boolean): AppState => ({ ...s, consents: s.consents.map((c) => (c.id === id ? { ...c, granted } : c)) });

// ---------------------------------------------------------------- pregnancy (D-21)

test('pregnancy week: counted from the first day of the last period; due date = +40 weeks (estimate)', () => {
  const s = { ...base(), cycleProfile: { ...base().cycleProfile, lastPeriodStart: '2026-06-01' } };
  const e = pregnancyEstimate(s)!;
  assert.equal(e.lastPeriodStart, '2026-06-01');
  assert.equal(e.weeks, 20); // 142 days
  assert.equal(e.days, 2);
  assert.equal(e.trimester, 2);
  assert.equal(e.dueDate, '2027-03-08');
  assert.equal(e.outOfRange, false);
});

test('pregnancy week: a newer logged period wins; future dates are ignored; no date → no estimate', () => {
  const withProfile = { ...base(), cycleProfile: { ...base().cycleProfile, lastPeriodStart: '2026-06-01' } };
  const logged = act(withProfile, { type: 'ADD_PERIOD', start: '2026-07-01', end: '2026-07-05', flow: 'medium' });
  assert.equal(pregnancyEstimate(logged)!.lastPeriodStart, '2026-07-01');
  assert.equal(pregnancyEstimate({ ...base(), cycleProfile: { ...base().cycleProfile, lastPeriodStart: addDays(TODAY, 3) } }), null);
  assert.equal(pregnancyEstimate(base()), null);
});

test('pregnancy week: in pregnancy mode the saved date is used, even with later period logs', () => {
  let s = act(base(), { type: 'ADD_PERIOD', start: '2026-09-20', end: '2026-09-23', flow: 'light' });
  s = { ...s, cycleProfile: { ...s.cycleProfile, lastPeriodStart: '2026-08-01' } };
  assert.equal(pregnancyEstimate(s)!.lastPeriodStart, '2026-09-20'); // preview: newest known start
  const pregnant = { ...s, profile: { ...s.profile, mode: 'pregnancy' as const } };
  assert.equal(pregnancyEstimate(pregnant)!.lastPeriodStart, '2026-08-01');
  assert.equal(pregnancyEstimate(pregnant)!.weeks, 11); // 81 days
});

test('pregnancy week: trimester boundaries and the >42-week "check your date" flag', () => {
  const at = (lmp: string) => pregnancyEstimate({ ...base(), cycleProfile: { ...base().cycleProfile, lastPeriodStart: lmp } })!;
  assert.equal(at(addDays(TODAY, -(13 * 7 + 6))).trimester, 1);
  assert.equal(at(addDays(TODAY, -14 * 7)).trimester, 2);
  assert.equal(at(addDays(TODAY, -28 * 7)).trimester, 3);
  assert.equal(at(addDays(TODAY, -43 * 7)).outOfRange, true);
});

// ---------------------------------------------------------------- stage dashboard (D-36)

test('stage dashboard: share of target over the last 7 days; days with nothing logged are left out', () => {
  let s = base();
  const t = s.sleepTargetHours;
  s = act(
    s,
    sleep(TODAY, t + 0.5),
    sleep(addDays(TODAY, -1), t),
    sleep(addDays(TODAY, -2), t + 1),
    sleep(addDays(TODAY, -3), t - 2),
    sleep(addDays(TODAY, -9), t + 2), // outside the window
    checkIn(TODAY, 6, 'good'),
    checkIn(addDays(TODAY, -1), 8, 'neutral'),
    { type: 'SET_STEPS', date: TODAY, steps: s.stepTarget },
    { type: 'SET_STEPS', date: addDays(TODAY, -1), steps: s.stepTarget + 500 },
    { type: 'SET_STEPS', date: addDays(TODAY, -2), steps: 1000 },
  );
  const d = stageDashboard(s);
  assert.equal(d.sleep.pct, 75); // 3 of 4 logged nights at or above the goal
  assert.equal(d.energy.pct, 70); // average 7 / 10
  assert.equal(d.mood.pct, 70); // (4 + 3) / 2 = 3.5 / 5
  assert.equal(d.activity.pct, 67); // 2 of 3 days with steps
  assert.match(d.sleep.basis, /3 of 4 logged nights/);
});

test('stage dashboard: nothing logged → no percentages (never a made-up score)', () => {
  const d = stageDashboard(base());
  assert.deepEqual([d.sleep.pct, d.energy.pct, d.mood.pct, d.activity.pct], [null, null, null, null]);
});

test('symptom series: hot flashes and night sweats per day, oldest first', () => {
  const s = act(
    base(),
    { type: 'LOG_SYMPTOMS', date: TODAY, entries: [{ symptomId: 'hot_flash', severity: 'mild' }] },
    { type: 'LOG_SYMPTOMS', date: addDays(TODAY, -2), entries: [{ symptomId: 'night_sweats', severity: 'moderate' }] },
  );
  const days = dailySymptomCounts(s, ['hot_flash', 'night_sweats'], 7);
  assert.equal(days.length, 7);
  assert.equal(days[6].date, TODAY);
  assert.equal(days[6].bySymptom.hot_flash, 1);
  assert.equal(days[4].bySymptom.night_sweats, 1);
  assert.equal(days.reduce((a, d) => a + d.count, 0), 2);
});

// ---------------------------------------------------------------- insights & weekly summary

test('insight rule: 3 days of short sleep and low energy → sleep-routine suggestion; Admin can switch it off', () => {
  let s = base();
  const t = s.sleepTargetHours;
  for (const n of [1, 2, 3]) s = act(s, sleep(addDays(TODAY, -n), t - 1.5), checkIn(addDays(TODAY, -n), 3));
  assert.ok(computeInsights(s).some((i) => i.ruleId === 'sleep_energy_3d'));
  // One day with medium energy breaks the 3-day pattern.
  const broken = act(s, checkIn(addDays(TODAY, -2), 6));
  assert.ok(!computeInsights(broken).some((i) => i.ruleId === 'sleep_energy_3d'));
  // Rules an Admin disabled never show.
  const managed = { ...s, managed: { disabledRules: ['sleep_energy_3d'], planLibrary: [] } };
  assert.ok(!computeInsights(managed).some((i) => i.ruleId === 'sleep_energy_3d'));
});

test('weekly summary: totals, averages and mood wording from the last 7 days only', () => {
  let s = base();
  s = act(
    s,
    sleep(TODAY, 7),
    sleep(addDays(TODAY, -1), 8),
    checkIn(TODAY, 6, 'good'),
    checkIn(addDays(TODAY, -1), 8, 'excellent'),
    { type: 'SET_STEPS', date: TODAY, steps: 5000 },
    { type: 'SET_STEPS', date: addDays(TODAY, -1), steps: 3000 },
    { type: 'SET_STEPS', date: addDays(TODAY, -8), steps: 9000 }, // outside the week
  );
  const w = weeklySummary(s);
  assert.equal(w.steps, 8000);
  assert.equal(w.avgSleep, 7.5);
  assert.equal(w.avgEnergy, 7);
  assert.equal(w.checkIns, 2);
  assert.equal(w.moodSummary, 'Mostly positive');
  assert.equal(w.days.length, 7);
  assert.equal(weeklySummary(base()).moodSummary, 'Not enough check-ins');
});

// ---------------------------------------------------------------- coach safety (§34, §67)

test('coach: emergencies are redirected, diagnosis / medication / contraception are declined', () => {
  for (const q of ['I have chest pain', 'The baby not moving since this morning', 'heavy bleeding and dizzy', 'I want to die']) assert.equal(simulateCoachReply(q).kind, 'emergency', q);
  for (const q of ['Do I have PCOS?', 'What dosage of ibuprofen should I take?', 'Which are my safe days?']) assert.equal(simulateCoachReply(q).kind, 'declined', q);
  assert.equal(simulateCoachReply('What can I do to improve my sleep?').kind, 'educational');
});

test('coach: personal notes only with AI-personalisation consent, and never on emergency or declined replies', () => {
  let s = base();
  for (const n of [0, 1, 2]) s = act(s, sleep(addDays(TODAY, -n), 6), checkIn(addDays(TODAY, -n), 4));
  assert.equal(coachContextOf(withConsent(s, 'ai_personalization', false)), null);
  const ctx = coachContextOf(withConsent(s, 'ai_personalization', true));
  assert.ok(ctx);
  const reply = simulateCoachReply('Why might I feel tired?', ctx);
  assert.ok(reply.personal && reply.personal.some((p) => p.includes('6 h')));
  assert.equal(simulateCoachReply('Why might I feel tired?', null).personal, undefined);
  assert.equal(simulateCoachReply('I have chest pain and feel tired', ctx).personal, undefined);
  assert.equal(simulateCoachReply('Do I have endometriosis? I feel tired', ctx).personal, undefined);
});

// ---------------------------------------------------------------- workout & meal builders

test('workout builder: blocks always add up to the chosen time; relax sessions have no core block', () => {
  for (const total of [10, 15, 20, 30, 45]) {
    for (const goal of ['strength', 'energy', 'flexibility', 'relax'] as const) {
      const m = splitMinutes(total, goal);
      assert.equal(m.warmup + m.main + m.core + m.cooldown, total, `${goal} ${total}`);
      if (goal === 'relax') assert.equal(m.core, 0);
    }
  }
  const s = buildWorkoutSession({ goal: 'strength', level: 'beginner', minutes: 20, equipment: 'none', location: 'home' });
  assert.equal(s.totalMin, 20);
  assert.equal(s.blocks.reduce((a, b) => a + b.minutes, 0), 20);
  assert.ok(s.blocks.every((b) => b.items.length > 0));
});

test('meal ideas: vegetarian filter, varied plan, merged grocery list, no nutrient numbers', () => {
  const plan = buildMealPlan({ vegetarian: true, cuisine: 'any' }, 3);
  assert.equal(plan.length, 3);
  const ideas = plan.flatMap((d) => Object.values(d.meals)).filter((m) => !!m);
  assert.ok(ideas.length > 0 && ideas.every((m) => m!.vegetarian));
  const ids = [...new Set(ideas.map((m) => m!.id))];
  const list = groceryList(ids);
  const keys = list.map((g) => g.item.toLowerCase());
  assert.equal(new Set(keys).size, keys.length); // each ingredient once
  assert.ok(list.every((g) => g.forMeals.length >= 1 && g.qty.length >= 1));
  for (const m of MEAL_IDEAS) for (const k of ['kcal', 'calories', 'protein', 'carbs', 'fat']) assert.ok(!(k in m), `${m.id} has ${k}`);
});

// ---------------------------------------------------------------- notifications (§41, §42)

test('notifications: withdrawing consent switches every type and personal reminder off', () => {
  let s = withConsent(base(), 'notifications', true);
  s = act(s, { type: 'ADD_REMINDER', reminder: { title: 'Check-up', type: 'appointment', time: '10:30', date: addDays(TODAY, 5), enabled: true } });
  s = act(s, { type: 'SET_CONSENT', id: 'notifications', granted: false });
  assert.ok(Object.values(s.notificationPrefs.types).every((t) => !t.enabled));
  assert.ok(s.reminders.every((r) => !r.enabled));
});

test('notifications: older saved settings gain the sleep and appointment types', () => {
  const old = { discreet: true, quietHours: { enabled: false, from: '22:00', to: '07:00' }, types: { cycle: { enabled: false, time: '08:00' } } } as unknown as NotificationPrefs;
  const p = normalizeNotificationPrefs(old);
  assert.equal(p.types.cycle.enabled, false); // what the person chose is kept
  assert.equal(p.types.cycle.time, '08:00');
  assert.ok(p.types.sleep && p.types.appointment);
  assert.equal(p.discreet, true);
});

// ---------------------------------------------------------------- reminder schedule (§37, §41)

const NOW = new Date(2026, 9, 21, 8, 0, 0); // 21 Oct 2026, 08:00 local

test('reminder plan: nothing is scheduled without the notifications consent', () => {
  assert.deepEqual(reminderPlan(withConsent(base(), 'notifications', false), NOW), []);
});

test('reminder plan: daily types, weekly report, dated appointments; quiet hours skip daily ones only', () => {
  let s = withConsent(base(), 'notifications', true);
  const types = { ...s.notificationPrefs.types, sleep: { enabled: true, time: '22:30' } };
  s = { ...s, notificationPrefs: { ...s.notificationPrefs, discreet: false, types, quietHours: { enabled: true, from: '22:00', to: '07:00' } } };
  s = act(
    s,
    { type: 'ADD_REMINDER', reminder: { title: 'Scan', type: 'appointment', time: '23:00', date: '2026-10-24', enabled: true } },
    { type: 'ADD_REMINDER', reminder: { title: 'Old visit', type: 'appointment', time: '10:00', date: '2026-10-01', enabled: true } },
  );
  const plan = reminderPlan(s, NOW);
  const keys = plan.map((p) => p.key);
  assert.ok(keys.includes('type:habit') && keys.includes('type:hydration'));
  assert.ok(!keys.includes('type:sleep'), 'a 22:30 daily reminder falls in quiet hours');
  const report = plan.find((p) => p.key === 'type:report')!;
  assert.equal(report.schedule.kind, 'weekly');
  const scan = plan.find((p) => p.title === 'Scan')!;
  assert.ok(scan, 'a dated reminder inside quiet hours still arrives');
  assert.equal(scan.schedule.kind === 'date' && scan.schedule.at.getDate(), 24);
  assert.ok(!plan.some((p) => p.title === 'Old visit'), 'past dates are not scheduled');
});

test('reminder plan: period reminder two days before the estimate, paused in pregnancy mode; discreet wording', () => {
  let s = withConsent(base(), 'notifications', true);
  s = act(s, { type: 'ADD_PERIOD', start: '2026-09-01', end: '2026-09-05', flow: 'medium' }, { type: 'ADD_PERIOD', start: '2026-09-29', end: '2026-10-03', flow: 'medium' });
  s = { ...s, notificationPrefs: { ...s.notificationPrefs, discreet: true } };
  const cycle = reminderPlan(s, NOW).find((p) => p.key === 'type:cycle');
  assert.ok(cycle && cycle.schedule.kind === 'date');
  assert.equal(cycle.schedule.kind === 'date' && cycle.schedule.at.toDateString(), new Date(2026, 9, 25).toDateString()); // estimate 27 Oct (28-day history) − 2
  assert.equal(cycle.title, 'HealthX');
  assert.ok(!/period/i.test(cycle.body), 'discreet text mentions the period');
  const pregnant = { ...s, profile: { ...s.profile, mode: 'pregnancy' as const } };
  assert.ok(!reminderPlan(pregnant, NOW).some((p) => p.key === 'type:cycle'));
});
