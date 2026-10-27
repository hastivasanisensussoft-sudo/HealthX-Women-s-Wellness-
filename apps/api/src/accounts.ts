/** Account lifecycle + privacy-minimised admin views of app users. */
import { isLegacyRole, LEGACY_ROLES, migratePermissionMatrix, privilegesForLegacyRole, type AdminUser, type LegacyRole, type StaffMember, type StaffRole } from '@healthx/shared/admin';
import type { Account, AccountStatus, Store } from './store';

export function maskEmail(email: unknown): string {
  if (typeof email !== 'string') return '***';
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

/** Deactivation / deletion takes effect immediately: every session of the account is revoked. */
export function setAccountStatus(store: Store, acc: Account, status: AccountStatus) {
  acc.status = status;
  if (status !== 'active') store.revokeAllFor(acc.id);
  if (status === 'deleted') deleteAccountData(store, acc);
}

const REMOVED = '[removed when the account was deleted]';

/**
 * Erases the user's wellness data and identity (SRS §42), including copies of their name and
 * email in support requests, refunds and queued emails. A tombstone keeps audit references valid.
 */
export function deleteAccountData(store: Store, acc: Account) {
  const email = acc.email.toLowerCase();
  const name = acc.name;
  store.userStates.delete(acc.id);
  store.appliedActions.delete(acc.id);
  store.revokeAllFor(acc.id);
  for (const [h, t] of store.tokens) if (t.accountId === acc.id) store.tokens.delete(h);
  store.releaseEmail(acc);
  acc.status = 'deleted';
  acc.email = `deleted+${acc.id}@invalid`;
  acc.name = 'Deleted user';
  acc.passwordHash = null;
  acc.mfaSecret = null;
  acc.trialEndsAt = null;
  const syn = store.syntheticUsers.get(acc.id);
  if (syn) store.syntheticUsers.set(acc.id, { ...syn, name: 'Deleted user', email: acc.email, devices: [], status: 'deleted' });

  const s = store.admin;
  s.support = s.support.map((r) =>
    r.userId === acc.id || (typeof r.userEmail === 'string' && r.userEmail.toLowerCase() === email)
      ? { ...r, userName: 'Deleted user', userEmail: acc.email, subject: REMOVED, notes: r.notes.map((n) => (n.by === name || n.by === r.userName ? { ...n, by: 'Deleted user', text: REMOVED } : n)) }
      : r,
  );
  s.refunds = s.refunds.map((r) => (r.userId === acc.id ? { ...r, userName: 'Deleted user' } : r));
  store.outbox = store.outbox.filter((m) => m.to.toLowerCase() !== email);
}

/** Admin list row for an app user — account metadata only, never health data. */
export function adminUserRow(store: Store, acc: Account, opts: { maskEmail: boolean }): AdminUser {
  const syn = store.syntheticUsers.get(acc.id);
  const state = store.userStates.get(acc.id);
  const base: AdminUser = syn
    ? { ...syn, status: acc.status === 'invited' ? 'active' : acc.status }
    : {
        id: acc.id,
        name: acc.name,
        email: acc.email,
        signupDate: acc.createdAt.slice(0, 10),
        plan: state?.profile.plan ?? 'free',
        status: acc.status === 'invited' ? 'active' : acc.status,
        authMethod: acc.authMethod,
        lastActive: acc.lastActiveAt ?? acc.createdAt,
        country: state?.profile.country ?? acc.country,
        devices: store.activeSessions(acc.id).map((s) => ({
          platform: s.client === 'mobile' ? (/android/i.test(s.userAgent) ? 'Android' : 'iOS') : 'Web',
          model: s.userAgent.split(' ')[0]?.slice(0, 40) || 'Unknown',
          appVersion: '0.1.0',
          lastSeen: s.lastSeenAt,
        })),
        consents: {
          analytics: !!state?.consents.find((c) => c.id === 'analytics')?.granted,
          ai: !!state?.consents.find((c) => c.id === 'ai_personalization')?.granted,
          integrations: !!state?.consents.find((c) => c.id === 'health_integrations')?.granted,
          notifications: !!state?.consents.find((c) => c.id === 'notifications')?.granted,
        },
        mfa: false,
      };
  return opts.maskEmail ? { ...base, email: maskEmail(base.email) } : base;
}

export function staffRow(acc: Account): StaffMember {
  const status = acc.status === 'invited' || acc.status === 'deactivated' ? acc.status : 'active';
  return { id: acc.id, name: acc.name, email: acc.email, role: acc.role, privileges: acc.role === 'admin' ? acc.privileges : [], mfaEnabled: !!acc.mfaSecret, status, lastLogin: acc.lastLoginAt };
}

/**
 * Migrates accounts stored under the seven-role model (a no-op for current data): each retired
 * role becomes its canonical role, and a former Super Admin keeps those powers as an Admin's
 * privileged permissions. Nobody else carries privileged permissions over, whatever the stored record
 * says. Ids, credentials, sessions and app data are untouched; sessions pick up the new role on their
 * next request because capabilities are re-read every time.
 */
export function migrateLegacyAccounts(store: Store): { id: string; from: LegacyRole; to: StaffRole }[] {
  const changed: { id: string; from: LegacyRole; to: StaffRole }[] = [];
  for (const acc of store.accounts.values()) {
    const from: unknown = acc.role;
    if (!isLegacyRole(from)) continue;
    const to = LEGACY_ROLES[from];
    acc.role = to;
    acc.privileges = to === 'admin' ? privilegesForLegacyRole(from) : [];
    changed.push({ id: acc.id, from, to });
  }
  store.admin.permissions = migratePermissionMatrix(store.admin.permissions);
  for (const c of changed) store.audit({ actor: 'System', role: 'system', action: 'staff.role_migrated', target: c.id, detail: `${c.from} → ${c.to}` }, 'system');
  return changed;
}

export const appUsers = (store: Store) => [...store.accounts.values()].filter((a) => a.role === 'end_user');
/** Staff accounts, including invited and deactivated ones (deleted accounts are gone). */
export const staffAccounts = (store: Store) => [...store.accounts.values()].filter((a) => a.role !== 'end_user' && a.status !== 'deleted');
