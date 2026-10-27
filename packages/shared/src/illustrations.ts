/**
 * Platform-neutral vector specs for the friendly mood faces (inspired by the
 * character chips in the reference designs). Web renders them with <svg>, mobile
 * with react-native-svg — same geometry, identical look. viewBox: 0 0 64 64.
 */
import type { MoodLevel } from './types';

export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };

const INK = '#3E2E3A';
const CHEEK = '#FF9DB1';

const hair = (color: string): Shape[] => [
  { kind: 'path', d: 'M10 30 C10 12 22 6 32 6 C46 6 55 15 54 31 C50 22 44 17 36 16 C28 22 18 24 10 30 Z', fill: color },
];

const faceBase = (skin: string, hairColor: string): Shape[] => [
  { kind: 'circle', cx: 32, cy: 34, r: 22, fill: skin },
  ...hair(hairColor),
  { kind: 'circle', cx: 20, cy: 40, r: 3.4, fill: CHEEK, opacity: 0.55 },
  { kind: 'circle', cx: 44, cy: 40, r: 3.4, fill: CHEEK, opacity: 0.55 },
];

const eyesOpen: Shape[] = [
  { kind: 'circle', cx: 24, cy: 34, r: 2.6, fill: INK },
  { kind: 'circle', cx: 40, cy: 34, r: 2.6, fill: INK },
  { kind: 'circle', cx: 25, cy: 33, r: 0.9, fill: '#FFFFFF' },
  { kind: 'circle', cx: 41, cy: 33, r: 0.9, fill: '#FFFFFF' },
];
const eyesHappy: Shape[] = [
  { kind: 'path', d: 'M20 35 Q24 30 28 35', stroke: INK, strokeWidth: 2.4 },
  { kind: 'path', d: 'M36 35 Q40 30 44 35', stroke: INK, strokeWidth: 2.4 },
];
const eyesSad: Shape[] = [
  { kind: 'path', d: 'M20 33 Q24 36 28 33', stroke: INK, strokeWidth: 2.4 },
  { kind: 'path', d: 'M36 33 Q40 36 44 33', stroke: INK, strokeWidth: 2.4 },
];

export const MOOD_FACES: Record<MoodLevel, { bg: string; shapes: Shape[] }> = {
  excellent: {
    bg: '#FFF1D6',
    shapes: [...faceBase('#FFD8B8', '#7A4A3A'), ...eyesHappy, { kind: 'path', d: 'M23 43 Q32 52 41 43 Z', fill: '#C8475F', stroke: INK, strokeWidth: 1.6 }],
  },
  good: {
    bg: '#E1F2E8',
    shapes: [...faceBase('#FFD8B8', '#7A4A3A'), ...eyesOpen, { kind: 'path', d: 'M25 44 Q32 49 39 44', stroke: INK, strokeWidth: 2.4 }],
  },
  neutral: {
    bg: '#ECE8FD',
    shapes: [...faceBase('#FFD8B8', '#7A4A3A'), ...eyesOpen, { kind: 'path', d: 'M26 45 L38 45', stroke: INK, strokeWidth: 2.4 }],
  },
  low: {
    bg: '#DDEFFD',
    shapes: [...faceBase('#FFD8B8', '#7A4A3A'), ...eyesSad, { kind: 'path', d: 'M25 47 Q32 42 39 47', stroke: INK, strokeWidth: 2.4 }],
  },
  very_low: {
    bg: '#E6E9FB',
    shapes: [
      ...faceBase('#FFD8B8', '#7A4A3A'),
      ...eyesSad,
      { kind: 'path', d: 'M25 48 Q32 41 39 48', stroke: INK, strokeWidth: 2.4 },
      { kind: 'path', d: 'M44 38 Q46 43 44 45 Q42 43 44 38 Z', fill: '#7CC4F2' },
    ],
  },
};

/** Brand mark: a leaf-shaped droplet. viewBox 0 0 32 32. */
export const LOGO_PATHS = {
  drop: 'M16 3 C16 3 6 13.5 6 19.5 C6 25 10.5 29 16 29 C21.5 29 26 25 26 19.5 C26 13.5 16 3 16 3 Z',
  leaf: 'M16 26 C16 20 18.5 15.5 22.5 13 C22 18.5 19.8 23 16 26 Z',
  vein: 'M16 26 C17.3 21.5 19.2 18 21.6 15',
};
