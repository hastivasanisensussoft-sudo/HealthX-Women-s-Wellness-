/**
 * Role & permission model — exactly the four SRS roles (§6.1–§6.4), shared by the Web Admin UI and
 * the API. The API enforces it server-side on every request; UI checks only hide controls.
 *
 * Seven roles were consolidated into these four on 2026-10-26 (see LEGACY_ROLES): Super Admin,
 * Support Agent and Analyst became Admin; Medical Reviewer was renamed Medical Content Reviewer.
 * The §40 compliance step is an Admin capability (D-08 option B).
 */
export type StaffRole = 'end_user' | 'content_manager' | 'medical_content_reviewer' | 'admin';

export type Capability =
  | 'admin_access'
  | 'view_analytics'
  | 'export_reports'
  | 'view_content'
  | 'edit_content'
  | 'medical_review'
  | 'compliance_review'
  | 'publish_content'
  | 'view_notifications'
  | 'manage_notifications'
  | 'edit_templates'
  | 'review_templates'
  | 'view_users'
  | 'manage_user_status'
  | 'process_data_requests'
  | 'resend_verification'
  | 'break_glass'
  | 'manage_support'
  | 'manage_subscriptions'
  | 'view_staff'
  | 'manage_staff'
  | 'manage_permissions'
  | 'manage_config'
  | 'manage_flags'
  | 'view_audit'
  | 'view_settings'
  | 'manage_settings';

export type PermissionMatrix = Record<StaffRole, Capability[]>;

/** The four permanent roles, in SRS order (§6.1 → §6.4). */
export const ALL_ROLES: StaffRole[] = ['end_user', 'content_manager', 'medical_content_reviewer', 'admin'];
export const STAFF_ROLES = ALL_ROLES.filter((r) => r !== 'end_user');
export const ALL_CAPABILITIES: Capability[] = [
  'admin_access', 'view_analytics', 'export_reports', 'view_content', 'edit_content', 'medical_review', 'compliance_review', 'publish_content',
  'view_notifications', 'manage_notifications', 'edit_templates', 'review_templates', 'view_users', 'manage_user_status', 'process_data_requests',
  'resend_verification', 'break_glass', 'manage_support', 'manage_subscriptions', 'view_staff', 'manage_staff', 'manage_permissions',
  'manage_config', 'manage_flags', 'view_audit', 'view_settings', 'manage_settings',
];

export const isStaffRole = (v: unknown): v is StaffRole => typeof v === 'string' && (ALL_ROLES as string[]).includes(v);

/** Canonical role names (SRS §6.1–§6.4) — used verbatim by the API and the UI. */
export const ROLE_LABELS: Record<StaffRole, string> = {
  end_user: 'End User',
  content_manager: 'Content Manager',
  medical_content_reviewer: 'Medical Content Reviewer',
  admin: 'Admin',
};

/**
 * Admin operations that are never granted by role. Each Admin account holds them individually,
 * so the most sensitive powers stay with named people inside the single Admin role.
 */
export const PRIVILEGED_CAPABILITIES = ['manage_staff', 'manage_permissions', 'manage_settings', 'break_glass'] as const satisfies readonly Capability[];
export type PrivilegedCapability = (typeof PRIVILEGED_CAPABILITIES)[number];
export const isPrivileged = (c: string): c is PrivilegedCapability => (PRIVILEGED_CAPABILITIES as readonly string[]).includes(c);

/** Clinical sign-off belongs to the Medical Content Reviewer role only (§6.3, §40). */
export const CLINICAL_CAPABILITIES: Capability[] = ['medical_review', 'review_templates'];

const all = ALL_CAPABILITIES;

/**
 * Default matrix.
 * - Admin: every operational capability (former Super Admin, Admin, Support Agent and Analyst
 *   functions) except clinical sign-off and the per-account privileged permissions.
 * - Content Manager: write, categorise and schedule/publish content that has passed review (§6.2).
 * - Medical Content Reviewer: review content and health-related copy (§6.3).
 */
