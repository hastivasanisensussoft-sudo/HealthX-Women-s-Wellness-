/**
 * /v1/me/* — the signed-in app user's own data. Every handler resolves the user from the
 * session (never from a parameter), so there is no way to address another user's records.
 */
import { activityForAction, buildDailyPlan, createEmptyState, createInitialState, isUsageEvent, reducer, todayISO, USAGE_EVENTS, type AppState } from '@healthx/shared';
import { recordAccountEvent, recordActivity, sourceOf, withManagedConfig } from '../activity';
import { deleteAccountData } from '../accounts';
import { requireEndUser, type AuthInfo, type Deps } from '../auth';
import { publishedArticles, publishedIds } from '../content';
import { verifyPasswordAsync } from '../crypto';
import { badRequest, conflict, HttpError, notFound, tooMany, type Ctx, type Router } from '../http';
import { validateUserAction } from '../userActions';
import { arr, obj, str } from '../validate';

/** Record collections that can be fetched by id (object-level authorisation demo + API). */
const COLLECTIONS = {
  periods: (s: AppState) => s.periods,
  'symptom-logs': (s: AppState) => s.symptomLogs,
  water: (s: AppState) => s.water,
  workouts: (s: AppState) => s.sessions,
  meals: (s: AppState) => s.meals,
  habits: (s: AppState) => s.habits,
  goals: (s: AppState) => s.goals,
  reminders: (s: AppState) => s.reminders,
} satisfies Record<string, (s: AppState) => { id: string }[]>;

const TRIAL_MS = 7 * 86400_000;

