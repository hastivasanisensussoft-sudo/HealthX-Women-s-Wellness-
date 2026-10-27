/**
 * Synthetic seed data for local development. Seeding is refused in production (config.ts).
 * - Admin/CMS state comes from the shared admin seed (same data the Web Admin demo shows).
 * - Seeded app users without credentials appear in admin lists only.
 * - Demo end users and one staff account per role can sign in with `config.demoPassword`;
 *   staff also need an authenticator code (see /v1/dev/mfa-code in development).
 */
import { createInitialState, todayISO } from '@healthx/shared';
import { initialAdminState } from '@healthx/shared/admin';
import { migrateLegacyAccounts } from './accounts';
import type { Config } from './config';
import { hashPassword, newTotpSecret } from './crypto';
import { Store } from './store';

export const DEMO_USERS = [
  { id: 'usr_aisha', email: 'aisha@example.com', name: 'Aisha Kapoor', country: 'India' },
  { id: 'usr_riya', email: 'riya.test@example.com', name: 'Riya Desai', country: 'India' },
];

export function seedStore(config: Config): Store {
  const admin = initialAdminState();
  admin.session = null;
  const store = new Store(admin);
  const today = todayISO();

  // Seeded app users (no credentials) — listed in User management, can't sign in.
  for (const u of admin.users) {
    try {
      store.addAccount({
        id: u.id,
        email: u.email,
        name: u.name,
        role: 'end_user',
        status: u.status,
        passwordHash: null,
        mfaSecret: null,
        mfaLastStep: 0,
        createdAt: `${u.signupDate}T09:00:00.000Z`,
        lastLoginAt: null,
        lastActiveAt: u.lastActive,
        authMethod: u.authMethod,
        country: u.country,
        synthetic: true,
        trialUsed: false,
        emailVerified: true,
      });
      store.syntheticUsers.set(u.id, u);
    } catch {
      /* duplicate email in seed — skip */
    }
  }

  if (config.seedDemo) {
    for (const d of DEMO_USERS) {
      store.addAccount({
        id: d.id,
        email: d.email,
        name: d.name,
        role: 'end_user',
        status: 'active',
        passwordHash: hashPassword(config.demoPassword),
        mfaSecret: null,
        mfaLastStep: 0,
        createdAt: new Date(Date.now() - 75 * 86400_000).toISOString(),
        lastLoginAt: null,
        lastActiveAt: null,
        authMethod: 'email',
        country: d.country,
        synthetic: false,
        trialUsed: false,
        emailVerified: true,
      });
      const s = createInitialState(today);
      store.userStates.set(d.id, { ...s, auth: { ...s.auth, signedIn: true, onboarded: true, email: d.email }, profile: { ...s.profile, id: d.id, name: d.name, email: d.email } });
    }
    // Staff: one account per seeded staff member; every active staff account is enrolled in MFA (D-33).
    for (const m of admin.staff) {
      const active = m.status === 'active';
      store.addAccount({
        id: m.id,
        email: m.email,
        name: m.name,
        role: m.role,
        privileges: m.role === 'admin' ? m.privileges : [],
        status: active ? 'active' : 'invited',
        passwordHash: active ? hashPassword(config.demoPassword) : null,
        mfaSecret: active ? newTotpSecret() : null,
        mfaLastStep: 0,
        createdAt: new Date(Date.now() - 200 * 86400_000).toISOString(),
        lastLoginAt: m.lastLogin,
        lastActiveAt: m.lastLogin,
        authMethod: 'email',
        country: 'India',
        synthetic: false,
        trialUsed: false,
        emailVerified: true,
      });
    }
  }

  // Link seeded CMS items to their author accounts so self-approval is checked by identity.
  const byName = new Map([...store.accounts.values()].map((a) => [a.name.trim().toLowerCase(), a.id]));
  for (const c of admin.content) {
    const id = byName.get(c.author.trim().toLowerCase());
    if (id) store.contentAuthors.set(c.id, id);
  }
  // Accounts from before the four-role consolidation would be mapped here (no-op for this seed).
  migrateLegacyAccounts(store);
  return store;
}
