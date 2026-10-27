/**
 * App activity (SRS §53 analytics events, §54 KPIs). The API records an event for every account
 * action (sign-up, sign-in, password reset…) and every write the mobile app makes; app-usage events
 * (app opened, screens viewed, videos played…) only when the user allows analytics (§42).
 *
 * Labels and details never contain health values (no flow, symptom, mood score or life stage):
 * staff see THAT something was logged and when. The values themselves stay in the user's records,
 * which only an Admin with health-records access can open, with a reason, for 30 minutes (audited).
 */
import type { Action, AppState } from './state';
import { addDays } from './dates';
import type { ISODate } from './types';

export type ActivityCategory =
  | 'account'
  | 'onboarding'
  | 'profile'
  | 'cycle'
  | 'symptoms'
  | 'mood'
  | 'fertility'
  | 'life_stage'
  | 'fitness'
  | 'nutrition'
  | 'hydration'
  | 'sleep'
  | 'habits'
  | 'goals'
  | 'plan'
  | 'insights'
  | 'content'
  | 'coach'
  | 'notifications'
  | 'privacy'
  | 'integrations'
  | 'subscription'
  | 'community'
  | 'app';

/** `health` = the category's records are health data (shown only with health-records access). */
export const ACTIVITY_CATEGORIES: Record<ActivityCategory, { label: string; health: boolean }> = {
  account: { label: 'Account & sign-in', health: false },
  onboarding: { label: 'Onboarding', health: false },
  profile: { label: 'Profile', health: false },
  cycle: { label: 'Cycle & period', health: true },
  symptoms: { label: 'Symptoms', health: true },
  mood: { label: 'Mood & check-ins', health: true },
  fertility: { label: 'Fertility awareness', health: true },
  life_stage: { label: 'Life stages', health: true },
  fitness: { label: 'Fitness & steps', health: true },
  nutrition: { label: 'Nutrition', health: true },
  hydration: { label: 'Hydration', health: true },
  sleep: { label: 'Sleep', health: true },
  habits: { label: 'Habits', health: false },
  goals: { label: 'Goals', health: false },
  plan: { label: 'Daily plan', health: false },
  insights: { label: 'Insights', health: false },
  content: { label: 'Learn & content', health: false },
  coach: { label: 'AI coach', health: false },
  notifications: { label: 'Notifications & reminders', health: false },
  privacy: { label: 'Privacy & consent', health: false },
  integrations: { label: 'Health integrations', health: false },
  subscription: { label: 'Subscription', health: false },
  community: { label: 'Community', health: false },
  app: { label: 'App usage', health: false },
};
export const ACTIVITY_CATEGORY_KEYS = Object.keys(ACTIVITY_CATEGORIES) as ActivityCategory[];

/** `seed` = synthetic history created with the demo accounts (not something a person did). */
export type ActivitySource = 'mobile' | 'web' | 'server' | 'seed';

export interface ActivityEvent {
  id: string;
  at: string;
  userId: string;
  /** Event name — SRS §53 names where the SRS defines one (period_logged, water_logged…). */
  event: string;
  category: ActivityCategory;
  /** Plain-language label without health values. */
  label: string;
  source: ActivitySource;
  /** Optional non-health detail: sign-in method, screen route, article id, consent name… */
  detail?: string;
}

export interface ActivityDescriptor {
  event: string;
  category: ActivityCategory;
  label: string;
  detail?: string;
}

const d = (event: string, category: ActivityCategory, label: string, detail?: string): ActivityDescriptor => (detail ? { event, category, label, detail } : { event, category, label });

