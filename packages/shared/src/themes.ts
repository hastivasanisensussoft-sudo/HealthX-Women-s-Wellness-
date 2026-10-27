/**
 * Theme customization (Settings → Appearance): accent themes (free + premium) and
 * light / dark / system modes. Pure colour maths shared by web (CSS variables) and
 * mobile (runtime palette). Data colours (period blush, hydration sky, …) keep their
 * meaning in every theme; only the brand colour (`green` scale) follows the accent.
 */
import { palette } from './tokens';

/** Snapshot of the original scales: mobile applies themes by updating `palette` in place. */
const ORIGINAL = {
  green: { ...palette.green },
  rose: { ...palette.rose },
  lavender: { ...palette.lavender },
  peach: { ...palette.peach },
  sky: { ...palette.sky },
  indigo: { ...palette.indigo },
  butter: { ...palette.butter },
  ink: { ...palette.ink },
  cream: palette.cream,
  mint: palette.mint,
  sage: palette.sage,
};

export type ThemeId = 'evergreen' | 'sage' | 'ocean' | 'lavender' | 'blush' | 'sunrise';
export type ThemeMode = 'light' | 'dark' | 'system';
export interface ThemePrefs {
  theme: ThemeId;
  mode: ThemeMode;
}
export type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>;

export interface ThemeDef {
  id: ThemeId;
  name: string;
  description: string;
  premium: boolean;
  brand: Scale;
}

export const DEFAULT_THEME: ThemePrefs = { theme: 'evergreen', mode: 'light' };
export const THEME_STORAGE_KEY = 'healthx.theme';

export const THEMES: ThemeDef[] = [
  { id: 'evergreen', name: 'Evergreen', description: 'The HealthX green and white — calm and clear.', premium: false, brand: ORIGINAL.green },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Soft herbal greens with a natural feel.',
    premium: false,
    brand: { 50: '#F3F7F1', 100: '#E4EEDF', 200: '#C9DEC1', 300: '#A6C79A', 400: '#7FAD72', 500: '#5E9353', 600: '#487A40', 700: '#3A6334', 800: '#2F4F2A', 900: '#263F23', 950: '#172A16' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool teal blues, fresh like water.',
    premium: false,
    brand: { 50: '#EFF8FA', 100: '#D7EEF3', 200: '#B0DDE7', 300: '#7EC4D5', 400: '#47A4BC', 500: '#2A87A1', 600: '#1F6D86', 700: '#1B586D', 800: '#1A4859', 900: '#183C4B', 950: '#0D2632' },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Dreamy violet tones for calm evenings.',
    premium: true,
    brand: { 50: '#F6F4FE', 100: '#ECE7FD', 200: '#D9D0FA', 300: '#BDAEF4', 400: '#9C87EA', 500: '#7F68DC', 600: '#6A51C6', 700: '#573FA6', 800: '#483587', 900: '#3C2D6E', 950: '#251B47' },
  },
  {
    id: 'blush',
    name: 'Blush',
    description: 'Warm rose petals, soft and caring.',
    premium: true,
    brand: { 50: '#FDF3F5', 100: '#FBE4E9', 200: '#F6C8D3', 300: '#EEA0B4', 400: '#E2738F', 500: '#CF5174', 600: '#B53A5D', 700: '#962E4C', 800: '#7C2941', 900: '#672539', 950: '#3C111F' },
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    description: 'Terracotta and peach, like early light.',
    premium: true,
    brand: { 50: '#FEF5EF', 100: '#FCE7D9', 200: '#F8CBB0', 300: '#F2A87E', 400: '#E9814F', 500: '#D9652F', 600: '#BB4F24', 700: '#9A3F20', 800: '#7D3520', 900: '#662E1D', 950: '#38150C' },
  },
];

export const themeById = (id: string | null | undefined): ThemeDef => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** The fixed fertile-window mint (the original brand green), independent of the accent theme. */
export const FERTILE_SCALE: Scale = { ...ORIGINAL.green };

export function parseThemePrefs(raw: string | null | undefined): ThemePrefs {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<ThemePrefs>) : {};
    const theme = THEMES.some((t) => t.id === v.theme) ? (v.theme as ThemeId) : DEFAULT_THEME.theme;
    const mode = v.mode === 'dark' || v.mode === 'system' || v.mode === 'light' ? v.mode : DEFAULT_THEME.mode;
    return { theme, mode };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

/** A premium theme is usable on the Premium plan (or during the trial). */
export const canUseTheme = (t: ThemeDef, plan: 'free' | 'premium') => !t.premium || plan === 'premium';

