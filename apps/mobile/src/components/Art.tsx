/** Brand mark, mood faces (shared geometry) and decorative botanical shapes (leaves, arch portrait, sparkles, figures). */
import { LOGO_PATHS, MOOD_FACES, type MoodLevel, type PhotoKey, type Shape } from '@healthx/shared';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { DecorLayer, type DecorTheme } from './Decor';
import { Photo } from './Photo';
import { AppText } from './Text';
import { useReducedMotion } from '@/lib/hooks';
import { brandText, palette, shadow } from '@/lib/theme';

/** Unique gradient ids: on the web every inline SVG shares one document. */
let nextGroundId = 0;

/** The native driver isn't available on the web build (it falls back with a warning). */
const NATIVE = Platform.OS !== 'web';
const SINE = Easing.inOut(Easing.sin);
/** 0 → 1 → 0, forever (after an optional first delay). */
const pingPong = (v: Animated.Value, ms: number, delay = 0) =>
  Animated.sequence([
    Animated.delay(delay),
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: SINE, useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: SINE, useNativeDriver: NATIVE }),
      ]),
    ),
  ]);

function renderShapes(shapes: Shape[]) {
  return shapes.map((s, i) =>
    s.kind === 'circle' ? (
      <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.opacity} />
    ) : (
      <Path
        key={i}
        d={s.d}
        fill={s.fill ?? 'none'}
        stroke={s.stroke}
        strokeWidth={s.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={s.opacity}
      />
    ),
  );
}

export function MoodFace({ mood, size = 44, ring }: { mood: MoodLevel; size?: number; ring?: string }) {
  const f = MOOD_FACES[mood];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: f.bg, overflow: 'hidden', borderWidth: ring ? 2.5 : 0, borderColor: ring }}>
      <Svg width="100%" height="100%" viewBox="0 0 64 64">
        {renderShapes(f.shapes)}
      </Svg>
    </View>
  );
}

export function LogoMark({ size = 36, color = palette.green[700], leaf = palette.green[300] }: { size?: number; color?: string; leaf?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d={LOGO_PATHS.drop} fill={color} />
      <Path d={LOGO_PATHS.leaf} fill={leaf} />
      <Path d={LOGO_PATHS.vein} stroke={color} strokeWidth={0.9} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function Logo({ size = 30, light, style }: { size?: number; light?: boolean; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
      <LogoMark size={size} color={light ? '#fff' : palette.green[700]} leaf={light ? palette.green[300] : palette.green[300]} />
      <View>
        <AppText variant="h2" color={light ? '#fff' : brandText} style={{ fontSize: size * 0.62, lineHeight: size * 0.7 }}>
          HealthX
        </AppText>
        <AppText variant="overline" color={light ? palette.green[200] : palette.green[600]} style={{ fontSize: 8, lineHeight: 10 }}>
          Women’s Wellness
        </AppText>
      </View>
    </View>
  );
}

/** Soft organic blob used behind hero content. */
export function Blob({ size = 200, color = palette.green[100], style }: { size?: number; color?: string; style?: ViewStyle }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Path
          d="M44.7,-58.3C57.3,-50.8,66.1,-36.3,70.4,-20.6C74.8,-4.9,74.7,12,68.5,26.6C62.3,41.2,49.9,53.5,35.4,61.4C20.9,69.3,4.2,72.8,-12.4,70.8C-29,68.8,-45.4,61.3,-56.6,48.7C-67.8,36.1,-73.7,18.1,-72.8,1C-71.9,-16.1,-64.2,-32.3,-52.5,-40.3C-40.7,-48.3,-24.9,-48.2,-9.9,-51.6C5.1,-55,32.1,-65.8,44.7,-58.3Z"
          transform="translate(100 100)"
          fill={color}
        />
      </Svg>
    </View>
  );
}

export function Sprig({ size = 60, color = palette.green[300], style }: { size?: number; color?: string; style?: ViewStyle }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Path d="M30 58 C30 40 30 20 30 4" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M30 40 C20 38 14 30 14 22 C22 24 28 30 30 40Z" fill={color} />
        <Path d="M30 30 C40 28 46 20 46 12 C38 14 32 20 30 30Z" fill={color} />
        <Path d="M30 50 C38 49 44 44 46 37 C38 37 32 42 30 50Z" fill={color} />
      </Svg>
    </View>
  );
}

/** A single leaf with a soft midrib (Mira reference). Decorative only. */
export function Leaf({ size = 64, color = palette.rose[300], vein = 'rgba(255,255,255,0.55)', rotate = 0, style }: { size?: number; color?: string; vein?: string; rotate?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M8 92 C6 46 40 8 92 8 C94 56 56 94 8 92 Z" fill={color} />
        <Path d="M14 86 C38 62 58 42 82 18" stroke={vein} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** Pink and white leaves that sit behind portraits (Mira onboarding). */
export function LeafPair({ size = 80, pink = palette.rose[300], white = '#FFFFFF', style }: { size?: number; pink?: string; white?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size * 2.1, height: size * 1.2 }, style]}>
      <Leaf size={size} color={pink} rotate={-8} style={{ left: 0, top: size * 0.18 }} />
      <Leaf size={size * 0.82} color={white} vein={palette.green[200]} rotate={-96} style={{ right: 0, top: 0 }} />
    </View>
  );
}

