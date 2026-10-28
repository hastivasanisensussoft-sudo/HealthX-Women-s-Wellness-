/**
 * Animated decorations around a cut-out figure (ArtFigure): blossoms that sway, petals that drift down,
 * floating leaves, rising hearts, twinkling sparkles and stars, breath swirls and soft vine curves. All
 * shapes are drawn here (original vector art, no images). Each theme matches its picture. Items fade in
 * with a small stagger when the figure becomes active, move only while active, and stay still (but
 * visible) when the OS asks for reduced motion. `front` items are drawn over the figure, the rest behind.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

export type DecorTheme = 'bloom' | 'breath' | 'dream' | 'hello' | 'mini' | 'foliage' | 'garden';

const NATIVE = Platform.OS !== 'web';
const SINE = Easing.inOut(Easing.sin);
const PINK = '#F7B9CB';
const PINK_DEEP = '#F08FAB';
const GOLD = '#F5D27A';
const GOLD_DEEP = '#E9B23F';
const LEAF = '#86C2A0';
const LEAF_DEEP = '#5FA382';
const LILAC = '#C9B5EE';
const MINT = '#9BD5BD';

// ---------------------------------------------------------------------------------------------
// Shapes (viewBox 0 0 100 100)
// ---------------------------------------------------------------------------------------------
const PETALS = [0, 72, 144, 216, 288];
const Blossom = ({ size, color = PINK }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    {PETALS.map((r) => (
      <G key={r} rotation={r} origin="50, 50">
        <Path d="M50 50 C36 36 36 12 50 6 C64 12 64 36 50 50 Z" fill={color} />
        <Path d="M50 44 L50 16" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.5} strokeLinecap="round" />
      </G>
    ))}
    <Circle cx={50} cy={50} r={10} fill={GOLD} />
    {PETALS.map((r) => (
      <G key={`s${r}`} rotation={r + 36} origin="50, 50">
        <Circle cx={50} cy={36} r={2.6} fill={GOLD_DEEP} />
      </G>
    ))}
  </Svg>
);
const Petal = ({ size, color = PINK }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M50 4 C74 28 72 70 50 96 C28 70 26 28 50 4 Z" fill={color} />
    <Path d="M50 20 C46 44 46 64 50 82" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={4} fill="none" strokeLinecap="round" />
  </Svg>
);
const LeafShape = ({ size, color = LEAF }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M50 4 C82 26 84 70 50 96 C16 70 18 26 50 4 Z" fill={color} />
    <Path d="M50 14 L50 90 M50 40 L36 30 M50 40 L64 30 M50 60 L34 50 M50 60 L66 50" stroke={LEAF_DEEP} strokeOpacity={0.7} strokeWidth={3} fill="none" strokeLinecap="round" />
  </Svg>
);
const Heart = ({ size, color = PINK_DEEP }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M50 88 C18 66 6 48 6 32 C6 18 18 8 31 8 C40 8 46 13 50 20 C54 13 60 8 69 8 C82 8 94 18 94 32 C94 48 82 66 50 88 Z" fill={color} />
    <Path d="M24 28 C26 22 30 19 35 18" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={5} fill="none" strokeLinecap="round" />
  </Svg>
);
const Star = ({ size, color = GOLD }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 0 C13 7 17 11 24 12 C17 13 13 17 12 24 C11 17 7 13 0 12 C7 11 11 7 12 0 Z" fill={color} />
  </Svg>
);
const Moon = ({ size, color = GOLD }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M62 6 A44 44 0 1 0 94 72 A36 36 0 1 1 62 6 Z" fill={color} />
    <Circle cx={40} cy={44} r={4} fill="#FFFFFF" opacity={0.45} />
    <Circle cx={30} cy={64} r={2.6} fill="#FFFFFF" opacity={0.45} />
  </Svg>
);
const Swirl = ({ size, color = 'rgba(255,255,255,0.5)' }: { size: number; color?: string }) => (
  <Svg width={size} height={size * 0.5} viewBox="0 0 100 50">
    <Path d="M4 30 C20 22 34 22 48 28 S78 36 86 24 C92 14 80 6 72 12 C66 17 70 26 78 24" stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="round" />
    <Path d="M14 42 C28 38 40 38 54 42" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.7} />
  </Svg>
);
const Butterfly = ({ size, color = '#F6B3C6' }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M48 46 C34 18 8 14 8 34 C8 50 28 56 48 52 Z" fill={color} />
    <Path d="M52 46 C66 18 92 14 92 34 C92 50 72 56 52 52 Z" fill={color} />
    <Path d="M48 54 C30 56 16 70 24 82 C32 92 46 76 48 60 Z" fill={color} opacity={0.85} />
    <Path d="M52 54 C70 56 84 70 76 82 C68 92 54 76 52 60 Z" fill={color} opacity={0.85} />
    <Path d="M20 32 C26 26 34 28 40 36" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={3} fill="none" strokeLinecap="round" />
    <Path d="M50 40 L50 78" stroke="#B85C7A" strokeWidth={5} strokeLinecap="round" />
    <Path d="M50 40 C46 30 42 26 38 24 M50 40 C54 30 58 26 62 24" stroke="#B85C7A" strokeWidth={2} fill="none" strokeLinecap="round" />
  </Svg>
);
const Dot = ({ size, color = PINK }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 10 10">
    <Circle cx={5} cy={5} r={5} fill={color} />
  </Svg>
);

// ---------------------------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------------------------
type Kind = 'float' | 'sway' | 'fall' | 'rise' | 'twinkle' | 'flutter';
interface Item {
  shape: (p: { size: number; color?: string }) => ReactNode;
  color?: string;
  /** Centre, as a fraction of the box. */
  x: number;
  y: number;
  /** Size as a fraction of the box height. */
  s: number;
  kind: Kind;
  ms: number;
  delay?: number;
  /** Starting rotation (deg). */
  rot?: number;
  /** fall / rise distance as a fraction of the box height. */
  dist?: number;
  front?: boolean;
  /** Fixed transparency (soft, out-of-focus look). */
  alpha?: number;
}

