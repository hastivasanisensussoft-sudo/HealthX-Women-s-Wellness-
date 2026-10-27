/**
 * Mobile theme — every value comes from the shared design tokens ("Evergreen" redesign),
 * already adjusted to the saved appearance by lib/themeBoot (loaded first by index.js).
 */
import { colors, nativeShadows, palette, phaseColors, radius, spacing } from '@healthx/shared';

import { brandText, fertile, onDark, THEME } from './themeBoot';

export { colors, palette, phaseColors, radius, spacing };
/** Dark mode on? (themes apply at start-up; changing them reloads the app). */
export const isDark = THEME.dark;
/** Brand colour for text/icons on surfaces, and the fixed fertile-window mint. */
export { brandText, fertile, onDark };

/**
 * Font family names registered in the root layout (React Native needs one family per weight):
 * DM Sans for body and UI, Outfit for display and headings, DM Mono for small labels,
 * Caveat for the handwritten lines on the Home hero.
 */
export const font = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extrabold: 'DMSans_800ExtraBold',
  display: 'Outfit_600SemiBold',
  displayBold: 'Outfit_700Bold',
  displayMedium: 'Outfit_500Medium',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
  hand: 'Caveat_600SemiBold',
  handBold: 'Caveat_700Bold',
} as const;

export const shadow = nativeShadows;

export const layout = {
  screenPadding: 20,
  cardRadius: 24,
  tabBarHeight: 76,
} as const;

/**
 * Full-bleed background image style. On web, react-native-web sizes an Image from its
 * asset's intrinsic dimensions unless width/height are explicit, so absoluteFill alone
 * renders photos at full resolution and crops them.
 */
export const imageFill = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' } as const;