/** Four-point sparkle used in illustrated empty states. */
export function Sparkle({
  size = 16,
  color = palette.butter[400],
  style,
  twinkle,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** Twinkles (fades and grows) forever; a number delays its start in ms so sparkles don't pulse together. */
  twinkle?: boolean | number;
}) {
  const reduce = useReducedMotion();
  const on = !!twinkle || twinkle === 0;
  const [t] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!on || reduce) return t.setValue(1);
    t.setValue(0);
    const loop = pingPong(t, 1100, typeof twinkle === 'number' ? twinkle : 0);
    loop.start();
    return () => loop.stop();
  }, [on, reduce, twinkle, t]);
  const anim = on ? { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }] } : null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style, anim]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 0 C13 7 17 11 24 12 C17 13 13 17 12 24 C11 17 7 13 0 12 C7 11 11 7 12 0 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/**
 * A cut-out illustration (transparent PNG, lib/welcomeArt) standing freely on the page, whole and never
 * cropped, on a soft round glow. It fades and rises in whenever it becomes `active`, then floats gently
 * while the glow breathes; "wave" adds a small sway from the feet. All motion stops when the OS asks for
 * reduced motion. `decor` adds themed, animated decorations around it (components/Decor); `ground` adds a
 * breathing ground shadow and ripples beneath it instead. Decorative unless `alt` is given.
 */
export function ArtFigure({
  source,
  height,
  glow,
  alt,
  style,
  motion = 'none',
  active = true,
  decor,
  light = false,
  ground = false,
}: {
  source: ImageSourcePropType;
  height: number;
  /** Colour of the soft disc behind the figure; omit for none. */
  glow?: string;
  alt?: string;
  style?: StyleProp<ViewStyle>;
  /** The figure itself stays put by default (the product owner wants it still); "float" / "wave" move it. */
  motion?: 'float' | 'wave' | 'none';
  /** Replays the entrance each time it turns true (e.g. a carousel slide coming into view). */
  active?: boolean;
  /** Animated decorations around the figure (components/Decor), themed to the picture. */
  decor?: DecorTheme;
  /** The page behind is light (decorations use deeper colours). */
  light?: boolean;
  /** A soft ground shadow that breathes with the float, and calm ripples spreading from where the figure sits. */
  ground?: boolean;
}) {
  const reduce = useReducedMotion();
  const still = reduce || motion === 'none';
  const [a] = useState(() => ({ enter: new Animated.Value(still ? 1 : 0), float: new Animated.Value(0), glow: new Animated.Value(0), sway: new Animated.Value(0), ripple: new Animated.Value(0), ripple2: new Animated.Value(0) }));
  const [boxW, setBoxW] = useState(0);
  const [groundId] = useState(() => `ground${++nextGroundId}`);
  const disc = Math.round(height * 0.86);
  const lift = Math.max(4, Math.round(height * 0.024));

  useEffect(() => {
    if (!active) return;
    if (still) return a.enter.setValue(1);
    a.enter.setValue(0);
    const anim = Animated.timing(a.enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE });
    anim.start();
    return () => anim.stop();
  }, [active, still, a]);

  useEffect(() => {
    if (still) return;
    const loops = [pingPong(a.float, 1800), pingPong(a.glow, 2400, 300)];
    if (motion === 'wave') loops.push(pingPong(a.sway, 1000));
    if (ground) {
      const spread = (v: Animated.Value, delay: number) =>
        Animated.sequence([Animated.delay(delay), Animated.loop(Animated.timing(v, { toValue: 1, duration: 3600, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }))]);
      loops.push(spread(a.ripple, 400), spread(a.ripple2, 2200));
    }
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [still, motion, ground, a]);

  const figure = {
    opacity: a.enter,
    transformOrigin: '50% 100%',
    transform: [
      { translateY: Animated.add(a.enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }), a.float.interpolate({ inputRange: [0, 1], outputRange: [0, -lift] })) },
      { scale: a.enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
      { rotate: a.sway.interpolate({ inputRange: [0, 1], outputRange: motion === 'wave' ? ['-1deg', '1deg'] : ['0deg', '0deg'] }) },
    ],
  };
  // Ground: the shadow shrinks and fades a little as the figure lifts; ripples grow and fade outward.
  const shadowW = Math.round(height * 0.72);
  const shadowH = Math.max(10, Math.round(height * 0.1));
  const shade = {
    opacity: Animated.multiply(a.enter, a.float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.65] })),
    transform: [{ scaleX: a.float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }, { scaleY: a.float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }],
  };
  const ring = (v: Animated.Value) => ({
    opacity: Animated.multiply(a.enter, v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0] })),
    transform: [{ scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.45] }) }, { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.45] }) }],
  });
  const halo = {
    opacity: Animated.multiply(a.enter, a.glow.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] })),
    transform: [{ scale: a.glow.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }) }],
  };

  return (
    <View
      accessible={!!alt}
      accessibilityRole={alt ? 'image' : undefined}
      accessibilityLabel={alt}
      onLayout={decor ? (e) => setBoxW(Math.round(e.nativeEvent.layout.width)) : undefined}
      style={[{ width: '100%', height, alignItems: 'center', justifyContent: 'flex-end' }, style]}>
      {decor && boxW ? <DecorLayer theme={decor} front={false} width={boxW} height={height} active={active} still={reduce} light={light} /> : null}
      {glow ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', bottom: Math.round(height * 0.04), width: disc, height: disc, borderRadius: disc / 2, backgroundColor: glow }, halo]} /> : null}
      {ground ? (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: -shadowH * 0.45, width: shadowW, height: shadowH, alignItems: 'center', justifyContent: 'center' }}>
          {still
            ? null
            : [a.ripple, a.ripple2].map((v, i) => (
                <Animated.View key={i} style={[{ position: 'absolute', width: shadowW, height: shadowH * 1.6 }, ring(v)]}>
                  <Svg width={shadowW} height={shadowH * 1.6}>
                    <Ellipse cx={shadowW / 2} cy={shadowH * 0.8} rx={shadowW / 2 - 1} ry={shadowH * 0.8 - 1} stroke={light ? 'rgba(95,163,130,0.6)' : 'rgba(255,255,255,0.5)'} strokeWidth={1.4} fill="none" />
                  </Svg>
                </Animated.View>
              ))}
          {/* A soft shadow: an ellipse that fades out from its centre (no blur on mobile). */}
          <Animated.View style={shade}>
            <Svg width={shadowW} height={shadowH}>
              <Defs>
                <RadialGradient id={groundId} cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0" stopColor={light ? '#0D4336' : '#03201A'} stopOpacity={light ? 0.22 : 0.5} />
                  <Stop offset="0.6" stopColor={light ? '#0D4336' : '#03201A'} stopOpacity={light ? 0.1 : 0.22} />
                  <Stop offset="1" stopColor={light ? '#0D4336' : '#03201A'} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={shadowW / 2} cy={shadowH / 2} rx={shadowW / 2} ry={shadowH / 2} fill={`url(#${groundId})`} />
            </Svg>
          </Animated.View>
        </View>
      ) : null}
      <Animated.View style={[{ width: '100%', height: '100%' }, figure]}>
        <Image source={source as never} style={{ width: '100%', height: '100%' }} contentFit="contain" contentPosition="bottom" transition={250} accessible={false} />
      </Animated.View>
      {decor && boxW ? <DecorLayer theme={decor} front width={boxW} height={height} active={active} still={reduce} light={light} /> : null}
    </View>
  );
}

