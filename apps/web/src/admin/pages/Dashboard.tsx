import type { ComponentType } from 'react';
import { Badge } from '@/components/ui';
import { useAccess } from '../adminState';
import { AdminHeader, RoleBadge } from '../components';
import { ROLE_META, type StaffRole } from '../rbac';
import { AdminDashboard, ContentDashboard, MedicalDashboard } from './dashboards/RoleDashboards';

type StaffOnly = Exclude<StaffRole, 'end_user'>;

const TITLES: Record<StaffOnly, { title: string; subtitle: string }> = {
  admin: { title: 'Admin overview', subtitle: 'Users and support, subscriptions, compliance, campaigns, security posture and reports (§6.4).' },
  medical_content_reviewer: { title: 'Medical review', subtitle: 'Your review queue, turnaround and recent decisions (§6.3, §40).' },
  content_manager: { title: 'Content workspace', subtitle: 'Your drafts, the publishing pipeline and scheduled posts (§6.2).' },
};

const BODY: Record<StaffOnly, ComponentType> = {
  admin: AdminDashboard,
  medical_content_reviewer: MedicalDashboard,
  content_manager: ContentDashboard,
};

/** Role-specific dashboard at /admin — one per staff role. */
export default function Dashboard() {
  const { role, session } = useAccess();
  if (!role || role === 'end_user') return null;
  const t = TITLES[role];
  const Body = BODY[role];
  const parts = session?.name.split(' ') ?? [];
  const hello = parts[0] === 'Dr.' ? parts.slice(0, 2).join(' ') : parts[0];
  return (
    <>
      <AdminHeader
        eyebrow={`Web Admin · ${ROLE_META[role].label} dashboard`}
        title={t.title}
        subtitle={`Hi ${hello} — ${t.subtitle}`}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <RoleBadge role={role} />
            <Badge tone="butter">Simulated data</Badge>
          </span>
        }
      />
      <p className="sr-only">Dashboard for {ROLE_META[role].label}</p>
      <Body />
    </>
  );
}