export function meRoutes(r: Router, deps: Deps) {
  const { store, config } = deps;

  const stateOf = (a: AuthInfo): AppState => {
    let s = store.userStates.get(a.account.id);
    if (!s) {
      // Accounts created before data existed (e.g. seeded rows) start empty.
      const fresh = createEmptyState(todayISO(), a.account.email);
      s = { ...fresh, profile: { ...fresh.profile, id: a.account.id, name: a.account.name } };
    }
    // Score weights, staff-added symptoms, switched-off insight rules and the approved plan library (Web Admin).
    s = withManagedConfig(store, s);
    const today = todayISO();
    if (s.today !== today) s = { ...s, today, plan: s.plan.date === today ? s.plan : { date: today, items: buildDailyPlan(s, today) } };
    // The trial end is a server decision, applied on the next request after it passes.
    if (a.account.trialEndsAt && Date.parse(a.account.trialEndsAt) <= Date.now()) {
      a.account.trialEndsAt = null;
      if (s.profile.plan === 'premium') s = { ...s, profile: { ...s.profile, plan: 'free' } };
    }
    store.userStates.set(a.account.id, s);
    return s;
  };

  /** Per-account write budget, on top of the global per-IP limit. */
  const writeBudget = (a: AuthInfo) => {
    const wait = store.rate.hit(`me-write:${a.account.id}`, config.rate.userWritesPerWindow, config.rate.windowMs);
    if (wait) throw tooMany(wait);
  };
  /** Stores a new state only while it stays under the per-account size cap. */
  const save = (a: AuthInfo, next: AppState) => {
    if (Buffer.byteLength(JSON.stringify(next)) > config.limits.maxUserStateBytes) {
      throw new HttpError(413, 'state_too_large', 'Your account has reached its storage limit. Delete some older entries and try again.');
    }
    store.userStates.set(a.account.id, next);
  };

  /** Response view: published CMS content is joined in; auth flags describe this session. */
  const view = (s: AppState, a: AuthInfo): AppState => ({
    ...s,
    auth: { ...s.auth, signedIn: true, email: a.account.email, role: 'user' },
    articles: publishedArticles(store),
  });

  r.get('/v1/me/state', (ctx) => {
    const a = requireEndUser(ctx, deps);
    return { body: { state: view(stateOf(a), a) } };
  });

  r.post('/v1/me/actions', (ctx) => {
    const a = requireEndUser(ctx, deps);
    writeBudget(a);
    const b = obj(ctx.body, 'body', ['id', 'action']);
    const clientId = b.id === undefined ? undefined : str(b.id, 'id', 1, 80);
    const applied = store.appliedActions.get(a.account.id) ?? [];
    if (clientId && applied.includes(clientId)) return { body: { ok: true, duplicate: true } };
    const before = stateOf(a);
    const action = validateUserAction(b.action, { today: before.today, state: before, articleIds: publishedIds(store) });
    const next = reducer(before, action);
    save(a, next);
    if (clientId) store.appliedActions.set(a.account.id, [...applied, clientId].slice(-500));
    // Activity log (SRS §53): what kind of record was written and when — never its values. Actions that
    // changed nothing (the reducer returned the same state, e.g. re-marking a read article) aren't activity.
    const act = activityForAction(action);
    if (act && next !== before) recordActivity(store, a.account.id, act, sourceOf(a.session.client));
    return { body: { ok: true } };
  });

  /**
   * App-usage events (app opened, screens, videos…). Recorded only while the user's analytics consent
   * is on (SRS §42); otherwise accepted and dropped, so the app doesn't need to know.
   */
  r.post('/v1/me/events', (ctx) => {
    const a = requireEndUser(ctx, deps);
    const wait = store.rate.hit(`me-events:${a.account.id}`, config.rate.userWritesPerWindow, config.rate.windowMs);
    if (wait) throw tooMany(wait);
    // Validate the whole batch first, so a bad entry records nothing.
    const events = arr(obj(ctx.body, 'body', ['events']).events, 'events', 20).map((raw, i) => {
      const e = obj(raw, `events[${i}]`, ['name', 'detail']);
      if (!isUsageEvent(e.name)) throw badRequest(`events[${i}].name is not a known app event.`);
      const detail = e.detail === undefined || e.detail === null ? undefined : str(e.detail, `events[${i}].detail`, 1, 120).trim();
      // Route patterns and catalogue ids only (e.g. "/life-stage/[mode]", "a_sleep_routine") — no free text.
      if (detail && !/^[\w./:[\]()-]+$/.test(detail)) throw badRequest(`events[${i}].detail may only contain letters, digits and / . : - _ [ ] ( ).`);
      const x = USAGE_EVENTS[e.name];
      return detail ? { ...x, detail } : x;
    });
    const consented = !!stateOf(a).consents.find((c) => c.id === 'analytics')?.granted;
    if (consented) for (const x of events) recordActivity(store, a.account.id, x, sourceOf(a.session.client));
    return { status: 202, body: { ok: true, recorded: consented ? events.length : 0, analyticsConsent: consented } };
  });

  r.get('/v1/me/records/:collection/:id', (ctx) => {
    const a = requireEndUser(ctx, deps);
    const name = ctx.params.collection;
    if (!Object.hasOwn(COLLECTIONS, name)) throw notFound();
    const rec = COLLECTIONS[name as keyof typeof COLLECTIONS](stateOf(a)).find((x) => x.id === ctx.params.id);
    if (!rec) throw notFound('Record not found.');
    return { body: { record: rec } };
  });

  r.get('/v1/me/export', (ctx) => {
    const a = requireEndUser(ctx, deps);
    const wait = store.rate.hit(`export:${a.account.id}`, config.rate.exportPerHour, 3600_000);
    if (wait) throw tooMany(wait);
    const s = stateOf(a);
    const { articles: _a, workouts: _w, ...data } = s;
    recordAccountEvent(store, a.account, 'data_exported', a.session.client);
    return {
      body: { exportedAt: new Date().toISOString(), format: 'healthx-export-v1', account: { id: a.account.id, email: a.account.email, name: a.account.name, createdAt: a.account.createdAt }, data },
      headers: { 'Content-Disposition': `attachment; filename="healthx-export-${todayISO()}.json"` },
    };
  });

  r.delete('/v1/me', async (ctx: Ctx) => {
    const a = requireEndUser(ctx, deps);
    const b = obj(ctx.body, 'body', ['password', 'confirm']);
    if (b.confirm !== 'DELETE') throw badRequest('Type DELETE to confirm.');
    const key = `self-delete:${a.account.id}`;
    const wait = store.rate.peek(key, config.rate.loginAttempts);
    if (wait) throw tooMany(wait);
    if (!(await verifyPasswordAsync(typeof b.password === 'string' ? b.password.slice(0, 200) : '', a.account.passwordHash))) {
      store.rate.hit(key, config.rate.loginAttempts, config.rate.windowMs);
      throw new HttpError(400, 'wrong_password', 'Your password is incorrect.');
    }
    deleteAccountData(store, a.account);
    store.audit({ actor: 'App user', role: 'system', action: 'user.self_delete', target: a.account.id }, ctx.ip);
    return {};
  });

  // Subscription: a free trial is a server decision (once per account). Paid plans need a billing provider.
  r.post('/v1/me/subscription/trial', (ctx) => {
    const a = requireEndUser(ctx, deps);
    if (a.account.trialUsed) throw conflict('You’ve already used your free trial.');
    const s = stateOf(a);
    store.userStates.set(a.account.id, { ...s, profile: { ...s.profile, plan: 'premium' } });
    a.account.trialUsed = true;
    a.account.trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
    recordAccountEvent(store, a.account, 'subscription_started', a.session.client, 'free trial');
    return { body: { ok: true, plan: 'premium', trialEndsAt: a.account.trialEndsAt } };
  });
  r.post('/v1/me/subscription/cancel', (ctx) => {
    const a = requireEndUser(ctx, deps);
    const s = stateOf(a);
    store.userStates.set(a.account.id, { ...s, profile: { ...s.profile, plan: 'free' } });
    a.account.trialEndsAt = null;
    recordAccountEvent(store, a.account, 'subscription_cancelled', a.session.client);
    return { body: { ok: true, plan: 'free' } };
  });

  // Demo tools for the user's OWN data only.
  r.post('/v1/me/data/sample', (ctx) => {
    const a = requireEndUser(ctx, deps);
    writeBudget(a);
    const cur = stateOf(a);
    const fresh = createInitialState(todayISO());
    store.userStates.set(a.account.id, { ...fresh, auth: { ...fresh.auth, onboarded: true, email: a.account.email }, profile: { ...fresh.profile, id: a.account.id, name: cur.profile.name || a.account.name, email: a.account.email, plan: cur.profile.plan } });
    recordAccountEvent(store, a.account, 'sample_data_loaded', a.session.client);
    return { body: { ok: true } };
  });
  r.post('/v1/me/data/clear', (ctx) => {
    const a = requireEndUser(ctx, deps);
    writeBudget(a);
    const cur = stateOf(a);
    const empty = createEmptyState(todayISO(), a.account.email);
    store.userStates.set(a.account.id, { ...empty, auth: { ...empty.auth, onboarded: true }, profile: { ...cur.profile }, consents: cur.consents });
    recordAccountEvent(store, a.account, 'data_cleared', a.session.client);
    return { body: { ok: true } };
  });
}