// ---------- colour maths ----------

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('').toUpperCase();
/** Mix a towards b by t (0 = a, 1 = b). */
export const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};
/** "R G B" triplet for CSS `rgb(var(--x) / <alpha>)`. */
export const rgbTriplet = (hex: string) => hexToRgb(hex).join(' ');

const DARK_BASE = '#121A17';
type AnyScale = Partial<Record<number, string>>;

/** Dark mode backgrounds: light tints become deep tints; saturated and deep shades stay. */
function darkBg(s: AnyScale): AnyScale {
  const out: AnyScale = { ...s };
  const mid = s[500] ?? s[400]!;
  if (s[50]) out[50] = mix(mid, DARK_BASE, 0.86);
  if (s[100]) out[100] = mix(mid, DARK_BASE, 0.8);
  if (s[200]) out[200] = mix(mid, DARK_BASE, 0.7);
  if (s[300]) out[300] = mix(s[400] ?? mid, DARK_BASE, 0.52);
  return out;
}
/** Dark mode text: deep shades become light so coloured text stays readable on dark surfaces. */
function darkText(s: AnyScale): AnyScale {
  const out: AnyScale = { ...s };
  const map: [number, number][] = [
    [600, 400],
    [700, 300],
    [800, 200],
    [900, 100],
    [950, 50],
  ];
  for (const [k, from] of map) if (s[k] && s[from]) out[k] = s[from];
  return out;
}

const INK_DARK_BG: AnyScale = { 50: '#18211E', 100: '#1E2925', 200: '#2A3632', 300: '#3A4843', 400: '#55655F', 500: '#6F807A', 600: '#8E9D97', 700: '#A7B5AF', 800: '#C2CEC9', 900: '#DDE6E2' };
const INK_DARK_TEXT: AnyScale = { 50: '#18211E', 100: '#1E2925', 200: '#3A4843', 300: '#55655F', 400: '#73847E', 500: '#8E9D97', 600: '#A7B5AF', 700: '#C2CEC9', 800: '#DDE6E2', 900: '#EDF2F0' };

/** `green` is the brand (follows the accent theme); `fertile` is the fixed mint data colour for fertile-window estimates. */
export const HUES = ['green', 'fertile', 'rose', 'lavender', 'peach', 'sky', 'indigo', 'butter', 'ink'] as const;
export type Hue = (typeof HUES)[number];

export interface ResolvedTheme {
  id: ThemeId;
  dark: boolean;
  /** Background, border, ring, fill shades per hue. */
  bg: Record<Hue, AnyScale>;
  /** Text shades per hue (differ from `bg` only in dark mode). */
  text: Record<Hue, AnyScale>;
  surface: { white: string; canvas: string; cream: string; mint: string; sage: string };
  shadowTint: string;
}

/** Full palette for a theme + mode (mode already resolved to light or dark). */
export function resolveTheme(id: ThemeId, dark: boolean): ResolvedTheme {
  const brand = themeById(id).brand as AnyScale;
  const base: Record<Hue, AnyScale> = {
    green: brand,
    fertile: ORIGINAL.green,
    rose: ORIGINAL.rose,
    lavender: ORIGINAL.lavender,
    peach: ORIGINAL.peach,
    sky: ORIGINAL.sky,
    indigo: ORIGINAL.indigo,
    butter: ORIGINAL.butter,
    ink: ORIGINAL.ink,
  };
  const bg = {} as Record<Hue, AnyScale>;
  const text = {} as Record<Hue, AnyScale>;
  for (const h of HUES) {
    if (h === 'ink') {
      bg.ink = dark ? INK_DARK_BG : base.ink;
      text.ink = dark ? INK_DARK_TEXT : base.ink;
    } else {
      bg[h] = dark ? darkBg(base[h]) : base[h];
      text[h] = dark ? darkText(base[h]) : base[h];
    }
  }
  const b = brand as Scale;
  const surface = dark
    ? { white: mix(b[900], '#0F1513', 0.82), canvas: mix(b[950], '#0A0F0D', 0.7), cream: mix(b[900], '#141A18', 0.85), mint: mix(b[500], DARK_BASE, 0.84), sage: mix(b[400], DARK_BASE, 0.84) }
    : id === 'evergreen'
      ? { white: '#FFFFFF', canvas: '#F3F8F6', cream: ORIGINAL.cream, mint: ORIGINAL.mint, sage: ORIGINAL.sage }
      : { white: '#FFFFFF', canvas: mix(b[50], '#FFFFFF', 0.25), cream: ORIGINAL.cream, mint: mix(b[50], b[100], 0.4), sage: mix(b[100], '#E8EDE9', 0.4) };
  return { id, dark, bg, text, surface, shadowTint: dark ? '#000000' : b[900] };
}
