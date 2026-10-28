import type { ImageSourcePropType } from 'react-native';

/**
 * Cut-out illustrations (transparent PNGs, background removed) for the welcome slides, sign-up,
 * onboarding and the library card, from pictures the product owner supplied (2026-10-28). Their licence
 * must be confirmed before a public release (like lib/pictures).
 */
export const WELCOME_ART = {
  /** A woman in a green sweater meditating, cross-legged. */
  calm: require('../../assets/illustrations/calm-cutout.png'),
  /** A yoga stretch on a mat. */
  breathe: require('../../assets/illustrations/breathe-cutout.png'),
  /** A girl in a purple sweater, chin on her hand, looking up hopefully. */
  dreamer: require('../../assets/illustrations/window-cutout.png'),
  /** A girl waving hello. */
  hello: require('../../assets/illustrations/hello-cutout.png'),
  /** A woman in a green sweater with a mug of tea, eyes closed (sign-up header; cut from the product owner's mockup). */
  tea: require('../../assets/illustrations/tea-cutout.png'),
  /** A girl holding a calendar with her period days circled. */
  calendar: require('../../assets/illustrations/calendar-cutout.png'),
} satisfies Record<string, ImageSourcePropType>;
