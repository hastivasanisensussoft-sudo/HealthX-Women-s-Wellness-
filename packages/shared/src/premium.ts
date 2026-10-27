/**
 * Free vs Premium (SRS §49). Free keeps core tracking: periods, symptoms, basic wellness, the learning
 * library, privacy controls, basic trends and the weekly summary (§61 MVP). Premium adds the items
 * below. The Premium plan is simulated in this build (a server-granted 7-day trial); store billing,
 * renewal and receipts need App Store / Google Play (Phase 2, pricing D-13).
 */
import type { Plan } from './types';

export type PremiumFeature = 'coach' | 'advanced_insights' | 'advanced_reports' | 'advanced_cycle_history' | 'nutrition' | 'programs' | 'themes';

export const PREMIUM_FEATURES: Record<PremiumFeature, { label: string; description: string }> = {
  coach: { label: 'AI wellness coach', description: 'Ask general wellness questions and get educational answers.' },
  advanced_insights: { label: 'Advanced insights', description: 'Patterns across cycles, like energy before your period and cycle-length variation.' },
  advanced_reports: { label: 'Monthly & cycle reports', description: 'Your trends over a month or a whole cycle, not just the week.' },
  advanced_cycle_history: { label: 'Advanced cycle history', description: 'Charts of cycle length, period length, symptom trends and patterns by phase.' },
  nutrition: { label: 'Nutrition & meal ideas', description: 'Meal logging, macros, meal ideas, a meal plan and a grocery list.' },
  programs: { label: 'Personalised workouts', description: 'Sessions built from your goal, level, time and equipment.' },
  themes: { label: 'Premium themes', description: 'Lavender, Blush and Sunrise colour themes.' },
};

export const hasPremium = (plan: Plan) => plan === 'premium';
export const canUseFeature = (plan: Plan, _feature: PremiumFeature) => plan === 'premium';
