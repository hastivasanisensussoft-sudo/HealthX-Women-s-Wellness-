/**
 * Demo application state + pure reducer, shared by web and mobile.
 *
 * FRONTEND-ONLY: every action here mutates local demo state. In production each
 * action becomes an API call to the matching NestJS module (SRS §56); see the
 * `backend` note on each action group.
 */
import { addDays, nowClock, todayISO } from './dates';
import { SYMPTOMS } from './catalog';
import { ARTICLES } from './mock/articles';
import { WORKOUTS } from './mock/workouts';
import { generateHistory } from './mock/generate';
import { seedCommunity } from './mock/community';
import { uid } from './mock/random';
import { buildDailyPlan } from './plan';
import type {
  ActivityFeedItem,
  AppNotification,
  Article,
  Badge,
  CheckIn,
  CommunityPost,
  Consent,
  CycleProfile,
  FertilityLog,
  Flow,
  GoalKey,
  Habit,
  HabitCompletion,
  HealthConnection,
  ISODate,
  LifeStageMode,
  MealLog,
  NotificationPrefs,
  PeriodLog,
  Plan,
  PlanItem,
  Reminder,
  SleepLog,
  SymptomDef,
  SymptomLog,
  UserProfile,
  WaterLog,
  WellnessGoal,
  WellnessWeights,
  Workout,
  WorkoutSession,
  ActivityDay,
} from './types';

export const STATE_VERSION = 4;

export const DEFAULT_WEIGHTS: WellnessWeights = {
  activity: 20,
  sleep: 20,
  hydration: 10,
  nutrition: 20,
  habits: 15,
  mood: 15,
};