const pingPong = (v: Animated.Value, ms: number) =>
  Animated.loop(
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: SINE, useNativeDriver: NATIVE }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: SINE, useNativeDriver: NATIVE }),
    ]),
  );
const linear = (v: Animated.Value, ms: number) => Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: NATIVE }));

function Drifter({ item, height, active, still, order }: { item: Item; height: number; active: boolean; still: boolean; order: number }) {
  const [t] = useState(() => new Animated.Value(0));
  const [enter] = useState(() => new Animated.Value(still ? 1 : 0));
  // Larger figures get proportionally bolder decorations; small cards keep them dainty.
  const size = Math.max(6, Math.round(item.s * height * (height < 160 ? 1 : 1.3)));
  const travel = (item.dist ?? 0.4) * height;
  const rot = item.rot ?? 0;

  useEffect(() => {
    if (still) {
      enter.setValue(1);
      t.setValue(item.kind === 'fall' || item.kind === 'rise' ? 0.45 : 0.5);
      return;
    }
    if (!active) {
      enter.setValue(0);
      return;
    }
    t.setValue(0);
    const fadeIn = Animated.timing(enter, { toValue: 1, duration: 600, delay: 200 + order * 70, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE });
    const loop = item.kind === 'fall' || item.kind === 'rise' ? linear(t, item.ms) : pingPong(t, item.ms);
    const run = Animated.parallel([fadeIn, Animated.sequence([Animated.delay(item.delay ?? 0), loop])]);
    run.start();
    return () => run.stop();
  }, [active, still, item, order, enter, t]);

  let anim: object;
  switch (item.kind) {
    case 'float':
      anim = {
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.35] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${rot - 8}deg`, `${rot + 8}deg`] }) },
        ],
      };
      break;
    case 'sway':
      anim = {
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.06, size * 0.06] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${rot - 12}deg`, `${rot + 12}deg`] }) },
          { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.96, 1.03, 0.96] }) },
        ],
      };
      break;
    case 'flutter': {
      // Drifts in a slow loop while the wings flap (a quick squeeze in width, several times per drift).
      const flaps = Array.from({ length: 13 }, (_, k) => k / 12);
      anim = {
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -size * 0.7, -size * 0.2] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-size * 0.5, size * 0.3, size * 0.6] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${rot - 8}deg`, `${rot + 8}deg`] }) },
          { scaleX: t.interpolate({ inputRange: flaps, outputRange: flaps.map((_, k) => (k % 2 ? 0.45 : 1)) }) },
        ],
      };
      break;
    }
    case 'twinkle':
      anim = {
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.15] }) }, { rotate: `${rot}deg` }],
      };
      break;
    default: {
      const dir = item.kind === 'fall' ? 1 : -1;
      anim = {
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 0.9, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dir * travel] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, size * 0.7, 0, -size * 0.7, 0] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${rot}deg`, `${rot + dir * 170}deg`] }) },
          { scale: item.kind === 'rise' ? t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.1] }) : 1 },
        ],
      };
    }
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.item, { left: `${item.x * 100}%`, top: `${item.y * 100}%`, marginLeft: -size / 2, marginTop: -size / 2, opacity: enter }]}>
      <Animated.View style={[anim, item.alpha !== undefined && { opacity: item.alpha }]}>{item.shape({ size, color: item.color })}</Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------------------------
