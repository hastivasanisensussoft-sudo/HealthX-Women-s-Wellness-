/**
 * SIMULATED AI coach (SRS §34) — keyword rules only, no model is called.
 * Demonstrates the required behaviour: educational answers allowed, diagnosis
 * declined, emergencies redirected without AI interpretation (§23, §34, §67).
 * The production version needs the D-11 trigger list and D-12 AI policy.
 */
import { COPY } from './copy';

export type CoachReplyKind = 'educational' | 'declined' | 'emergency';

export interface CoachReply {
  kind: CoachReplyKind;
  text: string;
  bullets?: string[];
  suggestions: string[];
  /** Observations from the person's own logs (only with AI-personalisation consent). */
  personal?: string[];
}

export const COACH_STARTERS = [
  'What can I do to improve my sleep?',
  'Give me a beginner workout.',
  'Why might I feel tired?',
  'Tips for period cramps',
];

const EMERGENCY = [
  'chest pain',
  "can't breathe",
  'cannot breathe',
  'suicid',
  'kill myself',
  'self harm',
  'self-harm',
  'severe bleeding',
  'soaking',
  'fainted',
  'unconscious',
  'seizure',
  'bleeding during pregnancy',
  'pregnant and bleeding',
  'heavy bleeding',
  'overdose',
  'want to die',
  'end my life',
  'hurt myself',
  'stroke',
  'severe pain',
  'passed out',
  'not breathing',
  'allergic reaction',
  'baby not moving',
];
const DIAGNOSIS = ['do i have', 'diagnose', 'pcos', 'endometriosis', 'infertile', 'infertility', 'am i pregnant', 'is it cancer', 'what condition', 'hormonal imbalance'];
const MEDICATION = ['prescription', 'medication', 'dosage', 'dose of', 'which pill', 'antibiotic', 'should i take'];
const CONTRACEPTION = ['safe day', 'safe days', 'avoid pregnancy', 'contracept', 'unprotected'];

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

/**
 * What the coach may use from the person's own logs. Only built when they turned on AI personalisation
 * (§35, consent-controlled); otherwise answers stay general. Summaries only — no diagnosis.
 */
export interface CoachContext {
  avgSleepHours: number | null;
  sleepTargetHours: number;
  avgEnergy: number | null;
  hydrationPct: number;
  workouts7d: number;
}

export function simulateCoachReply(input: string, ctx?: CoachContext | null): CoachReply {
  const reply = baseReply(input);
  if (!ctx || reply.kind !== 'educational') return reply;
  const t = input.toLowerCase();
  const notes: string[] = [];
  if (has(t, ['sleep', 'tired', 'fatigue', 'energy', 'exhausted', 'insomnia']) && ctx.avgSleepHours !== null)
    notes.push(`From your logs: about ${ctx.avgSleepHours} h of sleep a night this week (your goal is ${ctx.sleepTargetHours} h).`);
  if (has(t, ['tired', 'fatigue', 'energy', 'exhausted']) && ctx.avgEnergy !== null) notes.push(`Your check-in energy averaged ${ctx.avgEnergy} / 10 this week.`);
  if (has(t, ['tired', 'fatigue', 'energy', 'hydrat', 'water'])) notes.push(`You reached about ${ctx.hydrationPct}% of your water goal this week.`);
  if (has(t, ['workout', 'exercise', 'beginner', 'training'])) notes.push(`You logged ${ctx.workouts7d} workout${ctx.workouts7d === 1 ? '' : 's'} in the last 7 days.`);
  return notes.length ? { ...reply, personal: notes } : reply;
}

/**
 * Questions per day per person (A-23 — the real limit and cost controls are set with the AI provider;
 * this is an example value). Reaching it shows a friendly "come back tomorrow" message.
 */
export const COACH_DAILY_LIMIT = 30;
/** Longest question accepted (characters). */
export const COACH_MAX_CHARS = 500;

