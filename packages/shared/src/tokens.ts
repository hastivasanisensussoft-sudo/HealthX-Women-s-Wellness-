/**
 * HealthX "Evergreen" design tokens — the single source of truth for colour, type,
 * spacing, radius and elevation. Web (Tailwind config) and mobile (StyleSheet) both
 * read from here so the two frontends stay visually identical.
 *
 * Direction (2026-10-26 redesign): a calm evergreen-teal and white health palette
 * (Mira / Balanza references), soft blush, mint, lavender and sky data accents
 * (Myflo / Moonly references), butter-yellow calls to action (Healix), rounded
 * cards, arch photo frames and leaf shapes. See docs/design/healthx-design-system.md.
 */

export const palette = {
  /**
   * Brand evergreen (teal-leaning green) — primary of the green-and-white theme.
   * 700 is the primary button colour: white text on it is ~6.5:1 (WCAG AA), and
   * 600/700 also pass AA as text colours on white.
   */
  green: {
    50: '#F0F8F5',
    100: '#DDF0E8',
    200: '#BFE3D4',
    300: '#93CFB8',
    400: '#5FB597',
    500: '#3A9A7B',
    600: '#227F63',
    700: '#186A53',
    800: '#125643',
    900: '#0D4336',
    950: '#082D24',
  },
  /** Blush — period and menstrual phase (soft pink from the cycle-app references). */
  rose: {
    50: '#FFF2F5',
    100: '#FFE3EA',
    200: '#FDC8D5',
    300: '#F7A4B9',
    400: '#EE7F9C',
    500: '#DF5C80',
    600: '#C03F63',
    700: '#9E2E4E',
  },
  /** Lavender — luteal phase and mood. */
  lavender: {
    50: '#F6F4FF',
    100: '#ECE8FE',
    200: '#D9D1FB',
    300: '#BEB1F5',
    400: '#A090EC',
    500: '#8572DE',
    600: '#6B57C4',
    700: '#55429F',
  },
  /** Peach — energy and nutrition. */
  peach: {
    50: '#FFF6EE',
    100: '#FFEAD8',
    200: '#FFD4B0',
    300: '#FDBA88',
    400: '#F9A066',
    500: '#EE8442',
    600: '#C9682A',
    700: '#9F4F1C',
  },
  /** Sky — hydration and the follicular phase. */
  sky: {
    50: '#F0F8FE',
    100: '#DCEFFC',
    200: '#B9DFF8',
    300: '#8BC9F2',
    400: '#5AAFE8',
    500: '#3693D3',
    600: '#2476B3',
    700: '#1B5C8C',
  },
  /** Indigo — sleep. */
  indigo: {
    50: '#F3F4FE',
    100: '#E5E8FB',
    200: '#CBD0F6',
    300: '#A7B0EF',
    400: '#8590E5',
    500: '#6673D6',
    600: '#4F59BA',
    700: '#3D4592',
  },
  /** Butter — warm call-to-action accent (landing buttons, highlights). */
  butter: {
    50: '#FFFBEA',
    100: '#FEF3C4',
    200: '#FDE7A0',
    300: '#FAD772',
    400: '#F4C548',
    500: '#E3AC1F',
    600: '#B9860F',
  },
  /** Sage-grey neutrals (text, borders, surfaces). */
  ink: {
    50: '#F6F9F8',
    100: '#EDF2F0',
    200: '#DDE6E2',
    300: '#C2CEC9',
    400: '#95A59F',
    500: '#6F807A',
    600: '#54655E',
    700: '#3A4B45',
    800: '#24322D',
    900: '#14211D',
  },
  white: '#FFFFFF',
  /** Warm paper for alternating website sections. */
  cream: '#FAF7F1',
  /** Mint wash (app canvas, soft panels). */
  mint: '#EAF5F0',
  /** Sage wash for decorative website bands. */
  sage: '#E3EFE8',
} as const;

