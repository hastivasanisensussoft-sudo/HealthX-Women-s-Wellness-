/**
 * Server-side policy for every Web Admin write (SRS §6, §47). The browser proposes an action;
 * this decides whether the signed-in staff member may perform it (capability from the server's
 * permission matrix, never from the request), reads only the fields the action may change,
 * applies it and names the audit entry. Ids of new records, identities, authors, timestamps and
 * metrics are always written by the server. Returns null when nothing changed (no audit entry).
 */
import { addDays, CONTENT_CATEGORIES, reducer, SYMPTOM_CATEGORIES, todayISO } from '@healthx/shared';
import {
  ALL_CAPABILITIES,
  ALL_ROLES,
  DEFAULT_PERMISSIONS,
  defaultAccount,
  isLegacyRole,
  isLockedCell,
  isPrivileged,
  LEGACY_ROLES,
  MEDIA_UPLOAD_RULES,
  mediaKindOf,
  PRIVACY_TYPES,
  PRIVILEGED_CAPABILITIES,
  ROLE_LABELS,
  STAFF_ROLES,
  type AdminSettings,
  type Campaign,
  type CampaignSegment,
  type Capability,
  type ConsentKey,
  type NotificationTemplate,
  type PrivacyRequest,
  type PrivilegedCapability,
  type StaffAccount,
  type StaffRole,
  type SupportRequest,
  type TaxonomyCategory,
} from '@healthx/shared/admin';
import { appUsers, setAccountStatus, staffAccounts } from './accounts';
import type { AuthInfo } from './auth';
import { applyContentUpsert } from './contentWorkflow';
import { randomId, randomToken } from './crypto';
import { badRequest, conflict, forbidden, HttpError, notFound } from './http';
import type { Account, Store } from './store';
import { arr, bool, email, isoDate, num, obj, oneOf, optStr, str } from './validate';

export interface AuditNote {
  action: string;
  target: string;
  detail?: string;
}

const need = (auth: AuthInfo, ...anyOf: Capability[]) => {
  if (!anyOf.some((c) => auth.caps.includes(c))) throw forbidden();
};
const now = () => new Date().toISOString();
const ENVS = ['dev', 'staging', 'prod'] as const;
const SAFE_ID = /^[\w-]{1,60}$/;
const BUILT_IN_CATEGORIES = new Set<string>(CONTENT_CATEGORIES.map((c) => c.key));
/** Size limits for lists staff can grow (memory is the only storage). */
const LIMITS = { staff: 500, campaigns: 500, refunds: 5000, media: 2000, customSymptoms: 200, notes: 200 };
const CONSENT_IDS: Record<ConsentKey, string> = { analytics: 'analytics', ai: 'ai_personalization', integrations: 'health_integrations', notifications: 'notifications' };

