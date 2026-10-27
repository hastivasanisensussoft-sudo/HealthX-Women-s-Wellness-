/**
 * App users' activity for the Web Admin (SRS §53/§54): per-user overview and timeline, the cross-user
 * feed, platform KPIs and content engagement.
 * - API mode: from the HealthX API, which records what people do in the mobile app (role-checked there).
 * - Offline demo: simulated from the synthetic demo history, clearly labelled as such.
 */
import { useCallback, useEffect, useState } from 'react';
import { activityFromHistory, ARTICLES, createInitialState, todayISO, type ActivityEvent, type AppState } from '@healthx/shared';
import {
  activityStats,
  engagementRows,
  summarizeActivity,
  type ActivityFeedEntry,
  type ActivitySummary,
  type AdminUser,
  type ContentEngagementRow,
  type UserOverview,
} from '@healthx/shared/admin';
import { adminApi, ApiError } from '@/lib/api';
import { useAdmin } from './adminState';

export interface Loaded<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Couldn’t load this. Please try again.');

/** Loads `fetcher` in API mode, or computes `demo` offline. */
function useLoad<T>(key: string, fetcher: () => Promise<T>, demo: () => T): Loaded<T> {
  const { apiMode } = useAdmin();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    const run = apiMode ? fetcher() : new Promise<T>((resolve) => setTimeout(() => resolve(demo()), 250));
    run
      .then((d) => live && setData(d))
      .catch((e) => live && setError(message(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // `key` captures the inputs of fetcher/demo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMode, key, tick]);
  return { data, error, loading, reload };
}

const TITLES = new Map(ARTICLES.map((a) => [a.id, a.title]));
export const articleTitle = (id: string) => TITLES.get(id) ?? id;

// ---------- offline demo: synthetic records and activity for the seeded list users ----------

const demoCache = new Map<string, { record: AppState; events: ActivityEvent[] }>();

/** A synthetic record set for a seeded demo user (offline demo only — never a real person's data). */
export function demoDataFor(u: AdminUser) {
  let hit = demoCache.get(u.id);
  if (!hit) {
    const s = createInitialState(todayISO());
    const record: AppState = { ...s, profile: { ...s.profile, id: u.id, name: u.name, email: u.email, country: u.country, plan: u.plan } };
    const events = u.status === 'deleted' ? [] : activityFromHistory(record, u.id).map((e, i) => ({ ...e, id: `demo_${u.id}_${i}` }));
    hit = { record, events };
    demoCache.set(u.id, hit);
  }
  return hit;
}

function demoOverview(u: AdminUser): UserOverview {
  const { record, events } = demoDataFor(u);
  return {
    user: u,
    account: { emailVerified: true, onboarded: true, createdAt: `${u.signupDate}T09:00:00.000Z`, lastLoginAt: u.lastActive, lastActiveAt: u.lastActive, synthetic: true, trialEndsAt: null, sessions: [] },
    profile: { name: u.name, country: u.country, timezone: record.profile.timezone, language: record.profile.language, units: record.profile.units, memberSince: u.signupDate, plan: u.plan },
    stats: activityStats(events),
    recent: events.slice(0, 25),
    notes: [],
    healthAccess: { active: false, expiresAt: null, reason: null },
    hasAppData: u.status !== 'deleted',
  };
}

const demoUsers = (users: AdminUser[]) => users.filter((u) => u.status !== 'deleted').slice(0, 12);

// ---------- hooks ----------

export function useUserOverview(user: AdminUser | undefined, id: string) {
  return useLoad<UserOverview>(
    `overview:${id}`,
    async () => (await adminApi.userOverview(id)).overview,
    () => {
      if (!user) throw new Error('User not found.');
      return demoOverview(user);
    },
  );
}

export function useUserActivity(user: AdminUser | undefined, id: string, page: number, category: string) {
  const size = 25;
  return useLoad(
    `activity:${id}:${page}:${category}`,
    () => adminApi.userActivity(id, { page, size, category: category || undefined }),
    () => {
      const all = user ? demoDataFor(user).events.filter((e) => (category ? e.category === category : e.category !== 'app')) : [];
      return { total: all.length, page, size, events: all.slice((page - 1) * size, page * size) };
    },
  );
}

export function useActivityFeed(users: AdminUser[], opts: { limit?: number; category?: string } = {}) {
  return useLoad<ActivityFeedEntry[]>(
    `feed:${opts.limit ?? 50}:${opts.category ?? ''}:${users.length}`,
    async () => (await adminApi.activityFeed({ limit: opts.limit, category: opts.category || undefined })).events,
    () =>
      demoUsers(users)
        .flatMap((u) => demoDataFor(u).events.map((e) => ({ ...e, userName: u.name })))
        .filter((e) => (opts.category ? e.category === opts.category : e.category !== 'app'))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, opts.limit ?? 50),
  );
}

export function useActivitySummary(users: AdminUser[], days = 30) {
  return useLoad<ActivitySummary>(
    `summary:${days}:${users.length}`,
    async () => (await adminApi.activitySummary(days)).summary,
    () => {
      const list = demoUsers(users);
      const summary = summarizeActivity(
        list.map((u) => ({ id: u.id, createdAt: `${u.signupDate}T09:00:00.000Z`, onboarded: true, premium: u.plan === 'premium', events: demoDataFor(u).events })),
        articleTitle,
        days,
        todayISO(),
      );
      summary.recent = list
        .flatMap((u) => demoDataFor(u).events.slice(0, 6).map((e) => ({ ...e, userName: u.name })))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 12);
      return summary;
    },
  );
}

export function useContentEngagement(users: AdminUser[], days = 30) {
  return useLoad<ContentEngagementRow[]>(
    `engagement:${days}:${users.length}`,
    async () => (await adminApi.contentEngagement(days)).rows,
    () => engagementRows(demoUsers(users).map((u) => ({ id: u.id, events: demoDataFor(u).events, bookmarks: demoDataFor(u).record.bookmarks })), articleTitle, days),
  );
}