/**
 * Arch-framed portrait (Mira / Balanza): a coloured arch plate, the photo in an arch and a
 * pink + white leaf pair peeking from behind the top.
 */
export function ArchPortrait({
  photo,
  source,
  shape = 'arch',
  width = 190,
  height = 240,
  plate = palette.butter[300],
  leaves = true,
  alt,
  position = 'top',
  style,
  leafColors,
}: {
  photo?: PhotoKey;
  /** A bundled illustration instead of a shared photo (lib/welcomeArt). */
  source?: ImageSourcePropType;
  /** "rounded" keeps the corners, for pictures with lettering near the top that an arch would cut. */
  shape?: 'arch' | 'rounded';
  width?: number;
  height?: number;
  plate?: string;
  leaves?: boolean;
  alt?: string;
  position?: 'top' | 'center' | 'bottom';
  style?: StyleProp<ViewStyle>;
  /** [pink, white] leaf colours — tint the white leaf on light backgrounds. */
  leafColors?: [string, string];
}) {
  const leaf = Math.round(width * 0.42);
  const top = Math.round(leaf * 0.62);
  const plateRadius = shape === 'arch' ? { borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 } : { borderRadius: 30 };
  return (
    <View style={[{ width, height: height + top }, style]} pointerEvents="none">
      {leaves ? <LeafPair size={leaf} pink={leafColors?.[0]} white={leafColors?.[1]} style={{ top: 0, left: width * 0.04 }} /> : null}
      <View style={{ position: 'absolute', left: 0, bottom: 0, width, height, ...plateRadius, backgroundColor: plate, ...shadow.lift }} />
      <Photo photo={photo} source={source} shape={shape} radius={24} alt={alt} position={position} style={{ position: 'absolute', left: 9, bottom: 9, width: width - 18, height: height - 18 }} />
    </View>
  );
}
