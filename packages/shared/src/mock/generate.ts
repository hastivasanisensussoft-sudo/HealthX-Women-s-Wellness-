/**
 * Builds ~75 days of believable, internally consistent demo history relative to
 * `today`, so the app always looks "current". Seeded → identical on web and mobile.
 */
import { addDays, diffDays, lastNDays, rangeDays, weekday } from '../dates';
import { SYMPTOMS } from '../catalog';
import type {
  ActivityDay,
  ActivityFeedItem,
  AppNotification,
  Badge,
  CheckIn,
  Consent,
  FertilityLog,
  Flow,
  Habit,
  HabitCompletion,
  HealthConnection,
  ISODate,
  MealLog,
  MoodLevel,
  NotificationPrefs,
  PeriodLog,
  Reminder,
  SleepLog,
  SymptomLog,
  UserProfile,
  WaterLog,
  WellnessGoal,
  WorkoutSession,
} from '../types';
import { createRng } from './random';
import { WORKOUTS } from './workouts';

const HISTORY_DAYS = 75;
/** Completed cycle lengths, most recent first (spread 4 days → "regular"). */
const CYCLE_LENGTHS = [29, 31, 28, 30, 27, 29];
const PERIOD_LENGTHS = [5, 5, 4, 5, 6, 5, 5];
const FLOW_PATTERN: Flow[] = ['medium', 'heavy', 'medium', 'light', 'light', 'light'];
/** Today is shown as cycle day 12 (follicular, next period ~2.5 weeks away). */
const CURRENT_CYCLE_DAY = 12;

export function generatePeriods(today: ISODate): PeriodLog[] {
  const starts: ISODate[] = [addDays(today, -(CURRENT_CYCLE_DAY - 1))];
  for (const len of CYCLE_LENGTHS) starts.unshift(addDays(starts[0], -len));
  return starts.map((start, i) => {
    const len = PERIOD_LENGTHS[i % PERIOD_LENGTHS.length];
    const end = addDays(start, len - 1);
    const flowByDay: Record<ISODate, Flow> = {};
    rangeDays(start, end).forEach((d, j) => (flowByDay[d] = FLOW_PATTERN[Math.min(j, FLOW_PATTERN.length - 1)]));
    return { id: `p_${i + 1}`, start, end: end <= today ? end : null, flowByDay };
  });
}

function nearestPeriodStartAfter(day: ISODate, periods: PeriodLog[]): number | null {
  const next = periods.find((p) => p.start > day);
  return next ? diffDays(day, next.start) : null;
}

function inPeriod(day: ISODate, periods: PeriodLog[]): number | null {
  for (const p of periods) {
    const end = p.end ?? p.start;
    if (day >= p.start && day <= end) return diffDays(p.start, day) + 1;
  }
  return null;
}

