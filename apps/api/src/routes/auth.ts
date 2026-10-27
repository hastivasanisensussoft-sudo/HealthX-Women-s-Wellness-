/** /v1/auth/* — sign-up, sign-in (+ staff MFA), refresh rotation, sign-out, recovery (SRS §47/§48, A-01, A-02, A-04). */
import { createEmptyState, todayISO } from '@healthx/shared';
import { auditBy, capsOf, clearRefreshCookie, cookieFor, issueSession, publicUser, refreshTtlFor, requireAuth, requireEndUser, sessionAlive, tokenResponse, type Deps } from '../auth';
import { hashPasswordAsync, newTotpSecret, otpauthUrl, randomToken, verifyPasswordAsync, verifyTotp } from '../crypto';
import { badRequest, conflict, forbidden, HttpError, notFound, tooMany, unauthorized, type Ctx, type Router } from '../http';
import type { Account } from '../store';
import { bool, email, obj, password, str } from '../validate';

const GENERIC_LOGIN = 'Email or password is incorrect.';
const MFA_LOCK_MS = 15 * 60_000;

export function authRoutes(r: Router, deps: Deps) {
  const { store, config } = deps;
  const limit = (key: string, max: number, windowMs: number) => {
    const wait = store.rate.hit(key, max, windowMs);
    if (wait) throw tooMany(wait);
  };
  const origin = (ctx: { origin?: string }) => (ctx.origin && config.allowedOrigins.includes(ctx.origin) ? ctx.origin : config.allowedOrigins[0] ?? 'http://localhost:5173');
  /** Staff passwords follow the Admin settings minimum (≥ 8 for everyone). */
  const staffPassword = (acc: Account, pw: string) => {
    const min = store.admin.settings.passwordMinLength ?? 8;
    if (acc.role !== 'end_user' && pw.length < min) throw badRequest(`Staff passwords need at least ${min} characters.`);
    return pw;
  };
  const sendVerification = (ctx: Ctx, acc: Account) => {
    const raw = randomToken();
    store.issueToken('verify', acc.id, 24 * 3600_000, raw);
    store.outbox.unshift({ at: new Date().toISOString(), to: acc.email, subject: 'Confirm your HealthX email', link: `${origin(ctx)}/verify-email?token=${raw}` });
  };
  /**
   * First proof that the caller controls the mailbox (magic link / reset) on an account whose email was never
   * verified: anyone who registered it before (account pre-hijacking) loses every session and the password.
   */
  const claimOwnership = (acc: Account) => {
    if (acc.emailVerified) return;
    store.revokeAllFor(acc.id);
    acc.passwordHash = null;
    acc.emailVerified = true;
  };

  r.post('/v1/auth/register', async (ctx) => {
    limit(`register:${ctx.ip}`, config.rate.registerPerHour, 3600_000);
    const b = obj(ctx.body, 'body', ['name', 'email', 'password', 'acceptTerms']);
    const name = str(b.name, 'name', 2, 60).trim();
    const addr = email(b.email);
    const pw = password(b.password);
    if (!bool(b.acceptTerms, 'acceptTerms')) throw badRequest('Please accept the Terms and Privacy Policy.');
    if (store.byEmail(addr)) throw conflict('An account with this email already exists. Try signing in.');
    const passwordHash = await hashPasswordAsync(pw);
    if (store.byEmail(addr)) throw conflict('An account with this email already exists. Try signing in.');
    const acc = store.addAccount({
      email: addr,
      name,
      role: 'end_user',
      status: 'active',
      passwordHash,
      mfaSecret: null,
      mfaLastStep: 0,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      lastActiveAt: null,
      authMethod: 'email',
      country: 'India',
      synthetic: false,
      trialUsed: false,
    });
    const s = createEmptyState(todayISO(), addr);
    store.userStates.set(acc.id, { ...s, profile: { ...s.profile, id: acc.id, name } });
    sendVerification(ctx, acc);
    return { status: 201, body: issueSession(ctx, deps, acc) };
  });

  r.post('/v1/auth/verify-email', (ctx) => {
    const t = store.findToken('verify', str(obj(ctx.body, 'body', ['token']).token, 'token', 10, 200));
    if (!t || t.used || t.exp <= Date.now()) throw new HttpError(400, 'invalid_token', 'This link has expired or was already used. Request a new one.');
    const acc = store.accounts.get(t.accountId);
    if (!acc || acc.status !== 'active') throw new HttpError(400, 'invalid_token', 'This link has expired or was already used. Request a new one.');
    t.used = true;
    acc.emailVerified = true;
    return { body: { ok: true } };
  });

  r.post('/v1/auth/verify-email/resend', (ctx) => {
    const a = requireEndUser(ctx, deps);
    limit(`verify-resend:${a.account.id}`, 5, 3600_000);
    if (!a.account.emailVerified) sendVerification(ctx, a.account);
    return { status: 202, body: { ok: true } };
  });

  r.post('/v1/auth/login', async (ctx) => {
    const b = obj(ctx.body, 'body', ['email', 'password']);
    const addr = email(b.email);
    const pw = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
    // Three independent limits: this IP+account, this account from anywhere, this IP across accounts (spraying).
    const keys = [
      [`login:${ctx.ip}:${addr}`, config.rate.loginAttempts],
      [`login-acct:${addr}`, config.rate.loginPerAccount],
      [`login-ip:${ctx.ip}`, config.rate.loginFailuresPerIp],
    ] as const;
    for (const [k, max] of keys) {
      const wait = store.rate.peek(k, max);
      if (wait) throw tooMany(wait);
    }
    const acc = store.byEmail(addr);
    const ok = await verifyPasswordAsync(pw, acc?.passwordHash ?? null);
    if (!acc || !ok || acc.status === 'deleted' || acc.status === 'invited') {
      for (const [k, max] of keys) store.rate.hit(k, max, config.rate.windowMs);
      throw unauthorized(GENERIC_LOGIN);
    }
    if (acc.status === 'deactivated') throw forbidden('This account is deactivated. Contact support to restore access.');
    if (acc.status === 'deletion_pending') throw forbidden('This account is scheduled for deletion.');
    store.rate.reset(keys[0][0]);
    if (acc.role !== 'end_user') {
      if (!acc.mfaSecret) throw forbidden('Staff accounts need two-step verification. Ask an Admin who manages staff to re-send your invite.');
      if (acc.mfaLockedUntil > Date.now()) throw tooMany(Math.ceil((acc.mfaLockedUntil - Date.now()) / 1000));
      const raw = randomToken();
      store.issueToken('mfa', acc.id, config.mfaTokenTtlMs, raw);
      return { body: { mfaRequired: true, mfaToken: raw } };
    }
    return { body: issueSession(ctx, deps, acc) };
  });

  r.post('/v1/auth/mfa/verify', (ctx) => {
    const b = obj(ctx.body, 'body', ['mfaToken', 'code']);
    const t = store.findToken('mfa', str(b.mfaToken, 'mfaToken', 10, 200));
    if (!t || t.used || t.exp <= Date.now()) throw unauthorized('Your sign-in expired. Please start again.');
    const acc = store.accounts.get(t.accountId);
    if (!acc || acc.status !== 'active' || !acc.mfaSecret) throw unauthorized('Your sign-in expired. Please start again.');
    if (acc.mfaLockedUntil > Date.now()) throw tooMany(Math.ceil((acc.mfaLockedUntil - Date.now()) / 1000));
    if (t.attempts >= config.rate.mfaAttempts) {
      t.used = true;
      throw tooMany(60);
    }
    const step = verifyTotp(acc.mfaSecret, String(b.code ?? '').trim(), acc.mfaLastStep);
    if (step === null) {
      t.attempts += 1;
      // Counted per ACCOUNT and not reset by a correct password, so new sign-in attempts can't reset the budget.
      acc.mfaFailures += 1;
      if (acc.mfaFailures >= config.rate.mfaFailuresPerAccount) {
        acc.mfaLockedUntil = Date.now() + MFA_LOCK_MS;
        acc.mfaFailures = 0;
        t.used = true;
        auditBy(deps, acc, { action: 'staff.mfa_lockout', target: acc.email, detail: 'Too many wrong authenticator codes' }, ctx.ip);
        throw tooMany(MFA_LOCK_MS / 1000);
      }
      throw unauthorized('That code didn’t work. Check your authenticator app and try again.');
    }
    acc.mfaLastStep = step;
    acc.mfaFailures = 0;
    t.used = true;
    auditBy(deps, acc, { action: 'staff.login', target: acc.email }, ctx.ip);
    return { body: issueSession(ctx, deps, acc) };
  });

  r.post('/v1/auth/refresh', (ctx) => {
    const b = (ctx.body && typeof ctx.body === 'object' ? ctx.body : {}) as { refreshToken?: unknown };
    const raw = typeof b.refreshToken === 'string' ? b.refreshToken : ctx.cookies[cookieFor(String(ctx.req.headers['x-client'] ?? '').toLowerCase())];
    if (!raw) throw unauthorized();
    const { session, reusedFamily } = store.sessionByRefresh(raw);
    if (reusedFamily) {
      // A rotated-out token came back: assume theft, end every session in that family.
      store.revokeFamily(reusedFamily);
      clearRefreshCookie(ctx, deps);
      throw unauthorized('Your session was ended for security. Please sign in again.');
    }
    const acc = session ? store.accounts.get(session.accountId) : undefined;
    if (!session || !acc || session.refreshExp <= Date.now() || acc.status !== 'active' || !sessionAlive(deps, session, acc)) {
      if (session) store.revokeSession(session);
      clearRefreshCookie(ctx, deps, session?.client);
      throw unauthorized();
    }
    const access = randomToken();
    const refresh = randomToken();
    store.rotate(session, { access, refresh }, { access: config.accessTtlMs, refresh: refreshTtlFor(deps, acc) });
    return { body: tokenResponse(ctx, deps, acc, session, access, refresh) };
  });

  r.post('/v1/auth/logout', (ctx) => {
    const a = requireAuth(ctx, deps);
    store.revokeSession(a.session);
    clearRefreshCookie(ctx, deps, a.session.client);
    return {};
  });

  r.post('/v1/auth/logout-all', (ctx) => {
    const a = requireAuth(ctx, deps);
    store.revokeAllFor(a.account.id);
    clearRefreshCookie(ctx, deps, a.session.client);
    if (a.account.role !== 'end_user') auditBy(deps, a.account, { action: 'staff.logout_all', target: a.account.email }, ctx.ip);
    return {};
  });

  r.get('/v1/auth/me', (ctx) => {
    const a = requireAuth(ctx, deps);
    return { body: { user: publicUser(store, a.account), capabilities: capsOf(store, a.account) } };
  });

  r.get('/v1/auth/sessions', (ctx) => {
    const a = requireAuth(ctx, deps);
    return {
      body: {
        sessions: store.activeSessions(a.account.id).map((s) => ({ id: s.id, client: s.client, userAgent: s.userAgent, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, current: s.id === a.session.id })),
      },
    };
  });

  r.delete('/v1/auth/sessions/:id', (ctx) => {
    const a = requireAuth(ctx, deps);
    const s = store.sessions.get(ctx.params.id);
    // Another account's session id looks exactly like a missing one.
    if (!s || s.accountId !== a.account.id || s.revoked) throw notFound('Session not found.');
    store.revokeSession(s);
    return {};
  });

  r.post('/v1/auth/password/change', async (ctx) => {
    const a = requireAuth(ctx, deps);
    const b = obj(ctx.body, 'body', ['currentPassword', 'newPassword']);
    const key = `pwchange:${a.account.id}`;
    const wait = store.rate.peek(key, config.rate.loginAttempts);
    if (wait) throw tooMany(wait);
    if (!(await verifyPasswordAsync(typeof b.currentPassword === 'string' ? b.currentPassword.slice(0, 200) : '', a.account.passwordHash))) {
      store.rate.hit(key, config.rate.loginAttempts, config.rate.windowMs);
      throw new HttpError(400, 'wrong_password', 'Your current password is incorrect.');
    }
    const next = staffPassword(a.account, password(b.newPassword, 'newPassword'));
    if (next === b.currentPassword) throw badRequest('Choose a password you haven’t used here before.');
    a.account.passwordHash = await hashPasswordAsync(next);
    store.revokeAllFor(a.account.id, a.session.id);
    store.dropTokens(a.account.id, ['reset', 'magic']);
    if (a.account.role !== 'end_user') auditBy(deps, a.account, { action: 'staff.password_change', target: a.account.email }, ctx.ip);
    return {};
  });

  r.post('/v1/auth/password/forgot', (ctx) => {
    limit(`forgot:${ctx.ip}`, 10, 3600_000);
    const addr = email(obj(ctx.body, 'body', ['email']).email);
    const acc = store.byEmail(addr);
    if (acc && acc.status === 'active') {
      const raw = randomToken();
      store.issueToken('reset', acc.id, config.resetTtlMs, raw);
      store.outbox.unshift({ at: new Date().toISOString(), to: acc.email, subject: 'Reset your HealthX password', link: `${origin(ctx)}/reset-password?token=${raw}` });
    }
    // Same response whether or not the account exists (no account enumeration).
    return { status: 202, body: { ok: true } };
  });

  r.post('/v1/auth/password/reset', async (ctx) => {
    const b = obj(ctx.body, 'body', ['token', 'newPassword']);
    const t = store.findToken('reset', str(b.token, 'token', 10, 200));
    if (!t || t.used || t.exp <= Date.now()) throw new HttpError(400, 'invalid_token', 'This link has expired or was already used. Request a new one.');
    const acc = store.accounts.get(t.accountId);
    if (!acc || acc.status !== 'active') throw new HttpError(400, 'invalid_token', 'This link has expired or was already used. Request a new one.');
    const next = staffPassword(acc, password(b.newPassword, 'newPassword'));
    t.used = true;
    claimOwnership(acc);
    acc.passwordHash = await hashPasswordAsync(next);
    store.revokeAllFor(acc.id);
    store.dropTokens(acc.id, ['reset', 'magic']);
    return {};
  });

  r.post('/v1/auth/magic-link', (ctx) => {
    limit(`magic:${ctx.ip}`, 10, 3600_000);
    const addr = email(obj(ctx.body, 'body', ['email']).email);
    const acc = store.byEmail(addr);
    // Magic links are for app users only — staff always use password + MFA.
    if (acc && acc.status === 'active' && acc.role === 'end_user') {
      const raw = randomToken();
      store.issueToken('magic', acc.id, config.magicTtlMs, raw);
      store.outbox.unshift({ at: new Date().toISOString(), to: acc.email, subject: 'Your HealthX sign-in link', link: `${origin(ctx)}/login?magic=${raw}` });
    }
    return { status: 202, body: { ok: true } };
  });

  r.post('/v1/auth/magic-link/verify', (ctx) => {
    const t = store.findToken('magic', str(obj(ctx.body, 'body', ['token']).token, 'token', 10, 200));
    if (!t || t.used || t.exp <= Date.now()) throw new HttpError(400, 'invalid_token', 'This sign-in link has expired or was already used. Request a new one.');
    const acc = store.accounts.get(t.accountId);
    if (!acc || acc.status !== 'active' || acc.role !== 'end_user') throw new HttpError(400, 'invalid_token', 'This sign-in link has expired or was already used. Request a new one.');
    t.used = true;
    claimOwnership(acc);
    return { body: issueSession(ctx, deps, acc) };
  });

  r.post('/v1/auth/invite/accept', async (ctx) => {
    const b = obj(ctx.body, 'body', ['token', 'password']);
    const t = store.findToken('invite', str(b.token, 'token', 10, 200));
    if (!t || t.used || t.exp <= Date.now()) throw new HttpError(400, 'invalid_token', 'This invite has expired or was already used.');
    const acc: Account | undefined = store.accounts.get(t.accountId);
    if (!acc || acc.status !== 'invited') throw new HttpError(400, 'invalid_token', 'This invite has expired or was already used.');
    const pw = staffPassword(acc, password(b.password));
    acc.passwordHash = await hashPasswordAsync(pw);
    acc.mfaSecret = newTotpSecret();
    acc.status = 'active';
    acc.emailVerified = true;
    t.used = true;
    auditBy(deps, acc, { action: 'staff.invite_accepted', target: acc.email }, ctx.ip);
    // The secret is shown once so it can be added to an authenticator app.
    return { body: { mfaSecret: acc.mfaSecret, otpauthUrl: otpauthUrl(acc.mfaSecret, acc.email) } };
  });

  r.post('/v1/auth/oauth/:provider', () => {
    throw new HttpError(501, 'not_configured', 'Apple and Google sign-in need OAuth client credentials that aren’t configured in this environment.');
  });
}
