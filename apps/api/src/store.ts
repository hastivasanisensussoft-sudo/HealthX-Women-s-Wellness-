/**
 * In-memory storage (the user asked for no database). Everything here is lost when the
 * process stops. The shapes mirror what a PostgreSQL schema would hold (SRS §45/§46):
 * accounts, sessions, one-time tokens, per-user wellness state, admin/CMS state, audit log.
 */
import type { ActivityEvent, AppState } from '@healthx/shared';
import type { AdminState, AdminUser, AuditEntry, PrivilegedCapability, StaffRole } from '@healthx/shared/admin';
import { randomId, sha256 } from './crypto';

export type AccountStatus = 'active' | 'invited' | 'deactivated' | 'deletion_pending' | 'deleted';

export interface Account {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  /** Admin accounts only: privileged permissions this person holds (never granted by role). */
  privileges: PrivilegedCapability[];
  status: AccountStatus;
  passwordHash: string | null;
  mfaSecret: string | null;
  /** Last TOTP step accepted — a code can't be replayed. */
  mfaLastStep: number;
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  authMethod: 'email' | 'magic_link' | 'google' | 'apple';
  country: string;
  /** Seeded record without credentials (shown in admin lists only). */
  synthetic: boolean;
  trialUsed: boolean;
  /** When a free trial ends (server-enforced). */
  trialEndsAt: string | null;
  /** Ownership of the email address proven (verification link, magic link or password reset). */
  emailVerified: boolean;
  /** Failed authenticator codes since the last success — NOT reset by a correct password. */
  mfaFailures: number;
  mfaLockedUntil: number;
}

export interface Session {
  id: string;
  accountId: string;
  family: string;
  accessHash: string;
  accessExp: number;
  refreshHash: string;
  refreshExp: number;
  revoked: boolean;
  createdAt: string;
  lastSeenAt: string;
  client: 'web' | 'web-admin' | 'mobile' | 'api';
  userAgent: string;
  /** Hard end of the session (staff: re-MFA required), regardless of refreshes. */
  absoluteExp: number;
}

export type OneTimeKind = 'mfa' | 'reset' | 'magic' | 'invite' | 'verify';

export interface OneTimeToken {
  hash: string;
  kind: OneTimeKind;
  accountId: string;
  exp: number;
  used: boolean;
  attempts: number;
}

export interface OutboxMessage {
  at: string;
  to: string;
  subject: string;
  /** Contains a single-use token — dev outbox only, never logged. */
  link: string;
}

export interface HealthGrant {
  staffId: string;
  userId: string;
  reason: string;
  grantedAt: string;
  expiresAt: number;
}

export interface UserNote {
  id: string;
  at: string;
  by: string;
  byId: string;
  text: string;
}

export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  /** Counts a hit; returns seconds to wait when over the limit. */
  hit(key: string, limit: number, windowMs: number, now = Date.now()): number | null {
    // Keys include emails/IPs chosen by clients: drop expired windows before the map gets large.
    if (this.hits.size > 50_000) for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    const cur = this.hits.get(key);
    if (!cur || cur.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }
    cur.count += 1;
    return cur.count > limit ? Math.ceil((cur.resetAt - now) / 1000) : null;
  }
  peek(key: string, limit: number, now = Date.now()): number | null {
    const cur = this.hits.get(key);
    return cur && cur.resetAt > now && cur.count >= limit ? Math.ceil((cur.resetAt - now) / 1000) : null;
  }
  reset(key: string) {
    this.hits.delete(key);
  }
}

export class Store {
  accounts = new Map<string, Account>();
  private emailIndex = new Map<string, string>();
  sessions = new Map<string, Session>();
  private accessIndex = new Map<string, string>();
  private refreshIndex = new Map<string, string>();
  /** Rotated-out refresh token hashes → session family (reuse ⇒ the family is revoked). */
  private usedRefresh = new Map<string, string>();
  tokens = new Map<string, OneTimeToken>();
  userStates = new Map<string, AppState>();
  /** Recently applied client action ids per account (idempotent retries). */
  appliedActions = new Map<string, string[]>();
  /** Display records for seeded synthetic users (devices, consents…). */
  syntheticUsers = new Map<string, AdminUser>();
  /** CMS item id → author account id (separation of duties is checked by id, not name). */
  contentAuthors = new Map<string, string>();
  /** CMS item id → accounts that wrote or edited the version now in the workflow (none may approve it). */
  contentContributors = new Map<string, Set<string>>();
  /** CMS item id → account that gave the current version's medical approval (≠ compliance approver). */
  contentMedicalApprover = new Map<string, string>();
  /** Privacy request id → staff account that opened it (a different person must complete a deletion). */
  privacyOpeners = new Map<string, string>();
  /** Notification template key → account that proposed the pending copy. */
  templateProposers = new Map<string, string>();
  /** Daily-plan template id → account that last edited it (that person can't approve it). */
  planEditors = new Map<string, string>();
  /** App user id → activity events, newest first (SRS §53). Erased with the account (§42). */
  activity = new Map<string, ActivityEvent[]>();
  /** `staffId:userId` → time-limited, reason-stated health-records access (audited). */
  healthGrants = new Map<string, HealthGrant>();
  /** App user id → internal staff notes (support context; never shown to the user's app). */
  userNotes = new Map<string, UserNote[]>();
  outbox: OutboxMessage[] = [];
  rate = new RateLimiter();

  constructor(public admin: AdminState) {}