/** Semantic aliases used by components. */
export const colors = {
  primary: palette.green[700],
  primaryHover: palette.green[800],
  primarySoft: palette.green[100],
  primaryDeep: palette.green[900],
  surface: palette.white,
  background: '#F3F8F6',
  backgroundAlt: palette.cream,
  border: palette.ink[200],
  borderSoft: palette.ink[100],
  text: palette.ink[900],
  textMuted: palette.ink[600],
  textSubtle: palette.ink[500],
  success: palette.green[500],
  warning: '#D99413',
  danger: '#D14343',
  dangerSoft: '#FDECEC',
  info: palette.sky[500],

  // Data / tracking categories
  period: palette.rose[500],
  periodSoft: palette.rose[100],
  predicted: palette.rose[300],
  fertile: palette.green[500],
  fertileSoft: palette.green[100],
  mood: palette.lavender[500],
  moodSoft: palette.lavender[100],
  energy: palette.peach[500],
  energySoft: palette.peach[100],
  hydration: palette.sky[500],
  hydrationSoft: palette.sky[100],
  sleep: palette.indigo[500],
  sleepSoft: palette.indigo[100],
  activity: palette.green[600],
  activitySoft: palette.green[100],
  nutrition: palette.butter[500],
  nutritionSoft: palette.butter[100],
} as const;

/**
 * Cycle-phase colours: period blush, follicular sky, fertile window / ovulatory mint,
 * luteal lavender. Estimates are always drawn lighter or dashed.
 */
export const phaseColors = {
  menstrual: { solid: palette.rose[500], soft: palette.rose[100] },
  follicular: { solid: palette.sky[500], soft: palette.sky[100] },
  ovulatory: { solid: palette.green[500], soft: palette.green[100] },
  luteal: { solid: palette.lavender[500], soft: palette.lavender[100] },
} as const;

/**
 * Typefaces: Outfit (display and headings), DM Sans (body and UI — very legible at
 * every age), DM Mono (small labels and eyebrows), Caveat (rare handwritten accents).
 */
export const fonts = {
  display: 'Outfit',
  sans: 'DM Sans',
  mono: 'DM Mono',
  script: 'Caveat',
} as const;

/** Type scale in px (body text is 16 px for readability). */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 17,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 38,
  '5xl': 48,
  '6xl': 62,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/** 4px spacing grid. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

/** Soft, generous corners: cards 26, hero panels 34, controls are pills. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  '2xl': 26,
  '3xl': 34,
  pill: 999,
} as const;

/** CSS box-shadow strings (web). Mobile maps these to elevation presets. */
export const shadows = {
  xs: '0 1px 2px rgba(13, 67, 54, 0.05)',
  soft: '0 2px 12px rgba(13, 67, 54, 0.06)',
  card: '0 1px 2px rgba(13, 67, 54, 0.04), 0 12px 32px -14px rgba(13, 67, 54, 0.14)',
  lift: '0 26px 50px -20px rgba(13, 67, 54, 0.32)',
  glow: '0 14px 34px -10px rgba(24, 106, 83, 0.45)',
  rose: '0 14px 34px -12px rgba(223, 92, 128, 0.45)',
} as const;

/** React Native shadow presets mirroring `shadows`. */
export const nativeShadows = {
  card: {
    shadowColor: '#0D4336',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  lift: {
    shadowColor: '#0D4336',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
} as const;

export const gradients = {
  hero: ['#0D4336', '#186A53'],
  mint: ['#F0F8F5', '#DDF0E8'],
  dawn: ['#FFF2F5', '#ECE8FE'],
  sunrise: ['#FFF6EE', '#FFE3EA'],
  sage: ['#EAF5F0', '#F6F9F8'],
  cycleRing: ['#F7A4B9', '#DF5C80'],
  fertile: ['#BFE3D4', '#3A9A7B'],
} as const;

export type Palette = typeof palette;
export type Colors = typeof colors;
