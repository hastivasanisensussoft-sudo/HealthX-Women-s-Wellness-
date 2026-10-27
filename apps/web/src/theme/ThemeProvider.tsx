import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { THEME_STORAGE_KEY, type ThemeId, type ThemePrefs } from '@healthx/shared';
import { applyTheme, isDarkFor, loadThemePrefs, saveThemePrefs } from './engine';
import { ThemeContext, type ThemeCtx } from './themeContext';

/** Owns the appearance preferences (accent theme + light/dark/system) and keeps the page styled to match. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(loadThemePrefs);
  const [previewing, setPreviewing] = useState<ThemeId | null>(null);
  const [systemDark, setSystemDark] = useState(() => isDarkFor({ ...prefs, mode: 'system' }));
  const active = useMemo(() => (previewing ? { ...prefs, theme: previewing } : prefs), [prefs, previewing]);

  useEffect(() => applyTheme(active), [active, systemDark]);

  // "System" follows the device setting live.
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Other tabs: pick up a theme saved elsewhere.
  useEffect(() => {
    const on = (e: StorageEvent) => e.key === THEME_STORAGE_KEY && setPrefs(loadThemePrefs());
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  const update = useCallback((next: ThemePrefs) => {
    saveThemePrefs(next);
    setPrefs(next);
  }, []);

  const value: ThemeCtx = {
    prefs,
    active,
    dark: isDarkFor(active),
    previewing,
    setTheme: (id) => {
      setPreviewing(null);
      update({ ...prefs, theme: id });
    },
    setMode: (m) => update({ ...prefs, mode: m }),
    preview: setPreviewing,
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