  // ----- accounts -----
  /** New accounts start unverified, with no trial, no MFA failures and no privileged permissions unless stated. */
  addAccount(
    a: Omit<Account, 'id' | 'privileges' | 'trialEndsAt' | 'emailVerified' | 'mfaFailures' | 'mfaLockedUntil'> &
      Partial<Pick<Account, 'id' | 'privileges' | 'trialEndsAt' | 'emailVerified' | 'mfaFailures' | 'mfaLockedUntil'>>,
  ): Account {
    const email = a.email.trim().toLowerCase();
    if (this.emailIndex.has(email)) throw new Error('duplicate email');
    const acc: Account = { privileges: [], trialEndsAt: null, emailVerified: false, mfaFailures: 0, mfaLockedUntil: 0, ...a, id: a.id ?? randomId('acc'), email };
    this.accounts.set(acc.id, acc);
    this.emailIndex.set(email, acc.id);
    return acc;
  }
  byEmail(email: string): Account | undefined {
    const id = this.emailIndex.get(email.trim().toLowerCase());
    return id ? this.accounts.get(id) : undefined;
  }
  /** Frees the email (account deletion) while keeping a tombstone for audit references. */
  releaseEmail(acc: Account) {
    this.emailIndex.delete(acc.email);
  }

  // ----- sessions -----
  createSession(
    accountId: string,
    tokens: { access: string; refresh: string },
    ttl: { access: number; refresh: number; absolute?: number },
    meta: { client: Session['client']; userAgent: string },
    family?: string,
  ): Session {
    const now = Date.now();
    const s: Session = {
      id: randomId('ses'),
      accountId,
      family: family ?? randomId('fam'),
      accessHash: sha256(tokens.access),
      accessExp: now + ttl.access,
      refreshHash: sha256(tokens.refresh),
      refreshExp: now + ttl.refresh,
      revoked: false,
      createdAt: new Date(now).toISOString(),
      lastSeenAt: new Date(now).toISOString(),
      client: meta.client,
      userAgent: meta.userAgent.slice(0, 160),
      absoluteExp: now + (ttl.absolute ?? ttl.refresh),
    };
    this.sessions.set(s.id, s);
    this.accessIndex.set(s.accessHash, s.id);
    this.refreshIndex.set(s.refreshHash, s.id);
    return s;
  }
  sessionByAccess(token: string): Session | undefined {
    const id = this.accessIndex.get(sha256(token));
    return id ? this.sessions.get(id) : undefined;
  }
  sessionByRefresh(token: string): { session?: Session; reusedFamily?: string } {
    const h = sha256(token);
    const id = this.refreshIndex.get(h);
    if (id) return { session: this.sessions.get(id) };
    const fam = this.usedRefresh.get(h);
    return fam ? { reusedFamily: fam } : {};
  }
  rotate(s: Session, tokens: { access: string; refresh: string }, ttl: { access: number; refresh: number }) {
    this.accessIndex.delete(s.accessHash);
    this.refreshIndex.delete(s.refreshHash);
    this.usedRefresh.set(s.refreshHash, s.family);
    const now = Date.now();
    s.accessHash = sha256(tokens.access);
    s.refreshHash = sha256(tokens.refresh);
    s.accessExp = Math.min(now + ttl.access, s.absoluteExp);
    s.refreshExp = Math.min(now + ttl.refresh, s.absoluteExp);
    s.lastSeenAt = new Date(now).toISOString();
    this.accessIndex.set(s.accessHash, s.id);
    this.refreshIndex.set(s.refreshHash, s.id);
  }
  revokeSession(s: Session) {
    s.revoked = true;
    this.accessIndex.delete(s.accessHash);
    this.refreshIndex.delete(s.refreshHash);
  }
  revokeFamily(family: string) {
    for (const s of this.sessions.values()) if (s.family === family) this.revokeSession(s);
  }
  revokeAllFor(accountId: string, except?: string) {
    for (const s of this.sessions.values()) if (s.accountId === accountId && s.id !== except && !s.revoked) this.revokeSession(s);
  }
  activeSessions(accountId: string) {
    return [...this.sessions.values()].filter((s) => s.accountId === accountId && !s.revoked && s.refreshExp > Date.now());
  }

  // ----- one-time tokens -----
  issueToken(kind: OneTimeKind, accountId: string, ttlMs: number, raw: string): OneTimeToken {
    // Only one live token per kind per account.
    for (const [h, t] of this.tokens) if (t.kind === kind && t.accountId === accountId) this.tokens.delete(h);
    const t: OneTimeToken = { hash: sha256(raw), kind, accountId, exp: Date.now() + ttlMs, used: false, attempts: 0 };
    this.tokens.set(t.hash, t);
    return t;
  }
  /** Invalidates every outstanding token of these kinds for an account (e.g. after a password change). */
  dropTokens(accountId: string, kinds: OneTimeKind[]) {
    for (const [h, t] of this.tokens) if (t.accountId === accountId && kinds.includes(t.kind)) this.tokens.delete(h);
  }
  findToken(kind: OneTimeKind, raw: string): OneTimeToken | undefined {
    const t = this.tokens.get(sha256(raw));
    return t && t.kind === kind ? t : undefined;
  }

  // ----- audit (server-written, never truncated, never contains health values) -----
  audit(entry: Omit<AuditEntry, 'id' | 'at' | 'ip'>, ip: string) {
    this.admin.audit.unshift({ ...entry, id: randomId('au'), at: new Date().toISOString(), ip: maskIp(ip) });
  }
}

/** Keep audit IPs useful for investigations without storing full addresses. */
export function maskIp(ip: string): string {
  const v4 = ip.replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.replace(/\.\d+$/, '.x');
  if (v4 === '::1') return 'localhost';
  return v4.split(':').slice(0, 3).join(':') + ':…';
}