/** Names that differ only in case, spacing, compatibility forms or invisible characters are the same name. */
const nameKey = (s: string) => s.normalize('NFKC').replace(/\p{Cf}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
const sameName = (a: string, b: string) => nameKey(a) === nameKey(b);
const room = (n: number, max: number, what: string) => {
  if (n >= max) throw conflict(`The ${what} list is full (${max}). Remove old entries first.`);
};
const nullableInt = (v: unknown, path: string, min: number, max: number) => (v === null ? null : num(v, path, min, max, true));
/** Staff display names are unique — the audit log and author checks show them. */
const nameTaken = (store: Store, name: string, exceptId?: string) =>
  [...store.accounts.values()].some((x) => x.role !== 'end_user' && x.status !== 'deleted' && x.id !== exceptId && sameName(x.name, name));
/** A staff display name: visible text, without control or text-direction characters that could disguise it. */
const staffName = (v: unknown, path: string) => {
  const name = str(v, path, 2, 80).trim();
  if (/[\p{Cc}؜‎‏‪-‮⁦-⁩]/u.test(name)) throw badRequest(`${path} can’t contain control or text-direction characters.`);
  if (nameKey(name).length < 2) throw badRequest(`${path} must be at least 2 characters.`);
  return name;
};
/** Assignees must be staff members (unchanged legacy values are kept as they are). */
const assigneeOf = (store: Store, v: unknown, current: string | null) => {
  if (v === null || v === undefined || v === '') return null;
  const name = str(v, 'assignee', 1, 80).trim();
  if (current && name === current) return current;
  const staff = staffAccounts(store).find((x) => x.status === 'active' && sameName(x.name, name));
  if (!staff) throw badRequest('Assign the request to an active staff member.');
  return staff.name;
};
/** A canonical role. Ids retired in the four-role consolidation are refused, naming their replacement. */
const roleOf = (v: unknown, path: string, allowed: readonly StaffRole[]): StaffRole => {
  if (isLegacyRole(v)) throw badRequest(`“${v}” is no longer a role — it was merged into ${ROLE_LABELS[LEGACY_ROLES[v]]}.`);
  return oneOf(v, path, allowed);
};
const privilegeList = (v: unknown): PrivilegedCapability[] => [
  ...new Set(
    arr(v, 'privileges', PRIVILEGED_CAPABILITIES.length).map((p, i) => {
      if (typeof p !== 'string' || !isPrivileged(p)) throw badRequest(`privileges[${i}] must be one of: ${PRIVILEGED_CAPABILITIES.join(', ')}.`);
      return p;
    }),
  ),
];
/** Only entries appended after the existing ones count; the server writes who and when. */
const appended = (incoming: unknown, existingLen: number, path: string, max: number, by: string) => {
  const list = Array.isArray(incoming) ? incoming.slice(existingLen) : [];
  if (existingLen + list.length > LIMITS.notes) throw conflict(`This record can have at most ${LIMITS.notes} notes.`);
  return list.map((n, i) => ({ at: now(), by, text: str(obj(n, `${path}[${i}]`).text, `${path}[${i}].text`, 1, max).trim() }));
};

export function applyAdminAction(store: Store, auth: AuthInfo, raw: unknown, origin: string): AuditNote | null {
  const a = obj(raw, 'action');
  const type = typeof a.type === 'string' ? a.type : '';
  const actor = auth.account;
  const s = store.admin;

  switch (type) {
    case 'UPSERT_CONTENT': {
      need(auth, 'edit_content', 'medical_review', 'compliance_review', 'publish_content');
      const r = applyContentUpsert(store, auth, a.item);
      return r && { action: r.audit, target: r.target, detail: r.detail };
    }

    case 'UPDATE_USER': {
      const acc = store.accounts.get(str(a.id, 'id', 1, 100));
      if (!acc || acc.role !== 'end_user') throw notFound('User not found.');
      if (acc.status === 'deleted') throw conflict('This account has been deleted.');
      const patch = obj(a.patch, 'patch', ['status', 'plan', 'comp']);
      const notes: string[] = [];
      if (patch.status !== undefined && patch.status !== acc.status) {
        // Erasure only happens by completing a tracked deletion request (SLA + audit, SRS §42).
        if (patch.status === 'deleted') throw conflict('Accounts are deleted by completing their deletion request in Privacy requests.');
        const status = oneOf(patch.status, 'status', ['active', 'deactivated', 'deletion_pending']);
        if (status === 'deletion_pending') {
          need(auth, 'process_data_requests');
          if (!s.privacy.some((p) => p.userId === acc.id && p.type === 'deletion' && p.status !== 'completed')) {
            const req: PrivacyRequest = {
              id: randomId('PR'),
              userId: acc.id,
              type: 'deletion',
              requestedAt: now(),
              dueDate: addDays(todayISO(), PRIVACY_TYPES.deletion.days),
              status: 'new',
              assignee: null,
              channel: 'support',
              log: [{ at: now(), by: actor.name, text: 'Deletion requested through support.' }],
            };
            s.privacy = [req, ...s.privacy];
            store.privacyOpeners.set(req.id, actor.id);
            notes.push(`deletion request ${req.id} opened`);
          }
        } else need(auth, 'manage_user_status');
        setAccountStatus(store, acc, status);
        const syn = store.syntheticUsers.get(acc.id);
        if (syn) store.syntheticUsers.set(acc.id, { ...syn, status });
        notes.unshift(`status → ${status}`);
      }
      if (patch.plan !== undefined || patch.comp !== undefined) {
        need(auth, 'manage_subscriptions');
        const plan = patch.plan === undefined ? undefined : oneOf(patch.plan, 'plan', ['free', 'premium']);
        let comp: { until: string; reason: string } | undefined;
        if (patch.comp !== undefined && patch.comp !== null) {
          const c = obj(patch.comp, 'comp', ['until', 'reason']);
          comp = { until: isoDate(c.until, 'comp.until', { notBefore: todayISO() }), reason: str(c.reason, 'comp.reason', 3, 200).trim() };
        }
        const st = store.userStates.get(acc.id);
        if (st && plan) store.userStates.set(acc.id, { ...st, profile: { ...st.profile, plan } });
        const syn = store.syntheticUsers.get(acc.id);
        if (syn) store.syntheticUsers.set(acc.id, { ...syn, ...(plan ? { plan } : {}), comp: patch.comp === null ? undefined : (comp ?? syn.comp) });
        notes.push(plan ? `plan → ${plan}` : 'complimentary access updated');
      }
      return notes.length ? { action: 'user.update', target: acc.id, detail: notes.join('; ') } : null;
    }

    case 'INVITE_STAFF': {
      need(auth, 'manage_staff');
      // The UI sends a whole StaffMember; only name, email and role are used. The id is generated here,
      // and new staff never start with privileged permissions.
      const m = obj(a.member, 'member', ['id', 'name', 'email', 'role', 'privileges', 'mfaEnabled', 'status', 'lastLogin']);
      const role = roleOf(m.role, 'member.role', STAFF_ROLES);
      const addr = email(m.email, 'member.email');
      const name = staffName(m.name, 'member.name');
      if (store.byEmail(addr)) throw conflict('An account with this email already exists.');
      if (nameTaken(store, name)) throw conflict('Another staff member already has this name — add a surname or an initial.');
      room(staffAccounts(store).length, LIMITS.staff, 'staff');
      const acc = store.addAccount({
        id: randomId('st'),
        email: addr,
        name,
        role,
        status: 'invited',
        passwordHash: null,
        mfaSecret: null,
        mfaLastStep: 0,
        createdAt: now(),
        lastLoginAt: null,
        lastActiveAt: null,
        authMethod: 'email',
        country: 'India',
        synthetic: false,
        trialUsed: false,
      });
      sendInvite(store, acc, origin);
      return { action: 'staff.invite', target: acc.email, detail: role };
    }

    case 'UPDATE_STAFF': {
      need(auth, 'manage_staff');
      const target = store.accounts.get(str(a.id, 'id', 1, 100));
      if (!target || target.role === 'end_user' || target.status === 'deleted') throw notFound('Staff member not found.');
      const patch = obj(a.patch, 'patch', ['role', 'name', 'status', 'privileges']);
      // Work out the requested end state and check it as a whole before anything changes.
      const role = patch.role === undefined ? target.role : roleOf(patch.role, 'role', STAFF_ROLES);
      const wanted = patch.status === undefined ? undefined : oneOf(patch.status, 'status', ['active', 'deactivated']);
      const privileges = role !== 'admin' ? [] : patch.privileges === undefined ? target.privileges : privilegeList(patch.privileges);
      const name = patch.name === undefined ? target.name : staffName(patch.name, 'name');
      const roleChanged = role !== target.role;
      const renamed = name !== target.name;
      const added = privileges.filter((p) => !target.privileges.includes(p));
      const removed = target.privileges.filter((p) => !privileges.includes(p));
      const deactivating = wanted === 'deactivated' && target.status !== 'deactivated';
      const reactivating = wanted === 'active' && target.status === 'deactivated';
      // Every change to a staff account is checked the same way — a new display name included.
      if (roleChanged || renamed || added.length || removed.length || deactivating || reactivating) {
        if (target.id === actor.id) {
          const what = deactivating ? 'deactivate your own account' : roleChanged ? 'change your own role' : added.length || removed.length ? 'change your own permissions' : renamed ? 'rename your own account' : 'change your own account';
          throw forbidden(`You can’t ${what}.`);
        }
        // Nobody changes someone who holds privileged permissions they lack, or hands out ones they lack.
        // With "not yourself", this also means an active Admin holding each privileged permission always remains.
        if (target.privileges.some((p) => !actor.privileges.includes(p))) throw forbidden('This person holds privileged permissions you don’t have, so only an Admin who holds them can change this account.');
        const lacking = added.find((p) => !actor.privileges.includes(p));
        if (lacking) throw forbidden(`You can only grant privileged permissions you hold yourself (${lacking}).`);
      }
      if (renamed && nameTaken(store, name, target.id)) throw conflict('Another staff member already has this name.');
      const changes: string[] = [];
      let action = 'staff.update';
      if (deactivating) {
        // Takes effect now: every session ends and outstanding invite/sign-in links stop working.
        setAccountStatus(store, target, 'deactivated');
        store.dropTokens(target.id, ['invite', 'mfa', 'reset', 'magic']);
        changes.push('deactivated');
        action = 'staff.deactivate';
      } else if (reactivating) {
        if (target.passwordHash && target.mfaSecret) target.status = 'active';
        else {
          target.status = 'invited';
          sendInvite(store, target, origin);
        }
        changes.push(`reactivated (${target.status})`);
        action = 'staff.reactivate';
      }
      if (roleChanged) {
        changes.push(`${ROLE_LABELS[target.role]} → ${ROLE_LABELS[role]}`);
        target.role = role; // takes effect on the target's very next request
        if (action === 'staff.update') action = 'staff.role_change';
      }
      if (added.length || removed.length) {
        target.privileges = privileges;
        changes.push([...added.map((p) => `granted ${p}`), ...removed.map((p) => `removed ${p}`)].join(', '));
        if (action === 'staff.update') action = 'staff.privileges';
      }
      if (renamed) {
        changes.push(`name: ${target.name} → ${name}`);
        target.name = name;
      }
      return changes.length ? { action, target: target.email, detail: changes.join('; ') } : null;
    }

    case 'SET_PERMISSION': {
      need(auth, 'manage_permissions');
      const role = roleOf(a.role, 'role', ALL_ROLES);
      const cap = oneOf(a.cap, 'cap', ALL_CAPABILITIES);
      const granted = bool(a.granted, 'granted');
      if (isPrivileged(cap)) throw forbidden('Privileged permissions are given to individual Admins on the Staff page, never to a whole role.');
      if (isLockedCell(role, cap)) throw forbidden('This permission can’t be changed.');
      // Escalation guard: nobody edits their own role's permissions.
      if (role === actor.role) throw forbidden('You can’t change the permissions of your own role.');
      const cur = s.permissions[role] ?? [];
      if (cur.includes(cap) === granted) return null;
      s.permissions = { ...s.permissions, [role]: granted ? [...cur, cap] : cur.filter((c) => c !== cap) };
      return { action: 'permission.change', target: `${role}.${cap}`, detail: granted ? 'granted' : 'revoked' };
    }

    case 'RESET_PERMISSIONS':
      need(auth, 'manage_permissions');
      s.permissions = Object.fromEntries(Object.entries(DEFAULT_PERMISSIONS).map(([r, caps]) => [r, [...caps]])) as typeof s.permissions;
      return { action: 'permission.reset', target: 'permission matrix' };

    case 'UPDATE_SETTINGS': {
      need(auth, 'manage_settings');
      const st = obj(a.settings, 'settings', ['mfaRequired', 'sessionTimeoutMin', 'passwordMinLength', 'retention', 'privacy', 'environment', 'showEnvBanner']);
      if (st.mfaRequired !== true) throw badRequest('MFA can’t be turned off for staff.');
      const rt = obj(st.retention, 'settings.retention', ['auditMonths', 'deletedBackupDays', 'supportMonths', 'analyticsMonths']);
      const pv = obj(st.privacy, 'settings.privacy', ['discreetDefault', 'analyticsOptInOnly', 'aiPersonalisationDefaultOff']);
      if (pv.analyticsOptInOnly !== true || pv.aiPersonalisationDefaultOff !== true) throw badRequest('Privacy defaults required by the SRS can’t be changed.');
      const next: AdminSettings = {
        mfaRequired: true,
        sessionTimeoutMin: Number(oneOf(String(st.sessionTimeoutMin), 'sessionTimeoutMin', ['5', '15', '30'])) as AdminSettings['sessionTimeoutMin'],
        passwordMinLength: num(st.passwordMinLength, 'passwordMinLength', 8, 64, true),
        retention: {
          auditMonths: nullableInt(rt.auditMonths, 'retention.auditMonths', 1, 1200),
          deletedBackupDays: nullableInt(rt.deletedBackupDays, 'retention.deletedBackupDays', 1, 3650),
          supportMonths: nullableInt(rt.supportMonths, 'retention.supportMonths', 1, 1200),
          analyticsMonths: nullableInt(rt.analyticsMonths, 'retention.analyticsMonths', 1, 1200),
        },
        privacy: { discreetDefault: bool(pv.discreetDefault, 'privacy.discreetDefault'), analyticsOptInOnly: true, aiPersonalisationDefaultOff: true },
        environment: oneOf(st.environment, 'environment', ['development', 'staging', 'production']),
        showEnvBanner: bool(st.showEnvBanner, 'showEnvBanner'),
      };
      if (JSON.stringify(next) === JSON.stringify(s.settings)) return null;
      s.settings = next;
      return { action: 'settings.update', target: 'admin settings' };
    }

    case 'UPDATE_FLAG': {
      need(auth, 'manage_flags');
      const key = str(a.key, 'key', 1, 80);
      const env = oneOf(a.env, 'env', ENVS);
      const p = obj(a.patch, 'patch', ['enabled', 'rollout']);
      const patch = { ...(p.enabled !== undefined ? { enabled: bool(p.enabled, 'patch.enabled') } : {}), ...(p.rollout !== undefined ? { rollout: num(p.rollout, 'patch.rollout', 0, 100, true) } : {}) };
      const f = s.flags.find((x) => x.key === key);
      if (!f) throw notFound('Flag not found.');
      if (Object.entries(patch).every(([k, v]) => f.env[env][k as 'enabled' | 'rollout'] === v)) return null;
      s.flags = s.flags.map((x) => (x.key === key ? { ...x, env: { ...x.env, [env]: { ...x.env[env], ...patch } }, lastChangedBy: actor.name, lastChangedAt: now() } : x));
      return { action: 'flag.update', target: `${key} (${env})`, detail: JSON.stringify(patch) };
    }

    case 'TOGGLE_RULE': {
      need(auth, 'manage_config');
      const rid = str(a.id, 'id', 1, 80);
      if (!s.rules.some((r) => r.id === rid)) throw notFound('Rule not found.');
      s.rules = s.rules.map((r) => (r.id === rid ? { ...r, enabled: !r.enabled } : r));
      return { action: 'config.rule_toggle', target: rid };
    }
    case 'ADD_SYMPTOM': {
      need(auth, 'manage_config');
      const label = str(a.label, 'label', 2, 40).trim();
      const category = oneOf(a.category, 'category', SYMPTOM_CATEGORIES.map((c) => c.key));
      if (s.customSymptoms.some((x) => sameName(x.label, label))) throw conflict('That symptom already exists.');
      room(s.customSymptoms.length, LIMITS.customSymptoms, 'custom symptom');
      s.customSymptoms = [...s.customSymptoms, { id: randomId('adm_sym'), label, category }];
      return { action: 'config.symptom_add', target: label };
    }
    case 'SET_DEFAULTS': {
      need(auth, 'manage_config');
      const d = obj(a.defaults, 'defaults', ['waterMl', 'sleepHours']);
      const next = { waterMl: num(d.waterMl, 'waterMl', 500, 6000, true), sleepHours: num(d.sleepHours, 'sleepHours', 5, 12) };
      if (next.waterMl === s.defaults.waterMl && next.sleepHours === s.defaults.sleepHours) return null;
      s.defaults = next;
      return { action: 'config.defaults', target: 'tracking defaults' };
    }

    case 'UPSERT_SUPPORT': {
      need(auth, 'manage_support');
      // Requests are opened by app users and the contact form; staff update status, priority, assignee and notes.
      const r = obj(a.request, 'request');
      const existing = s.support.find((x) => x.id === str(r.id, 'request.id', 1, 80));
      if (!existing) throw notFound('Support request not found.');
      const next: SupportRequest = {
        ...existing,
        status: oneOf(r.status, 'request.status', ['open', 'in_progress', 'resolved']),
        priority: oneOf(r.priority, 'request.priority', ['low', 'normal', 'high']),
        assignee: assigneeOf(store, r.assignee, existing.assignee),
        notes: [...existing.notes, ...appended(r.notes, existing.notes.length, 'request.notes', 1000, actor.name)],
      };
      if (JSON.stringify(next) === JSON.stringify(existing)) return null;
      s.support = s.support.map((x) => (x.id === existing.id ? next : x));
      return { action: 'support.update', target: existing.id, detail: next.status };
    }

    case 'UPSERT_TEMPLATE': {
      need(auth, 'edit_templates', 'review_templates');
      const t = obj(a.template, 'template');
      const existing = s.templates.find((x) => x.key === t.key);
      if (!existing) throw notFound('Template not found.');
      const title = str(t.title, 'template.title', 1, 120);
      const body = str(t.body, 'template.body', 1, 400);
      const discreetBody = str(t.discreetBody, 'template.discreetBody', 1, 400);
      const status = oneOf(t.status, 'template.status', ['live', 'pending_review']);
      const liveUnchanged = title === existing.title && body === existing.body && discreetBody === existing.discreetBody;
      let next: NotificationTemplate;
      let action: string;
      if (status === 'pending_review') {
        need(auth, 'edit_templates');
        if (!liveUnchanged) throw conflict('Put the new wording in the proposal — the live copy changes only when it’s approved.');
        const p = obj(t.proposed, 'template.proposed');
        next = { ...existing, status: 'pending_review', proposed: { title: str(p.title, 'proposed.title', 1, 120).trim(), body: str(p.body, 'proposed.body', 1, 400).trim(), by: actor.name, at: now() } };
        store.templateProposers.set(existing.key, actor.id);
        action = 'template.propose';
      } else if (existing.status === 'pending_review' && existing.proposed) {
        const proposal = existing.proposed;
        if (liveUnchanged) {
          need(auth, 'review_templates', 'edit_templates');
          next = { ...existing, status: 'live', proposed: undefined };
          action = 'template.reject_proposal';
        } else if (title === proposal.title && body === proposal.body && discreetBody === existing.discreetBody) {
          // Approval publishes exactly the reviewed proposal — never other text from the request.
          if (existing.healthRelated) {
            need(auth, 'review_templates');
            const proposerId = store.templateProposers.get(existing.key);
            if (proposerId ? proposerId === actor.id : sameName(proposal.by, actor.name)) throw forbidden('Health-related copy must be approved by a different reviewer.');
          } else need(auth, 'edit_templates', 'review_templates');
          next = { ...existing, title: proposal.title, body: proposal.body, status: 'live', proposed: undefined, lastReviewedBy: actor.name, lastReviewedAt: now(), version: existing.version + 1 };
          action = 'template.approve';
        } else throw conflict('Approve the proposed wording as it is, or reject it and propose new wording.');
        store.templateProposers.delete(existing.key);
      } else {
        need(auth, 'edit_templates');
        if (liveUnchanged) return null;
        if (existing.healthRelated) throw forbidden('Health-related copy must go through medical review.');
        next = { ...existing, title, body, discreetBody, status: 'live', version: existing.version + 1 };
        action = 'template.edit';
      }
      s.templates = s.templates.map((x) => (x.key === next.key ? next : x));
      return { action, target: existing.label };
    }

    case 'UPSERT_CAMPAIGN': {
      need(auth, 'manage_notifications');
      const c = obj(a.campaign, 'campaign');
      const id = str(c.id, 'campaign.id', 1, 80);
      if (!SAFE_ID.test(id)) throw badRequest('campaign.id may only contain letters, digits, “_” and “-”.');
      const existing = s.campaigns.find((x) => x.id === id);
      if (existing?.status === 'sent') throw conflict('A sent campaign can’t be changed.');
      const status = oneOf(c.status, 'campaign.status', ['draft', 'scheduled', 'sent', 'cancelled']);
      if (status === 'sent') throw new HttpError(501, 'not_configured', 'Sending needs a push-notification provider, which isn’t configured in this environment. Save it as a draft or schedule it.');
      // Targeting may use account attributes only — never health data (SRS §41, G7).
      const seg = obj(c.segment, 'campaign.segment', ['plan', 'countries', 'language', 'lastActive', 'appVersion']);
      const segment: CampaignSegment = {
        plan: oneOf(seg.plan, 'segment.plan', ['any', 'free', 'premium']),
        countries: [...new Set(arr(seg.countries, 'segment.countries', 50).map((x, i) => str(x, `segment.countries[${i}]`, 1, 60).trim()))],
        language: str(seg.language, 'segment.language', 1, 40),
        lastActive: oneOf(seg.lastActive, 'segment.lastActive', ['any', '7d', '30d', 'inactive_30d']),
        appVersion: oneOf(seg.appVersion, 'segment.appVersion', ['any', '1.2+', '1.3+']),
      };
      let schedule: string | null = null;
      if (c.schedule !== null && c.schedule !== undefined) {
        if (typeof c.schedule !== 'string' || c.schedule.length > 40 || Number.isNaN(Date.parse(c.schedule))) throw badRequest('campaign.schedule must be a date-time.');
        schedule = c.schedule;
      }
      if (status === 'scheduled' && (!schedule || Date.parse(schedule) <= Date.now())) throw badRequest('Choose a future time to schedule the campaign.');
      if (!existing) room(s.campaigns.length, LIMITS.campaigns, 'campaign');
      const next: Campaign = {
        id,
        name: str(c.name, 'campaign.name', 2, 100).trim(),
        title: str(c.title, 'campaign.title', 2, 120).trim(),
        body: str(c.body, 'campaign.body', 2, 400).trim(),
        segment,
        schedule,
        status,
        createdBy: existing?.createdBy ?? actor.name,
        createdAt: existing?.createdAt ?? now(),
        // Reach is counted by the server from account attributes; delivery stats come only from a provider.
        reach: reachOf(store, segment),
        delivered: existing?.delivered,
        opened: existing?.opened,
      };
      s.campaigns = existing ? s.campaigns.map((x) => (x.id === id ? next : x)) : [next, ...s.campaigns];
      return { action: existing ? 'campaign.update' : 'campaign.create', target: next.name, detail: status };
    }

    case 'ADD_REFUND': {
      need(auth, 'manage_subscriptions');
      const r = obj(a.refund, 'refund');
      const acc = store.accounts.get(str(r.userId, 'refund.userId', 1, 100));
      if (!acc || acc.role !== 'end_user' || acc.status === 'deleted') throw notFound('User not found.');
      room(s.refunds.length, LIMITS.refunds, 'refund');
      const refund = { id: randomId('rf'), userId: acc.id, userName: acc.name, amount: num(r.amount, 'refund.amount', 0.01, 1000), reason: str(r.reason, 'refund.reason', 3, 300).trim(), at: now(), by: actor.name };
      s.refunds = [refund, ...s.refunds];
      return { action: 'subscription.refund', target: acc.id, detail: `${refund.amount}` };
    }

    case 'UPSERT_PRIVACY': {
      need(auth, 'process_data_requests');
      const r = obj(a.request, 'request');
      const existing = s.privacy.find((x) => x.id === r.id);
      if (!existing) throw notFound('Request not found.');
      const status = oneOf(r.status, 'request.status', ['new', 'in_progress', 'completed']);
      const order = { new: 0, in_progress: 1, completed: 2 };
      if (order[status] < order[existing.status]) throw conflict('Requests can’t move backwards.');
      if (existing.status === 'completed') throw conflict('This request is already completed.');
      // Two-person rule: an erasure a staff member asked for is completed by someone else.
      if (status === 'completed' && existing.type === 'deletion' && store.privacyOpeners.get(existing.id) === actor.id) {
        throw forbidden('A deletion you opened must be completed by another Admin (two-person rule).');
      }
      const next: PrivacyRequest = {
        ...existing,
        status,
        assignee: r.assignee === undefined ? existing.assignee : assigneeOf(store, r.assignee, existing.assignee),
        log: [...existing.log, ...appended(r.log, existing.log.length, 'request.log', 500, actor.name)],
        completedAt: status === 'completed' ? now() : existing.completedAt,
      };
      if (JSON.stringify(next) === JSON.stringify(existing)) return null;
      s.privacy = s.privacy.map((x) => (x.id === next.id ? next : x));
      if (status === 'completed') completePrivacyRequest(store, existing);
      return { action: `privacy.${status}`, target: existing.id, detail: existing.type };
    }

    case 'ADD_MEDIA': {
      need(auth, 'edit_content');
      // Metadata only — there is no file storage in this environment.
      const m = obj(a.asset, 'asset');
      const mime = str(m.mime, 'asset.mime', 3, 60);
      const kind = mediaKindOf(mime);
      const rules = MEDIA_UPLOAD_RULES[kind];
      if (!rules.types.includes(mime)) throw badRequest(`Unsupported file type. Allowed: ${rules.label}.`);
      room(s.media.length, LIMITS.media, 'media');
      const asset = {
        id: typeof m.id === 'string' && SAFE_ID.test(m.id) && !s.media.some((x) => x.id === m.id) ? m.id : randomId('md'),
        name: str(m.name, 'asset.name', 1, 120).trim(),
        kind,
        mime,
        size: num(m.size, 'asset.size', 1, rules.max, true),
        uploadedAt: now(),
        uploadedBy: actor.name,
        alt: optStr(m.alt, 'asset.alt', 200),
        duration: optStr(m.duration, 'asset.duration', 20),
      };
      s.media = [asset, ...s.media];
      return { action: 'media.upload', target: asset.name };
    }
    case 'UPDATE_MEDIA': {
      need(auth, 'edit_content');
      const mid = str(a.id, 'id', 1, 80);
      const patch = obj(a.patch, 'patch', ['alt', 'name']);
      if (!s.media.some((m) => m.id === mid)) throw notFound('File not found.');
      s.media = s.media.map((m) => (m.id === mid ? { ...m, ...(patch.alt !== undefined ? { alt: optStr(patch.alt, 'alt', 200) } : {}), ...(patch.name !== undefined ? { name: str(patch.name, 'name', 1, 120).trim() } : {}) } : m));
      return { action: 'media.update', target: mid };
    }
    case 'DELETE_MEDIA': {
      need(auth, 'edit_content');
      const mid = str(a.id, 'id', 1, 80);
      const m = s.media.find((x) => x.id === mid);
      if (!m) throw notFound('File not found.');
      if (s.content.some((c) => c.media?.name === m.name && c.status !== 'archived')) throw conflict('This file is used by content — replace it there first.');
      s.media = s.media.filter((x) => x.id !== mid);
      return { action: 'media.delete', target: m.name };
    }
    case 'SET_TAXONOMY': {
      need(auth, 'edit_content');
      const t = obj(a.taxonomy, 'taxonomy', ['categories', 'tags']);
      const categories: TaxonomyCategory[] = arr(t.categories, 'taxonomy.categories', 60).map((c, i) => {
        const o = obj(c, `taxonomy.categories[${i}]`, ['key', 'label', 'subs', 'builtIn']);
        const key = str(o.key, `taxonomy.categories[${i}].key`, 1, 60);
        if (!SAFE_ID.test(key)) throw badRequest(`taxonomy.categories[${i}].key may only contain letters, digits, “_” and “-”.`);
        const subs = arr(o.subs, `taxonomy.categories[${i}].subs`, 60).map((x, j) => str(x, `taxonomy.categories[${i}].subs[${j}]`, 1, 80).trim());
        return { key, label: str(o.label, `taxonomy.categories[${i}].label`, 1, 60).trim(), subs: [...new Set(subs)], builtIn: BUILT_IN_CATEGORIES.has(key) };
      });
      if (new Set(categories.map((c) => c.key)).size !== categories.length) throw badRequest('Category keys must be unique.');
      if ([...BUILT_IN_CATEGORIES].some((k) => !categories.some((c) => c.key === k))) throw conflict('Built-in categories can’t be removed.');
      const tags = [...new Set(arr(t.tags, 'taxonomy.tags', 200).map((x, i) => str(x, `taxonomy.tags[${i}]`, 1, 40).trim()))];
      const next = { categories, tags };
      if (JSON.stringify(next) === JSON.stringify(s.taxonomy)) return null;
      s.taxonomy = next;
      return { action: 'taxonomy.update', target: 'categories & tags' };
    }

    case 'UPDATE_ACCOUNT': {
      // Staff preferences — only your own. Sessions and password dates are server facts (see /v1/auth/*).
      if (str(a.email, 'email', 3, 254).toLowerCase() !== actor.email) throw forbidden('You can only change your own account.');
      const p = obj(a.patch, 'patch', ['language', 'timezone', 'reviewAlerts', 'weeklyDigest']);
      const cur: StaffAccount = s.accounts[actor.email] ?? defaultAccount();
      const next: StaffAccount = {
        ...cur,
        ...(p.language !== undefined ? { language: str(p.language, 'language', 1, 40) } : {}),
        ...(p.timezone !== undefined ? { timezone: str(p.timezone, 'timezone', 1, 60) } : {}),
        ...(p.reviewAlerts !== undefined ? { reviewAlerts: bool(p.reviewAlerts, 'reviewAlerts') } : {}),
        ...(p.weeklyDigest !== undefined ? { weeklyDigest: bool(p.weeklyDigest, 'weeklyDigest') } : {}),
      };
      if (JSON.stringify(next) === JSON.stringify(cur) && s.accounts[actor.email]) return null;
      s.accounts = { ...s.accounts, [actor.email]: next };
      return { action: 'account.preferences', target: actor.email };
    }

    case 'LOG':
      // Audit entries are written by the server for every accepted action; client-written entries are ignored.
      return null;

    default:
      throw badRequest(`Unknown or disallowed admin action “${type || '(missing)'}”.`);
  }
}

function sendInvite(store: Store, acc: Account, origin: string) {
  store.dropTokens(acc.id, ['invite']);
  const raw = randomToken();
  store.issueToken('invite', acc.id, 7 * 86400_000, raw);
  store.outbox.unshift({ at: now(), to: acc.email, subject: 'You’re invited to HealthX Admin', link: `${origin}/admin/accept-invite?token=${raw}` });
}

/** App users a campaign segment matches (account attributes only). */
function reachOf(store: Store, seg: CampaignSegment): number {
  const cutoff = (days: number) => Date.now() - days * 86400_000;
  return appUsers(store).filter((acc) => {
    if (acc.status !== 'active') return false;
    const syn = store.syntheticUsers.get(acc.id);
    const plan = syn?.plan ?? store.userStates.get(acc.id)?.profile.plan ?? 'free';
    const country = syn?.country ?? acc.country;
    const last = Date.parse(syn?.lastActive ?? acc.lastActiveAt ?? acc.createdAt);
    if (seg.plan !== 'any' && plan !== seg.plan) return false;
    if (seg.countries.length && !seg.countries.includes(country)) return false;
    if (seg.lastActive === '7d' && !(last >= cutoff(7))) return false;
    if (seg.lastActive === '30d' && !(last >= cutoff(30))) return false;
    if (seg.lastActive === 'inactive_30d' && !(last < cutoff(30))) return false;
    return true;
  }).length;
}

/** What completing a request does on the server: deletion erases the account; consent withdrawal turns the consent off. */
function completePrivacyRequest(store: Store, req: PrivacyRequest) {
  const acc = store.accounts.get(req.userId);
  if (!acc || acc.role !== 'end_user' || acc.status === 'deleted') return;
  if (req.type === 'deletion') setAccountStatus(store, acc, 'deleted');
  if (req.type === 'consent_withdrawal' && req.consent) {
    const st = store.userStates.get(acc.id);
    if (st) store.userStates.set(acc.id, reducer(st, { type: 'SET_CONSENT', id: CONSENT_IDS[req.consent], granted: false } as Parameters<typeof reducer>[1]));
    const syn = store.syntheticUsers.get(acc.id);
    if (syn) store.syntheticUsers.set(acc.id, { ...syn, consents: { ...syn.consents, [req.consent]: false } });
  }
}
