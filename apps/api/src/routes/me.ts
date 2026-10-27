/**
 * /v1/me/* — the signed-in app user's own data. Every handler resolves the user from the
 * session (never from a parameter), so there is no way to address another user's records.
 */
import { buildDailyPlan, createEmptyState, createInitialState, reducer, todayISO, type AppState } from '@healthx/shared';
import { deleteAccountData } from '../accounts';
import { requireEndUser, type AuthInfo, type Deps } from '../auth';
import { publishedArticles, publishedIds } from '../content';
import { verifyPasswordAsync } from '../crypto';
import { badRequest, conflict, HttpError, notFound, tooMany, type Ctx, type Router } from '../http';
import { validateUserAction } from '../userActions';
import { obj, str } from '../validate';

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
    save(a, reducer(before, action));
    if (clientId) store.appliedActions.set(a.account.id, [...applied, clientId].slice(-500));
    return { body: { ok: true } };
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
    return { body: { ok: true, plan: 'premium', trialEndsAt: a.account.trialEndsAt } };
  });
  r.post('/v1/me/subscription/cancel', (ctx) => {
    const a = requireEndUser(ctx, deps);
    const s = stateOf(a);
    store.userStates.set(a.account.id, { ...s, profile: { ...s.profile, plan: 'free' } });
    a.account.trialEndsAt = null;
    return { body: { ok: true, plan: 'free' } };
  });

  // Demo tools for the user's OWN data only.
  r.post('/v1/me/data/sample', (ctx) => {
    const a = requireEndUser(ctx, deps);
    writeBudget(a);
    const cur = stateOf(a);
    const fresh = createInitialState(todayISO());
    store.userStates.set(a.account.id, { ...fresh, auth: { ...fresh.auth, onboarded: true, email: a.account.email }, profile: { ...fresh.profile, id: a.account.id, name: cur.profile.name || a.account.name, email: a.account.email, plan: cur.profile.plan } });
    return { body: { ok: true } };
  });
  r.post('/v1/me/data/clear', (ctx) => {
    const a = requireEndUser(ctx, deps);
    writeBudget(a);
    const cur = stateOf(a);
    const empty = createEmptyState(todayISO(), a.account.email);
    store.userStates.set(a.account.id, { ...empty, auth: { ...empty.auth, onboarded: true }, profile: { ...cur.profile }, consents: cur.consents });
    return { body: { ok: true } };
  });
}
