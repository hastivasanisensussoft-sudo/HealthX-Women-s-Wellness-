import { BookOpen, CalendarHeart, ChartLine, Droplets, LayoutDashboard, ListChecks, Smile, UserCog, type LucideIcon } from 'lucide-react';

export interface NavLeaf {
  to: string;
  label: string;
  /** Exact match only (for index routes like /app). */
  end?: boolean;
  phase?: 2 | 3 | 4;
  keywords?: string;
  /** Extra path prefixes that should highlight this item (detail/related pages). */
  also?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavLeaf[];
}

/** User web application sidebar: 8 groups (requirements §3) + mockup pages (FAQ, community, achievements, integrations). */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/app', label: 'Home Dashboard', end: true, keywords: 'home overview today summary' },
      { to: '/app/check-in', label: 'Daily Check-in', keywords: 'mood energy stress sleep today' },
      { to: '/app/wellness-score', label: 'Wellness Score', keywords: 'score engagement components weights' },
    ],
  },
  {
    id: 'cycle',
    label: 'Cycle & Period',
    icon: CalendarHeart,
    items: [
      { to: '/app/cycle', label: 'Period Tracking', end: true, keywords: 'period log flow menstrual start' },
      { to: '/app/cycle/calendar', label: 'Period Calendar', keywords: 'calendar month days estimate' },
      { to: '/app/cycle/history', label: 'Cycle History', keywords: 'history length duration past cycles' },
      { to: '/app/cycle/insights', label: 'Cycle Insights', keywords: 'patterns variation irregular energy by day' },
    ],
  },
  {
    id: 'symptoms',
    label: 'Symptoms & Mood',
    icon: Smile,
    items: [
      { to: '/app/symptoms', label: 'Symptom Tracking', keywords: 'symptoms cramps headache bloating custom severity' },
      { to: '/app/mood', label: 'Mood & Energy', keywords: 'mood energy feelings' },
      { to: '/app/stress', label: 'Stress Tracking', keywords: 'stress anxiety breathing calm' },
    ],
  },
  {
    id: 'wellness',
    label: 'Daily Wellness',
    icon: Droplets,
    items: [
      { to: '/app/hydration', label: 'Hydration Tracking', keywords: 'water drink target streak' },
      { to: '/app/sleep', label: 'Sleep Tracking', phase: 2, keywords: 'sleep bedtime wake quality' },
      { to: '/app/fitness', label: 'Fitness & Workouts', keywords: 'workout steps exercise activity yoga strength' },
      { to: '/app/nutrition', label: 'Nutrition Tracking', phase: 2, keywords: 'meals food calories protein fibre' },
    ],
  },
  {
    id: 'goals',
    label: 'Goals & Habits',
    icon: ListChecks,
    items: [
      { to: '/app/goals', label: 'Daily Goals', keywords: 'goals targets progress badges' },
      { to: '/app/habits', label: 'Habits', keywords: 'habits streaks routine' },
      { to: '/app/plan', label: 'Daily Wellness Plan', keywords: 'plan today tasks' },
      { to: '/app/achievements', label: 'Achievements', phase: 2, keywords: 'badges streaks rewards milestones' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights & Reports',
    icon: ChartLine,
    items: [
      { to: '/app/insights/weekly', label: 'Weekly Reports', keywords: 'weekly report summary' },
      { to: '/app/insights/progress', label: 'Progress Charts', keywords: 'progress charts goals steps water sleep' },
      { to: '/app/insights/trends', label: 'Wellness Trends', keywords: 'trends insights patterns mood energy' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: BookOpen,
    items: [
      { to: '/app/learn', label: 'Educational Articles', keywords: 'articles library read' },
      { to: '/app/learn/womens-wellness', label: "Women's Wellness", keywords: 'cycle mind body nutrition skin' },
      { to: '/app/learn/fertility-pregnancy', label: 'Fertility & Pregnancy Information', keywords: 'fertility ovulation pregnancy prenatal life stages menopause', also: ['/app/fertility', '/app/life-stages'] },
      { to: '/app/learn/faq', label: 'Most Asked Questions', keywords: 'faq questions answers gynecologist hormones' },
      { to: '/app/community', label: 'Community', phase: 4, keywords: 'community groups posts share support' },
    ],
  },
  {
    id: 'account',
    label: 'Profile & Settings',
    icon: UserCog,
    items: [
      { to: '/app/profile', label: 'My Profile', keywords: 'profile personal goals account', also: ['/app/settings'] },
      { to: '/app/notifications', label: 'Notifications & Reminders', keywords: 'notifications reminders alerts quiet hours' },
      { to: '/app/privacy', label: 'Privacy & Data Controls', keywords: 'privacy consent export delete' },
      { to: '/app/integrations', label: 'Health Integrations', phase: 2, keywords: 'apple health health connect sync steps sleep wearable' },
      { to: '/app/subscription', label: 'Subscription & Plans', phase: 2, keywords: 'premium subscription plan upgrade billing' },
    ],
  },
];

/** Pages reachable outside the sidebar (topbar, profile menu, hubs). Used by global search. */
export const EXTRA_PAGES: (NavLeaf & { group: string })[] = [
  { to: '/app/coach', label: 'AI Wellness Coach', group: 'Topbar', phase: 2, keywords: 'ai chat assistant coach' },
  { to: '/app/settings', label: 'Preferences & Settings', group: 'Profile menu', keywords: 'units language demo reset' },
  { to: '/app/settings/appearance', label: 'Appearance & Theme', group: 'Profile menu', keywords: 'theme dark mode light colour color accent appearance' },
  { to: '/app/fertility', label: 'Fertility Awareness Tracker', group: 'Learn', phase: 3, keywords: 'bbt mucus ovulation test' },
  { to: '/app/life-stages', label: 'Pregnancy & Menopause Modes', group: 'Learn', phase: 3, keywords: 'perimenopause menopause pregnancy hot flash' },
];

export const ALL_NAV = [...NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))), ...EXTRA_PAGES];

/** Finds the sidebar item for a path: longest matching route wins; aliases via `also`. */
export function matchNav(pathname: string): { groupId: string; to: string } | undefined {
  const path = pathname.replace(/\/+$/, '') || '/';
  let best: { groupId: string; to: string; len: number } | undefined;
  for (const g of NAV_GROUPS) {
    for (const leaf of g.items) {
      for (const p of [leaf.to, ...(leaf.also ?? [])]) {
        const hit = leaf.end && p === leaf.to ? path === p : path === p || path.startsWith(`${p}/`);
        if (hit && (!best || p.length > best.len)) best = { groupId: g.id, to: leaf.to, len: p.length };
      }
    }
  }
  return best && { groupId: best.groupId, to: best.to };
}

/** Mock data links are app-relative (e.g. "/hydration"); prefix for the web router. */
export const appPath = (to?: string) => (!to ? '/app' : to.startsWith('/app') ? to : `/app${to}`);
