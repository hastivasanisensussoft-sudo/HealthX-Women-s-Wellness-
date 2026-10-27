/**
 * Role-scoped view of the admin state. Each slice is included only when the role holds a
 * capability that needs it; everything else is empty. App-user rows never include health data,
 * emails are masked (full address via an audited reveal), and roles that don't work with
 * individual accounts (e.g. analysts) get no user rows at all.
 */
import { ADMIN_STATE_VERSION, type AdminState, type Capability } from '@healthx/shared/admin';
import { adminUserRow, appUsers, maskEmail, staffAccounts, staffRow } from './accounts';
import type { AuthInfo } from './auth';
import { publishDue } from './contentWorkflow';
import type { Store } from './store';

/** In-app campaign opens, counted from users' inboxes (no identities). */
function openedCount(store: Store, campaignId: string): number {
  const id = `cmp_${campaignId}`;
  let n = 0;
  for (const st of store.userStates.values()) if (st.notifications.some((x) => x.id === id && x.read)) n += 1;
  return n;
}

export function projectAdminState(store: Store, auth: AuthInfo): AdminState {
  publishDue(store);
  const s = store.admin;
  const can = (...c: Capability[]) => c.some((x) => auth.caps.includes(x));
  const contentRole = can('view_content', 'edit_content', 'medical_review', 'compliance_review', 'publish_content');
  const users = can('view_users', 'manage_subscriptions', 'process_data_requests') ? appUsers(store).map((a) => adminUserRow(store, a, { maskEmail: true })) : [];
  const me = auth.account;
  return {
    version: ADMIN_STATE_VERSION,
    session: { name: me.name, email: me.email, role: me.role, privileges: me.role === 'admin' ? me.privileges : [], signedInAt: auth.session.createdAt },
    permissions: s.permissions,
    settings: s.settings,
    content: contentRole ? s.content : [],
    users,
    staff: can('view_staff') ? staffAccounts(store).map(staffRow) : [staffRow(me)],
    flags: can('manage_flags', 'view_settings') ? s.flags : [],
    audit: can('view_audit') ? s.audit.slice(0, 1000) : [],
    rules: can('manage_config') ? s.rules : [],
    customSymptoms: can('manage_config') ? s.customSymptoms : [],
    defaults: s.defaults,
    support: can('manage_support') ? s.support.map((r) => ({ ...r, userEmail: maskEmail(r.userEmail) })) : [],
    templates: can('view_notifications') ? s.templates : [],
    campaigns: can('view_notifications') ? s.campaigns.map((c) => (c.channel === 'in_app' ? { ...c, opened: openedCount(store, c.id) } : c)) : [],
    refunds: can('manage_subscriptions') ? s.refunds : [],
    privacy: can('process_data_requests') ? s.privacy : [],
    media: contentRole ? s.media : [],
    taxonomy: s.taxonomy,
    accounts: s.accounts[me.email] ? { [me.email]: s.accounts[me.email] } : {},
    scoreWeights: s.scoreWeights,
    planTemplates: contentRole || can('manage_config') ? s.planTemplates : [],
  };
}
