/**
 * Admin navigation: exactly 8 top-level sections. Visibility per role uses mock
 * capability checks — NOT security (NestJS guards enforce access server-side).
 */
import { BarChart3, Bell, CreditCard, FileText, LayoutDashboard, Settings2, UserCog, Users, type LucideIcon } from 'lucide-react';
import type { Capability } from './rbac';

export interface AdminNavLeaf {
  to: string;
  label: string;
  /** Visible if the role has ANY of these. */
  caps: Capability[];
}

export interface AdminNavSection {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Single-page sections link directly; grouped sections expand like an accordion. */
  to?: string;
  caps?: Capability[];
  children?: AdminNavLeaf[];
  phase?: 2;
}

export const ADMIN_NAV: AdminNavSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/admin', caps: ['admin_access'] },
  {
    key: 'users',
    label: 'User Management',
    icon: Users,
    children: [
      { to: '/admin/users', label: 'Users', caps: ['view_users'] },
      { to: '/admin/support', label: 'Support requests', caps: ['manage_support'] },
      { to: '/admin/privacy-requests', label: 'Privacy requests', caps: ['process_data_requests'] },
    ],
  },
  {
    key: 'content',
    label: 'Content Management',
    icon: FileText,
    children: [
      { to: '/admin/content', label: 'Content library', caps: ['view_content'] },
      { to: '/admin/content/new', label: 'Create article', caps: ['edit_content'] },
      { to: '/admin/reviews', label: 'Review queue', caps: ['medical_review', 'compliance_review', 'edit_content'] },
      { to: '/admin/compliance', label: 'Compliance', caps: ['compliance_review'] },
      { to: '/admin/schedule', label: 'Publishing calendar', caps: ['publish_content', 'compliance_review'] },
      { to: '/admin/media', label: 'Media library', caps: ['edit_content', 'publish_content'] },
      { to: '/admin/categories', label: 'Categories & tags', caps: ['edit_content', 'publish_content'] },
      { to: '/admin/versions', label: 'Version history', caps: ['view_content'] },
    ],
  },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard, to: '/admin/subscriptions', caps: ['manage_subscriptions'], phase: 2 },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: Bell,
    children: [
      { to: '/admin/notifications/templates', label: 'Templates', caps: ['view_notifications'] },
      { to: '/admin/notifications/campaigns', label: 'Campaigns', caps: ['view_notifications'] },
      { to: '/admin/notifications/delivery', label: 'Delivery stats', caps: ['view_notifications'] },
    ],
  },
  { key: 'analytics', label: 'Analytics & Reports', icon: BarChart3, to: '/admin/analytics', caps: ['view_analytics'] },
  { key: 'roles', label: 'Roles & Permissions', icon: UserCog, to: '/admin/roles', caps: ['view_staff'] },
  {
    key: 'settings',
    label: 'Settings & Audit Logs',
    icon: Settings2,
    children: [
      { to: '/admin/settings', label: 'Admin settings', caps: ['view_settings'] },
      { to: '/admin/config', label: 'Configuration', caps: ['manage_config'] },
      { to: '/admin/flags', label: 'Feature flags', caps: ['manage_flags'] },
      { to: '/admin/audit', label: 'Audit log', caps: ['view_audit'] },
      { to: '/admin/account', label: 'My account', caps: ['admin_access'] },
    ],
  },
];

type Can = (cap: Capability) => boolean;

/** Sections (with only their permitted children) visible to the current role. */
export function visibleNav(can: Can): AdminNavSection[] {
  return ADMIN_NAV.flatMap((s) => {
    if (s.children) {
      const children = s.children.filter((c) => c.caps.some(can));
      return children.length ? [{ ...s, children }] : [];
    }
    return s.caps?.some(can) ? [s] : [];
  });
}

/** Labels of sections/pages the role can't use — for the "Your access" panel. */
export function restrictedLabels(can: Can): string[] {
  return ADMIN_NAV.flatMap((s) => {
    if (s.children) {
      const hidden = s.children.filter((c) => !c.caps.some(can));
      if (hidden.length === s.children.length) return [s.label];
      return hidden.map((c) => c.label);
    }
    return s.caps?.some(can) ? [] : [s.label];
  });
}

/** Longest-prefix match of the current path against the visible nav. */
export function findActive(pathname: string, sections: AdminNavSection[]): { section?: AdminNavSection; leaf?: AdminNavLeaf } {
  const path = pathname.replace(/\/+$/, '') || '/admin';
  // Per-item version history lives under /admin/content but belongs to the Version history page.
  if (/^\/admin\/content\/[^/]+\/versions$/.test(path)) return findActive('/admin/versions', sections);
  let best: { section?: AdminNavSection; leaf?: AdminNavLeaf; len: number } = { len: -1 };
  const matches = (to: string) => path === to || (to !== '/admin' && path.startsWith(`${to}/`));
  sections.forEach((s) => {
    if (s.to && matches(s.to) && s.to.length > best.len) best = { section: s, len: s.to.length };
    s.children?.forEach((c) => {
      if (matches(c.to) && c.to.length > best.len) best = { section: s, leaf: c, len: c.to.length };
    });
  });
  // Paths that live under a section but aren't menu items (e.g. /admin/notifications).
  if (!best.section) {
    const owner = sections.find((s) => s.children?.some((c) => c.to.startsWith(`${path}/`)));
    if (owner) return { section: owner };
  }
  return { section: best.section, leaf: best.leaf };
}
