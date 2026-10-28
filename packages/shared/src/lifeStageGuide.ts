/**
 * Life-stage content and helpers (SRS §20–§25): the week-by-week pregnancy guide, urgent-care warning
 * signs, the local emergency number, temperature units for basal temperature (A-16) and the note format
 * that carries a hot flash's time inside a symptom log.
 *
 * The guide is general wellness education, not clinical advice. Every entry still needs the Medical
 * Content Reviewer's sign-off before launch (P3-02), and the urgent-sign lists stand in for the D-11
 * trigger list until it is decided.
 */
import type { ISODate } from './types';

export interface PregnancyGuideEntry {
  fromWeek: number;
  toWeek: number;
  title: string;
  /** What many people notice around these weeks (general, not a prediction). */
  body: string;
  /** Gentle self-care focus for these weeks. */
  focus: string[];
}

export const PREGNANCY_GUIDE: PregnancyGuideEntry[] = [
  {
    fromWeek: 0,
    toWeek: 4,
    title: 'The very beginning',
    body: 'Many people don’t know they’re pregnant yet in these weeks. It’s a good time to get in touch with a care provider.',
    focus: ['Book a first appointment with a care provider', 'Ask your care provider about prenatal supplements, such as folic acid', 'Keep up regular meals and water'],
  },
  {
    fromWeek: 5,
    toWeek: 8,
    title: 'Early changes',
    body: 'Tiredness, nausea and tender breasts are common now — everyone is different, and some people notice very little.',
    focus: ['Small, regular meals can feel easier', 'Rest when you can', 'Sip water through the day'],
  },
  {
    fromWeek: 9,
    toWeek: 13,
    title: 'End of the first trimester',
    body: 'Your care provider may offer first checks and scans around now. Note any questions you want to ask.',
    focus: ['Write down questions for your next visit', 'Gentle activity, as agreed with your care team', 'Keep appointments in your reminders'],
  },
  {
    fromWeek: 14,
    toWeek: 17,
    title: 'Second trimester',
    body: 'Many people find their energy returns a little in the second trimester.',
    focus: ['Short walks or gentle stretching', 'Balanced meals with protein, fruit and vegetables', 'Notice how you sleep'],
  },
  {
    fromWeek: 18,
    toWeek: 22,
    title: 'Halfway there',
    body: 'Many people start to feel the first movements somewhere in these weeks. A mid-pregnancy scan is often offered.',
    focus: ['Pelvic-floor exercises, if your care provider agrees', 'Supportive pillows can help with comfort in bed', 'Stay hydrated'],
  },
  {
    fromWeek: 23,
    toWeek: 27,
    title: 'Getting to know your rhythm',
    body: 'You may start to notice a pattern in your baby’s movements. Your care provider can tell you what to look out for.',
    focus: ['Get to know your baby’s usual movements', 'Ask about any routine tests offered around now', 'Rest your feet when you can'],
  },
  {
    fromWeek: 28,
    toWeek: 32,
    title: 'Third trimester',
    body: 'Back and hip comfort, heartburn and broken sleep are common in the third trimester.',
    focus: ['Side-lying with pillows may feel comfortable', 'Smaller meals can ease heartburn for some people', 'Talk to your care team about your birth preferences'],
  },
  {
    fromWeek: 33,
    toWeek: 36,
    title: 'Getting ready',
    body: 'A good time to plan practical things and make sure you know how to reach your care team at any hour.',
    focus: ['Save your care team’s numbers', 'Pack a bag for the birth', 'Keep resting and moving gently'],
  },
  {
    fromWeek: 37,
    toWeek: 42,
    title: 'Any day now',
    body: 'Babies often arrive within a couple of weeks either side of the due date. Your care team will guide you on what to watch for.',
    focus: ['Know when your care team wants you to call', 'Rest and eat little and often', 'Keep your questions list handy'],
  },
];

/** The guide entry for a pregnancy week (clamped to the guide's range). */
export function pregnancyGuideFor(weeks: number): PregnancyGuideEntry {
  const w = Math.max(0, Math.min(42, Math.floor(weeks)));
  return PREGNANCY_GUIDE.find((g) => w >= g.fromWeek && w <= g.toWeek) ?? PREGNANCY_GUIDE[PREGNANCY_GUIDE.length - 1];
}

/**
 * Signs that need urgent medical care — shown as directions to care, never interpreted (§23).
 * Pregnancy list based on the CDC "Hear Her" urgent maternal warning signs; pending the D-11 review.
 */
export const URGENT_SIGNS: Record<'pregnancy' | 'general', string[]> = {
  pregnancy: [
    'Vaginal bleeding or fluid leaking',
    'Severe belly pain that doesn’t go away',
    'Your baby’s movements stopping or slowing',
    'A severe headache that won’t go away, or changes in your vision',
    'Dizziness or fainting',
    'Trouble breathing, chest pain or a racing heart',
    'Fever of 38 °C (100.4 °F) or higher',
    'Severe swelling of your hands or face',
    'Severe nausea and vomiting',
    'Thoughts of harming yourself or your baby',
  ],
  general: [
    'Chest pain, or trouble breathing',
    'Fainting or passing out',
    'Very heavy bleeding — soaking a pad or tampon every hour',
    'Severe pain that doesn’t ease',
    'Sudden weakness, a drooping face or slurred speech',
    'A severe allergic reaction',
    'Thoughts of harming yourself',
  ],
};

const EMERGENCY_NUMBERS: Record<string, string> = { US: '911', CA: '911', MX: '911', GB: '999', IE: '112', AU: '000', NZ: '111', IN: '112', ZA: '112', SG: '995', AE: '999', JP: '119' };

/**
 * The emergency number for a locale such as "en-IN". Unknown regions get 112 (the GSM standard number,
 * which most mobile networks route), and the screens always add "or your local emergency number".
 */
export function emergencyNumberFor(locale: string | undefined | null): { number: string; region: string | null } {
  const region = /[-_]([A-Za-z]{2})\b/.exec(locale ?? '')?.[1]?.toUpperCase() ?? null;
  return { number: (region && EMERGENCY_NUMBERS[region]) || '112', region };
}

/** Basal temperature units (A-16): readings are always stored in °C. */
export const celsiusToFahrenheit = (c: number) => Math.round((c * 9) / 5 * 100 + 3200) / 100;
export const fahrenheitToCelsius = (f: number) => Math.round(((f - 32) * 5) / 9 * 100) / 100;

/** A hot flash's start time is kept in its symptom note ("Started 14:30"), which the API already stores. */
export const hotFlashNote = (time: string, extra?: string) => [`Started ${time}`, extra?.trim()].filter(Boolean).join(' · ');
export function hotFlashTime(notes: string | undefined): string | null {
  return /^Started ([01]\d|2[0-3]):([0-5]\d)/.exec(notes ?? '')?.slice(1, 3).join(':') ?? null;
}

/** Cycle lengths of the completed cycles, newest first (for the perimenopause "cycle changes" view). */
export function recentCycleLengths(cycles: { start: ISODate; length: number | null }[], count = 6): { start: ISODate; length: number }[] {
  return cycles
    .filter((c): c is { start: ISODate; length: number } => c.length !== null)
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, count);
}
