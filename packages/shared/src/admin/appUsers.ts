/**
 * Web Admin views of app users and their activity (SRS §6.4 "manage users", §53/§54).
 * Overviews and activity carry no health values; health records are a separate Admin-only view
 * (break-glass permission + stated reason, 30 minutes, audited).
 */
import { ACTIVITY_CATEGORY_KEYS, type ActivityCategory, type ActivityEvent } from '../activity';
import { addDays } from '../dates';
import type { AppState } from '../state';
import type { ISODate, Plan, Units } from '../types';
import type { AdminUser } from './data';

export interface UserActivityStats {
  total: number;
  last7: number;
  last30: number;
  activeDays30: number;
  firstAt: string | null;
  lastAt: string | null;
  byCategory: Record<ActivityCategory, number>;
  /** Events created with the synthetic demo history (not done by a person). */
  seedEvents: number;
}

export interface UserNoteView {
  id: string;
  at: string;
  by: string;
  text: string;
}

export interface UserSessionView {
  id: string;
  client: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface UserOverview {
  /** Email masked; reveal is a separate, audited action. */
  user: AdminUser;
  account: {
    emailVerified: boolean;
    onboarded: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    lastActiveAt: string | null;
    /** Seeded list-only record without credentials or app data. */
    synthetic: boolean;
    trialEndsAt: string | null;
    sessions: UserSessionView[];
  };
  /** Account-level profile fields (no date of birth, body measurements, goals or life stage). */
  profile: { name: string; country: string; timezone: string; language: string; units: Units; memberSince: ISODate; plan: Plan } | null;
  stats: UserActivityStats;
  recent: ActivityEvent[];
  notes: UserNoteView[];
  healthAccess: { active: boolean; expiresAt: string | null; reason: string | null };
  hasAppData: boolean;
}

export interface ActivityPage {
  total: number;
  page: number;
  size: number;
  events: ActivityEvent[];
}

export interface ActivityFeedEntry extends ActivityEvent {
  userName: string;
}

export interface ActivitySummary {
  generatedAt: string;
  days: number;
  users: { total: number; new7: number; new30: number; premium: number };
  engagement: { dau: number; wau: number; mau: number; events30: number; checkInsPerUser30: number };
  activation: { registered: number; onboarded: number; firstPeriod: number; firstCheckIn: number };
  retention: { d7: { cohort: number; retained: number } | null; d30: { cohort: number; retained: number } | null; d90: { cohort: number; retained: number } | null };
  monetization: { trialsStarted: number; cancellations: number; premium: number };
  byCategory: Record<ActivityCategory, number>;
  series: { date: ISODate; events: number; activeUsers: number }[];
  topContent: { id: string; title: string; views: number; readers: number }[];
  seedEvents: number;
  totalEvents: number;
  /** Newest events with the user's name — included only for staff who can view users. */
  recent?: ActivityFeedEntry[];
}

export interface ContentEngagementRow {
  id: string;
  title: string;
  views: number;
  opens: number;
  readers: number;
  bookmarkedNow: number;
}

export interface HealthAccessGrant {
  categories: { label: string; count: number }[];
  expiresInSec: number;
  expiresAt: string;
  note?: string;
}

export interface HealthRecordResponse {
  /** The user's records as the app holds them (catalogues removed). */
  record: AppState;
  expiresAt: string;
  reason: string;
}

// ---------- pure calculations shared by the API and the Web Admin's offline demo ----------

const DAY = 86400_000;
const emptyByCategory = () => Object.fromEntries(ACTIVITY_CATEGORY_KEYS.map((k) => [k, 0])) as Record<ActivityCategory, number>;

/** One person's activity numbers (no health values). Events are newest first. */
export function activityStats(events: ActivityEvent[], now = Date.now()): UserActivityStats {
  const within = (ms: number) => events.filter((e) => now - Date.parse(e.at) <= ms);
  const byCategory = emptyByCategory();
  for (const e of within(30 * DAY)) byCategory[e.category] += 1;
  return {
    total: events.length,
    last7: within(7 * DAY).length,
    last30: within(30 * DAY).length,
    // Calendar days: today and the 29 before it.
    activeDays30: new Set(events.map((e) => e.at.slice(0, 10)).filter((d) => d >= new Date(now - 29 * DAY).toISOString().slice(0, 10))).size,
    firstAt: events.length ? events[events.length - 1].at : null,
    lastAt: events.length ? events[0].at : null,
    byCategory,
    seedEvents: events.filter((e) => e.source === 'seed').length,
  };
}

export interface SummaryUser {
  id: string;
  createdAt: string;
  onboarded: boolean;
  premium: boolean;
  events: ActivityEvent[];
}

/** Platform KPIs (SRS §54) from recorded activity — aggregates only. */
export function summarizeActivity(users: SummaryUser[], titleOf: (articleId: string) => string, days = 30, today: ISODate, now = Date.now()): ActivitySummary {
  const events = users.flatMap((u) => u.events);
  const inLast = (ms: number) => events.filter((e) => now - Date.parse(e.at) <= ms);
  const uniq = (xs: ActivityEvent[]) => new Set(xs.map((e) => e.userId)).size;
  const usersWith = (event: string) => new Set(events.filter((e) => e.event === event).map((e) => e.userId)).size;
  const created = (ms: number) => users.filter((u) => now - Date.parse(u.createdAt) <= ms).length;

  const series = Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const evs = events.filter((e) => e.at.slice(0, 10) === date);
    return { date, events: evs.length, activeUsers: uniq(evs) };
  });
  const byCategory = emptyByCategory();
  for (const e of inLast(days * DAY)) byCategory[e.category] += 1;

  // Retention: of people who signed up at least N days ago, how many were active N or more days after signing up.
  const retention = (n: number) => {
    const cohort = users.filter((u) => now - Date.parse(u.createdAt) >= n * DAY);
    if (!cohort.length) return null;
    return { cohort: cohort.length, retained: cohort.filter((u) => u.events.some((e) => Date.parse(e.at) - Date.parse(u.createdAt) >= n * DAY)).length };
  };

  const mau = uniq(inLast(30 * DAY));
  const checkIns30 = inLast(30 * DAY).filter((e) => e.event === 'checkin_completed').length;
  const premium = users.filter((u) => u.premium).length;

  const reads = new Map<string, { views: number; readers: Set<string> }>();
  for (const e of inLast(days * DAY)) {
    if ((e.event !== 'content_viewed' && e.event !== 'content_opened') || !e.detail) continue;
    const r = reads.get(e.detail) ?? { views: 0, readers: new Set<string>() };
    r.views += 1;
    r.readers.add(e.userId);
    reads.set(e.detail, r);
  }

  return {
    generatedAt: new Date(now).toISOString(),
    days,
    users: { total: users.length, new7: created(7 * DAY), new30: created(30 * DAY), premium },
    engagement: { dau: uniq(inLast(DAY)), wau: uniq(inLast(7 * DAY)), mau, events30: inLast(30 * DAY).length, checkInsPerUser30: mau ? +(checkIns30 / mau).toFixed(1) : 0 },
    activation: { registered: users.length, onboarded: users.filter((u) => u.onboarded).length, firstPeriod: usersWith('period_logged'), firstCheckIn: usersWith('checkin_completed') },
    retention: { d7: retention(7), d30: retention(30), d90: retention(90) },
    monetization: { trialsStarted: usersWith('subscription_started'), cancellations: usersWith('subscription_cancelled'), premium },
    byCategory,
    series,
    topContent: [...reads.entries()]
      .map(([id, r]) => ({ id, title: titleOf(id), views: r.views, readers: r.readers.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8),
    seedEvents: events.filter((e) => e.source === 'seed').length,
    totalEvents: events.length,
  };
}

/** Reading per article (counts only, no identities). `bookmarked` = how many people have it saved now. */
export function engagementRows(users: { id: string; events: ActivityEvent[]; bookmarks: string[] }[], titleOf: (articleId: string) => string, days = 30, now = Date.now()): ContentEngagementRow[] {
  const rows = new Map<string, { views: number; opens: number; readers: Set<string> }>();
  for (const u of users) {
    for (const e of u.events) {
      if (!e.detail || now - Date.parse(e.at) > days * DAY || (e.event !== 'content_viewed' && e.event !== 'content_opened')) continue;
      const r = rows.get(e.detail) ?? { views: 0, opens: 0, readers: new Set<string>() };
      if (e.event === 'content_viewed') r.views += 1;
      else r.opens += 1;
      r.readers.add(u.id);
      rows.set(e.detail, r);
    }
  }
  const saved = new Map<string, number>();
  for (const u of users) for (const id of u.bookmarks) saved.set(id, (saved.get(id) ?? 0) + 1);
  return [...rows.entries()]
    .map(([id, r]) => ({ id, title: titleOf(id), views: r.views, opens: r.opens, readers: r.readers.size, bookmarkedNow: saved.get(id) ?? 0 }))
    .sort((a, b) => b.views + b.opens - (a.views + a.opens));
}