const blossom = Blossom as Item['shape'];
const petal = Petal as Item['shape'];
const leaf = LeafShape as Item['shape'];
const heart = Heart as Item['shape'];
const star = Star as Item['shape'];
const moon = Moon as Item['shape'];
const swirl = Swirl as Item['shape'];
const dot = Dot as Item['shape'];
const butterfly = Butterfly as Item['shape'];

/** Light marks on dark (green) pages; deeper ones on light pages. */
const THEMES: Record<DecorTheme, (light: boolean) => Item[]> = {
  // Meditation: blossoms, drifting petals, floating leaves, sparkles (the reference look).
  bloom: (light) => [
    { shape: blossom, x: 0.14, y: 0.1, s: 0.12, kind: 'sway', ms: 2600 },
    { shape: blossom, x: 0.88, y: 0.5, s: 0.11, kind: 'sway', ms: 2900, delay: 400 },
    { shape: blossom, x: 0.07, y: 0.63, s: 0.085, kind: 'sway', ms: 2400, delay: 800 },
    { shape: leaf, color: LEAF, x: 0.2, y: 0.37, s: 0.1, kind: 'float', ms: 2200, rot: -45 },
    { shape: leaf, color: LEAF, x: 0.84, y: 0.71, s: 0.09, kind: 'float', ms: 2500, rot: 40, delay: 500 },
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.85, y: 0.09, s: 0.07, kind: 'twinkle', ms: 1300 },
    { shape: star, color: light ? GOLD_DEEP : '#FFFFFF', x: 0.1, y: 0.3, s: 0.045, kind: 'twinkle', ms: 1100, delay: 500 },
    { shape: star, color: light ? GOLD_DEEP : '#FFFFFF', x: 0.91, y: 0.35, s: 0.04, kind: 'twinkle', ms: 1000, delay: 900 },
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.12, y: 0.88, s: 0.055, kind: 'twinkle', ms: 1200, delay: 300 },
    { shape: petal, x: 0.25, y: 0.02, s: 0.055, kind: 'fall', ms: 7500, dist: 0.55, rot: 20, front: true },
    { shape: petal, x: 0.8, y: 0.2, s: 0.05, kind: 'fall', ms: 8200, dist: 0.5, rot: -30, delay: 2600, front: true },
    { shape: petal, x: 0.1, y: 0.44, s: 0.045, kind: 'fall', ms: 6800, dist: 0.38, rot: 60, delay: 4800, front: true },
    { shape: petal, x: 0.93, y: 0.68, s: 0.04, kind: 'fall', ms: 6000, dist: 0.26, rot: -10, delay: 1500, front: true },
  ],
  // Yoga: breath swirls, blossoms, petals, leaves, sparkles.
  breath: (light) => [
    { shape: swirl, color: light ? MINT : 'rgba(255,255,255,0.55)', x: 0.13, y: 0.24, s: 0.22, kind: 'float', ms: 2600 },
    { shape: swirl, color: light ? LILAC : 'rgba(255,255,255,0.45)', x: 0.88, y: 0.62, s: 0.2, kind: 'float', ms: 3000, rot: 180, delay: 600 },
    { shape: blossom, x: 0.87, y: 0.13, s: 0.1, kind: 'sway', ms: 2700 },
    { shape: blossom, color: '#F9CFDA', x: 0.09, y: 0.7, s: 0.09, kind: 'sway', ms: 2500, delay: 700 },
    { shape: leaf, x: 0.17, y: 0.48, s: 0.09, kind: 'float', ms: 2300, rot: -35, delay: 300 },
    { shape: leaf, x: 0.9, y: 0.38, s: 0.08, kind: 'float', ms: 2600, rot: 35 },
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.12, y: 0.08, s: 0.06, kind: 'twinkle', ms: 1200 },
    { shape: star, color: light ? GOLD_DEEP : '#FFFFFF', x: 0.93, y: 0.85, s: 0.045, kind: 'twinkle', ms: 1000, delay: 600 },
    { shape: star, color: light ? GOLD_DEEP : '#FFFFFF', x: 0.66, y: 0.03, s: 0.04, kind: 'twinkle', ms: 1100, delay: 1000 },
    { shape: petal, x: 0.3, y: 0.0, s: 0.05, kind: 'fall', ms: 7800, dist: 0.5, rot: 30, delay: 800, front: true },
    { shape: petal, color: '#F9CFDA', x: 0.78, y: 0.06, s: 0.045, kind: 'fall', ms: 8600, dist: 0.55, rot: -20, delay: 3400, front: true },
    { shape: petal, x: 0.06, y: 0.36, s: 0.04, kind: 'fall', ms: 6400, dist: 0.35, rot: 70, delay: 5600, front: true },
  ],
  // Looking up, hopeful: a crescent moon, twinkling stars, hearts rising, a blossom and a leaf.
  dream: (light) => [
    { shape: moon, color: GOLD, x: 0.86, y: 0.1, s: 0.12, kind: 'float', ms: 2800, rot: -10 },
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.12, y: 0.12, s: 0.065, kind: 'twinkle', ms: 1300 },
    { shape: star, color: light ? GOLD_DEEP : '#FFFFFF', x: 0.68, y: 0.03, s: 0.04, kind: 'twinkle', ms: 1000, delay: 400 },
    { shape: star, color: light ? GOLD_DEEP : '#FFFFFF', x: 0.93, y: 0.4, s: 0.045, kind: 'twinkle', ms: 1100, delay: 800 },
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.07, y: 0.46, s: 0.04, kind: 'twinkle', ms: 1200, delay: 1200 },
    { shape: dot, color: LILAC, x: 0.32, y: 0.06, s: 0.022, kind: 'twinkle', ms: 900, delay: 300 },
    { shape: dot, color: '#FFFFFF', x: 0.22, y: 0.24, s: 0.016, kind: 'twinkle', ms: 1000, delay: 700 },
    { shape: blossom, color: '#D9C8F5', x: 0.1, y: 0.72, s: 0.085, kind: 'sway', ms: 2600, delay: 500 },
    { shape: leaf, x: 0.9, y: 0.7, s: 0.08, kind: 'float', ms: 2400, rot: 35 },
    { shape: heart, x: 0.16, y: 0.86, s: 0.06, kind: 'rise', ms: 6200, dist: 0.5, rot: -10, front: true },
    { shape: heart, color: PINK, x: 0.86, y: 0.9, s: 0.05, kind: 'rise', ms: 7000, dist: 0.55, rot: 10, delay: 2200, front: true },
    { shape: heart, color: '#F9CFDA', x: 0.78, y: 0.72, s: 0.04, kind: 'rise', ms: 5600, dist: 0.4, delay: 4200, front: true },
  ],
  // Waving hello: hearts, confetti dots, sparkles, a blossom.
  hello: (light) => [
    { shape: blossom, x: 0.09, y: 0.3, s: 0.085, kind: 'sway', ms: 2500 },
    { shape: leaf, x: 0.92, y: 0.42, s: 0.075, kind: 'float', ms: 2400, rot: 30, delay: 400 },
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.12, y: 0.12, s: 0.065, kind: 'twinkle', ms: 1200 },
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.88, y: 0.16, s: 0.05, kind: 'twinkle', ms: 1000, delay: 600 },
    { shape: star, color: LILAC, x: 0.05, y: 0.55, s: 0.035, kind: 'twinkle', ms: 1100, delay: 1000 },
    { shape: dot, color: LILAC, x: 0.22, y: 0.05, s: 0.025, kind: 'twinkle', ms: 900, delay: 200 },
    { shape: dot, color: MINT, x: 0.77, y: 0.05, s: 0.022, kind: 'twinkle', ms: 1000, delay: 500 },
    { shape: dot, color: PINK, x: 0.96, y: 0.64, s: 0.025, kind: 'twinkle', ms: 950, delay: 900 },
    { shape: dot, color: GOLD, x: 0.04, y: 0.78, s: 0.02, kind: 'twinkle', ms: 1050, delay: 1300 },
    { shape: heart, x: 0.15, y: 0.82, s: 0.07, kind: 'rise', ms: 6000, dist: 0.5, rot: -12, front: true },
    { shape: heart, color: PINK, x: 0.9, y: 0.86, s: 0.06, kind: 'rise', ms: 6800, dist: 0.5, rot: 12, delay: 1900, front: true },
    { shape: heart, color: '#F9CFDA', x: 0.84, y: 0.55, s: 0.045, kind: 'rise', ms: 5400, dist: 0.35, delay: 3600, front: true },
  ],
  // Bottom of the welcome screen, around Get started: large soft leaves in the corners, drifting petals.
  foliage: () => [
    { shape: leaf, color: '#4C9C79', x: 0.02, y: 0.6, s: 0.34, kind: 'sway', ms: 3600, rot: 35, alpha: 0.45 },
    { shape: leaf, color: '#2F7A5C', x: 0.13, y: 0.92, s: 0.26, kind: 'sway', ms: 3100, rot: 72, delay: 600, alpha: 0.55 },
    { shape: leaf, color: '#4C9C79', x: 0.99, y: 0.46, s: 0.3, kind: 'sway', ms: 3800, rot: -40, delay: 300, alpha: 0.45 },
    { shape: leaf, color: '#2F7A5C', x: 0.89, y: 0.94, s: 0.24, kind: 'sway', ms: 3300, rot: -74, delay: 900, alpha: 0.55 },
    { shape: petal, x: 0.9, y: 0.02, s: 0.055, kind: 'fall', ms: 7200, dist: 0.5, rot: -20, alpha: 0.9 },
    { shape: petal, x: 0.1, y: 0.0, s: 0.05, kind: 'fall', ms: 8400, dist: 0.45, rot: 40, delay: 3200, alpha: 0.85 },
    { shape: star, color: '#FFFFFF', x: 0.8, y: 0.2, s: 0.035, kind: 'twinkle', ms: 1200, delay: 500 },
  ],
  // Sign-up header (whole hero box): butterflies, sparkles, blossoms and leaves around the woman with tea.
  garden: () => [
    { shape: leaf, color: '#4C9C79', x: 0.97, y: 0.06, s: 0.2, kind: 'sway', ms: 3600, rot: -150, alpha: 0.55 },
    { shape: leaf, color: '#2F7A5C', x: 0.86, y: 0.0, s: 0.14, kind: 'sway', ms: 3200, rot: -120, delay: 500, alpha: 0.6 },
    { shape: butterfly, x: 0.56, y: -0.01, s: 0.08, kind: 'flutter', ms: 2600 },
    { shape: butterfly, color: '#F9CFDA', x: 0.74, y: 0.02, s: 0.065, kind: 'flutter', ms: 3000, rot: 12, delay: 700 },
    { shape: butterfly, x: 0.95, y: 0.3, s: 0.055, kind: 'flutter', ms: 2800, rot: -10, delay: 1300 },
    { shape: star, color: GOLD, x: 0.33, y: 0.03, s: 0.05, kind: 'twinkle', ms: 1300 },
    { shape: star, color: PINK, x: 0.58, y: 0.36, s: 0.035, kind: 'twinkle', ms: 1000, delay: 500 },
    { shape: star, color: GOLD, x: 0.27, y: 0.82, s: 0.045, kind: 'twinkle', ms: 1200, delay: 900 },
    { shape: leaf, x: 0.44, y: 0.74, s: 0.13, kind: 'sway', ms: 2800, rot: -40 },
    { shape: leaf, color: '#5FA382', x: 0.5, y: 0.86, s: 0.11, kind: 'sway', ms: 3000, rot: -70, delay: 400 },
    { shape: blossom, x: 0.46, y: 0.62, s: 0.07, kind: 'sway', ms: 2500, front: true },
    { shape: blossom, x: 0.41, y: 0.83, s: 0.065, kind: 'sway', ms: 2700, delay: 600, front: true },
    { shape: blossom, x: 0.97, y: 0.54, s: 0.07, kind: 'sway', ms: 2600, delay: 300, front: true },
    { shape: blossom, color: '#F9CFDA', x: 0.93, y: 0.78, s: 0.06, kind: 'sway', ms: 2900, delay: 900, front: true },
    { shape: leaf, color: '#5FA382', x: 0.99, y: 0.9, s: 0.14, kind: 'sway', ms: 3100, rot: 40, front: true },
  ],
  // Small card: a few sparkles and a rising heart.
  mini: (light) => [
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.1, y: 0.22, s: 0.11, kind: 'twinkle', ms: 1200 },
    { shape: star, color: light ? GOLD_DEEP : GOLD, x: 0.92, y: 0.14, s: 0.09, kind: 'twinkle', ms: 1000, delay: 700 },
    { shape: dot, color: PINK, x: 0.06, y: 0.6, s: 0.04, kind: 'twinkle', ms: 950, delay: 400 },
    { shape: heart, x: 0.88, y: 0.78, s: 0.1, kind: 'rise', ms: 5200, dist: 0.45, front: true },
  ],
};

