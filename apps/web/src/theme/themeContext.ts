import { createContext, useContext } from 'react';
import type { ThemeId, ThemeMode, ThemePrefs } from '@healthx/shared';

export interface ThemeCtx {
  prefs: ThemePrefs;
  /** Theme currently on screen (a premium preview may differ from the saved choice). */
  active: ThemePrefs;
  dark: boolean;
  previewing: ThemeId | null;
  setTheme: (id: ThemeId) => void;
  setMode: (m: ThemeMode) => void;
  preview: (id: ThemeId | null) => void;
}

export const ThemeContext = createContext<ThemeCtx | null>(null);

export function useTheme(): ThemeCtx {
  const c = useContext(ThemeContext);
  if (!c) throw new Error('useTheme must be used inside ThemeProvider');
  return c;
}