export interface AppState {
  version: number;
  /** The demo's notion of "today" — fixed when the state is created/reset. */
  today: ISODate;
  auth: { signedIn: boolean; onboarded: boolean; email?: string; role: 'user' | 'admin' };
  profile: UserProfile;
  cycleProfile: CycleProfile;
  periods: PeriodLog[];
  symptomDefs: SymptomDef[];
  symptomLogs: SymptomLog[];
  checkIns: CheckIn[];
  water: WaterLog[];
  waterTargetMl: number;
  sleep: SleepLog[];
  sleepTargetHours: number;
  activity: ActivityDay[];
  stepTarget: number;
  workouts: Workout[];
  sessions: WorkoutSession[];
  meals: MealLog[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  goals: WellnessGoal[];
  plan: { date: ISODate; items: PlanItem[] };
  dismissedInsights: string[];
  articles: Article[];
  bookmarks: string[];
  readArticles: string[];
  notifications: AppNotification[];
  notificationPrefs: NotificationPrefs;
  reminders: Reminder[];
  consents: Consent[];
  badges: Badge[];
  fertility: FertilityLog[];
  connections: HealthConnection[];
  weights: WellnessWeights;
  feed: ActivityFeedItem[];
  /** Phase 4 community preview (simulated moderation). */
  community: { posts: CommunityPost[]; blocked: string[] };
}

export function createInitialState(today: ISODate = todayISO(), opts: { signedIn?: boolean; onboarded?: boolean } = {}): AppState {
  const h = generateHistory(today);
  const lastPeriod = h.periods[h.periods.length - 1];
  const base: AppState = {
    version: STATE_VERSION,
    today,
    auth: { signedIn: opts.signedIn ?? true, onboarded: opts.onboarded ?? true, email: h.profile.email, role: 'user' },
    profile: h.profile,
    cycleProfile: { lastPeriodStart: lastPeriod.start, typicalCycleLength: 29, typicalPeriodLength: 5, regularity: 'regular' },
    periods: h.periods,
    symptomDefs: [...SYMPTOMS, { id: 'c_migraine', label: 'Migraine', category: 'physical', icon: 'brain', custom: true }],
    symptomLogs: [...h.symptomLogs, { id: 'sl_c_mig', symptomId: 'c_migraine', date: addDays(today, -6), severity: 'moderate' }],
    checkIns: h.checkIns,
    water: h.water,
    waterTargetMl: 2400,
    sleep: h.sleep,
    sleepTargetHours: 7.5,
    activity: h.activity,
    stepTarget: 8000,
    workouts: WORKOUTS,
    sessions: h.sessions,
    meals: h.meals,
    habits: h.habits,
    habitCompletions: h.habitCompletions,
    goals: h.goals,
    plan: { date: today, items: [] },
    dismissedInsights: [],
    articles: ARTICLES,
    bookmarks: ['a_cycle_phases', 'a_sleep_routine'],
    readArticles: ['a_sleep_routine', 'a_period_basics'],
    notifications: h.notifications,
    notificationPrefs: h.notificationPrefs,
    reminders: h.reminders,
    consents: h.consents,
    badges: h.badges,
    fertility: h.fertility,
    connections: h.connections,
    weights: DEFAULT_WEIGHTS,
    feed: h.feed,
    community: { posts: seedCommunity(), blocked: [] },
  };
  base.plan = { date: today, items: buildDailyPlan(base, today) };
  return base;
}

/** A brand-new account (used by the sign-up → onboarding demo flow). */
export function createEmptyState(today: ISODate = todayISO(), email = ''): AppState {
  const s = createInitialState(today, { signedIn: true, onboarded: false });
  return {
    ...s,
    auth: { signedIn: true, onboarded: false, email, role: 'user' },
    profile: { ...s.profile, name: '', email, goals: [], avatar: undefined, memberSince: today, heightCm: undefined, weightKg: undefined },
    cycleProfile: { lastPeriodStart: null, typicalCycleLength: null, typicalPeriodLength: null, regularity: 'not_sure' },
    periods: [],
    symptomDefs: [...SYMPTOMS],
    symptomLogs: [],
    checkIns: [],
    water: [],
    sleep: [],
    activity: [],
    sessions: [],
    meals: [],
    habitCompletions: [],
    goals: [],
    notifications: [],
    badges: s.badges.map((b) => ({ ...b, earnedAt: undefined, progress: 0 })),
    fertility: [],
    feed: [],
    bookmarks: [],
    readArticles: [],
    plan: { date: today, items: [] },
  };
}

export type Action =
  // auth (backend: auth, users)
  | { type: 'SIGN_IN'; email: string }
  | { type: 'SIGN_UP'; email: string; name?: string }
  | { type: 'SIGN_OUT' }
  | { type: 'SET_ROLE'; role: 'user' | 'admin' }
  | {
      type: 'COMPLETE_ONBOARDING';
      name: string;
      dob: ISODate;
      country: string;
      goals: GoalKey[];
      cycle: CycleProfile;
      consents: Record<string, boolean>;
    }
  // profile (backend: profiles)
  | { type: 'UPDATE_PROFILE'; patch: Partial<UserProfile> }
  | { type: 'UPDATE_CYCLE_PROFILE'; patch: Partial<CycleProfile> }
  | { type: 'SET_MODE'; mode: LifeStageMode }
  | { type: 'SET_PLAN'; plan: Plan }
  // cycle & period (backend: cycle, period)
  | { type: 'START_PERIOD'; date: ISODate; flow?: Flow }
  | { type: 'END_PERIOD'; id: string; date: ISODate }
  | { type: 'ADD_PERIOD'; start: ISODate; end: ISODate | null; flow: Flow; notes?: string }
  | { type: 'UPDATE_PERIOD'; id: string; start: ISODate; end: ISODate | null; notes?: string }
  | { type: 'DELETE_PERIOD'; id: string }
  | { type: 'SET_FLOW'; date: ISODate; flow: Flow }
  // symptoms & mood (backend: symptoms, mood)
  | { type: 'LOG_SYMPTOMS'; date: ISODate; entries: { symptomId: string; severity: SymptomLog['severity'] }[]; notes?: string }
  | { type: 'REMOVE_SYMPTOM_LOG'; id: string }
  | { type: 'ADD_CUSTOM_SYMPTOM'; label: string; category: SymptomDef['category']; icon?: string; defaultSeverity?: SymptomDef['defaultSeverity'] }
  | { type: 'ARCHIVE_CUSTOM_SYMPTOM'; id: string }
  | { type: 'SAVE_CHECKIN'; checkIn: CheckIn }
  // hydration, sleep, activity, fitness, nutrition
  | { type: 'ADD_WATER'; ml: number; date?: ISODate }
  | { type: 'REMOVE_WATER'; id: string }
  | { type: 'SET_WATER_TARGET'; ml: number }
  | { type: 'LOG_SLEEP'; log: SleepLog }
  | { type: 'SET_SLEEP_TARGET'; hours: number }
  | { type: 'SET_STEPS'; date: ISODate; steps: number }
  | { type: 'LOG_WORKOUT'; session: Omit<WorkoutSession, 'id'> }
  | { type: 'DELETE_WORKOUT'; id: string }
  | { type: 'ADD_MEAL'; meal: Omit<MealLog, 'id'> }
  | { type: 'REMOVE_MEAL'; id: string }
  // habits, goals, plan (backend: habits, goals, wellness)
  | { type: 'TOGGLE_HABIT'; habitId: string; date: ISODate }
  | { type: 'ADD_HABIT'; habit: Omit<Habit, 'id'> }
  | { type: 'DELETE_HABIT'; id: string }
  | { type: 'ADD_GOAL'; goal: Omit<WellnessGoal, 'id' | 'createdAt' | 'status'> }
  | { type: 'UPDATE_GOAL'; id: string; patch: Partial<WellnessGoal> }
  | { type: 'DELETE_GOAL'; id: string }
  | { type: 'TOGGLE_PLAN_ITEM'; id: string }
  | { type: 'REGENERATE_PLAN' }
  // insights & content
  | { type: 'DISMISS_INSIGHT'; id: string }
  | { type: 'TOGGLE_BOOKMARK'; articleId: string }
  | { type: 'MARK_ARTICLE_READ'; articleId: string }
  // notifications (backend: notifications)
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'DELETE_NOTIFICATION'; id: string }
  | { type: 'UPDATE_NOTIFICATION_PREFS'; prefs: NotificationPrefs }
  | { type: 'ADD_REMINDER'; reminder: Omit<Reminder, 'id'> }
  | { type: 'TOGGLE_REMINDER'; id: string }
  | { type: 'DELETE_REMINDER'; id: string }
  // privacy (backend: consent, users)
  | { type: 'SET_CONSENT'; id: Consent['id']; granted: boolean }
  | { type: 'TOGGLE_CONNECTION'; id: HealthConnection['id'] }
  // fertility (backend: fertility — Phase 3)
  | { type: 'LOG_FERTILITY'; log: FertilityLog }
  // community — Phase 4 preview (backend: community, moderation)
  | { type: 'ADD_POST'; group: string; text: string }
  | { type: 'TOGGLE_LIKE_POST'; id: string }
  | { type: 'REPORT_POST'; id: string }
  | { type: 'BLOCK_AUTHOR'; author: string }
  // admin config (backend: config)
  | { type: 'SET_WEIGHTS'; weights: WellnessWeights }
  | { type: 'RESET_DEMO'; today?: ISODate }
  | { type: 'HYDRATE'; state: AppState };

