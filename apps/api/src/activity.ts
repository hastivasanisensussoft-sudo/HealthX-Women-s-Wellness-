/**
 * App activity (SRS §53/§54) and the Web Admin's views of app users.
 * - What is recorded, and why labels never carry health values: packages/shared/src/activity.ts.
 * - Health records are a separate, Admin-only view behind a reason-stated, 30-minute, audited grant.
 */
import {
  ACCOUNT_EVENTS,
  activityFromHistory,
  ARTICLES,
  todayISO,
  type AccountEvent,
  type ActivityDescriptor,
  type ActivityEvent,
  type ActivitySource,
  type AppState,
  type ManagedConfig,
  type SymptomDef,
} from '@healthx/shared';
import { engagementRows, summarizeActivity, type ActivitySummary } from '@healthx/shared/admin';
import { randomId } from './crypto';
import type { Account, HealthGrant, Session, Store } from './store';

const MAX_EVENTS_PER_USER = 5000;
export const HEALTH_GRANT_MS = 30 * 60_000;

export const sourceOf = (client: Session['client'] | undefined): ActivitySource => (client === 'mobile' ? 'mobile' : client === 'web' ? 'web' : 'server');

export function recordActivity(store: Store, userId: string, x: ActivityDescriptor, source: ActivitySource, at = new Date().toISOString()): ActivityEvent {
  const ev: ActivityEvent = { id: randomId('act'), at, userId, source, ...x };
  const list = store.activity.get(userId) ?? [];
  list.unshift(ev);
  if (list.length > MAX_EVENTS_PER_USER) list.length = MAX_EVENTS_PER_USER;
  store.activity.set(userId, list);
  return ev;
}

/** Account events are recorded for app users only (staff actions go to the audit log). */
export function recordAccountEvent(store: Store, acc: Account, ev: AccountEvent, client?: Session['client'], detail?: string) {
  if (acc.role !== 'end_user') return;
  const x = ACCOUNT_EVENTS[ev];
  recordActivity(store, acc.id, detail ? { ...x, detail } : x, sourceOf(client));
}

/** Seeds the synthetic history of a demo account as `seed` events (clearly labelled in the Web Admin). */
export function seedActivity(store: Store, userId: string, s: AppState) {
  const events = activityFromHistory(s, userId).map((e) => ({ ...e, id: randomId('act') }));
  store.activity.set(userId, events.slice(0, MAX_EVENTS_PER_USER));
}

// ---------- configuration the Web Admin manages for every app user ----------

export function managedConfig(store: Store): ManagedConfig {
  const a = store.admin;
  return {
    disabledRules: a.rules.filter((r) => !r.enabled).map((r) => r.id),
    planLibrary: a.planTemplates.filter((t) => t.status === 'approved'),
  };
}

/** Applies Admin configuration to a user's state: score weights (§31), symptoms added by staff (§14/§15), rules and plan library. */
export function withManagedConfig(store: Store, s: AppState): AppState {
  const extra: SymptomDef[] = store.admin.customSymptoms
    .filter((c) => !s.symptomDefs.some((d) => d.id === c.id || d.label.toLowerCase() === c.label.toLowerCase()))
    .map((c) => ({ id: c.id, label: c.label, category: c.category, icon: 'sparkles' }));
  return {
    ...s,
    weights: { ...store.admin.scoreWeights },
    symptomDefs: extra.length ? [...s.symptomDefs, ...extra] : s.symptomDefs,
    managed: managedConfig(store),
  };
}

// ---------- health-records access (Admin, break-glass permission, reason, 30 minutes) ----------

const grantKey = (staffId: string, userId: string) => `${staffId}:${userId}`;

export function grantHealthAccess(store: Store, staff: Account, userId: string, reason: string): HealthGrant {
  const g: HealthGrant = { staffId: staff.id, userId, reason, grantedAt: new Date().toISOString(), expiresAt: Date.now() + HEALTH_GRANT_MS };
  store.healthGrants.set(grantKey(staff.id, userId), g);
  return g;
}

export function activeGrant(store: Store, staffId: string, userId: string): HealthGrant | null {
  const g = store.healthGrants.get(grantKey(staffId, userId));
  if (!g) return null;
  if (g.expiresAt <= Date.now()) {
    store.healthGrants.delete(grantKey(staffId, userId));
    return null;
  }
  return g;
}

export const endGrant = (store: Store, staffId: string, userId: string) => store.healthGrants.delete(grantKey(staffId, userId));

/** The user's own records as the app holds them, minus the shared catalogues (articles, workouts). */
export function healthRecordOf(s: AppState): AppState {
  return { ...s, articles: [], workouts: [], feed: [] };
}

// ---------- platform KPIs and content engagement (calculations live in @healthx/shared/admin) ----------

const TITLES = new Map(ARTICLES.map((a) => [a.id, a.title]));

export function articleTitle(store: Store, id: string): string {
  return TITLES.get(id) ?? store.admin.content.find((c) => c.id === id)?.title ?? id;
}

/** Real app users (not the seeded list-only rows). */
const liveUsers = (store: Store) => [...store.accounts.values()].filter((a) => a.role === 'end_user' && !a.synthetic && a.status !== 'deleted');

export function activitySummary(store: Store, days = 30, now = Date.now()): ActivitySummary {
  const users = liveUsers(store).map((u) => {
    const st = store.userStates.get(u.id);
    return { id: u.id, createdAt: u.createdAt, onboarded: !!st?.auth.onboarded, premium: st?.profile.plan === 'premium', events: store.activity.get(u.id) ?? [] };
  });
  return summarizeActivity(users, (id) => articleTitle(store, id), days, todayISO(), now);
}

/** Aggregate engagement per article — no user identities (Content Managers see this). */
export function contentEngagement(store: Store, days = 30, now = Date.now()) {
  const users = liveUsers(store).map((u) => ({ id: u.id, events: store.activity.get(u.id) ?? [], bookmarks: store.userStates.get(u.id)?.bookmarks ?? [] }));
  return { days, rows: engagementRows(users, (id) => articleTitle(store, id), days, now) };
}
