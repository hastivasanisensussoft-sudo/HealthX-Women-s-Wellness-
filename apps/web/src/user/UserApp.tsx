import { lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import NotFound from '@/components/NotFound';
import { AppLayout } from './layout/AppLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cycle = lazy(() => import('./pages/Cycle'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const Symptoms = lazy(() => import('./pages/Symptoms'));
const Mood = lazy(() => import('./pages/Mood'));
const Stress = lazy(() => import('./pages/Stress'));
const Hydration = lazy(() => import('./pages/Hydration'));
const Sleep = lazy(() => import('./pages/Sleep'));
const Fitness = lazy(() => import('./pages/Fitness'));
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const HabitsGoals = lazy(() => import('./pages/HabitsGoals'));
const Insights = lazy(() => import('./pages/Insights'));
const WellnessScore = lazy(() => import('./pages/WellnessScore'));
const Progress = lazy(() => import('./pages/Progress'));
const WeeklyReport = lazy(() => import('./pages/WeeklyReport'));
const Coach = lazy(() => import('./pages/Coach'));
const Learn = lazy(() => import('./pages/Learn'));
const LearnHub = lazy(() => import('./pages/LearnHub'));
const LearnFaq = lazy(() => import('./pages/LearnFaq'));
const Community = lazy(() => import('./pages/Community'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Article = lazy(() => import('./pages/Article'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Fertility = lazy(() => import('./pages/Fertility'));
const LifeStages = lazy(() => import('./pages/LifeStages'));
const Premium = lazy(() => import('./pages/Premium'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Appearance = lazy(() => import('./pages/Appearance'));

/** Auth guard: in API mode `signedIn`/`onboarded` come from the server session; offline demo uses local state. */
function RequireUser({ children }: { children: ReactNode }) {
  const { state, sessionEnded } = useStore();
  const { auth } = state;
  const loc = useLocation();
  if (!auth.signedIn) return <Navigate to="/login" replace state={{ from: loc.pathname, reason: sessionEnded ? 'session_end' : undefined }} />;
  if (!auth.onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** User application area (mounted at /app/*). */
export default function UserApp() {
  return (
    <RequireUser>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Overview */}
          <Route index element={<Dashboard />} />
          <Route path="check-in" element={<CheckIn />} />
          <Route path="wellness-score" element={<WellnessScore />} />
          {/* Cycle & Period */}
          <Route path="cycle" element={<Cycle />} />
          <Route path="cycle/calendar" element={<Cycle view="calendar" />} />
          <Route path="cycle/history" element={<Cycle view="history" />} />
          <Route path="cycle/insights" element={<Cycle view="insights" />} />
          {/* Symptoms & Mood */}
          <Route path="symptoms" element={<Symptoms />} />
          <Route path="mood" element={<Mood />} />
          <Route path="stress" element={<Stress />} />
          {/* Daily Wellness */}
          <Route path="hydration" element={<Hydration />} />
          <Route path="sleep" element={<Sleep />} />
          <Route path="fitness" element={<Fitness />} />
          <Route path="fitness/:id" element={<WorkoutDetail />} />
          <Route path="nutrition" element={<Nutrition />} />
          {/* Goals & Habits */}
          <Route path="goals" element={<HabitsGoals view="goals" />} />
          <Route path="habits" element={<HabitsGoals view="habits" />} />
          <Route path="plan" element={<HabitsGoals view="plan" />} />
          <Route path="achievements" element={<Achievements />} />
          {/* Insights & Reports */}
          <Route path="insights" element={<Navigate to="/app/insights/trends" replace />} />
          <Route path="insights/weekly" element={<WeeklyReport />} />
          <Route path="insights/progress" element={<Progress />} />
          <Route path="insights/trends" element={<Insights />} />
          {/* Learn */}
          <Route path="learn" element={<Learn />} />
          <Route path="learn/womens-wellness" element={<LearnHub topic="womens-wellness" />} />
          <Route path="learn/fertility-pregnancy" element={<LearnHub topic="fertility-pregnancy" />} />
          <Route path="learn/faq" element={<LearnFaq />} />
          <Route path="community" element={<Community />} />
          <Route path="learn/:id" element={<Article />} />
          <Route path="fertility" element={<Fertility />} />
          <Route path="life-stages" element={<LifeStages />} />
          {/* Profile & Settings */}
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="subscription" element={<Premium />} />
          <Route path="premium" element={<Navigate to="/app/subscription" replace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/appearance" element={<Appearance />} />
          {/* Not in the sidebar: reached from the top bar */}
          <Route path="coach" element={<Coach />} />
          <Route path="*" element={<NotFound inApp />} />
        </Route>
      </Routes>
    </RequireUser>
  );
}
