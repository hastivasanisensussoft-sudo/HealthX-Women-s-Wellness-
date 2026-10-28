/**
 * Store billing adapter (P2-15). Real purchases need App Store / Google Play billing with server-side
 * receipt validation (D-13, A-22); until that exists:
 * - signed in to the API, paid plans report `unavailable` (the server only grants the free trial);
 * - in the offline demo, a mock store lets every purchase state be tried, and the plan, renewal date and
 *   receipts are remembered on this phone.
 * Plan prices are EXAMPLES — set per market at launch (D-13).
 */
import { addDays, type ISODate } from '@healthx/shared';
import { Linking, Platform } from 'react-native';

export type PlanKey = 'yearly' | 'monthly';
export const PLANS: { key: PlanKey; title: string; price: string; amount: string; note: string; tag: string | null; days: number }[] = [
  { key: 'yearly', title: 'Yearly', price: '₹1,799 / year', amount: '₹1,799', note: 'about ₹150 / month · save 40%', tag: 'Best value', days: 365 },
  { key: 'monthly', title: 'Monthly', price: '₹249 / month', amount: '₹249', note: 'cancel anytime', tag: null, days: 30 },
];

export type PurchaseOutcome = 'success' | 'cancelled' | 'pending' | 'failed' | 'unavailable';

/** What the demo store remembers on this phone. */
export interface DemoSubscription {
  plan: PlanKey;
  startedAt: ISODate;
  renewsAt: ISODate;
  receipts: { date: ISODate; plan: PlanKey; amount: string }[];
}

export function demoSubscription(plan: PlanKey, today: ISODate, prev?: DemoSubscription | null): DemoSubscription {
  const p = PLANS.find((x) => x.key === plan)!;
  return { plan, startedAt: today, renewsAt: addDays(today, p.days), receipts: [{ date: today, plan, amount: p.amount }, ...(prev?.receipts ?? [])].slice(0, 12) };
}

/** Message for each purchase result, shown after the store sheet closes. */
export const OUTCOME_TEXT: Record<Exclude<PurchaseOutcome, 'success'>, string> = {
  cancelled: 'Purchase cancelled — nothing was charged.',
  pending: 'Your purchase is waiting for approval. Premium turns on as soon as the store confirms it.',
  failed: 'The purchase didn’t go through and nothing was charged. Please try again.',
  unavailable: 'Paid plans need App Store / Google Play billing, which isn’t connected yet. You can start the 7-day free trial instead.',
};

/** Opens the store's own subscription settings (where people manage or cancel store subscriptions). */
export async function openStoreSubscriptions(): Promise<boolean> {
  const url = Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : Platform.OS === 'android' ? 'https://play.google.com/store/account/subscriptions' : null;
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
