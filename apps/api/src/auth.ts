/** Session issuance + request authentication/authorization guards (server-side RBAC, SRS §6/§47). */
import { capabilitiesOf, type Capability } from '@healthx/shared/admin';
import type { Config } from './config';
import { randomToken } from './crypto';
import { forbidden, serializeCookie, unauthorized, type Ctx } from './http';
import type { Account, Session, Store } from './store';

export const REFRESH_COOKIE = 'hx_rt';
/** The Web Admin shares the web origin but keeps its own session cookie, so signing in there doesn't sign the user app out. */
export const ADMIN_REFRESH_COOKIE = 'hx_rta';
export const cookieFor = (client: string) => (client === 'web-admin' ? ADMIN_REFRESH_COOKIE : REFRESH_COOKIE);
const usesCookie = (client: string) => client === 'web' || client === 'web-admin';

export interface Deps {
  store: Store;
  config: Config;
}

export interface AuthInfo {
  account: Account;
  session: Session;
  caps: Capability[];
}

/** Effective capabilities: the role's row in the server-held matrix plus an Admin's own privileged permissions. Re-read on every request. */
export function capsOf(store: Store, account: Account): Capability[] {
  return capabilitiesOf(store.admin.permissions, account.role, account.privileges);
}

/** Refresh lifetime for this account: short until the email is verified (pre-hijacking defence). */
export const refreshTtlFor = (deps: Deps, a: Account) => (a.role === 'end_user' && !a.emailVerified ? deps.config.unverifiedRefreshTtlMs : deps.config.refreshTtlMs);

/** Staff idle timeout from Admin settings (minutes), enforced server-side. */
const staffIdleMs = (deps: Deps) => (deps.store.admin.settings.sessionTimeoutMin ?? 15) * 60_000;

/** Is this session still usable right now? (absolute end, staff idle timeout) */
export function sessionAlive(deps: Deps, s: Session, a: Account, now = Date.now()): boolean {
  if (s.revoked || s.absoluteExp <= now) return false;
  if (a.role !== 'end_user' && now - Date.parse(s.lastSeenAt) > staffIdleMs(deps)) return false;
  return true;
}

export function publicUser(store: Store, a: Account) {
  return { id: a.id, email: a.email, name: a.name, role: a.role, status: a.status, capabilities: capsOf(store, a), privileges: a.role === 'admin' ? a.privileges : [], mfaEnrolled: !!a.mfaSecret, emailVerified: a.emailVerified };
}

export const clientOf = (ctx: Ctx): Session['client'] => {
  const c = String(ctx.req.headers['x-client'] ?? '').toLowerCase();
  return c === 'web' ? 'web' : c === 'web-admin' ? 'web-admin' : c === 'mobile' ? 'mobile' : 'api';
};

/**
 * Issues an access token (short-lived, returned in the body, kept in memory by clients) and a
 * rotating refresh token. Web clients receive the refresh token only as an HttpOnly, SameSite=Strict
 * cookie; mobile clients receive it in the body to store in the OS keystore.
 */
export function issueSession(ctx: Ctx, deps: Deps, account: Account, family?: string) {
  const access = randomToken();
  const refresh = randomToken();
  const client = clientOf(ctx);
  const session = deps.store.createSession(
    account.id,
    { access, refresh },
    {
      access: deps.config.accessTtlMs,
      refresh: refreshTtlFor(deps, account),
      // Staff must re-authenticate (password + MFA) at least every staffAbsoluteMs.
      absolute: account.role === 'end_user' ? undefined : deps.config.staffAbsoluteMs,
    },
    { client, userAgent: String(ctx.req.headers['user-agent'] ?? '') },
    family,
  );
  account.lastLoginAt = new Date().toISOString();
  account.lastActiveAt = account.lastLoginAt;
  return tokenResponse(ctx, deps, account, session, access, refresh);
}

export function tokenResponse(ctx: Ctx, deps: Deps, account: Account, session: Session, access: string, refresh: string) {
  const web = usesCookie(session.client);
  if (web) {
    ctx.headers['Set-Cookie'] = serializeCookie(cookieFor(session.client), refresh, { maxAgeSec: Math.max(1, Math.floor((session.refreshExp - Date.now()) / 1000)), path: '/', secure: deps.config.production });
  }
  return {
    accessToken: access,
    expiresIn: Math.floor(deps.config.accessTtlMs / 1000),
    ...(web ? {} : { refreshToken: refresh }),
    user: publicUser(deps.store, account),
  };
}

/** Clears the refresh cookie of the given session's client (or, without a session, the one the request names). */
export function clearRefreshCookie(ctx: Ctx, deps: Deps, client: Session['client'] = clientOf(ctx)) {
  ctx.headers['Set-Cookie'] = serializeCookie(cookieFor(client), '', { maxAgeSec: 0, path: '/', secure: deps.config.production });
}

/** Resolves the bearer token. Account status and role are re-read on every request, so deactivation and role changes apply immediately. */
export function authenticate(ctx: Ctx, deps: Deps): AuthInfo | null {
  const h = String(ctx.req.headers.authorization ?? '');
  if (!h.startsWith('Bearer ')) return null;
  const session = deps.store.sessionByAccess(h.slice(7).trim());
  if (!session || session.revoked || session.accessExp <= Date.now()) return null;
  const account = deps.store.accounts.get(session.accountId);
  if (!account || account.status !== 'active' || !sessionAlive(deps, session, account)) {
    deps.store.revokeSession(session);
    return null;
  }
  const now = new Date().toISOString();
  session.lastSeenAt = now;
  account.lastActiveAt = now;
  return { account, session, caps: capsOf(deps.store, account) };
}

export function requireAuth(ctx: Ctx, deps: Deps): AuthInfo {
  const a = authenticate(ctx, deps);
  if (!a) throw unauthorized('Your session has ended. Please sign in again.');
  return a;
}

/** App-user endpoints: only the signed-in end user, only their own data. */
export function requireEndUser(ctx: Ctx, deps: Deps): AuthInfo {
  const a = requireAuth(ctx, deps);
  if (a.account.role !== 'end_user') throw forbidden('Staff accounts can’t use app-user endpoints.');
  return a;
}

/** Web Admin endpoints: staff with admin access AND at least one of the listed capabilities. */
export function requireStaff(ctx: Ctx, deps: Deps, ...anyOf: Capability[]): AuthInfo {
  const a = requireAuth(ctx, deps);
  if (a.account.role === 'end_user' || !a.caps.includes('admin_access')) throw forbidden('No admin access.');
  if (anyOf.length && !anyOf.some((c) => a.caps.includes(c))) throw forbidden();
  return a;
}

export const has = (a: AuthInfo, cap: Capability) => a.caps.includes(cap);

/** Audit with a stable actor identity (id + email), not only the mutable display name. */
export function auditBy(deps: Deps, a: Account, entry: { action: string; target: string; detail?: string }, ip: string) {
  deps.store.audit({ actor: a.name, role: a.role, actorId: a.id, actorEmail: a.email, ...entry }, ip);
}