/** Claims an answer must never make (§67, G2): diagnoses, medication, confirmed ovulation, contraception. */
const PROHIBITED: RegExp[] = [
  /\byou (?:have|probably have|likely have|might have|may have) (?:pcos|endometriosis|infertility|a hormonal imbalance|cancer|an infection)\b/i,
  /\byou(?:'re| are) (?:pregnant|infertile|ovulating)\b/i,
  /\b(?:confirm(?:s|ed)?|confirming) (?:that )?(?:you )?ovulat/i,
  /\b(?:safe days?|safe to have unprotected)\b/i,
  /\btake \d+(?:\.\d+)? ?(?:mg|mcg|ml|tablets?|pills?)\b/i,
  /\b(?:prescribe|prescription for)\b/i,
];

/**
 * Output filter (P2-01): every answer — simulated today, from an AI provider later — passes through
 * here before it is shown. An answer with a prohibited claim is replaced, never shown in part.
 */
export function filterCoachReply(reply: CoachReply): CoachReply {
  // Declines and emergency redirects are fixed safety copy; only answers are checked.
  if (reply.kind !== 'educational') return reply;
  // Negated statements ("HealthX can't confirm ovulation") are safe, so they're removed before checking.
  const all = [reply.text, ...(reply.bullets ?? []), ...(reply.personal ?? [])]
    .join('\n')
    .replace(/\b(?:not|never|can't|cannot|can not|doesn't|does not|won't|isn't|is not)\b[^.\n]*/gi, '');
  if (!PROHIBITED.some((re) => re.test(all))) return reply;
  return {
    kind: 'declined',
    text: "I can't give a diagnosis, medication advice or confirm ovulation. A qualified healthcare professional can help with that — I'm happy to share general wellness information instead.",
    suggestions: ['How do I prepare for a doctor visit?', 'Sleep tips'],
  };
}

function baseReply(input: string): CoachReply {
  const t = input.toLowerCase();

  if (has(t, EMERGENCY)) {
    return {
      kind: 'emergency',
      text: `${COPY.emergency} I can't assess emergencies. If you're in crisis or thinking about harming yourself, please reach out to local emergency services or a crisis line right away.`,
      suggestions: [],
    };
  }
  if (has(t, DIAGNOSIS)) {
    return {
      kind: 'declined',
      text: "I can't diagnose conditions or tell you whether you have one. What I can do is share general information and help you prepare for a conversation with a qualified healthcare professional.",
      bullets: ['Note when symptoms happen in your cycle', 'Record how long they last and how intense they feel', 'Bring your HealthX cycle history to the appointment'],
      suggestions: ['How do I prepare for a doctor visit?', 'What should I track?'],
    };
  }
  if (has(t, MEDICATION)) {
    return {
      kind: 'declined',
      text: "I can't recommend prescription medication or dosages. A pharmacist or qualified healthcare professional can advise what's right for you.",
      suggestions: ['Non-medication comfort ideas for cramps', 'Sleep tips'],
    };
  }
  if (has(t, CONTRACEPTION)) {
    return {
      kind: 'declined',
      text: `${COPY.notContraception} ${COPY.ovulationNotConfirmed} A qualified healthcare professional can talk you through contraception options.`,
      suggestions: ['What is fertility awareness?'],
    };
  }

  if (has(t, ['sleep', 'insomnia', 'tired at night'])) {
    return {
      kind: 'educational',
      text: 'Here are a few general habits many people find helpful for sleep:',
      bullets: ['Keep a consistent bed and wake time — even at weekends', 'Dim lights and put screens away 30 minutes before bed', 'Try a 5-minute breathing or wind-down stretch', 'Limit caffeine later in the day'],
      suggestions: ['Show me a wind-down routine', 'Why might I feel tired?'],
    };
  }
  if (has(t, ['workout', 'exercise', 'beginner', 'training'])) {
    return {
      kind: 'educational',
      text: 'Here is a simple 20-minute beginner routine you can do at home (stop if anything hurts):',
      bullets: ['Warm-up · 3 min', 'Squats · 3 × 12', 'Glute bridge · 3 × 15', 'Push-up variation · 3 × 8', 'Core · 3 × 30 s', 'Cool-down · 3 min'],
      suggestions: ['A gentler option?', 'How often should I train?'],
    };
  }
  if (has(t, ['tired', 'fatigue', 'energy', 'exhausted'])) {
    return {
      kind: 'educational',
      text: 'Tiredness can have many everyday causes. Some things worth looking at:',
      bullets: ['Sleep duration and consistency', 'Hydration and regular meals', 'Stress levels', 'Where you are in your cycle — some people notice lower energy around their period'],
      suggestions: ['Sleep tips', 'Hydration tips'],
    };
  }
  if (has(t, ['cramp', 'period pain'])) {
    return {
      kind: 'educational',
      text: 'Many people find these comfort strategies soothing:',
      bullets: ['Warmth on the lower belly or back', 'Gentle stretching or a short walk', 'Rest and staying hydrated'],
      suggestions: ['Read: Comfort strategies for period cramps'],
    };
  }
  if (has(t, ['water', 'hydrat'])) {
    return {
      kind: 'educational',
      text: 'Hydration habits that tend to stick:',
      bullets: ['Keep a bottle within reach', 'Pair a glass with each meal', 'Use gentle reminders'],
      suggestions: ['Sleep tips'],
    };
  }
  if (has(t, ['stress', 'anxious', 'anxiety', 'overwhelm'])) {
    return {
      kind: 'educational',
      text: 'A few quick tools for stressful moments:',
      bullets: ['Box breathing: in 4, hold 4, out 4, hold 4', 'Name 5 things you can see', 'A short walk outside'],
      suggestions: ['Mindfulness for beginners'],
    };
  }
  return {
    kind: 'educational',
    text: "I'm a wellness coach (simulated in this demo). I can share general information about sleep, movement, nutrition, stress and cycle education. What would you like to explore?",
    suggestions: COACH_STARTERS.slice(0, 3),
  };
}
