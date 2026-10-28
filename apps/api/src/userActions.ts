/**
 * App-user writes go through the shared domain reducer, but only after this allowlist +
 * validation. Anything that would let a client change its role, plan, identity or replace its
 * whole state (HYDRATE / RESET_DEMO / SET_ROLE / SET_PLAN / SET_WEIGHTS / SIGN_*) is refused.
 */
import {
  COMMUNITY_GROUPS,
  CUSTOM_SYMPTOM_ICONS,
  FLOWS,
  GOALS,
  MOOD_FACTORS,
  MOODS,
  NOTIFICATION_TYPES,
  SEVERITIES,
  SYMPTOM_CATEGORIES,
  WORKOUT_CATEGORIES,
  addDays,
  type Action,
  type AppState,
} from '@healthx/shared';
import { badRequest, conflict, forbidden, notFound } from './http';
import { arr, bool, clock, id, isoDate, num, obj, oneOf, optNum, optStr, str, type Obj } from './validate';

const keys = <T extends { key: string }>(xs: readonly T[]) => xs.map((x) => x.key);
const FLOW = keys(FLOWS);
const SEVERITY = keys(SEVERITIES);
const SYM_CAT = keys(SYMPTOM_CATEGORIES);
const MOOD = keys(MOODS);
const GOAL_KEYS = keys(GOALS);
const NOTIF = keys(NOTIFICATION_TYPES);
const WORKOUT_CAT = keys(WORKOUT_CATEGORIES);
const FACTORS = MOOD_FACTORS.map((f) => f.key);
const MODES = ['cycle', 'pregnancy', 'perimenopause', 'menopause'] as const;
const CONSENTS = ['health_processing', 'analytics', 'ai_personalization', 'health_integrations', 'notifications'] as const;
const CONNECTIONS = ['apple_health', 'health_connect', 'wearable'] as const;
const AVATARS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-art-1', 'avatar-art-2', 'avatar-art-3', 'avatar-art-4', 'avatar-art-5'] as const;
const ACTIVITY = ['sedentary', 'light', 'moderate', 'active'] as const;

/** Actions a client may never send (identity, entitlement, role or whole-state replacement). */
export const BLOCKED = new Set(['SIGN_IN', 'SIGN_UP', 'SIGN_OUT', 'SET_ROLE', 'SET_PLAN', 'SET_WEIGHTS', 'RESET_DEMO', 'HYDRATE']);

/** `articleIds`: currently published CMS articles (absent → none can be referenced). */
export type ActionCtx = { today: string; state: AppState; articleIds?: ReadonlySet<string> };
type Check = (a: Obj, ctx: ActionCtx) => void;

const dateNotFuture = (v: unknown, p: string, today: string) => isoDate(v, p, { notAfter: today, notBefore: '1900-01-01' });
/** References must point at the user's own existing records — unknown ids would only grow the state. */
const symptomExists = (state: AppState, sid: string, p: string) => {
  if (!state.symptomDefs.some((s) => s.id === sid)) throw notFound(`${p}: symptom not found.`);
};
const postExists = (state: AppState, pid: string) => {
  if (!state.community.posts.some((p) => p.id === pid)) throw notFound('Post not found.');
};

const profilePatch = (p: Obj, today: string) => {
  obj(p, 'patch', ['name', 'dob', 'country', 'timezone', 'language', 'heightCm', 'weightKg', 'activityLevel', 'avatar', 'goals', 'units']);
  if (p.name !== undefined) str(p.name, 'name', 2, 60);
  if (p.dob !== undefined) dateNotFuture(p.dob, 'dob', today);
  if (p.country !== undefined) str(p.country, 'country', 1, 60);
  if (p.timezone !== undefined) str(p.timezone, 'timezone', 1, 60);
  if (p.language !== undefined) str(p.language, 'language', 1, 40);
  if (p.heightCm !== undefined) optNum(p.heightCm, 'heightCm', 100, 230);
  if (p.weightKg !== undefined) optNum(p.weightKg, 'weightKg', 30, 250);
  if (p.activityLevel !== undefined) oneOf(p.activityLevel, 'activityLevel', ACTIVITY);
  if (p.avatar !== undefined && p.avatar !== null) oneOf(p.avatar, 'avatar', AVATARS);
  if (p.goals !== undefined) arr(p.goals, 'goals', 10).forEach((g, i) => oneOf(g, `goals[${i}]`, GOAL_KEYS));
  if (p.units !== undefined) oneOf(p.units, 'units', ['metric', 'imperial']);
};

