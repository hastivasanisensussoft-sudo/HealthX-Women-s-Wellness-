/** Pure aggregate metrics for the role dashboards (no individual health data anywhere). */
import { addDays, todayISO } from '@healthx/shared';
import { STATUS_META, SUPPORT_TYPES, type AdminUser, type AuditEntry, type ContentItem, type FeatureFlag, type StaffMember, type SupportRequest, type SupportType, type WorkflowStatus } from './adminData';
import { slaRemaining } from './helpers';

const DAY = 86_400_000;
const withinDays = (iso: string, days: number) => Date.now() - new Date(iso).getTime() <= days * DAY;

export function contentPipeline(content: ContentItem[]) {
  const order: WorkflowStatus[] = ['draft', 'changes_requested', 'medical_review', 'compliance_review', 'approved', 'scheduled', 'published', 'archived', 'rejected'];
  return order.map((s) => ({ status: s, label: STATUS_META[s].label, count: content.filter((c) => c.status === s).length }));
}

export function recentWorkflow(content: ContentItem[], n = 8, actor?: string) {
  return content
    .flatMap((c) => c.history.map((h) => ({ ...h, title: c.title, id: c.id })))
    .filter((h) => !actor || h.actor === actor)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, n);
}

/** Average hours from "Submitted for medical review" to the next medical decision. */
export function reviewTurnaroundHours(content: ContentItem[]): number | null {
  const spans: number[] = [];
  content.forEach((c) => {
    c.history.forEach((h, i) => {
      if (!h.action.startsWith('Submitted for medical review')) return;
      const decision = c.history.slice(i + 1).find((x) => /Medical review approved|Requested changes|Rejected/.test(x.action));
      if (decision) spans.push((new Date(decision.at).getTime() - new Date(h.at).getTime()) / 3_600_000);
    });
  });
  return spans.length ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length) : null;
}

export function supportStats(support: SupportRequest[]) {
  const active = support.filter((r) => r.status !== 'resolved');
  const breached = active.filter((r) => slaRemaining(r.createdAt, SUPPORT_TYPES[r.type].slaHours) < 0);
  const dueSoon = active.filter((r) => {
    const left = slaRemaining(r.createdAt, SUPPORT_TYPES[r.type].slaHours);
    return left >= 0 && left < 12;
  });
  const byType = (Object.keys(SUPPORT_TYPES) as SupportType[]).map((t) => ({ type: t, label: SUPPORT_TYPES[t].label, open: active.filter((r) => r.type === t).length }));
  return {
    open: active.filter((r) => r.status === 'open').length,
    inProgress: active.filter((r) => r.status === 'in_progress').length,
    unassigned: active.filter((r) => !r.assignee).length,
    resolved: support.filter((r) => r.status === 'resolved').length,
    breached: breached.length,
    dueSoon: dueSoon.length,
    byType,
    active,
  };
}

export function userStats(users: AdminUser[]) {
  const since = addDays(todayISO(), -7);
  return {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    new7d: users.filter((u) => u.signupDate >= since).length,
    premium: users.filter((u) => u.plan === 'premium').length,
    pendingDeletion: users.filter((u) => u.status === 'deletion_pending').length,
    deactivated: users.filter((u) => u.status === 'deactivated').length,
  };
}

const SENSITIVE = /break_glass|role_change|permission|deletion|settings|login_denied|export|flag\.|config\.|staff\.invite|grant_comp|deactivate|refund/;

export function securityPosture(staff: StaffMember[], flags: FeatureFlag[], audit: AuditEntry[]) {
  const activeStaff = staff.filter((m) => m.status === 'active');
  const withMfa = activeStaff.filter((m) => m.mfaEnabled);
  const last7 = audit.filter((a) => withinDays(a.at, 7));
  return {
    mfaCoverage: activeStaff.length ? Math.round((withMfa.length / activeStaff.length) * 100) : 100,
    withoutMfa: staff.filter((m) => !m.mfaEnabled),
    flagsChanged7d: flags.filter((f) => withinDays(f.lastChangedAt, 7)).length,
    breakGlass7d: last7.filter((a) => a.action.includes('break_glass')).length,
    roleChanges7d: last7.filter((a) => a.action.includes('role_change') || a.action.includes('permission')).length,
    sensitive: audit.filter((a) => SENSITIVE.test(a.action)).slice(0, 6),
  };
}
