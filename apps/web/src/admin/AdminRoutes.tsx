import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminStoreProvider } from './AdminStore';
import { useAccess, useAdmin } from './adminState';
import { AdminLayout } from './AdminLayout';
import { Restricted } from './components';
import type { Capability } from './rbac';
import AdminLogin from './pages/AdminLogin';
import AcceptInvite from './pages/AcceptInvite';
import NoAccess from './pages/NoAccess';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import ContentList from './pages/ContentList';
import ContentEditor from './pages/ContentEditor';
import Reviews from './pages/Reviews';
import Notifications from './pages/Notifications';
import UsersPage from './pages/Users';
import Support from './pages/Support';
import Staff from './pages/Staff';
import Config from './pages/Config';
import Flags from './pages/Flags';
import Subscriptions from './pages/Subscriptions';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Schedule from './pages/Schedule';
import AdminNotFound from './pages/AdminNotFound';
import PrivacyRequests from './pages/PrivacyRequests';
import MediaLibrary from './pages/MediaLibrary';
import Categories from './pages/Categories';
import Compliance from './pages/Compliance';
import Versions from './pages/Versions';
import Account from './pages/Account';
import UserProfile from './pages/UserProfile';
import AppActivity from './pages/AppActivity';
import DailyPlans from './pages/DailyPlans';
import Appearance from './pages/Appearance';

/**
 * Route guards are UX only: with the API running, the server re-checks the staff session, MFA and
 * the permission on every request (SRS §47). In offline demo mode nothing is enforced.
 */
function RequireStaff({ children }: { children: ReactNode }) {
  const { state } = useAdmin();
  const { can } = useAccess();
  const loc = useLocation();
  if (!state.session) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (!can('admin_access')) return <NoAccess />;
  return <>{children}</>;
}

function RequireCap({ cap, any, children }: { cap?: Capability; any?: Capability[]; children: ReactNode }) {
  const { can } = useAccess();
  const caps = any ?? (cap ? [cap] : []);
  return caps.some((c) => can(c)) ? <>{children}</> : <Restricted cap={caps[0]} />;
}

export default function AdminRoutes() {
  return (
    <AdminStoreProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route path="accept-invite" element={<AcceptInvite />} />
        <Route
          element={
            <RequireStaff>
              <AdminLayout />
            </RequireStaff>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<RequireCap cap="view_analytics"><Analytics /></RequireCap>} />
          <Route path="content" element={<RequireCap cap="view_content"><ContentList /></RequireCap>} />
          <Route path="content/new" element={<RequireCap cap="edit_content"><ContentEditor /></RequireCap>} />
          <Route path="content/:id" element={<RequireCap cap="view_content"><ContentEditor /></RequireCap>} />
          <Route path="content/:id/versions" element={<RequireCap cap="view_content"><Versions /></RequireCap>} />
          <Route path="versions" element={<RequireCap cap="view_content"><Versions /></RequireCap>} />
          <Route path="compliance" element={<RequireCap cap="compliance_review"><Compliance /></RequireCap>} />
          <Route path="media" element={<RequireCap any={['edit_content', 'publish_content']}><MediaLibrary /></RequireCap>} />
          <Route path="categories" element={<RequireCap any={['edit_content', 'publish_content']}><Categories /></RequireCap>} />
          <Route path="reviews" element={<RequireCap any={['medical_review', 'compliance_review', 'edit_content']}><Reviews /></RequireCap>} />
          <Route path="schedule" element={<RequireCap any={['publish_content', 'compliance_review']}><Schedule /></RequireCap>} />
          <Route path="notifications" element={<Navigate to="/admin/notifications/templates" replace />} />
          <Route path="notifications/:tab" element={<RequireCap cap="view_notifications"><Notifications /></RequireCap>} />
          <Route path="users" element={<RequireCap cap="view_users"><UsersPage /></RequireCap>} />
          <Route path="users/:id" element={<RequireCap cap="view_users"><UserProfile /></RequireCap>} />
          <Route path="activity" element={<RequireCap cap="view_users"><AppActivity /></RequireCap>} />
          <Route path="plans" element={<RequireCap cap="view_content"><DailyPlans /></RequireCap>} />
          <Route path="support" element={<RequireCap cap="manage_support"><Support /></RequireCap>} />
          <Route path="privacy-requests" element={<RequireCap cap="process_data_requests"><PrivacyRequests /></RequireCap>} />
          <Route path="roles" element={<RequireCap cap="view_staff"><Staff /></RequireCap>} />
          <Route path="staff" element={<Navigate to="/admin/roles" replace />} />
          <Route path="subscriptions" element={<RequireCap cap="manage_subscriptions"><Subscriptions /></RequireCap>} />
          <Route path="config" element={<RequireCap cap="manage_config"><Config /></RequireCap>} />
          <Route path="flags" element={<RequireCap cap="manage_flags"><Flags /></RequireCap>} />
          <Route path="audit" element={<RequireCap cap="view_audit"><Audit /></RequireCap>} />
          <Route path="settings" element={<RequireCap cap="view_settings"><Settings /></RequireCap>} />
          <Route path="account" element={<Account />} />
          <Route path="appearance" element={<Appearance />} />
          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Routes>
    </AdminStoreProvider>
  );
}
