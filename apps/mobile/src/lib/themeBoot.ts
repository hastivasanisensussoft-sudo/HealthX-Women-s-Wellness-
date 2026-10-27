/**
 * Applies the saved appearance (accent theme + light/dark/system) to the shared palette
 * BEFORE any screen module creates its StyleSheets. Loaded first by the app entry (index.js).
 * Changing the theme saves it and reloads the app (see app/appearance.tsx).
 *
 * React Native uses one colour per shade for text and backgrounds, so dark mode uses a
 * merged scale: light tints → deep tints (backgrounds), 600/700 lifted (readable coloured
 * text), deep 800–950 kept (forest panels, solid buttons).
 */
import { colors, FERTILE_SCALE, gradients, mix, nativeShadows, palette, parseThemePrefs, phaseColors, resolveTheme, themeById, type Hue, type ThemePrefs } from '@healthx/shared';
import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';

const KEY = 'healthx.mobile.theme';
type Shades = Record<number, string>;
/** Browser storage on the web build (React Native has no DOM typings). */
const webStorage = () => (globalThis as unknown as { localStorage?: { getItem(k: string): string | null; setItem(k: string, v: string): void } }).localStorage;

export function readThemePrefs(): ThemePrefs {
  try {
    const raw = Platform.OS === 'web' ? webStorage()?.getItem(KEY) : SecureStore.getItem(KEY);
    return parseThemePrefs(raw);
  } catch {
    return parseThemePrefs(null);
  }
}

export function writeThemePrefs(p: ThemePrefs) {
  const s = JSON.stringify(p);
  try {
    if (Platform.OS === 'web') webStorage()?.setItem(KEY, s);
    else SecureStore.setItem(KEY, s);
  } catch {
    /* storage unavailable: keep the current theme */
  }
}

const prefs = readThemePrefs();
const dark = prefs.mode === 'dark' || (prefs.mode === 'system' && Appearance.getColorScheme() === 'dark');
export const THEME = { prefs, dark };

/**
 * Light tints for text and icons on always-dark panels (forest heroes, splash, banners). They keep their
 * light-mode values in dark mode, where the palette's 50–300 tints become deep background tints.
 */
export const onDark = resolveTheme(prefs.theme, false).bg as Record<Hue, Shades>;

/** Fixed fertile-window mint for cycle visuals (adapted for dark mode, never the accent colour). */
export const fertile: Shades = { ...FERTILE_SCALE };

function merged(bg: Partial<Shades> | undefined, text: Partial<Shades> | undefined, isInk: boolean): Shades {
  const b = (bg ?? {}) as Shades;
  if (!dark) return { ...b };
  if (isInk) return { ...((text ?? {}) as Shades), 50: b[50], 100: b[100], 200: b[200] };
  const out: Shades = { ...b };
  if (b[600] && b[400]) out[600] = b[400];
  if (b[700] && b[500]) out[700] = b[500];
  return out;
}

if (prefs.theme !== 'evergreen' || dark) {
  const r = resolveTheme(prefs.theme, dark);
  const brand = themeById(prefs.theme).brand;
  const set = (target: object, values: Shades) => Object.assign(target as Shades, values);
  set(palette.green, merged(r.bg.green, r.text.green, false));
  set(palette.rose, merged(r.bg.rose, r.text.rose, false));
  set(palette.lavender, merged(r.bg.lavender, r.text.lavender, false));
  set(palette.peach, merged(r.bg.peach, r.text.peach, false));
  set(palette.sky, merged(r.bg.sky, r.text.sky, false));
  set(palette.indigo, merged(r.bg.indigo, r.text.indigo, false));
  set(palette.butter, merged(r.bg.butter, r.text.butter, false));
  set(palette.ink, merged(r.bg.ink, r.text.ink, true));
  Object.assign(fertile, merged(r.bg.fertile, r.text.fertile, false));
  const p = palette as unknown as Record<string, string>;
  p.cream = r.surface.cream;
  p.mint = r.surface.mint;
  p.sage = r.surface.sage;

  Object.assign(colors as unknown as Record<string, string>, {
    primary: brand[700],
    primaryHover: brand[800],
    primarySoft: palette.green[100],
    primaryDeep: brand[900],
    surface: r.surface.white,
    background: r.surface.canvas,
    backgroundAlt: r.surface.cream,
    border: palette.ink[200],
    borderSoft: palette.ink[100],
    text: palette.ink[900],
    textMuted: palette.ink[600],
    textSubtle: palette.ink[500],
    success: palette.green[500],
    dangerSoft: dark ? mix('#D14343', '#121A17', 0.78) : '#FDECEC',
    info: palette.sky[500],
    period: palette.rose[500],
    periodSoft: palette.rose[100],
    predicted: palette.rose[300],
    fertile: fertile[500],
    fertileSoft: fertile[100],
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
  });
  Object.assign(phaseColors, {
    menstrual: { solid: palette.rose[500], soft: palette.rose[100] },
    follicular: { solid: palette.sky[500], soft: palette.sky[100] },
    ovulatory: { solid: fertile[500], soft: fertile[100] },
    luteal: { solid: palette.lavender[500], soft: palette.lavender[100] },
  });
  Object.assign(gradients, {
    hero: [brand[900], brand[700]],
    mint: [palette.green[50], palette.green[100]],
    dawn: [palette.rose[50], palette.lavender[100]],
    sunrise: [palette.peach[50], palette.rose[100]],
    sage: [palette.mint, r.surface.canvas],
    fertile: [fertile[200], fertile[500]],
  });
  if (dark) {
    for (const s of [nativeShadows.card, nativeShadows.lift] as { shadowColor: string; shadowOpacity: number }[]) {
      s.shadowColor = '#000000';
      s.shadowOpacity = Math.min(0.45, s.shadowOpacity * 3);
    }
  }
}

/** Brand colour for text and icons on surfaces (deep in light mode, lifted in dark mode). */
export const brandText = dark ? palette.green[700] : palette.green[800];
