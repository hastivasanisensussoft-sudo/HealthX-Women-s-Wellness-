/** Route tabs linking sibling pages within a sidebar group (mirrors nav.ts). */
export const CYCLE_TABS = [
  { to: '/app/cycle', label: 'Period tracking' },
  { to: '/app/cycle/calendar', label: 'Calendar' },
  { to: '/app/cycle/history', label: 'History' },
  { to: '/app/cycle/insights', label: 'Insights' },
];

export const SYMPTOM_TABS = [
  { to: '/app/symptoms', label: 'Symptom tracking' },
  { to: '/app/mood', label: 'Mood & energy' },
  { to: '/app/stress', label: 'Stress tracking' },
];

export const GOALS_TABS = [
  { to: '/app/goals', label: 'Daily goals' },
  { to: '/app/habits', label: 'Habits' },
  { to: '/app/plan', label: 'Daily wellness plan' },
  { to: '/app/achievements', label: 'Achievements' },
];

export const INSIGHTS_TABS = [
  { to: '/app/insights/weekly', label: 'Weekly reports' },
  { to: '/app/insights/progress', label: 'Progress charts' },
  { to: '/app/insights/trends', label: 'Wellness trends' },
];

export const LEARN_TABS = [
  { to: '/app/learn', label: 'Educational articles' },
  { to: '/app/learn/womens-wellness', label: 'Women’s wellness' },
  { to: '/app/learn/fertility-pregnancy', label: 'Fertility & pregnancy' },
  { to: '/app/learn/faq', label: 'Most asked questions' },
  { to: '/app/community', label: 'Community' },
];