/** The activity a data write from the app represents (null for local-only actions). */
export function activityForAction(a: Action): ActivityDescriptor | null {
  switch (a.type) {
    case 'COMPLETE_ONBOARDING':
      return d('onboarding_completed', 'onboarding', 'Completed onboarding');
    case 'UPDATE_PROFILE':
      return d('profile_updated', 'profile', 'Updated profile details');
    case 'UPDATE_CYCLE_PROFILE':
      return d('cycle_profile_updated', 'cycle', 'Updated cycle profile');
    case 'SET_MODE':
      return d('life_stage_changed', 'life_stage', 'Changed life-stage mode');
    case 'START_PERIOD':
    case 'ADD_PERIOD':
      return d('period_logged', 'cycle', 'Logged a period');
    case 'END_PERIOD':
      return d('period_ended', 'cycle', 'Marked a period as ended');
    case 'UPDATE_PERIOD':
      return d('period_edited', 'cycle', 'Edited a period');
    case 'DELETE_PERIOD':
      return d('period_deleted', 'cycle', 'Deleted a period');
    case 'SET_FLOW':
      return d('flow_logged', 'cycle', 'Logged period flow');
    case 'LOG_SYMPTOMS':
      return d('symptom_logged', 'symptoms', 'Logged symptoms');
    case 'REMOVE_SYMPTOM_LOG':
      return d('symptom_removed', 'symptoms', 'Removed a symptom entry');
    case 'ADD_CUSTOM_SYMPTOM':
      return d('custom_symptom_created', 'symptoms', 'Created a custom symptom');
    case 'ARCHIVE_CUSTOM_SYMPTOM':
      return d('custom_symptom_archived', 'symptoms', 'Archived a custom symptom');
    case 'SAVE_CHECKIN':
      return d('checkin_completed', 'mood', 'Completed a daily check-in');
    case 'ADD_WATER':
      return d('water_logged', 'hydration', 'Logged water');
    case 'REMOVE_WATER':
      return d('water_removed', 'hydration', 'Removed a water entry');
    case 'SET_WATER_TARGET':
      return d('water_target_changed', 'hydration', 'Changed hydration goal');
    case 'LOG_SLEEP':
      return d('sleep_logged', 'sleep', 'Logged sleep');
    case 'SET_SLEEP_TARGET':
      return d('sleep_target_changed', 'sleep', 'Changed sleep goal');
    case 'SET_STEPS':
      return d('steps_logged', 'fitness', 'Logged steps');
    case 'LOG_WORKOUT':
      return d('workout_completed', 'fitness', 'Logged a workout');
    case 'DELETE_WORKOUT':
      return d('workout_deleted', 'fitness', 'Deleted a workout');
    case 'ADD_MEAL':
      return d('meal_logged', 'nutrition', 'Logged a meal');
    case 'REMOVE_MEAL':
      return d('meal_removed', 'nutrition', 'Removed a meal');
    case 'TOGGLE_HABIT':
      return d('habit_toggled', 'habits', 'Checked off a habit');
    case 'ADD_HABIT':
      return d('habit_created', 'habits', 'Created a habit');
    case 'DELETE_HABIT':
      return d('habit_deleted', 'habits', 'Deleted a habit');
    case 'ADD_GOAL':
      return d('goal_created', 'goals', 'Created a wellness goal');
    case 'UPDATE_GOAL':
      return a.patch.status === 'completed' ? d('goal_completed', 'goals', 'Completed a wellness goal') : d('goal_updated', 'goals', 'Updated a wellness goal');
    case 'DELETE_GOAL':
      return d('goal_deleted', 'goals', 'Deleted a wellness goal');
    case 'TOGGLE_PLAN_ITEM':
      return d('plan_item_toggled', 'plan', 'Ticked a daily-plan item', a.id);
    case 'REGENERATE_PLAN':
      return d('plan_generated', 'plan', 'Created today’s plan');
    case 'DISMISS_INSIGHT':
      return d('insight_dismissed', 'insights', 'Dismissed an insight');
    case 'TOGGLE_BOOKMARK':
      return d('content_bookmarked', 'content', 'Bookmarked or un-bookmarked an article', a.articleId);
    case 'MARK_ARTICLE_READ':
      return d('content_viewed', 'content', 'Read an article', a.articleId);
    case 'MARK_NOTIFICATION_READ':
      return d('notification_read', 'notifications', 'Read a notification');
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return d('notifications_read_all', 'notifications', 'Marked all notifications read');
    case 'DELETE_NOTIFICATION':
      return d('notification_deleted', 'notifications', 'Deleted a notification');
    case 'UPDATE_NOTIFICATION_PREFS':
      return d('notification_prefs_changed', 'notifications', 'Changed notification settings');
    case 'ADD_REMINDER':
      return d('reminder_created', 'notifications', 'Created a reminder');
    case 'TOGGLE_REMINDER':
      return d('reminder_toggled', 'notifications', 'Turned a reminder on or off');
    case 'DELETE_REMINDER':
      return d('reminder_deleted', 'notifications', 'Deleted a reminder');
    case 'SET_CONSENT':
      return a.granted ? d('consent_granted', 'privacy', 'Gave optional consent', a.id) : d('consent_withdrawn', 'privacy', 'Withdrew optional consent', a.id);
    case 'TOGGLE_CONNECTION':
      return d('integration_toggled', 'integrations', 'Connected or disconnected a health integration', a.id);
    case 'LOG_FERTILITY':
      return d('fertility_logged', 'fertility', 'Logged fertility-awareness observations');
    case 'ADD_POST':
      return d('community_post_created', 'community', 'Posted in a community group');
    case 'TOGGLE_LIKE_POST':
      return d('community_post_liked', 'community', 'Liked or unliked a post');
    case 'REPORT_POST':
      return d('community_post_reported', 'community', 'Reported a post');
    case 'BLOCK_AUTHOR':
      return d('community_author_blocked', 'community', 'Blocked a community member');
    default:
      return null;
  }
}

