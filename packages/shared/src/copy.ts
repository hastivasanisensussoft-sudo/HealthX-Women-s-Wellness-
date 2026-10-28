/**
 * Approved safety wording (SRS §5, §11, §19, §20, §23, §31, §34, §67).
 * Use these constants instead of ad-hoc copy so the medical reviewer approves one list.
 */
export const COPY = {
  estimate: "This is an estimate based on the information you've provided.",
  estimateShort: 'Estimate',
  concern: "If you're concerned about this symptom or pattern, consider speaking with a qualified healthcare professional.",
  notDiagnostic:
    'HealthX is a wellness app. It does not diagnose, treat or prevent any medical condition and does not replace a qualified healthcare professional.',
  ovulationNotConfirmed: 'Calendar estimates cannot confirm ovulation.',
  notContraception: 'Calendar-based estimates are not a reliable form of contraception.',
  fertilityAwareness: 'Fertility awareness helps you learn your cycle signs — it is not a guaranteed conception prediction.',
  pregnancy:
    'HealthX provides wellness and educational information and does not replace prenatal care from a qualified healthcare professional.',
  emergency:
    'If you think you may be experiencing a medical emergency, contact your local emergency number or go to the nearest emergency department now.',
  wellnessScore:
    'Your Wellness Score is a wellness engagement metric based on what you log. It is not a medical health score.',
  aiDisclaimer:
    'The AI coach shares general wellness education. It cannot diagnose conditions or recommend prescription medication.',
  observedPattern: 'Observed pattern — not a diagnosis.',
  irregular: 'Your recent cycle lengths vary more than your previous cycles.',
  employerPrivacy: 'Employers never receive your individual cycle or reproductive-health data.',
} as const;

/** Labels for the demo/production boundary shown in the UI. */
export const DEMO = {
  banner: 'Demo mode — all data is sample data stored only in this browser/device.',
  needsBackend: 'Requires backend — simulated in this demo',
  phase2: 'Phase 2',
  phase3: 'Phase 3',
} as const;
