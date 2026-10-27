/**
 * Admin state model + pure reducer, shared by the Web Admin (offline demo mode and
 * optimistic updates) and the API (which owns the authoritative copy and decides,
 * per action, whether the signed-in staff member may perform it).
 */
import { defaultPlanLibrary, type PlanTemplate, type PlanTemplateStatus } from '../plan';
import { DEFAULT_WEIGHTS } from '../state';
import type { SymptomCategory, WellnessWeights } from '../types';
import {
  defaultAccount,
  DEFAULT_SETTINGS,
  nowIso,
  seedAudit,
  seedCampaigns,
  seedContent,
  seedFlags,
  seedMedia,
  seedPrivacyRequests,
  seedRefunds,
  seedRules,
  seedStaff,
  seedSupport,
  seedTaxonomy,
  seedTemplates,
  seedUsers,
  type AdminSettings,
  type AdminUser,
  type AuditEntry,
  type Campaign,
  type ContentItem,
  type FeatureFlag,
  type InsightRule,
  type MediaAsset,
  type NotificationTemplate,
  type PrivacyRequest,
  type Refund,
  type StaffAccount,
  type StaffMember,
  type SupportRequest,
  type Taxonomy,
} from './data';
import {
  DEFAULT_PERMISSIONS,
  isLockedCell,
  isPrivileged,
  migratePermissionMatrix,
  migrateRole,
  privilegesForLegacyRole,
  type Capability,
  type PermissionMatrix,
  type PrivilegedCapability,
  type StaffRole,
} from './rbac';

/** v4: the four SRS roles (v3 had seven roles; see migrateAdminState). */
export const ADMIN_STATE_VERSION = 4;
const VERSION = ADMIN_STATE_VERSION;

export interface AdminSession {
  name: string;
  email: string;
  role: StaffRole;
  /** Admin only: privileged permissions this person holds (see PRIVILEGED_CAPABILITIES). */
  privileges: PrivilegedCapability[];
  signedInAt: string;
}

export interface AdminState {
  version: number;
  session: AdminSession | null;
  permissions: PermissionMatrix;
  settings: AdminSettings;
  content: ContentItem[];
  users: AdminUser[];
  staff: StaffMember[];
  flags: FeatureFlag[];
  audit: AuditEntry[];
  rules: InsightRule[];
  customSymptoms: { id: string; label: string; category: SymptomCategory }[];
  defaults: { waterMl: number; sleepHours: number };
  support: SupportRequest[];
  templates: NotificationTemplate[];
  campaigns: Campaign[];
  refunds: Refund[];
  privacy: PrivacyRequest[];
  media: MediaAsset[];
  taxonomy: Taxonomy;
  /** Per-staff account preferences, keyed by staff email. */
  accounts: Record<string, StaffAccount>;
  /** Wellness Score weighting used by the app (SRS §31: configurable). */
  scoreWeights: WellnessWeights;
  /** Daily-plan template library (SRS §33). Only approved templates reach the app. */
  planTemplates: PlanTemplate[];
}

type Env = 'dev' | 'staging' | 'prod';

export type AdminAction =
  | { type: 'SIGN_IN'; session: AdminSession }
  | { type: 'SIGN_OUT' }
  | { type: 'UPSERT_CONTENT'; item: ContentItem }
  | { type: 'UPDATE_USER'; id: string; patch: Partial<AdminUser> }
  | { type: 'INVITE_STAFF'; member: StaffMember }
  | { type: 'UPDATE_STAFF'; id: string; patch: Partial<StaffMember> }
  | { type: 'SET_PERMISSION'; role: StaffRole; cap: Capability; granted: boolean }
  | { type: 'RESET_PERMISSIONS' }
  | { type: 'UPDATE_SETTINGS'; settings: AdminSettings }
  | { type: 'UPDATE_FLAG'; key: string; env: Env; patch: Partial<{ enabled: boolean; rollout: number }>; by: string }
  | { type: 'TOGGLE_RULE'; id: string }
  | { type: 'ADD_SYMPTOM'; label: string; category: SymptomCategory }
  | { type: 'SET_DEFAULTS'; defaults: AdminState['defaults'] }
  | { type: 'UPSERT_SUPPORT'; request: SupportRequest }
  | { type: 'UPSERT_TEMPLATE'; template: NotificationTemplate }
  | { type: 'UPSERT_CAMPAIGN'; campaign: Campaign }
  | { type: 'ADD_REFUND'; refund: Refund }
  | { type: 'UPSERT_PRIVACY'; request: PrivacyRequest }
  | { type: 'ADD_MEDIA'; asset: MediaAsset }
  | { type: 'UPDATE_MEDIA'; id: string; patch: Partial<MediaAsset> }
  | { type: 'DELETE_MEDIA'; id: string }
  | { type: 'SET_TAXONOMY'; taxonomy: Taxonomy }
  | { type: 'UPDATE_ACCOUNT'; email: string; patch: Partial<StaffAccount> }
  | { type: 'SET_SCORE_WEIGHTS'; weights: WellnessWeights }
  | { type: 'UPSERT_PLAN_TEMPLATE'; template: PlanTemplate }
  | { type: 'SET_PLAN_TEMPLATE_STATUS'; id: string; status: Extract<PlanTemplateStatus, 'retired' | 'in_review'> }
  | { type: 'REVIEW_PLAN_TEMPLATE'; id: string; decision: 'approve' | 'changes'; note?: string; by: string }
  | { type: 'DELIVER_CAMPAIGN'; id: string }
  | { type: 'LOG'; entry: Omit<AuditEntry, 'id' | 'at' | 'ip'> }
  | { type: 'RESET' };