/** App-usage events the app may send (POST /v1/me/events). Recorded only with analytics consent. */
export const USAGE_EVENTS = {
  app_opened: d('app_opened', 'app', 'Opened the app'),
  screen_viewed: d('screen_viewed', 'app', 'Viewed a screen'),
  content_opened: d('content_opened', 'content', 'Opened an article'),
  video_played: d('video_played', 'content', 'Played a video'),
  workout_started: d('workout_started', 'fitness', 'Started a guided workout'),
  ai_question_asked: d('ai_question_asked', 'coach', 'Asked the AI coach a question'),
  weekly_report_viewed: d('weekly_report_viewed', 'insights', 'Viewed the weekly report'),
  search_used: d('search_used', 'app', 'Searched in the app'),
} as const;
export type UsageEvent = keyof typeof USAGE_EVENTS;
export const isUsageEvent = (v: unknown): v is UsageEvent => typeof v === 'string' && Object.prototype.hasOwnProperty.call(USAGE_EVENTS, v);

/** Server-side account events (sign-up, sign-in…). */
export const ACCOUNT_EVENTS = {
  user_registered: d('user_registered', 'account', 'Created an account'),
  user_logged_in: d('user_logged_in', 'account', 'Signed in'),
  user_logged_out: d('user_logged_out', 'account', 'Signed out'),
  logged_out_everywhere: d('logged_out_everywhere', 'account', 'Signed out on all devices'),
  session_revoked: d('session_revoked', 'account', 'Signed out another device'),
  email_verified: d('email_verified', 'account', 'Confirmed email address'),
  password_changed: d('password_changed', 'account', 'Changed password'),
  password_reset_requested: d('password_reset_requested', 'account', 'Asked for a password-reset link'),
  password_reset_completed: d('password_reset_completed', 'account', 'Reset password'),
  magic_link_requested: d('magic_link_requested', 'account', 'Asked for a magic sign-in link'),
  subscription_started: d('subscription_started', 'subscription', 'Started the Premium free trial'),
  subscription_cancelled: d('subscription_cancelled', 'subscription', 'Cancelled Premium'),
  data_exported: d('data_exported', 'privacy', 'Exported their data'),
  sample_data_loaded: d('sample_data_loaded', 'privacy', 'Loaded sample data'),
  data_cleared: d('data_cleared', 'privacy', 'Cleared their logged data'),
} as const;
export type AccountEvent = keyof typeof ACCOUNT_EVENTS;

const at = (date: ISODate, hhmm: string) => `${date}T${hhmm}:00.000Z`;

/**
 * Activity implied by a state's existing history (the synthetic seed accounts). Used once, when demo
 * accounts are created, so the Web Admin isn't empty on a fresh start; every event is marked `seed`.
 */
export function activityFromHistory(s: AppState, userId: string, days = 60, now = Date.now()): Omit<ActivityEvent, 'id'>[] {
  const from = addDays(s.today, -days);
  const out: Omit<ActivityEvent, 'id'>[] = [];
  // Nothing later than "now": a seeded 18:05 workout must not appear before the clock gets there.
  const push = (date: ISODate, hhmm: string, x: ActivityDescriptor) => {
    if (date >= from && date <= s.today && Date.parse(at(date, hhmm)) <= now) out.push({ at: at(date, hhmm), userId, source: 'seed', ...x });
  };
  const since = s.profile.memberSince >= from ? s.profile.memberSince : from;
  push(since, '07:58', ACCOUNT_EVENTS.user_registered);
  push(since, '08:04', d('onboarding_completed', 'onboarding', 'Completed onboarding'));
  for (const p of s.periods) push(p.start, '08:10', d('period_logged', 'cycle', 'Logged a period'));
  for (const date of new Set(s.symptomLogs.map((l) => l.date))) push(date, '08:20', d('symptom_logged', 'symptoms', 'Logged symptoms'));
  for (const c of s.checkIns) push(c.date, '08:30', d('checkin_completed', 'mood', 'Completed a daily check-in'));
  for (const date of new Set(s.water.map((w) => w.date))) push(date, '12:15', d('water_logged', 'hydration', 'Logged water'));
  for (const l of s.sleep) push(l.date, '07:40', d('sleep_logged', 'sleep', 'Logged sleep'));
  for (const w of s.sessions) push(w.date, '18:05', d('workout_completed', 'fitness', 'Logged a workout'));
  for (const date of new Set(s.meals.map((m) => m.date))) push(date, '13:10', d('meal_logged', 'nutrition', 'Logged a meal'));
  for (const f of s.fertility) push(f.date, '07:50', d('fertility_logged', 'fertility', 'Logged fertility-awareness observations'));
  for (const id of s.readArticles) push(addDays(s.today, -3), '21:00', d('content_viewed', 'content', 'Read an article', id));
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
