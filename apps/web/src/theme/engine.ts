import { HUES, mix, parseThemePrefs, resolveTheme, rgbTriplet, THEME_STORAGE_KEY, type ThemePrefs } from '@healthx/shared';

export const prefersDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
export const isDarkFor = (p: ThemePrefs) => p.mode === 'dark' || (p.mode === 'system' && prefersDark());

export function loadThemePrefs(): ThemePrefs {
  try {
    return parseThemePrefs(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return parseThemePrefs(null);
  }
}

export function saveThemePrefs(p: ThemePrefs) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
}

/** CSS custom properties for a theme, scoped to `selector` (":root" for the app, a data attribute for previews). */
export function themeCss(theme: ThemePrefs['theme'], dark: boolean, selector = ':root'): string {
  const r = resolveTheme(theme, dark);
  const out: string[] = [];
  for (const h of HUES) {
    for (const [k, hex] of Object.entries(r.bg[h])) out.push(`--c-${h}-${k}:${rgbTriplet(hex!)}`);
    for (const [k, hex] of Object.entries(r.text[h])) out.push(`--t-${h}-${k}:${rgbTriplet(hex!)}`);
  }
  for (const [k, hex] of Object.entries(r.surface)) out.push(`--c-${k}:${rgbTriplet(hex)}`);
  out.push(`--c-surface:${rgbTriplet(r.surface.white)}`);
  out.push('--t-white:255 255 255');
  out.push(`--c-danger-soft:${rgbTriplet(dark ? mix('#D14343', '#121A17', 0.78) : '#FDECEC')}`);
  out.push(`--c-warning-soft:${rgbTriplet(dark ? mix('#D99413', '#121A17', 0.8) : '#FFF5DD')}`);
  const t = rgbTriplet(r.shadowTint);
  const a = (light: number, darkA: number) => (dark ? darkA : light);
  const glow = rgbTriplet(r.bg.green[700]!);
  out.push(`--shadow-xs:0 1px 2px rgb(${t} / ${a(0.05, 0.35)})`);
  out.push(`--shadow-soft:0 2px 12px rgb(${t} / ${a(0.06, 0.35)})`);
  out.push(`--shadow-card:0 1px 2px rgb(${t} / ${a(0.04, 0.3)}), 0 12px 32px -14px rgb(${t} / ${a(0.14, 0.55)})`);
  out.push(`--shadow-lift:0 26px 50px -20px rgb(${t} / ${a(0.32, 0.7)})`);
  out.push(`--shadow-glow:0 14px 34px -10px rgb(${glow} / 0.45)`);
  out.push(`--shadow-rose:0 14px 34px -12px rgb(223 92 128 / ${a(0.45, 0.35)})`);
  return `${selector}{${out.join(';')};color-scheme:${dark ? 'dark' : 'light'}}`;
}

/** Applies a theme to the whole app (and the Web Admin / public site, which share the stylesheet). */
export function applyTheme(p: ThemePrefs) {
  if (typeof document === 'undefined') return;
  const dark = isDarkFor(p);
  let el = document.getElementById('hx-theme') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'hx-theme';
    document.head.appendChild(el);
  }
  el.textContent = themeCss(p.theme, dark);
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.dataset.mode = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolveTheme(p.theme, dark).surface.canvas);
}

/** CSS colour for inline SVG/canvas use that follows the theme, e.g. cv('ink', 100). */
export const cv = (hue: (typeof HUES)[number], shade: number, alpha?: number) => `rgb(var(--c-${hue}-${shade})${alpha !== undefined ? ` / ${alpha}` : ''})`;
export const tv = (hue: (typeof HUES)[number], shade: number) => `rgb(var(--t-${hue}-${shade}))`;
export const surfaceVar = 'rgb(var(--c-white))';