export function initialAdminState(): AdminState {
  const users = seedUsers();
  const content = seedContent();
  return {
    version: VERSION,
    session: null,
    permissions: defaultMatrix(),
    settings: DEFAULT_SETTINGS,
    content,
    users,
    staff: seedStaff(),
    flags: seedFlags(),
    audit: seedAudit(),
    rules: seedRules(),
    customSymptoms: [],
    defaults: { waterMl: 2400, sleepHours: 7.5 },
    support: seedSupport(users),
    templates: seedTemplates(),
    campaigns: seedCampaigns(),
    refunds: seedRefunds(users),
    privacy: seedPrivacyRequests(users),
    media: seedMedia(content),
    taxonomy: seedTaxonomy(),
    accounts: {},
    scoreWeights: { ...DEFAULT_WEIGHTS },
    planTemplates: defaultPlanLibrary(),
  };
}

const defaultMatrix = (): PermissionMatrix => Object.fromEntries(Object.entries(DEFAULT_PERMISSIONS).map(([r, caps]) => [r, [...caps]])) as PermissionMatrix;

let seq = 0;
const upsert = <T,>(list: T[], item: T, same: (x: T) => boolean) => (list.some(same) ? list.map((x) => (same(x) ? item : x)) : [item, ...list]);

export function adminReducer(s: AdminState, a: AdminAction): AdminState {
  switch (a.type) {
    case 'SIGN_IN':
      return { ...s, session: a.session };
    case 'SIGN_OUT':
      return { ...s, session: null };
    case 'UPSERT_CONTENT':
      return { ...s, content: upsert(s.content, a.item, (c) => c.id === a.item.id) };
    case 'UPDATE_USER':
      return { ...s, users: s.users.map((u) => (u.id === a.id ? { ...u, ...a.patch } : u)) };
    case 'INVITE_STAFF':
      // New staff start without privileged permissions.
      return { ...s, staff: [...s.staff, { ...a.member, privileges: [] }] };
    case 'UPDATE_STAFF':
      return {
        ...s,
        staff: s.staff.map((m) => {
          if (m.id !== a.id) return m;
          const next = { ...m, ...a.patch };
          // Privileged permissions exist only on Admin accounts.
          return { ...next, privileges: next.role === 'admin' ? (next.privileges ?? []).filter(isPrivileged) : [] };
        }),
      };
    case 'SET_PERMISSION': {
      if (isLockedCell(a.role, a.cap)) return s;
      const current = s.permissions[a.role] ?? [];
      const next = a.granted ? [...new Set([...current, a.cap])] : current.filter((c) => c !== a.cap);
      return { ...s, permissions: { ...s.permissions, [a.role]: next } };
    }
    case 'RESET_PERMISSIONS':
      return { ...s, permissions: defaultMatrix() };
    case 'UPDATE_SETTINGS':
      return { ...s, settings: a.settings };
    case 'UPDATE_FLAG':
      return {
        ...s,
        flags: s.flags.map((f) =>
          f.key === a.key ? { ...f, env: { ...f.env, [a.env]: { ...f.env[a.env], ...a.patch } }, lastChangedBy: a.by, lastChangedAt: nowIso() } : f,
        ),
      };
    case 'TOGGLE_RULE':
      return { ...s, rules: s.rules.map((r) => (r.id === a.id ? { ...r, enabled: !r.enabled } : r)) };
    case 'ADD_SYMPTOM':
      return { ...s, customSymptoms: [...s.customSymptoms, { id: `adm_sym_${Date.now().toString(36)}`, label: a.label, category: a.category }] };
    case 'SET_DEFAULTS':
      return { ...s, defaults: a.defaults };
    case 'UPSERT_SUPPORT':
      return { ...s, support: upsert(s.support, a.request, (r) => r.id === a.request.id) };
    case 'UPSERT_TEMPLATE':
      return { ...s, templates: upsert(s.templates, a.template, (t) => t.key === a.template.key) };
    case 'UPSERT_CAMPAIGN':
      return { ...s, campaigns: upsert(s.campaigns, a.campaign, (c) => c.id === a.campaign.id) };
    case 'ADD_REFUND':
      return { ...s, refunds: [a.refund, ...s.refunds] };
    case 'UPSERT_PRIVACY':
      return { ...s, privacy: upsert(s.privacy, a.request, (r) => r.id === a.request.id) };
    case 'ADD_MEDIA':
      return { ...s, media: [a.asset, ...s.media] };
    case 'UPDATE_MEDIA':
      return { ...s, media: s.media.map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) };
    case 'DELETE_MEDIA':
      return { ...s, media: s.media.filter((m) => m.id !== a.id) };
    case 'SET_TAXONOMY':
      return { ...s, taxonomy: a.taxonomy };
    case 'UPDATE_ACCOUNT':
      return { ...s, accounts: { ...s.accounts, [a.email]: { ...(s.accounts[a.email] ?? defaultAccount()), ...a.patch } } };
    case 'SET_SCORE_WEIGHTS':
      return { ...s, scoreWeights: { ...a.weights } };
    case 'UPSERT_PLAN_TEMPLATE':
      return { ...s, planTemplates: upsert(s.planTemplates, a.template, (t) => t.id === a.template.id) };
    case 'SET_PLAN_TEMPLATE_STATUS':
      return { ...s, planTemplates: s.planTemplates.map((t) => (t.id === a.id ? { ...t, status: a.status, updatedAt: nowIso() } : t)) };
    case 'REVIEW_PLAN_TEMPLATE':
      return {
        ...s,
        planTemplates: s.planTemplates.map((t) =>
          t.id === a.id ? { ...t, status: a.decision === 'approve' ? 'approved' : 'changes_requested', reviewedBy: a.by, reviewedAt: nowIso(), reviewNote: a.note } : t,
        ),
      };
    case 'DELIVER_CAMPAIGN':
      // Offline demo: nothing is delivered to real inboxes; the campaign is marked sent in-app.
      return { ...s, campaigns: s.campaigns.map((c) => (c.id === a.id ? { ...c, status: 'sent', channel: 'in_app', sentAt: nowIso(), delivered: c.reach } : c)) };
    case 'LOG': {
      seq += 1;
      return { ...s, audit: [{ ...a.entry, id: `au_${Date.now().toString(36)}_${seq}`, at: nowIso(), ip: '192.0.2.10 (demo)' }, ...s.audit] };
    }
    case 'RESET':
      return { ...initialAdminState(), session: s.session };
    default:
      return s;
  }
}