const cycleProfile = (c: Obj, today: string, partial: boolean) => {
  obj(c, 'cycle', ['lastPeriodStart', 'typicalCycleLength', 'typicalPeriodLength', 'regularity']);
  if (!partial || c.lastPeriodStart !== undefined) if (c.lastPeriodStart !== null) dateNotFuture(c.lastPeriodStart, 'lastPeriodStart', today);
  if (!partial || c.typicalCycleLength !== undefined) if (c.typicalCycleLength !== null) num(c.typicalCycleLength, 'typicalCycleLength', 15, 60, true);
  if (!partial || c.typicalPeriodLength !== undefined) if (c.typicalPeriodLength !== null) num(c.typicalPeriodLength, 'typicalPeriodLength', 1, 15, true);
  if (!partial || c.regularity !== undefined) oneOf(c.regularity, 'regularity', ['regular', 'irregular', 'not_sure']);
};

const CHECKS: Record<string, Check> = {
  COMPLETE_ONBOARDING: (a, { today }) => {
    obj(a, 'action', ['type', 'name', 'dob', 'country', 'goals', 'cycle', 'consents']);
    str(a.name, 'name', 2, 60);
    dateNotFuture(a.dob, 'dob', today);
    str(a.country, 'country', 1, 60);
    arr(a.goals, 'goals', 10).forEach((g, i) => oneOf(g, `goals[${i}]`, GOAL_KEYS));
    cycleProfile(obj(a.cycle, 'cycle'), today, false);
    const c = obj(a.consents, 'consents');
    for (const [k, v] of Object.entries(c)) {
      oneOf(k, 'consent', CONSENTS);
      bool(v, `consents.${k}`);
    }
  },
  UPDATE_PROFILE: (a, { today }) => profilePatch(obj(a.patch, 'patch'), today),
  UPDATE_CYCLE_PROFILE: (a, { today }) => cycleProfile(obj(a.patch, 'patch'), today, true),
  SET_MODE: (a) => oneOf(a.mode, 'mode', MODES),
  START_PERIOD: (a, { today }) => {
    dateNotFuture(a.date, 'date', today);
    if (a.flow !== undefined) oneOf(a.flow, 'flow', FLOW);
  },
  END_PERIOD: (a, { today, state }) => {
    const p = state.periods.find((x) => x.id === id(a.id));
    if (!p) throw notFound('Period not found.');
    if (dateNotFuture(a.date, 'date', today) < p.start) throw badRequest('The end date can’t be before the period started.');
  },
  ADD_PERIOD: (a, { today }) => {
    const start = dateNotFuture(a.start, 'start', today);
    if (a.end !== null) {
      const end = dateNotFuture(a.end, 'end', today);
      if (end < start) throw badRequest('end can’t be before start.');
    }
    oneOf(a.flow, 'flow', FLOW);
    optStr(a.notes, 'notes', 500);
  },
  UPDATE_PERIOD: (a, { today }) => {
    id(a.id);
    const start = dateNotFuture(a.start, 'start', today);
    if (a.end !== null) {
      const end = dateNotFuture(a.end, 'end', today);
      if (end < start) throw badRequest('end can’t be before start.');
    }
    optStr(a.notes, 'notes', 500);
  },
  DELETE_PERIOD: (a) => void id(a.id),
  SET_FLOW: (a, { today }) => {
    dateNotFuture(a.date, 'date', today);
    oneOf(a.flow, 'flow', FLOW);
  },
  LOG_SYMPTOMS: (a, { today, state }) => {
    dateNotFuture(a.date, 'date', today);
    const entries = arr(a.entries, 'entries', 40);
    if (!entries.length) throw badRequest('Choose at least one symptom.');
    entries.forEach((e, i) => {
      const o = obj(e, `entries[${i}]`, ['symptomId', 'severity']);
      symptomExists(state, id(o.symptomId, `entries[${i}].symptomId`), `entries[${i}].symptomId`);
      oneOf(o.severity, `entries[${i}].severity`, SEVERITY);
    });
    optStr(a.notes, 'notes', 300);
  },
  REMOVE_SYMPTOM_LOG: (a) => void id(a.id),
  ADD_CUSTOM_SYMPTOM: (a, { state }) => {
    const label = str(a.label, 'label', 2, 40).trim().toLowerCase();
    oneOf(a.category, 'category', SYM_CAT);
    if (a.icon !== undefined) oneOf(a.icon, 'icon', CUSTOM_SYMPTOM_ICONS);
    if (a.defaultSeverity !== undefined) oneOf(a.defaultSeverity, 'defaultSeverity', SEVERITY);
    if (state.symptomDefs.some((s) => s.label.toLowerCase() === label)) throw conflict('That symptom already exists.');
  },
  ARCHIVE_CUSTOM_SYMPTOM: (a) => void id(a.id),
  SAVE_CHECKIN: (a, { today, state }) => {
    const c = obj(a.checkIn, 'checkIn', ['date', 'mood', 'energy', 'stress', 'anxiety', 'sleepHours', 'symptomIds', 'moodFactors', 'note']);
    dateNotFuture(c.date, 'checkIn.date', today);
    oneOf(c.mood, 'checkIn.mood', MOOD);
    num(c.energy, 'checkIn.energy', 1, 10, true);
    optNum(c.stress, 'checkIn.stress', 1, 10, true);
    optNum(c.anxiety, 'checkIn.anxiety', 1, 10, true);
    optNum(c.sleepHours, 'checkIn.sleepHours', 0, 24);
    arr(c.symptomIds, 'checkIn.symptomIds', 40).forEach((s, i) => symptomExists(state, id(s, `checkIn.symptomIds[${i}]`), `checkIn.symptomIds[${i}]`));
    if (c.moodFactors !== undefined) arr(c.moodFactors, 'checkIn.moodFactors', 12).forEach((f, i) => oneOf(f, `checkIn.moodFactors[${i}]`, FACTORS));
    optStr(c.note, 'checkIn.note', 500);
  },
  ADD_WATER: (a, { today }) => {
    num(a.ml, 'ml', 1, 5000, true);
    if (a.date !== undefined) dateNotFuture(a.date, 'date', today);
  },
  REMOVE_WATER: (a) => void id(a.id),
  SET_WATER_TARGET: (a) => void num(a.ml, 'ml', 500, 6000, true),
  LOG_SLEEP: (a, { today }) => {
    const l = obj(a.log, 'log', ['date', 'bedtime', 'wake', 'durationMin', 'quality', 'wakings', 'source']);
    dateNotFuture(l.date, 'log.date', today);
    clock(l.bedtime, 'log.bedtime');
    clock(l.wake, 'log.wake');
    num(l.durationMin, 'log.durationMin', 0, 1440, true);
    num(l.quality, 'log.quality', 1, 5, true);
    num(l.wakings, 'log.wakings', 0, 50, true);
    // Imported sources come from the integrations pipeline, never from the client.
    oneOf(l.source, 'log.source', ['manual']);
  },
  SET_SLEEP_TARGET: (a) => void num(a.hours, 'hours', 5, 12),
  SET_STEPS: (a, { today }) => {
    dateNotFuture(a.date, 'date', today);
    num(a.steps, 'steps', 0, 100000, true);
  },
  LOG_WORKOUT: (a, { today }) => {
    const s = obj(a.session, 'session', ['workoutId', 'title', 'category', 'durationMin', 'date', 'status']);
    if (s.workoutId !== undefined) id(s.workoutId, 'session.workoutId');
    str(s.title, 'session.title', 1, 100);
    oneOf(s.category, 'session.category', WORKOUT_CAT);
    num(s.durationMin, 'session.durationMin', 0, 600, true);
    dateNotFuture(s.date, 'session.date', today);
    oneOf(s.status, 'session.status', ['completed', 'abandoned']);
  },
  DELETE_WORKOUT: (a) => void id(a.id),
  ADD_MEAL: (a, { today }) => {
    const m = obj(a.meal, 'meal', ['date', 'meal', 'name', 'kcal', 'protein', 'carbs', 'fat', 'fiber']);
    dateNotFuture(m.date, 'meal.date', today);
    oneOf(m.meal, 'meal.meal', ['breakfast', 'lunch', 'dinner', 'snack']);
    str(m.name, 'meal.name', 1, 100);
    num(m.kcal, 'meal.kcal', 0, 5000);
    for (const k of ['protein', 'carbs', 'fat', 'fiber']) num(m[k], `meal.${k}`, 0, 1000);
  },
  REMOVE_MEAL: (a) => void id(a.id),
  TOGGLE_HABIT: (a, { today, state }) => {
    const hid = id(a.habitId, 'habitId');
    if (!state.habits.some((h) => h.id === hid)) throw notFound('Habit not found.');
    dateNotFuture(a.date, 'date', today);
  },
  ADD_HABIT: (a) => {
    const h = obj(a.habit, 'habit', ['title', 'icon', 'category', 'days']);
    str(h.title, 'habit.title', 3, 50);
    str(h.icon, 'habit.icon', 1, 40);
    oneOf(h.category, 'habit.category', ['hydration', 'movement', 'mindfulness', 'nutrition', 'sleep']);
    arr(h.days, 'habit.days', 7).forEach((d, i) => num(d, `habit.days[${i}]`, 0, 6, true));
  },
  DELETE_HABIT: (a) => void id(a.id),
  ADD_GOAL: (a) => {
    const g = obj(a.goal, 'goal', ['title', 'metric', 'target', 'unit', 'period']);
    str(g.title, 'goal.title', 1, 80);
    oneOf(g.metric, 'goal.metric', ['steps', 'workouts', 'water', 'sleep', 'checkins', 'mindful']);
    num(g.target, 'goal.target', 0.1, 100000);
    str(g.unit, 'goal.unit', 1, 20);
    oneOf(g.period, 'goal.period', ['daily', 'weekly']);
  },
  UPDATE_GOAL: (a) => {
    id(a.id);
    const p = obj(a.patch, 'patch', ['title', 'target', 'status']);
    if (p.title !== undefined) str(p.title, 'patch.title', 1, 80);
    if (p.target !== undefined) num(p.target, 'patch.target', 0.1, 100000);
    if (p.status !== undefined) oneOf(p.status, 'patch.status', ['active', 'completed', 'paused']);
  },
  DELETE_GOAL: (a) => void id(a.id),
  TOGGLE_PLAN_ITEM: (a) => void id(a.id),
  REGENERATE_PLAN: () => undefined,
  DISMISS_INSIGHT: (a, { today }) => {
    // Insight ids are `r<rule>_<date>`; the date may differ by a day from the server's (time zones).
    const m = /^r\d{1,2}_(\d{4}-\d{2}-\d{2})$/.exec(id(a.id));
    if (!m || m[1] < addDays(today, -1) || m[1] > addDays(today, 1)) throw notFound('Insight not found.');
  },
  TOGGLE_BOOKMARK: (a, { state, articleIds }) => {
    const aid = id(a.articleId, 'articleId');
    // Removing a bookmark is always allowed; adding one needs a published article.
    if (!state.bookmarks.includes(aid) && !articleIds?.has(aid)) throw notFound('Article not found.');
  },
  MARK_ARTICLE_READ: (a, { articleIds }) => {
    if (!articleIds?.has(id(a.articleId, 'articleId'))) throw notFound('Article not found.');
  },
  MARK_NOTIFICATION_READ: (a) => void id(a.id),
  MARK_ALL_NOTIFICATIONS_READ: () => undefined,
  DELETE_NOTIFICATION: (a) => void id(a.id),
  UPDATE_NOTIFICATION_PREFS: (a) => {
    const p = obj(a.prefs, 'prefs', ['types', 'discreet', 'quietHours']);
    const t = obj(p.types, 'prefs.types', NOTIF);
    for (const k of NOTIF) {
      const v = obj(t[k], `prefs.types.${k}`, ['enabled', 'time']);
      bool(v.enabled, `prefs.types.${k}.enabled`);
      clock(v.time, `prefs.types.${k}.time`);
    }
    bool(p.discreet, 'prefs.discreet');
    const q = obj(p.quietHours, 'prefs.quietHours', ['enabled', 'from', 'to']);
    bool(q.enabled, 'prefs.quietHours.enabled');
    clock(q.from, 'prefs.quietHours.from');
    clock(q.to, 'prefs.quietHours.to');
  },
  ADD_REMINDER: (a) => {
    const r = obj(a.reminder, 'reminder', ['title', 'type', 'time', 'date', 'enabled']);
    str(r.title, 'reminder.title', 1, 80);
    oneOf(r.type, 'reminder.type', NOTIF);
    clock(r.time, 'reminder.time');
    if (r.date !== undefined) isoDate(r.date, 'reminder.date');
    bool(r.enabled, 'reminder.enabled');
  },
  TOGGLE_REMINDER: (a) => void id(a.id),
  DELETE_REMINDER: (a) => void id(a.id),
  SET_CONSENT: (a, { state }) => {
    const cid = oneOf(a.id, 'id', CONSENTS);
    const granted = bool(a.granted, 'granted');
    if (!granted && state.consents.find((c) => c.id === cid)?.required) throw badRequest('Required consent can’t be withdrawn here — delete your account instead.');
  },
  TOGGLE_CONNECTION: (a, { state }) => {
    const cid = oneOf(a.id, 'id', CONNECTIONS);
    const c = state.connections.find((x) => x.id === cid);
    if (c && !c.connected) {
      if (c.phase === 3) throw forbidden('This integration isn’t available yet.');
      if (!state.consents.find((x) => x.id === 'health_integrations')?.granted) throw conflict('Turn on the health-integrations consent first.');
    }
  },
  LOG_FERTILITY: (a, { today }) => {
    const l = obj(a.log, 'log', ['date', 'bbtCelsius', 'mucus', 'ovulationTest']);
    dateNotFuture(l.date, 'log.date', today);
    optNum(l.bbtCelsius, 'log.bbtCelsius', 34, 43);
    if (l.mucus !== undefined) oneOf(l.mucus, 'log.mucus', ['dry', 'sticky', 'creamy', 'watery', 'egg_white']);
    if (l.ovulationTest !== undefined) oneOf(l.ovulationTest, 'log.ovulationTest', ['negative', 'positive', 'not_sure']);
  },
  ADD_POST: (a) => {
    oneOf(a.group, 'group', COMMUNITY_GROUPS);
    str(a.text, 'text', 3, 500);
  },
  TOGGLE_LIKE_POST: (a, { state }) => postExists(state, id(a.id)),
  REPORT_POST: (a, { state }) => postExists(state, id(a.id)),
  BLOCK_AUTHOR: (a, { state }) => {
    const author = str(a.author, 'author', 1, 60);
    if (!state.community.posts.some((p) => p.author === author && !p.mine)) throw notFound('Author not found.');
  },
};

/** Validates a client action against the allowlist. Returns it typed for the reducer. */
export function validateUserAction(raw: unknown, ctx: ActionCtx): Action {
  const a = obj(raw, 'action');
  const type = typeof a.type === 'string' ? a.type : '';
  if (BLOCKED.has(type)) throw forbidden(`“${type}” can’t be performed by the app.`);
  const check = CHECKS[type];
  if (!check) throw badRequest(`Unknown action “${type || '(missing)'}”.`);
  check(a, ctx);
  return a as unknown as Action;
}

export const ALLOWED_USER_ACTIONS = Object.keys(CHECKS);
