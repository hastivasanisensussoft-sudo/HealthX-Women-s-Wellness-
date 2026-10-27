/** /v1/admin/* — Web Admin. Every route requires an MFA-verified staff session + server-side capabilities. */
import { ACTIVITY_CATEGORY_KEYS, type ActivityCategory } from '@healthx/shared';
import { activityStats, type ActivityFeedEntry, type ActivitySummary, type UserOverview } from '@healthx/shared/admin';
import { adminUserRow } from '../accounts';
import { activeGrant, activitySummary, contentEngagement, endGrant, grantHealthAccess, healthRecordOf, withManagedConfig } from '../activity';
import { auditBy, has, requireStaff, type Deps } from '../auth';
import { applyAdminAction } from '../adminPolicy';
import { randomId } from '../crypto';
import { badRequest, conflict, forbidden, notFound, tooMany, type Ctx, type Router } from '../http';
import { projectAdminState } from '../projection';
import { obj, str } from '../validate';

const MAX_NOTES = 200;

export function adminRoutes(r: Router, deps: Deps) {
  const { store, config } = deps;

  const appUser = (id: string) => {
    const acc = store.accounts.get(id);
    if (!acc || acc.role !== 'end_user') throw notFound('User not found.');
    return acc;
  };
  const intParam = (ctx: Ctx, name: string, def: number, min: number, max: number) => {
    const raw = ctx.query.get(name);
    const n = raw === null ? def : Number(raw);
    if (!Number.isInteger(n)) throw badRequest(`${name} must be a whole number.`);
    return Math.min(max, Math.max(min, n));
  };
  const categoryParam = (ctx: Ctx): ActivityCategory | null => {
    const c = ctx.query.get('category');
    if (!c) return null;
    if (!(ACTIVITY_CATEGORY_KEYS as string[]).includes(c)) throw badRequest('Unknown activity category.');
    return c as ActivityCategory;
  };
  const userName = (id: string) => store.accounts.get(id)?.name ?? 'Unknown user';

  r.get('/v1/admin/state', (ctx) => {
    const a = requireStaff(ctx, deps);
    return { body: { state: projectAdminState(store, a) } };
  });

  r.post('/v1/admin/actions', (ctx) => {
    const a = requireStaff(ctx, deps);
    // Per-account write budget (the audit log is never truncated, so writes are what bound its growth).
    const wait = store.rate.hit(`admin-write:${a.account.id}`, config.rate.adminWritesPerWindow, config.rate.windowMs);
    if (wait) throw tooMany(wait);
    const b = obj(ctx.body, 'body', ['action']);
    const origin = ctx.origin && config.allowedOrigins.includes(ctx.origin) ? ctx.origin : config.allowedOrigins[0];
    const note = applyAdminAction(store, a, b.action, origin);
    if (note) auditBy(deps, a.account, note, ctx.ip);
    return { body: { state: projectAdminState(store, a) } };
  });

  /** Full email for one account — needed for some support cases, so it is audited. */
  r.post('/v1/admin/users/:id/reveal-email', (ctx) => {
    const a = requireStaff(ctx, deps, 'view_users');
    const acc = store.accounts.get(ctx.params.id);
    if (!acc || acc.role !== 'end_user') throw notFound('User not found.');
    auditBy(deps, a.account, { action: 'user.email_revealed', target: acc.id }, ctx.ip);
    return { body: { email: adminUserRow(store, acc, { maskEmail: false }).email } };
  });

  // ---------- app users: overview, activity timeline, internal notes (no health values) ----------

  r.get('/v1/admin/users/:id/overview', (ctx) => {
    const a = requireStaff(ctx, deps, 'view_users');
    const acc = appUser(ctx.params.id);
    // Opening a person's activity is logged — at most once per staff member and user every 10 minutes.
    if (!store.rate.hit(`activity-view:${a.account.id}:${acc.id}`, 1, 10 * 60_000)) auditBy(deps, a.account, { action: 'user.activity_viewed', target: acc.id }, ctx.ip);
    const s = store.userStates.get(acc.id);
    const events = store.activity.get(acc.id) ?? [];
    const grant = has(a, 'break_glass') ? activeGrant(store, a.account.id, acc.id) : null;
    const overview: UserOverview = {
      user: adminUserRow(store, acc, { maskEmail: true }),
      account: {
        emailVerified: acc.emailVerified,
        onboarded: !!s?.auth.onboarded,
        createdAt: acc.createdAt,
        lastLoginAt: acc.lastLoginAt,
        lastActiveAt: acc.lastActiveAt,
        synthetic: acc.synthetic,
        trialEndsAt: acc.trialEndsAt,
        sessions: store.activeSessions(acc.id).map((x) => ({
          id: x.id,
          client: x.client === 'mobile' ? 'Mobile app' : x.client === 'web' ? 'Web' : 'API',
          device: x.userAgent.split(' ')[0]?.slice(0, 40) || 'Unknown device',
          createdAt: x.createdAt,
          lastSeenAt: x.lastSeenAt,
        })),
      },
      profile: s
        ? { name: s.profile.name || acc.name, country: s.profile.country, timezone: s.profile.timezone, language: s.profile.language, units: s.profile.units, memberSince: s.profile.memberSince, plan: s.profile.plan }
        : null,
      stats: activityStats(events),
      recent: events.filter((e) => e.category !== 'app').slice(0, 25),
      notes: has(a, 'manage_support') ? (store.userNotes.get(acc.id) ?? []).map(({ id, at, by, text }) => ({ id, at, by, text })) : [],
      healthAccess: { active: !!grant, expiresAt: grant ? new Date(grant.expiresAt).toISOString() : null, reason: grant?.reason ?? null },
      hasAppData: !!s,
    };
    return { body: { overview } };
  });

  r.get('/v1/admin/users/:id/activity', (ctx) => {
    requireStaff(ctx, deps, 'view_users');
    const acc = appUser(ctx.params.id);
    const page = intParam(ctx, 'page', 1, 1, 100_000);
    const size = intParam(ctx, 'size', 50, 1, 200);
    const cat = categoryParam(ctx);
    // Without a module filter, screen views and app opens are left out (choose “App usage” to see them).
    const all = (store.activity.get(acc.id) ?? []).filter((e) => (cat ? e.category === cat : e.category !== 'app'));
    return { body: { total: all.length, page, size, events: all.slice((page - 1) * size, page * size) } };
  });

  /** Internal notes on a user's account (support context). Admins only; the user's app never shows them. */
  r.post('/v1/admin/users/:id/notes', (ctx) => {
    const a = requireStaff(ctx, deps, 'manage_support');
    const acc = appUser(ctx.params.id);
    if (acc.status === 'deleted') throw conflict('This account was deleted.');
    const text = str(obj(ctx.body, 'body', ['text']).text, 'text', 1, 1000).trim();
    if (!text) throw badRequest('Write a note first.');
    const list = store.userNotes.get(acc.id) ?? [];
    if (list.length >= MAX_NOTES) throw conflict(`An account can have at most ${MAX_NOTES} notes.`);
    const note = { id: randomId('note'), at: new Date().toISOString(), by: a.account.name, byId: a.account.id, text };
    store.userNotes.set(acc.id, [note, ...list]);
    auditBy(deps, a.account, { action: 'user.note_added', target: acc.id }, ctx.ip);
    return { status: 201, body: { note: { id: note.id, at: note.at, by: note.by, text: note.text } } };
  });

  /** Recent activity across all app users (newest first). Identifies people, so it needs view_users. */
  r.get('/v1/admin/activity', (ctx) => {
    requireStaff(ctx, deps, 'view_users');
    const limit = intParam(ctx, 'limit', 50, 1, 200);
    const cat = categoryParam(ctx);
    const source = ctx.query.get('source');
    const feed: ActivityFeedEntry[] = [...store.activity.entries()]
      .flatMap(([uid, list]) => (store.accounts.get(uid)?.status === 'deleted' ? [] : list.slice(0, 400)))
      // Without a module filter, screen views and app opens are left out so actions stay visible.
      .filter((e) => (cat ? e.category === cat : e.category !== 'app') && (!source || e.source === source))
      .sort((x, y) => y.at.localeCompare(x.at))
      .slice(0, limit)
      .map((e) => ({ ...e, userName: userName(e.userId) }));
    return { body: { events: feed } };
  });

  /** Platform KPIs computed from recorded app activity (SRS §54). Aggregates; identities only with view_users. */
  r.get('/v1/admin/activity/summary', (ctx) => {
    const a = requireStaff(ctx, deps, 'view_analytics', 'view_users');
    const days = intParam(ctx, 'days', 30, 7, 90);
    const summary: ActivitySummary = activitySummary(store, days);
    if (has(a, 'view_users')) {
      summary.recent = [...store.activity.entries()]
        .flatMap(([uid, list]) => (store.accounts.get(uid)?.status === 'deleted' ? [] : list.filter((e) => e.category !== 'app').slice(0, 50)))
        .sort((x, y) => y.at.localeCompare(x.at))
        .slice(0, 12)
        .map((e) => ({ ...e, userName: userName(e.userId) }));
    }
    return { body: { summary } };
  });

  /** Aggregate reading per article for content staff — counts only, no user identities. */
  r.get('/v1/admin/content/engagement', (ctx) => {
    requireStaff(ctx, deps, 'view_content');
    return { body: contentEngagement(store, intParam(ctx, 'days', 30, 7, 90)) };
  });

  // ---------- health records: break-glass permission + reason → 30-minute, audited access ----------

  /**
   * Break-glass (A-15): Admins holding the per-account break-glass (health records) permission, with a reason.
   * The response lists data categories and counts; the records themselves come from GET …/health while the
   * 30-minute grant lasts. Every grant and every view is audited (the audit never contains health values).
   */
  r.post('/v1/admin/users/:id/break-glass', (ctx) => {
    const a = requireStaff(ctx, deps, 'break_glass');
    const reason = str(obj(ctx.body, 'body', ['reason']).reason, 'reason', 10, 500).trim();
    const acc = appUser(ctx.params.id);
    const s = store.userStates.get(acc.id);
    const counts = s
      ? [
          { label: 'Cycle & period logs', count: s.periods.length },
          { label: 'Symptom logs', count: s.symptomLogs.length },
          { label: 'Check-ins', count: s.checkIns.length },
          { label: 'Fertility observations', count: s.fertility.length },
          { label: 'Hydration', count: s.water.length },
          { label: 'Workouts', count: s.sessions.length },
          { label: 'Meals', count: s.meals.length },
          { label: 'Sleep', count: s.sleep.length },
        ]
      : [];
    const grant = grantHealthAccess(store, a.account, acc.id, reason.slice(0, 200));
    auditBy(deps, a.account, { action: 'user.break_glass', target: acc.id, detail: reason.slice(0, 200) }, ctx.ip);
    const expiresAt = new Date(grant.expiresAt).toISOString();
    return { body: { categories: counts, expiresInSec: Math.round((grant.expiresAt - Date.now()) / 1000), expiresAt, note: s ? undefined : 'No wellness data stored for this account.' } };
  });

  r.delete('/v1/admin/users/:id/break-glass', (ctx) => {
    const a = requireStaff(ctx, deps, 'break_glass');
    const acc = appUser(ctx.params.id);
    if (endGrant(store, a.account.id, acc.id)) auditBy(deps, a.account, { action: 'user.health_access_ended', target: acc.id }, ctx.ip);
    return {};
  });

  r.get('/v1/admin/users/:id/health', (ctx) => {
    const a = requireStaff(ctx, deps, 'break_glass');
    const acc = appUser(ctx.params.id);
    const grant = activeGrant(store, a.account.id, acc.id);
    if (!grant) throw forbidden('Request health-records access first (reason required). Access lasts 30 minutes.');
    const s = store.userStates.get(acc.id);
    if (!s) throw notFound('No wellness data is stored for this account.');
    auditBy(deps, a.account, { action: 'user.health_viewed', target: acc.id }, ctx.ip);
    return { body: { record: healthRecordOf(withManagedConfig(store, s)), expiresAt: new Date(grant.expiresAt).toISOString(), reason: grant.reason } };
  });

  r.get('/v1/admin/audit', (ctx) => {
    requireStaff(ctx, deps, 'view_audit');
    const page = Math.max(1, Number(ctx.query.get('page') ?? 1) || 1);
    const size = Math.min(200, Math.max(1, Number(ctx.query.get('size') ?? 50) || 50));
    if (!Number.isInteger(page) || !Number.isInteger(size)) throw badRequest('page and size must be whole numbers.');
    const all = store.admin.audit;
    return { body: { total: all.length, page, size, entries: all.slice((page - 1) * size, page * size) } };
  });
}
