/**
 * Web Admin role metadata (labels, tones) on top of the shared role/permission model — the four
 * SRS roles (§6.1–§6.4). Enforcement happens in the API (apps/api); checks here only shape the UI.
 */
import type { BadgeTone } from '@/components/ui';
import { isLegacyRole, isPrivileged, ROLE_LABELS, rolesWith, type Capability, type PermissionMatrix, type RecordedRole, type StaffRole } from '@healthx/shared/admin';

export * from '@healthx/shared/admin/rbac';

export const ROLE_META: Record<StaffRole, { label: string; short: string; description: string; tone: BadgeTone; srs: string }> = {
  end_user: {
    label: ROLE_LABELS.end_user,
    short: 'User',
    description: 'App users track their own wellness in the HealthX app. No admin access.',
    tone: 'gray',
    srs: '§6.1',
  },
  content_manager: {
    label: ROLE_LABELS.content_manager,
    short: 'Content',
    description: 'Write, categorise and submit educational content; schedule or publish it once it has passed medical and compliance review; draft notification copy.',
    tone: 'sky',
    srs: '§6.2',
  },
  medical_content_reviewer: {
    label: ROLE_LABELS.medical_content_reviewer,
    short: 'Medical',
    description: 'Review health content and health-related notification copy; approve, reject or request changes; add references; check safety wording.',
    tone: 'lavender',
    srs: '§6.3',
  },
  admin: {
    label: ROLE_LABELS.admin,
    short: 'Admin',
    description: 'Users and support, subscriptions, notifications, analytics and reports, configuration, flags, compliance approval and audit. Staff, permission, security-setting and break-glass powers are held per person.',
    tone: 'green',
    srs: '§6.4',
  },
};

/** Labels for roles recorded on history/audit entries written before the four-role consolidation. */
const RETIRED_LABELS: Record<string, string> = {
  super_admin: 'Super Admin (retired role)',
  support_agent: 'Support Agent (retired role)',
  analyst: 'Analyst (retired role)',
  medical_reviewer: 'Medical Reviewer (retired role)',
};

export const recordedRoleLabel = (role: RecordedRole): string =>
  role === 'system' ? 'System' : isLegacyRole(role) ? RETIRED_LABELS[role] : ROLE_META[role]?.label ?? String(role);

export const CAPABILITY_META: Record<Capability, { label: string; group: string; srs: string }> = {
  admin_access: { label: 'Access the Web Admin', group: 'General', srs: '§6' },
  view_analytics: { label: 'View aggregate analytics', group: 'Analytics', srs: '§6.4, §54' },
  export_reports: { label: 'Export aggregate reports (CSV)', group: 'Analytics', srs: '§54' },
  view_content: { label: 'View content library', group: 'Content', srs: '§39' },
  edit_content: { label: 'Create & edit content', group: 'Content', srs: '§6.2' },
  medical_review: { label: 'Medical review of content', group: 'Content', srs: '§6.3, §40' },
  compliance_review: { label: 'Compliance approval', group: 'Content', srs: '§40, D-08 B' },
  publish_content: { label: 'Schedule, publish & archive approved content', group: 'Content', srs: '§6.2, §39' },
  view_notifications: { label: 'Open notification management', group: 'Notifications', srs: '§41' },
  manage_notifications: { label: 'Create & schedule campaigns', group: 'Notifications', srs: '§41' },
  edit_templates: { label: 'Edit notification templates', group: 'Notifications', srs: '§41' },
  review_templates: { label: 'Approve health-related copy', group: 'Notifications', srs: '§6.3, D-40' },
  view_users: { label: 'Look up user accounts (no health data)', group: 'Users & support', srs: '§6.4' },
  manage_user_status: { label: 'Deactivate / reactivate accounts', group: 'Users & support', srs: '§6.4' },
  process_data_requests: { label: 'Process export & deletion requests', group: 'Users & support', srs: '§42' },
  resend_verification: { label: 'Resend verification / reset links', group: 'Users & support', srs: '[ADD A-01, A-02]' },
  break_glass: { label: 'Break-glass (data categories only)', group: 'Privileged — per Admin', srs: '[ADD A-15]' },
  manage_support: { label: 'Work the support queue', group: 'Users & support', srs: '[ADD]' },
  manage_subscriptions: { label: 'Manage subscriptions & refunds', group: 'Platform', srs: '§6.4, §49' },
  view_staff: { label: 'View staff & roles', group: 'Platform', srs: '§47' },
  manage_staff: { label: 'Invite staff, change roles & privileged permissions', group: 'Privileged — per Admin', srs: '§47' },
  manage_permissions: { label: 'Edit the permission matrix', group: 'Privileged — per Admin', srs: '§47' },
  manage_config: { label: 'Manage configuration', group: 'Platform', srs: '§6.4, §31' },
  manage_flags: { label: 'Manage feature flags', group: 'Platform', srs: '§6.4' },
  view_audit: { label: 'View & export audit log', group: 'Platform', srs: '§47 [ADD A-14]' },
  view_settings: { label: 'View admin settings', group: 'Platform', srs: '§47' },
  manage_settings: { label: 'Change security settings', group: 'Privileged — per Admin', srs: '§47' },
};

/** Who can do this, for "needs …" messages. Privileged permissions belong to individual Admins. */
export function requiredRolesLabel(perms: PermissionMatrix, cap: Capability): string {
  if (isPrivileged(cap)) return `Admin with the “${CAPABILITY_META[cap].label}” permission`;
  const roles = rolesWith(perms, cap);
  return roles.length ? roles.map((r) => ROLE_META[r].label).join(' or ') : 'no current';
}

export const SECURITY_NOTE =
  'Role checks in the browser only shape the UI. With the HealthX API running, every permission is enforced server-side (SRS §47); in offline demo mode nothing is enforced.';
