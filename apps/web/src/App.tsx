import { lazy, Suspense, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { PageLoader } from './components/PageLoader';
import NotFound from './components/NotFound';
import { SiteLayout } from './site/SiteLayout';

// 1) Public website
const Home = lazy(() => import('./site/pages/Home'));
const About = lazy(() => import('./site/pages/About'));
const Features = lazy(() => import('./site/pages/Features'));
const HowItWorksPage = lazy(() => import('./site/pages/HowItWorks'));
const Pricing = lazy(() => import('./site/pages/Pricing'));
const FaqPage = lazy(() => import('./site/pages/FaqPage'));
const Contact = lazy(() => import('./site/pages/Contact'));
const Legal = lazy(() => import('./site/pages/Legal'));
const GetTheApp = lazy(() => import('./site/pages/GetTheApp'));

// 2) Account links from emails (people use HealthX in the mobile app; these pages finish the step on the web)
const ResetPassword = lazy(() => import('./account/ResetPassword'));
const VerifyEmail = lazy(() => import('./account/VerifyEmail'));
const MagicLink = lazy(() => import('./account/MagicLink'));

// 3) Web Admin (Content Manager, Medical Content Reviewer, Admin)
const AdminRoutes = lazy(() => import('./admin/AdminRoutes'));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

/** /login only exists for magic sign-in links; everything else about signing in happens in the app. */
function LoginLink() {
  const [params] = useSearchParams();
  return params.get('magic') ? <MagicLink /> : <Navigate to="/get-the-app" replace />;
}

const toApp = <Navigate to="/get-the-app" replace />;

export function App() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <ScrollToTop />
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
            <Route path="get-the-app" element={<GetTheApp />} />
            <Route path="terms" element={<Legal doc="terms" />} />
            <Route path="privacy-policy" element={<Legal doc="privacy" />} />
          </Route>

          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="login" element={<LoginLink />} />
          {/* The end-user web app was retired: end users use the HealthX mobile app. */}
          <Route path="signup" element={toApp} />
          <Route path="forgot-password" element={toApp} />
          <Route path="onboarding" element={toApp} />
          <Route path="app/*" element={toApp} />

          <Route path="admin/*" element={<AdminRoutes />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