export interface GeneratedHistory {
  profile: UserProfile;
  periods: PeriodLog[];
  symptomLogs: SymptomLog[];
  checkIns: CheckIn[];
  water: WaterLog[];
  sleep: SleepLog[];
  activity: ActivityDay[];
  sessions: WorkoutSession[];
  meals: MealLog[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  goals: WellnessGoal[];
  notifications: AppNotification[];
  notificationPrefs: NotificationPrefs;
  reminders: Reminder[];
  consents: Consent[];
  badges: Badge[];
  fertility: FertilityLog[];
  connections: HealthConnection[];
  feed: ActivityFeedItem[];
}

export function generateHistory(today: ISODate, now = new Date()): GeneratedHistory {
  const rng = createRng();
  const periods = generatePeriods(today);
  const days = lastNDays(addDays(today, -1), HISTORY_DAYS); // history excludes today

  const profile: UserProfile = {
    id: 'u_demo',
    name: 'Aisha Kapoor',
    email: 'aisha@example.com',
    dob: '1996-04-18',
    country: 'India',
    timezone: 'Asia/Kolkata',
    language: 'English',
    heightCm: 163,
    weightKg: 58,
    activityLevel: 'moderate',
    avatar: 'avatar-art-1',
    goals: ['understand_cycle', 'improve_wellness', 'track_symptoms', 'improve_fitness'],
    units: 'metric',
    mode: 'cycle',
    plan: 'free',
    memberSince: addDays(today, -190),
  };

  // Workouts ~3× a week (Mon/Wed/Sat-ish with some noise)
  const sessions: WorkoutSession[] = [];
  const workoutDays = new Set<ISODate>();
  days.slice(-56).forEach((d) => {
    const wd = weekday(d);
    if ((wd === 1 || wd === 3 || wd === 6) && rng.chance(0.85)) {
      const w = rng.pick(WORKOUTS.filter((x) => x.category !== 'meditation'));
      sessions.push({ id: `s_${d}`, workoutId: w.id, title: w.title, category: w.category, durationMin: w.durationMin, date: d, status: 'completed' });
      workoutDays.add(d);
    }
  });

  // Check-ins: energy dips in the 3 days before a period and on period days 1–2,
  // rises on workout days → supports SRS §17 / §36 example insights.
  const checkIns: CheckIn[] = [];
  const sleep: SleepLog[] = [];
  days.forEach((d, idx) => {
    const untilPeriod = nearestPeriodStartAfter(d, periods);
    const pDay = inPeriod(d, periods);
    const lastThree = idx >= days.length - 3;
    let energy = rng.int(6, 8);
    if (untilPeriod !== null && untilPeriod <= 3) energy -= rng.int(2, 3);
    if (pDay !== null && pDay <= 2) energy -= 2;
    if (workoutDays.has(d)) energy += 1;
    if (lastThree) energy = 4;
    energy = Math.max(2, Math.min(10, energy));

    const sleepMin = lastThree ? rng.int(350, 385) : rng.int(400, 490);
    const bedMin = rng.int(22 * 60 + 15, 23 * 60 + 40);
    const wakeMin = (bedMin + sleepMin) % (24 * 60);
    const toClock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    sleep.push({
      date: d,
      bedtime: toClock(bedMin),
      wake: toClock(wakeMin),
      durationMin: sleepMin,
      quality: (lastThree ? 3 : rng.pick([3, 4, 4, 5])) as SleepLog['quality'],
      wakings: lastThree ? 2 : rng.int(0, 2),
      source: 'manual',
    });

    if (rng.chance(0.12) && idx < days.length - 7) return; // a few skipped check-ins
    const mood: MoodLevel = energy >= 8 ? 'excellent' : energy >= 6 ? 'good' : energy >= 5 ? 'neutral' : energy >= 3 ? 'low' : 'very_low';
    const symptomIds: string[] = [];
    if (pDay !== null && pDay <= 2) symptomIds.push('cramps');
    if (untilPeriod !== null && untilPeriod <= 2) symptomIds.push(rng.pick(['bloating', 'breast_tenderness', 'headache']));
    const stress = Math.max(1, Math.min(10, 10 - energy + rng.int(-1, 1)));
    // Derived without extra rng draws so the rest of the seeded history is unchanged.
    const dayNum = Number(d.slice(8, 10));
    const moodFactors = [stress >= 6 && 'work', sleepMin < 400 && 'sleep', dayNum % 3 === 0 && 'family', energy >= 7 && 'exercise', pDay !== null && pDay <= 3 && 'cycle'].filter(
      (x): x is string => !!x,
    );
    checkIns.push({
      date: d,
      mood,
      energy,
      stress,
      anxiety: Math.max(1, Math.min(10, stress - 1 + (dayNum % 2))),
      sleepHours: Math.round((sleepMin / 60) * 10) / 10,
      symptomIds,
      moodFactors,
    });
  });

  // Symptoms around periods (§13/§14)
  const symptomLogs: SymptomLog[] = [];
  periods.forEach((p) => {
    const add = (symptomId: string, date: ISODate, severity: SymptomLog['severity']) => {
      if (date >= today) return;
      symptomLogs.push({ id: `sl_${symptomId}_${date}`, symptomId, date, severity });
    };
    add('cramps', p.start, 'moderate');
    add('cramps', addDays(p.start, 1), 'mild');
    add('fatigue', p.start, 'moderate');
    if (rng.chance(0.6)) add('back_pain', addDays(p.start, 1), 'mild');
    add('bloating', addDays(p.start, -2), 'mild');
    add('breast_tenderness', addDays(p.start, -3), 'mild');
    if (rng.chance(0.7)) add('headache', addDays(p.start, -1), 'moderate');
    if (rng.chance(0.6)) add('acne', addDays(p.start, -4), 'mild');
    if (rng.chance(0.5)) add('irritability', addDays(p.start, -2), 'mild');
  });
  days.slice(-30).forEach((d) => {
    if (rng.chance(0.12)) symptomLogs.push({ id: `sl_calm_${d}`, symptomId: 'calm', date: d, severity: 'mild' });
  });

  // Water (target 2400 ml)
  const water: WaterLog[] = [];
  days.slice(-30).forEach((d) => {
    const entries = rng.int(5, 9);
    for (let i = 0; i < entries; i++) {
      water.push({ id: `w_${d}_${i}`, date: d, time: `${String(8 + i * 2).padStart(2, '0')}:${rng.pick(['05', '20', '40'])}`, ml: rng.pick([250, 250, 350, 300, 500]) });
    }
  });
  water.push(
    { id: 'w_today_1', date: today, time: '08:10', ml: 250 },
    { id: 'w_today_2', date: today, time: '10:30', ml: 350 },
    { id: 'w_today_3', date: today, time: '13:15', ml: 500 },
  );

  // Steps
  const activity: ActivityDay[] = days.map((d) => ({
    date: d,
    steps: workoutDays.has(d) ? rng.int(8200, 11800) : rng.int(4200, 8600),
    activeMin: workoutDays.has(d) ? rng.int(35, 60) : rng.int(12, 30),
    source: 'manual',
  }));
  activity.push({ date: today, steps: 3240, activeMin: 14, source: 'manual' });

  // Meals: last 6 days + today breakfast/lunch
  const MEALS: Omit<MealLog, 'id' | 'date'>[] = [
    { meal: 'breakfast', name: 'Oats with banana & chia', kcal: 340, protein: 11, carbs: 58, fat: 8, fiber: 9 },
    { meal: 'breakfast', name: 'Poha with peanuts', kcal: 310, protein: 8, carbs: 50, fat: 9, fiber: 4 },
    { meal: 'breakfast', name: 'Greek yoghurt & berries', kcal: 260, protein: 18, carbs: 30, fat: 6, fiber: 5 },
    { meal: 'lunch', name: 'Dal, brown rice & sabzi', kcal: 520, protein: 19, carbs: 82, fat: 12, fiber: 13 },
    { meal: 'lunch', name: 'Paneer wrap with salad', kcal: 480, protein: 24, carbs: 46, fat: 20, fiber: 7 },
    { meal: 'lunch', name: 'Chickpea quinoa bowl', kcal: 510, protein: 21, carbs: 68, fat: 15, fiber: 14 },
    { meal: 'snack', name: 'Apple & almonds', kcal: 190, protein: 5, carbs: 22, fat: 10, fiber: 5 },
    { meal: 'snack', name: 'Roasted chana', kcal: 150, protein: 8, carbs: 20, fat: 3, fiber: 6 },
    { meal: 'dinner', name: 'Grilled tofu & veggies', kcal: 430, protein: 26, carbs: 30, fat: 20, fiber: 8 },
    { meal: 'dinner', name: 'Roti, rajma & salad', kcal: 560, protein: 22, carbs: 80, fat: 14, fiber: 16 },
    { meal: 'dinner', name: 'Vegetable khichdi', kcal: 450, protein: 16, carbs: 70, fat: 10, fiber: 9 },
  ];
  const meals: MealLog[] = [];
  days.slice(-6).forEach((d) => {
    (['breakfast', 'lunch', 'snack', 'dinner'] as const).forEach((m) => {
      if (m === 'snack' && rng.chance(0.4)) return;
      const opt = rng.pick(MEALS.filter((x) => x.meal === m));
      meals.push({ id: `m_${d}_${m}`, date: d, ...opt });
    });
  });
  meals.push({ id: 'm_today_b', date: today, ...MEALS[0] }, { id: 'm_today_l', date: today, ...MEALS[3] });

  // Habits (§33, §66)
  const habits: Habit[] = [
    { id: 'h_water', title: 'Drink water with every meal', icon: 'glass-water', category: 'hydration', days: [] },
    { id: 'h_walk', title: '20-minute walk', icon: 'footprints', category: 'movement', days: [] },
    { id: 'h_breathe', title: '5-minute breathing', icon: 'wind', category: 'mindfulness', days: [] },
    { id: 'h_breakfast', title: 'Healthy breakfast', icon: 'apple', category: 'nutrition', days: [] },
    { id: 'h_sleep', title: 'In bed by 10:30 pm', icon: 'moon', category: 'sleep', days: [] },
    { id: 'h_stretch', title: 'Stretch for 10 minutes', icon: 'move', category: 'movement', days: [1, 3, 5] },
  ];
  const habitCompletions: HabitCompletion[] = [];
  days.slice(-35).forEach((d) => {
    habits.forEach((h) => {
      if (h.days.length && !h.days.includes(weekday(d))) return;
      if (rng.chance(0.7)) habitCompletions.push({ habitId: h.id, date: d });
    });
  });
  habitCompletions.push({ habitId: 'h_water', date: today }, { habitId: 'h_breakfast', date: today });

  const goals: WellnessGoal[] = [
    { id: 'g_steps', title: 'Walk 8,000 steps a day', metric: 'steps', target: 8000, unit: 'steps', period: 'daily', createdAt: addDays(today, -40), status: 'active' },
    { id: 'g_workouts', title: '3 workouts a week', metric: 'workouts', target: 3, unit: 'sessions', period: 'weekly', createdAt: addDays(today, -60), status: 'active' },
    { id: 'g_water', title: 'Drink 2.4 L of water daily', metric: 'water', target: 2400, unit: 'ml', period: 'daily', createdAt: addDays(today, -30), status: 'active' },
    { id: 'g_sleep', title: 'Sleep 7.5 hours a night', metric: 'sleep', target: 7.5, unit: 'h', period: 'daily', createdAt: addDays(today, -20), status: 'active' },
    { id: 'g_checkins', title: 'Check in 6 days a week', metric: 'checkins', target: 6, unit: 'check-ins', period: 'weekly', createdAt: addDays(today, -75), status: 'completed' },
  ];

  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const notifications: AppNotification[] = [
    { id: 'n1', type: 'hydration', title: 'Hydration', body: "You are behind today's hydration goal.", createdAt: hoursAgo(1), read: false, to: '/hydration' },
    { id: 'n2', type: 'habit', title: 'Daily check-in', body: 'Time for your daily wellness check-in.', createdAt: hoursAgo(3), read: false, to: '/check-in' },
    { id: 'n3', type: 'content', title: 'New article', body: 'New wellness article available: “Skin and your cycle”.', createdAt: hoursAgo(20), read: false, to: '/learn/a_skin_cycle' },
    { id: 'n4', type: 'report', title: 'Weekly summary', body: 'Your weekly summary is ready.', createdAt: hoursAgo(28), read: true, to: '/insights/weekly' },
    { id: 'n5', type: 'workout', title: 'Workout', body: 'Your scheduled workout is ready: Gentle Yoga Flow.', createdAt: hoursAgo(50), read: true, to: '/fitness' },
    { id: 'n6', type: 'cycle', title: 'Cycle', body: 'Your period was logged. Estimates have been updated.', createdAt: hoursAgo(24 * 11), read: true, to: '/cycle' },
    { id: 'n7', type: 'hydration', title: 'Hydration', body: 'You reached your water goal 5 days this week 🎉', createdAt: hoursAgo(24 * 4), read: true, to: '/hydration' },
    { id: 'n8', type: 'content', title: 'New article', body: 'New wellness article available: “Menopause and bone health”.', createdAt: hoursAgo(24 * 13), read: true, to: '/learn/a_menopause_bones' },
  ];

  const notificationPrefs: NotificationPrefs = {
    types: {
      cycle: { enabled: true, time: '09:00' },
      habit: { enabled: true, time: '20:00' },
      hydration: { enabled: true, time: '11:00' },
      workout: { enabled: true, time: '07:00' },
      sleep: { enabled: false, time: '22:00' },
      appointment: { enabled: true, time: '09:00' },
      content: { enabled: false, time: '18:00' },
      report: { enabled: true, time: '09:30' },
    },
    discreet: false,
    quietHours: { enabled: true, from: '22:30', to: '07:00' },
  };

  const reminders: Reminder[] = [
    { id: 'r1', title: 'Daily check-in', type: 'habit', time: '20:00', enabled: true },
    { id: 'r2', title: 'Drink a glass of water', type: 'hydration', time: '11:00', enabled: true },
    { id: 'r3', title: 'Gentle Yoga Flow', type: 'workout', time: '07:00', date: addDays(today, 1), enabled: true },
    { id: 'r4', title: 'Evening wind-down stretch', type: 'workout', time: '21:30', enabled: true },
    { id: 'r5', title: 'Estimated period may begin soon', type: 'cycle', time: '09:00', date: addDays(today, 16), enabled: true },
    { id: 'r6', title: 'Weekly summary', type: 'report', time: '09:30', date: addDays(today, (8 - weekday(today)) % 7 || 7), enabled: true },
  ];

  const consents: Consent[] = [
    { id: 'health_processing', label: 'Health data processing', description: 'Store and process the cycle and wellness data you log so the app can work — including a log of when you sign in and save records (not their values), kept for support and security. Required.', required: true, granted: true, version: 'v1.0', updatedAt: profile.memberSince },
    { id: 'notifications', label: 'Reminders & notifications', description: 'Send the reminders you choose. You control each type in Notification settings.', required: false, granted: true, version: 'v1.0', updatedAt: profile.memberSince },
    { id: 'analytics', label: 'Product analytics', description: 'Share app-usage events — which screens and features you use, never your health values — to help us improve and to help support with your account.', required: false, granted: true, version: 'v1.0', updatedAt: profile.memberSince },
    { id: 'ai_personalization', label: 'AI personalisation', description: 'Let the AI coach use your logs to personalise suggestions. Phase 2/3 feature.', required: false, granted: false, version: 'v1.0', updatedAt: profile.memberSince },
    { id: 'health_integrations', label: 'Health integrations', description: 'Import steps, sleep and workouts from Apple Health or Health Connect. Phase 2 feature.', required: false, granted: false, version: 'v1.0', updatedAt: profile.memberSince },
  ];

  const badges: Badge[] = [
    { id: 'b_streak7', title: '7-Day Wellness Streak', description: 'Checked in 7 days in a row', icon: 'flame', earnedAt: addDays(today, -9), progress: 1 },
    { id: 'b_first_workout', title: 'First Workout', description: 'Completed your first workout', icon: 'dumbbell', earnedAt: addDays(today, -55), progress: 1 },
    { id: 'b_hydration', title: 'Hydration Hero', description: 'Hit your water goal 10 days', icon: 'glass-water', progress: 0.7 },
    { id: 'b_movement30', title: '30-Day Movement', description: 'Move for 30 days in a row', icon: 'footprints', progress: 0.43 },
    { id: 'b_mindful', title: 'Mindfulness Starter', description: 'Completed 5 breathing sessions', icon: 'brain', earnedAt: addDays(today, -18), progress: 1 },
    { id: 'b_learner', title: 'Curious Learner', description: 'Read 10 articles', icon: 'book-open', progress: 0.6 },
  ];

  // Fertility-awareness observations for the current cycle (Phase 3 preview — user-entered only).
  const fertility: FertilityLog[] = [];
  rangeDays(addDays(today, -(CURRENT_CYCLE_DAY - 1)), addDays(today, -1)).forEach((d, i) => {
    fertility.push({
      date: d,
      bbtCelsius: Math.round((36.3 + rng.float(-0.08, 0.1)) * 100) / 100,
      mucus: i < 5 ? 'dry' : i < 8 ? 'sticky' : 'creamy',
      ovulationTest: i >= 8 ? 'negative' : undefined,
    });
  });

  const connections: HealthConnection[] = [
    { id: 'apple_health', label: 'Apple Health', connected: false, dataTypes: ['Steps', 'Distance', 'Sleep', 'Workouts', 'Weight', 'Heart rate'], phase: 2 },
    { id: 'health_connect', label: 'Health Connect (Android)', connected: false, dataTypes: ['Steps', 'Distance', 'Sleep', 'Workouts', 'Weight'], phase: 2 },
    { id: 'wearable', label: 'Wearables', connected: false, dataTypes: ['Sleep', 'Activity', 'Heart rate'], phase: 3 },
  ];

  const feed: ActivityFeedItem[] = [
    { id: 'f1', at: hoursAgo(1.2), kind: 'water', text: 'Logged 500 ml of water' },
    { id: 'f2', at: hoursAgo(2.5), kind: 'meal', text: 'Logged lunch · Dal, brown rice & sabzi' },
    { id: 'f3', at: hoursAgo(5), kind: 'habit', text: 'Completed “Healthy breakfast”' },
    { id: 'f4', at: hoursAgo(17), kind: 'checkin', text: 'Completed daily check-in' },
    { id: 'f5', at: hoursAgo(26), kind: 'workout', text: 'Completed Gentle Yoga Flow · 25 min' },
    { id: 'f6', at: hoursAgo(30), kind: 'content', text: 'Read “A wind-down routine for better sleep”' },
  ];

  return {
    profile,
    periods,
    symptomLogs,
    checkIns,
    water,
    sleep,
    activity,
    sessions,
    meals,
    habits,
    habitCompletions,
    goals,
    notifications,
    notificationPrefs,
    reminders,
    consents,
    badges,
    fertility,
    connections,
    feed,
  };
}

export const SYMPTOM_IDS = SYMPTOMS.map((s) => s.id);