/** Soft vine curves behind the figure (bloom and breath themes). */
function Vines({ width, height, light, active, still }: { width: number; height: number; light: boolean; active: boolean; still: boolean }) {
  const [o] = useState(() => new Animated.Value(still ? 1 : 0));
  useEffect(() => {
    if (still) return o.setValue(1);
    const a = Animated.timing(o, { toValue: active ? 1 : 0, duration: 800, useNativeDriver: NATIVE });
    a.start();
    return () => a.stop();
  }, [active, still, o]);
  const W = width, H = height;
  const stroke = light ? 'rgba(95,163,130,0.35)' : 'rgba(255,255,255,0.2)';
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: o }]}>
      <Svg width={W} height={H}>
        <Path d={`M${W * 0.18} ${-H * 0.02} C${W * 0.02} ${H * 0.25} ${W * 0.22} ${H * 0.45} ${W * 0.04} ${H * 0.8}`} stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <Path d={`M${W * 0.98} ${H * 0.16} C${W * 0.8} ${H * 0.38} ${W * 1.0} ${H * 0.62} ${W * 0.86} ${H * 0.94}`} stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/** One layer of decorations (draw `front={false}` before the figure and `front` after it). */
export function DecorLayer({ theme, front, width, height, active, still, light = false }: { theme: DecorTheme; front: boolean; width: number; height: number; active: boolean; still: boolean; light?: boolean }) {
  const [items] = useState(() => THEMES[theme](light));
  const list = items.map((it, i) => ({ it, i })).filter(({ it }) => !!it.front === front);
  return (
    <>
      {!front && (theme === 'bloom' || theme === 'breath') ? <Vines width={width} height={height} light={light} active={active} still={still} /> : null}
      {list.map(({ it, i }) => (
        <Drifter key={i} item={it} height={height} active={active} still={still} order={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute' },
});
