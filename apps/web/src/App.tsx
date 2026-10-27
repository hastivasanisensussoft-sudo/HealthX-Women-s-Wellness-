import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Route, Routes, useLocation } from 'react-router-dom';
import { PageLoader } from './components/PageLoader';
import NotFound from './components/NotFound';
import { SiteLayout } from './site/SiteLayout';
import { useToast } from './components/ui';
import { STORE_NOTICE_EVENT, type StoreNotice } from './store/AppStore';
import { ApiGate } from './user/components/ApiGate';

// 1) Public website
const Home = lazy(() => import('./site/pages/Home'));
const About = lazy(() => import('./site/pages/About'));
const Features = lazy(() => import('./site/pages/Features'));
const HowItWorksPage = lazy(() => import('./site/pages/HowItWorks'));
const Pricing = lazy(() => import('./site/pages/Pricing'));
const FaqPage = lazy(() => import('./site/pages/FaqPage'));
const Contact = lazy(() => import('./site/pages/Contact'));
const Legal = lazy(() => import('./site/pages/Legal'));

// 2) User application (auth + onboarding entry points, then /app/*)
const Login = lazy(() => import('./user/pages/auth/Login'));
const Signup = lazy(() => import('./user/pages/auth/Signup'));
const ForgotPassword = lazy(() => import('./user/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./user/pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./user/pages/auth/VerifyEmail'));
const Onboarding = lazy(() => import('./user/pages/onboarding/Onboarding'));
const UserApp = lazy(() => import('./user/UserApp'));

// 3) Admin panel
const AdminRoutes = lazy(() => import('./admin/AdminRoutes'));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

/** Shows store notices (sync errors, offline, back online) as toasts. */
function StoreNotices() {
  const toast = useToast();
  useEffect(() => {
    const on = (e: Event) => {
      const n = (e as CustomEvent<StoreNotice>).detail;
      toast[n.tone](n.title, n.body);
    };
    window.addEventListener(STORE_NOTICE_EVENT, on);
    return () => window.removeEventListener(STORE_NOTICE_EVENT, on);
  }, [toast]);
  return null;
}

const gated = (el: ReactNode) => <ApiGate>{el}</ApiGate>;

export function App() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <ScrollToTop />
      <StoreNotices />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="features" element={<Features />} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="contact" element={<Contact />} />
            <Route path="terms" element={<Legal doc="terms" />} />
            <Route path="privacy-policy" element={<Legal doc="privacy" />} />
          </Route>

          <Route path="login" element={gated(<Login />)} />
          <Route path="signup" element={gated(<Signup />)} />
          <Route path="forgot-password" element={gated(<ForgotPassword />)} />
          <Route path="reset-password" element={gated(<ResetPassword />)} />
          <Route path="verify-email" element={gated(<VerifyEmail />)} />
          <Route path="onboarding" element={gated(<Onboarding />)} />
          <Route path="app/*" element={gated(<UserApp />)} />

          <Route path="admin/*" element={<AdminRoutes />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
