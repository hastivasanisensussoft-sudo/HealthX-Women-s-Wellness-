import type { Config } from 'tailwindcss';
import { palette, radius } from '../../packages/shared/src/tokens';

const px = (n: number) => `${n}px`;

/**
 * Every palette colour is a CSS variable so Settings → Appearance can switch accent
 * themes and light/dark mode at runtime (src/theme/engine.ts writes the values).
 * Backgrounds/borders/fills read `--c-*`; text reads `--t-*` (same in light mode,
 * lifted for readability in dark mode). `text-white` always stays white.
 */
const SCALES = { green: palette.green, fertile: palette.green, rose: palette.rose, lavender: palette.lavender, peach: palette.peach, sky: palette.sky, indigo: palette.indigo, butter: palette.butter, ink: palette.ink };
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;
const scales = (prefix: 'c' | 't') => Object.fromEntries(Object.entries(SCALES).map(([hue, s]) => [hue, Object.fromEntries(Object.keys(s).map((k) => [k, v(`--${prefix}-${hue}-${k}`)]))]));

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...scales('c'),
        white: v('--c-white'),
        cream: v('--c-cream'),
        mint: v('--c-mint'),
        sage: v('--c-sage'),
        canvas: v('--c-canvas'),
        danger: { DEFAULT: '#D14343', soft: v('--c-danger-soft') },
        warning: { DEFAULT: '#D99413', soft: v('--c-warning-soft') },
      },
      textColor: {
        ...scales('t'),
        white: v('--t-white'),
      },
      fontFamily: {
        display: ['"Outfit Variable"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
        script: ['Caveat', 'cursive'],
      },
      borderRadius: {
        sm: px(radius.sm),
        md: px(radius.md),
        lg: px(radius.lg),
        xl: px(radius.xl),
        '2xl': px(radius['2xl']),
        '3xl': px(radius['3xl']),
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        glow: 'var(--shadow-glow)',
        rose: 'var(--shadow-rose)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'float-slow': { '0%,100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-14px) rotate(3deg)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-soft': { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.06)', opacity: '.85' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        wave: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-in': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        breathe: { '0%,100%': { transform: 'scale(.82)' }, '50%': { transform: 'scale(1)' } },
        sway: { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
        'ken-burns': { '0%': { transform: 'scale(1)' }, '100%': { transform: 'scale(1.08)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-up': 'fade-up .5s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'spin-slow': 'spin-slow 30s linear infinite',
        wave: 'wave 6s linear infinite',
        'scale-in': 'scale-in .18s ease-out both',
        'slide-in': 'slide-in .25s ease-out both',
        'slide-up': 'slide-up .28s cubic-bezier(.2,.8,.2,1) both',
        breathe: 'breathe 8s ease-in-out infinite',
        sway: 'sway 7s ease-in-out infinite',
        'ken-burns': 'ken-burns 14s ease-out both alternate infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
