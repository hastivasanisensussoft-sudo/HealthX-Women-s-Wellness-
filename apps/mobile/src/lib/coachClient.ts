/**
 * The AI coach client (P2-01). Every answer goes through `askCoach`, which applies a timeout and the
 * shared output filter (`filterCoachReply`) before anything is shown. Today the provider is the
 * simulated keyword coach; the real AI provider plugs in here once D-11 (emergency triggers) and D-12
 * (AI data policy) are decided and the backend `ai` module exists. Emergency requests never reach a
 * provider: the shared rules redirect them first (§23, §34).
 */
import { filterCoachReply, simulateCoachReply, type CoachContext, type CoachReply } from '@healthx/shared';

export type CoachProvider = (question: string, ctx: CoachContext | null) => Promise<CoachReply>;

/** True while answers come from the simulated keyword coach (shown in the UI). */
export const COACH_SIMULATED = true;
const TIMEOUT_MS = 15000;

const simulated: CoachProvider = (q, ctx) => new Promise((resolve) => setTimeout(() => resolve(simulateCoachReply(q, ctx)), 700 + Math.random() * 500));

export class CoachUnavailableError extends Error {
  constructor() {
    super('The coach didn’t answer in time. Check your connection and try again.');
  }
}

export async function askCoach(question: string, ctx: CoachContext | null, provider: CoachProvider = simulated): Promise<CoachReply> {
  // Safety rules run on the phone first, so an emergency is redirected even when the provider is down.
  const rules = simulateCoachReply(question, null);
  if (rules.kind === 'emergency') return rules;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const reply = await Promise.race([provider(question, ctx), new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new CoachUnavailableError()), TIMEOUT_MS)))]);
    return filterCoachReply(reply);
  } finally {
    clearTimeout(timer);
  }
}