/**
 * Brings a stored admin state up to the current version; null when it can't be used.
 * v3 → v4 is the seven-to-four role consolidation: staff and the session move to the canonical
 * roles (a former Super Admin keeps those powers as an Admin's privileged permissions; former
 * Support Agents and Analysts become Admins without them), the permission matrix is migrated,
 * and history/audit entries keep the role they were written with.
 */
export function migrateAdminState(raw: unknown): AdminState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = withNewSlices(raw as AdminState);
  if (s.version === ADMIN_STATE_VERSION) return s;
  if (s.version !== 3 || !Array.isArray(s.staff)) return null;
  const staff: StaffMember[] = [];
  for (const old of s.staff as (StaffMember & { role: string; privileges?: string[] })[]) {
    const role = migrateRole(old.role);
    if (!role) continue;
    // Only a former Super Admin carries privileged permissions over.
    const privileges = role === 'admin' ? privilegesForLegacyRole(old.role) : [];
    staff.push({ ...old, role, privileges });
  }
  const oldSession = s.session as (Omit<AdminSession, 'privileges'> & { role: string }) | null;
  const sessionRole = oldSession ? migrateRole(oldSession.role) : null;
  const session: AdminSession | null =
    oldSession && sessionRole
      ? { ...oldSession, role: sessionRole, privileges: sessionRole === 'admin' ? (staff.find((m) => m.email === oldSession.email)?.privileges ?? privilegesForLegacyRole(oldSession.role)) : [] }
      : null;
  return { ...s, version: ADMIN_STATE_VERSION, staff, session, permissions: migratePermissionMatrix(s.permissions) };
}

/** Slices added after v4 shipped (Daily plans, configurable score weights): filled in on load. */
function withNewSlices(s: AdminState): AdminState {
  return {
    ...s,
    scoreWeights: s.scoreWeights ?? { ...DEFAULT_WEIGHTS },
    planTemplates: Array.isArray(s.planTemplates) ? s.planTemplates : defaultPlanLibrary(),
  };
}
