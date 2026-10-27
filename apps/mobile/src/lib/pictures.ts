import type { ImageSourcePropType } from 'react-native';

/**
 * Illustrations the product owner supplied for Home and Today (2026-10-27), used in place of drawn
 * characters. Their licence must be confirmed before a public release.
 */
export const PICTURES = {
  /** Home hero: a woman in a cream sweater, eyes closed in the sun, with the line "Better Days Ahead". */
  betterDays: require('../../assets/illustrations/better-days.jpg'),
  /** A girl daydreaming beside a sleeping cat, with the line "A softer me is still a strong me". */
  softerMe: require('../../assets/illustrations/softer-me.jpg'),
  /** "My symptoms" tile: a girl holding her stomach with cramps. */
  cramps: require('../../assets/illustrations/cramps.jpg'),
  /** "My journal" tile: a thoughtful girl resting her cheek on her hand. */
  thoughtful: require('../../assets/illustrations/thoughtful.jpg'),
  /** "Period comfort" tile: a girl asleep under a soft blanket. */
  resting: require('../../assets/illustrations/resting.jpg'),
  /** Today banner: a girl holding a calendar with her period days circled. */
  calendarSurprise: require('../../assets/illustrations/calendar-surprise.jpg'),
  /** A girl by a window, chin on her hand, looking up at the sky. */
  windowDaydream: require('../../assets/illustrations/window-daydream.jpg'),
  /**
   * "I'm my highest priority": carries its creator's watermark (@the.girlss.community). Show it whole:
   * never crop or cover the watermark.
   */
  highestPriority: require('../../assets/illustrations/highest-priority.jpg'),
} satisfies Record<string, ImageSourcePropType>;