export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  end_user: [],
  content_manager: ['admin_access', 'view_content', 'edit_content', 'publish_content', 'view_notifications', 'edit_templates'],
  medical_content_reviewer: ['admin_access', 'view_content', 'medical_review', 'view_notifications', 'review_templates'],
  admin: all.filter((c) => !CLINICAL_CAPABILITIES.includes(c) && !isPrivileged(c)),
};

/**
 * Cells that can't be toggled in the matrix:
 * - End User has no admin capabilities.
 * - Privileged permissions are per Admin account, never per role.
 * - Clinical sign-off is fixed: on for Medical Content Reviewers, off for everyone else.
 * - Admins always keep Web Admin access (no lock-out).
 */
export function isLockedCell(role: StaffRole, cap: Capability): boolean {
  if (role === 'end_user') return true;
  if (isPrivileged(cap) || CLINICAL_CAPABILITIES.includes(cap)) return true;
  if (role === 'admin' && cap === 'admin_access') return true;
  return false;
}

/** Effective capabilities: the role's row, plus an Admin account's own privileged permissions. */
export function capabilitiesOf(perms: PermissionMatrix, role: StaffRole | undefined, privileges: readonly string[] = []): Capability[] {
  if (!role || !isStaffRole(role)) return [];
  const base = (perms[role] ?? []).filter((c) => !isPrivileged(c));
  return role === 'admin' ? [...base, ...PRIVILEGED_CAPABILITIES.filter((p) => privileges.includes(p))] : base;
}

export function canWith(perms: PermissionMatrix, role: StaffRole | undefined, cap: Capability, privileges: readonly string[] = []): boolean {
  return capabilitiesOf(perms, role, privileges).includes(cap);
}

/** Roles whose row grants this capability (privileged ones: Admin, per account). */
export function rolesWith(perms: PermissionMatrix, cap: Capability): StaffRole[] {
  if (isPrivileged(cap)) return ['admin'];
  return ALL_ROLES.filter((r) => (perms[r] ?? []).includes(cap));
}

// ---------- migration from the seven-role model ----------

/** Retired role ids → their canonical role. Used only to migrate stored data; never assignable. */
export const LEGACY_ROLES = {
  super_admin: 'admin',
  support_agent: 'admin',
  analyst: 'admin',
  medical_reviewer: 'medical_content_reviewer',
} as const satisfies Record<string, StaffRole>;
export type LegacyRole = keyof typeof LEGACY_ROLES;
export const isLegacyRole = (v: unknown): v is LegacyRole => typeof v === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_ROLES, v);

/** Canonical role for a stored role id (legacy ids are mapped); null for anything unknown. */
export function migrateRole(v: unknown): StaffRole | null {
  if (isStaffRole(v)) return v;
  return isLegacyRole(v) ? LEGACY_ROLES[v] : null;
}

/** Former Super Admins keep their powers as an Admin's privileged permissions; nobody else gains any. */
export const privilegesForLegacyRole = (v: unknown): PrivilegedCapability[] => (v === 'super_admin' ? [...PRIVILEGED_CAPABILITIES] : []);

/**
 * Migrates a stored permission matrix: canonical rows are kept, the Medical Reviewer row moves to
 * Medical Content Reviewer, retired roles' rows are dropped (their people get the Admin row), and
 * locked cells are reset to their fixed values.
 */
export function migratePermissionMatrix(raw: unknown): PermissionMatrix {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rowOf = (key: string): Capability[] | null => {
    const v = src[key];
    return Array.isArray(v) ? (v.filter((c) => typeof c === 'string' && (ALL_CAPABILITIES as string[]).includes(c)) as Capability[]) : null;
  };
  const out = {} as PermissionMatrix;
  for (const role of ALL_ROLES) {
    const stored = rowOf(role) ?? (role === 'medical_content_reviewer' ? rowOf('medical_reviewer') : null) ?? DEFAULT_PERMISSIONS[role];
    // Locked cells always take their default value.
    out[role] = ALL_CAPABILITIES.filter((c) => (isLockedCell(role, c) ? DEFAULT_PERMISSIONS[role].includes(c) : stored.includes(c)));
  }
  return out;
}
