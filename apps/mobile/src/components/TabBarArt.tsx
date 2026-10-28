/**
 * Bottom tab bar artwork (the product owner's 2026-10-28 reference): a floating pill with a soft rise
 * in the middle and a green-to-pink glow, and duo-tone tab icons — a house with a sprout, a calendar
 * with a heart, a heart with a leaf, three bars and a person with a heart.
 * Accent colours are fixed so they read the same in light and dark mode; outlines follow the theme.
 */
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { brandText, colors } from '@/lib/theme';

/** Fixed accents: the pink hearts, the sage leaves and the bar chart. */
const PINK = '#F09AB0';
const LEAF = '#5F9A6E';
const SAGE = '#A3C2AA';
const SAGE_DEEP = '#5E8B6A';
/** Room around the bar for the glow. */
const GLOW_PAD = 14;

/** The bar's outline: a full pill whose top edge rises by `rise` in the middle. */
function barPath(w: number, h: number, rise: number) {
  const r = (h - rise) / 2;
  const cx = w / 2;
  const half = Math.min(w * 0.2, 92); // half-width of the rise
  return [
    `M ${r} ${rise}`,
    `L ${cx - half} ${rise}`,
    `C ${cx - half * 0.5} ${rise} ${cx - half * 0.55} 0 ${cx} 0`,
    `C ${cx + half * 0.55} 0 ${cx + half * 0.5} ${rise} ${cx + half} ${rise}`,
    `L ${w - r} ${rise}`,
    `A ${r} ${r} 0 0 1 ${w} ${rise + r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${rise + r}`,
    `A ${r} ${r} 0 0 1 ${r} ${rise}`,
    'Z',
  ].join(' ');
}

/** The bar's background: drawn in SVG so the glow follows the rise on every platform. */
export function TabBarShape({ width, height, rise }: { width: number; height: number; rise: number }) {
  const d = barPath(width, height, rise);
  return (
    <Svg width={width + GLOW_PAD * 2} height={height + GLOW_PAD * 2} style={{ position: 'absolute', left: -GLOW_PAD, top: -GLOW_PAD }} pointerEvents="none">
      <Defs>
        <LinearGradient id="hxTabGlow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#7DBB92" />
          <Stop offset="0.45" stopColor={PINK} />
          <Stop offset="1" stopColor={PINK} />
        </LinearGradient>
      </Defs>
      {/* Soft glow: wide, faint strokes of the outline, a little lower than the bar. */}
      <G transform={`translate(${GLOW_PAD} ${GLOW_PAD + 3})`}>
        {[
          [20, 0.05],
          [12, 0.07],
          [6, 0.1],
        ].map(([w, o]) => (
          <Path key={w} d={d} fill="none" stroke="url(#hxTabGlow)" strokeWidth={w} strokeOpacity={o} strokeLinejoin="round" />
        ))}
      </G>
      <G transform={`translate(${GLOW_PAD} ${GLOW_PAD})`}>
        <Path d={d} fill={colors.surface} />
      </G>
    </Svg>
  );
}

export type TabName = 'home' | 'cycle' | 'wellness' | 'insights' | 'profile';

/**
 * One tab icon on a 28 × 28 grid. `cutout` is the colour behind the icon (the bar, or the active
 * bubble), used where a shape needs a gap — the house's door, the leaf's edge.
 */
export function TabIcon({ name, active, cutout, size = 28 }: { name: TabName; active: boolean; cutout: string; size?: number }) {
  const line = active ? brandText : colors.textMuted;
  const sw = 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessible={false}>
      {name === 'home' ? (
        <>
          <Path d="M4.5 13.2 L14 5 L23.5 13.2 V22.6 Q23.5 25 21.1 25 H6.9 Q4.5 25 4.5 22.6 Z" fill={active ? brandText : 'none'} stroke={line} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M11.4 25 V20.4 Q11.4 17.6 14 17.6 Q16.6 17.6 16.6 20.4 V25 Z" fill={active ? cutout : 'none'} stroke={active ? 'none' : line} strokeWidth={sw} strokeLinejoin="round" />
          {/* Sprout from the roof */}
          <Path d="M19.6 8.6 L22.4 4.6" stroke={LEAF} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M22 5.6 C22.2 3.4 23.9 2.3 26 2.5 C25.8 4.6 24.1 5.8 22 5.6 Z" fill={LEAF} />
          <Path d="M21.1 7.2 C19.4 6.1 18.9 4.4 19.7 2.8 C21.3 3.6 21.9 5.4 21.1 7.2 Z" fill={LEAF} />
        </>
      ) : name === 'cycle' ? (
        <>
          <Rect x={4} y={6} width={20} height={19} rx={3.5} fill="none" stroke={line} strokeWidth={sw} />
          <Path d="M4.5 11 H23.5" stroke={line} strokeWidth={1.6} />
          <Path d="M9.5 3.5 V8 M18.5 3.5 V8" stroke={line} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M14 22.2 C10.4 19.8 9.4 18.1 9.4 16.5 C9.4 15.1 10.5 14 11.8 14 C12.8 14 13.5 14.6 14 15.4 C14.5 14.6 15.2 14 16.2 14 C17.5 14 18.6 15.1 18.6 16.5 C18.6 18.1 17.6 19.8 14 22.2 Z" fill={PINK} />
        </>
      ) : name === 'wellness' ? (
        <>
          <Path
            d="M13.2 23.6 C5.8 18.4 3.2 14.8 3.2 11.1 C3.2 8.1 5.6 5.7 8.5 5.7 C10.6 5.7 12.2 6.9 13.2 8.6 C14.2 6.9 15.8 5.7 17.9 5.7 C20.8 5.7 23.2 8.1 23.2 11.1 C23.2 14.8 20.6 18.4 13.2 23.6 Z"
            fill={PINK}
            fillOpacity={0.75}
            stroke={line}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          {/* Leaf over the lower right of the heart, with a gap so it reads as separate */}
          <Path d="M16.8 26 C16.6 20.6 19.6 17.4 25.6 17.2 C25.8 22.6 22.6 25.8 16.8 26 Z" fill={LEAF} stroke={cutout} strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M18.4 24.4 L23.6 19.2" stroke={cutout} strokeWidth={1.1} strokeLinecap="round" />
        </>
      ) : name === 'insights' ? (
        <>
          <Rect x={5} y={13} width={4.6} height={12} rx={2.3} fill={active ? SAGE_DEEP : SAGE} opacity={active ? 0.55 : 1} />
          <Rect x={11.7} y={4.5} width={4.6} height={20.5} rx={2.3} fill={active ? brandText : SAGE_DEEP} />
          <Rect x={18.4} y={9.5} width={4.6} height={15.5} rx={2.3} fill={active ? SAGE_DEEP : SAGE} opacity={active ? 0.55 : 1} />
        </>
      ) : (
        <>
          <Circle cx={12.5} cy={8.6} r={4.6} fill="none" stroke={line} strokeWidth={sw} />
          <Path d="M4.2 25 C4.2 19.4 8 16.2 12.5 16.2 C14.4 16.2 16.1 16.7 17.5 17.7" fill="none" stroke={line} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M21 26 C17.2 23.5 16.2 21.7 16.2 20 C16.2 18.5 17.4 17.3 18.8 17.3 C19.8 17.3 20.5 17.9 21 18.7 C21.5 17.9 22.2 17.3 23.2 17.3 C24.6 17.3 25.8 18.5 25.8 20 C25.8 21.7 24.8 23.5 21 26 Z" fill={PINK} stroke={cutout} strokeWidth={1.2} />
        </>
      )}
    </Svg>
  );
}
