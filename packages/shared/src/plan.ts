/**
 * Daily wellness plan (SRS §33) — deterministic, rules-based. AI personalisation
 * of the plan is Phase 3 (§35); this demo never calls an AI.
 */
import type { AppState } from './state';
import type { ISODate, PlanItem } from './types';

export function buildDailyPlan(state: Pick<AppState, 'checkIns' | 'profile' | 'habitCompletions' | 'water' | 'waterTargetMl' | 'sleepTargetHours'>, today: ISODate): PlanItem[] {
  const checkIn = state.checkIns.find((c) => c.date === today);
  const goals = state.profile.goals;
  const waterToday = state.water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
  const items: PlanItem[] = [
    {
      id: 'plan_water',
      title: 'Drink water',
      detail: `${(state.waterTargetMl / 1000).toFixed(1)} L goal · spread it through the day`,
      icon: 'glass-water',
      done: waterToday >= state.waterTargetMl * 0.45,
    },
  ];

  if (checkIn && checkIn.energy <= 4) {
    items.push({ id: 'plan_walk', title: '10-minute gentle walk', detail: 'Low-energy day — keep it light', icon: 'footprints', done: false });
  } else {
    items.push({
      id: 'plan_walk',
      title: goals.includes('improve_fitness') ? '20-minute walk or workout' : '20-minute walk',
      detail: 'Any pace that feels good',
      icon: 'footprints',
      done: false,
    });
  }

  items.push({
    id: 'plan_breathe',
    title: '5-minute breathing',
    detail: checkIn && (checkIn.stress ?? 0) >= 6 ? 'Your stress was higher today' : 'A short reset',
    icon: 'wind',
    done: false,
  });

  items.push({
    id: 'plan_breakfast',
    title: 'Healthy breakfast',
    detail: 'Include some protein and fibre',
    icon: 'apple',
    done: state.habitCompletions.some((c) => c.habitId === 'h_breakfast' && c.date === today),
  });

  items.push({
    id: 'plan_sleep',
    title: 'Sleep before target time',
    detail: `Aim for ${state.sleepTargetHours} h tonight`,
    icon: 'moon',
    done: false,
  });

  if (goals.includes('track_symptoms')) {
    items.push({ id: 'plan_symptoms', title: 'Log how your body feels', detail: 'Symptoms take 10 seconds', icon: 'activity', done: false });
  }
  return items;
}