const feedItem = (kind: ActivityFeedItem['kind'], text: string): ActivityFeedItem => ({
  id: uid('f'),
  at: new Date().toISOString(),
  kind,
  text,
});

const withFeed = (s: AppState, item: ActivityFeedItem): AppState => ({ ...s, feed: [item, ...s.feed].slice(0, 40) });

function upsertBy<T>(list: T[], item: T, same: (a: T) => boolean): T[] {
  const i = list.findIndex(same);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;
    case 'RESET_DEMO':
      return createInitialState(action.today ?? todayISO());

    case 'SIGN_IN':
      return { ...state, auth: { ...state.auth, signedIn: true, email: action.email } };
    case 'SIGN_UP': {
      const fresh = createEmptyState(state.today, action.email);
      return action.name ? { ...fresh, profile: { ...fresh.profile, name: action.name.trim() } } : fresh;
    }
    case 'SIGN_OUT':
      return { ...state, auth: { ...state.auth, signedIn: false } };
    case 'SET_ROLE':
      return { ...state, auth: { ...state.auth, role: action.role } };
    case 'COMPLETE_ONBOARDING': {
      const consents = state.consents.map((c) =>
        c.id in action.consents ? { ...c, granted: c.required || action.consents[c.id], updatedAt: state.today } : c,
      );
      const periods: PeriodLog[] = action.cycle.lastPeriodStart
        ? [
            {
              id: uid('p'),
              start: action.cycle.lastPeriodStart,
              end: addDays(action.cycle.lastPeriodStart, (action.cycle.typicalPeriodLength ?? 5) - 1) <= state.today
                ? addDays(action.cycle.lastPeriodStart, (action.cycle.typicalPeriodLength ?? 5) - 1)
                : null,
              flowByDay: { [action.cycle.lastPeriodStart]: 'medium' },
            },
          ]
        : [];
      const next: AppState = {
        ...state,
        auth: { ...state.auth, onboarded: true },
        profile: { ...state.profile, name: action.name, dob: action.dob, country: action.country, goals: action.goals },
        cycleProfile: action.cycle,
        periods: state.periods.length ? state.periods : periods,
        consents,
      };
      return { ...next, plan: { date: state.today, items: buildDailyPlan(next, state.today) } };
    }

    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case 'UPDATE_CYCLE_PROFILE':
      return { ...state, cycleProfile: { ...state.cycleProfile, ...action.patch } };
    case 'SET_MODE':
      return { ...state, profile: { ...state.profile, mode: action.mode } };
    case 'SET_PLAN':
      return { ...state, profile: { ...state.profile, plan: action.plan } };

    case 'START_PERIOD': {
      const p: PeriodLog = { id: uid('p'), start: action.date, end: null, flowByDay: { [action.date]: action.flow ?? 'medium' } };
      return withFeed({ ...state, periods: [...state.periods, p] }, feedItem('period', 'Started a new period'));
    }
    case 'END_PERIOD':
      return withFeed(
        { ...state, periods: state.periods.map((p) => (p.id === action.id ? { ...p, end: action.date } : p)) },
        feedItem('period', 'Marked period as ended'),
      );
    case 'ADD_PERIOD': {
      const p: PeriodLog = { id: uid('p'), start: action.start, end: action.end, flowByDay: { [action.start]: action.flow }, notes: action.notes };
      return withFeed({ ...state, periods: [...state.periods, p] }, feedItem('period', 'Logged a period'));
    }
    case 'UPDATE_PERIOD':
      return {
        ...state,
        periods: state.periods.map((p) => (p.id === action.id ? { ...p, start: action.start, end: action.end, notes: action.notes } : p)),
      };
    case 'DELETE_PERIOD':
      return withFeed({ ...state, periods: state.periods.filter((p) => p.id !== action.id) }, feedItem('period', 'Deleted a period'));
    case 'SET_FLOW':
      return {
        ...state,
        periods: state.periods.map((p) =>
          action.date >= p.start && (p.end === null || action.date <= p.end) ? { ...p, flowByDay: { ...p.flowByDay, [action.date]: action.flow } } : p,
        ),
      };

    case 'LOG_SYMPTOMS': {
      const keep = state.symptomLogs.filter((l) => !(l.date === action.date && action.entries.some((e) => e.symptomId === l.symptomId)));
      const added = action.entries.map((e) => ({ id: uid('sl'), date: action.date, symptomId: e.symptomId, severity: e.severity, notes: action.notes }));
      return withFeed(
        { ...state, symptomLogs: [...keep, ...added] },
        feedItem('symptom', `Logged ${added.length} symptom${added.length === 1 ? '' : 's'}`),
      );
    }
    case 'REMOVE_SYMPTOM_LOG':
      return { ...state, symptomLogs: state.symptomLogs.filter((l) => l.id !== action.id) };
    case 'ADD_CUSTOM_SYMPTOM':
      return {
        ...state,
        symptomDefs: [
          ...state.symptomDefs,
          { id: uid('c'), label: action.label.trim(), category: action.category, icon: action.icon ?? 'sparkles', custom: true, defaultSeverity: action.defaultSeverity },
        ],
      };
    case 'ADD_POST':
      return {
        ...state,
        community: {
          ...state.community,
          posts: [
            { id: uid('p'), group: action.group, author: state.profile.name || 'You', initials: (state.profile.name || 'You').slice(0, 2).toUpperCase(), at: new Date().toISOString(), text: action.text.trim(), likes: 0, comments: 0, mine: true },
            ...state.community.posts,
          ],
        },
      };
    case 'TOGGLE_LIKE_POST':
      return {
        ...state,
        community: {
          ...state.community,
          posts: state.community.posts.map((p) => (p.id === action.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)),
        },
      };
    case 'REPORT_POST':
      return { ...state, community: { ...state.community, posts: state.community.posts.map((p) => (p.id === action.id ? { ...p, reported: true } : p)) } };
    case 'BLOCK_AUTHOR':
      return { ...state, community: { ...state.community, blocked: [...new Set([...state.community.blocked, action.author])] } };
    case 'ARCHIVE_CUSTOM_SYMPTOM':
      return { ...state, symptomDefs: state.symptomDefs.filter((s) => !(s.custom && s.id === action.id)) };
    case 'SAVE_CHECKIN': {
      const next = withFeed(
        { ...state, checkIns: upsertBy(state.checkIns, action.checkIn, (c) => c.date === action.checkIn.date) },
        feedItem('checkin', 'Completed daily check-in'),
      );
      return action.checkIn.date === state.today ? { ...next, plan: { date: state.today, items: mergePlan(state.plan.items, buildDailyPlan(next, state.today)) } } : next;
    }

    case 'ADD_WATER': {
      const log: WaterLog = { id: uid('w'), date: action.date ?? state.today, time: nowClock(), ml: action.ml };
      return withFeed({ ...state, water: [...state.water, log] }, feedItem('water', `Logged ${action.ml} ml of water`));
    }
    case 'REMOVE_WATER':
      return { ...state, water: state.water.filter((w) => w.id !== action.id) };
    case 'SET_WATER_TARGET':
      return { ...state, waterTargetMl: action.ml };
    case 'LOG_SLEEP':
      return withFeed(
        { ...state, sleep: upsertBy(state.sleep, action.log, (l) => l.date === action.log.date) },
        feedItem('sleep', `Logged ${Math.floor(action.log.durationMin / 60)}h ${action.log.durationMin % 60}m of sleep`),
      );
    case 'SET_SLEEP_TARGET':
      return { ...state, sleepTargetHours: action.hours };
    case 'SET_STEPS': {
      const prev = state.activity.find((a) => a.date === action.date);
      const day: ActivityDay = { date: action.date, steps: action.steps, activeMin: prev?.activeMin ?? 0, source: 'manual' };
      return { ...state, activity: upsertBy(state.activity, day, (a) => a.date === action.date) };
    }
    case 'LOG_WORKOUT':
      return withFeed(
        { ...state, sessions: [...state.sessions, { ...action.session, id: uid('s') }] },
        feedItem('workout', `${action.session.status === 'completed' ? 'Completed' : 'Logged'} ${action.session.title} · ${action.session.durationMin} min`),
      );
    case 'DELETE_WORKOUT':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };
    case 'ADD_MEAL':
      return withFeed({ ...state, meals: [...state.meals, { ...action.meal, id: uid('m') }] }, feedItem('meal', `Logged ${action.meal.meal} · ${action.meal.name}`));
    case 'REMOVE_MEAL':
      return { ...state, meals: state.meals.filter((m) => m.id !== action.id) };

    case 'TOGGLE_HABIT': {
      const exists = state.habitCompletions.some((c) => c.habitId === action.habitId && c.date === action.date);
      const habitCompletions = exists
        ? state.habitCompletions.filter((c) => !(c.habitId === action.habitId && c.date === action.date))
        : [...state.habitCompletions, { habitId: action.habitId, date: action.date }];
      const habit = state.habits.find((h) => h.id === action.habitId);
      const next = { ...state, habitCompletions };
      return exists || !habit ? next : withFeed(next, feedItem('habit', `Completed “${habit.title}”`));
    }
    case 'ADD_HABIT':
      return { ...state, habits: [...state.habits, { ...action.habit, id: uid('h') }] };
    case 'DELETE_HABIT':
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.id),
        habitCompletions: state.habitCompletions.filter((c) => c.habitId !== action.id),
      };
    case 'ADD_GOAL':
      return withFeed(
        { ...state, goals: [...state.goals, { ...action.goal, id: uid('g'), createdAt: state.today, status: 'active' }] },
        feedItem('goal', `Created goal “${action.goal.title}”`),
      );
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'TOGGLE_PLAN_ITEM':
      return { ...state, plan: { ...state.plan, items: state.plan.items.map((i) => (i.id === action.id ? { ...i, done: !i.done } : i)) } };
    case 'REGENERATE_PLAN':
      return { ...state, plan: { date: state.today, items: buildDailyPlan(state, state.today) } };

    case 'DISMISS_INSIGHT':
      // Ids are per day, so only recent dismissals matter; keep the list small.
      return state.dismissedInsights.includes(action.id) ? state : { ...state, dismissedInsights: [...state.dismissedInsights, action.id].slice(-200) };
    case 'TOGGLE_BOOKMARK':
      return {
        ...state,
        bookmarks: state.bookmarks.includes(action.articleId)
          ? state.bookmarks.filter((b) => b !== action.articleId)
          : [...state.bookmarks, action.articleId],
      };
    case 'MARK_ARTICLE_READ':
      return state.readArticles.includes(action.articleId) ? state : { ...state, readArticles: [...state.readArticles, action.articleId] };

    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)) };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case 'DELETE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) };
    case 'UPDATE_NOTIFICATION_PREFS':
      return { ...state, notificationPrefs: action.prefs };
    case 'ADD_REMINDER':
      return { ...state, reminders: [...state.reminders, { ...action.reminder, id: uid('r') }] };
    case 'TOGGLE_REMINDER':
      return { ...state, reminders: state.reminders.map((r) => (r.id === action.id ? { ...r, enabled: !r.enabled } : r)) };
    case 'DELETE_REMINDER':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.id) };

    case 'SET_CONSENT': {
      const consents = state.consents.map((c) => (c.id === action.id && !c.required ? { ...c, granted: action.granted, updatedAt: state.today } : c));
      // Withdrawing the integrations consent takes effect immediately: every health source is disconnected (SRS §42, §68).
      const revoked = action.id === 'health_integrations' && !action.granted;
      return { ...state, consents, connections: revoked ? state.connections.map((c) => (c.connected ? { ...c, connected: false, lastSync: undefined } : c)) : state.connections };
    }
    case 'TOGGLE_CONNECTION':
      return {
        ...state,
        connections: state.connections.map((c) =>
          c.id === action.id ? { ...c, connected: !c.connected, lastSync: !c.connected ? new Date().toISOString() : undefined } : c,
        ),
      };
    case 'LOG_FERTILITY':
      return { ...state, fertility: upsertBy(state.fertility, action.log, (l) => l.date === action.log.date) };
    case 'SET_WEIGHTS':
      return { ...state, weights: action.weights };
    default:
      return state;
  }
}

/** Keeps "done" flags for items that survive a plan rebuild. */
function mergePlan(prev: PlanItem[], next: PlanItem[]): PlanItem[] {
  return next.map((n) => ({ ...n, done: prev.find((p) => p.id === n.id)?.done ?? n.done }));
}
