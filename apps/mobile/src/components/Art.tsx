/** Brand mark, mood faces (shared geometry) and decorative botanical shapes (leaves, arch portrait, sparkles). */
import { LOGO_PATHS, MOOD_FACES, type MoodLevel, type PhotoKey, type Shape } from '@healthx/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Photo } from './Photo';
import { AppText } from './Text';
import { brandText, palette, shadow } from '@/lib/theme';

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
export function Sparkle({ size = 16, color = palette.butter[400], style }: { size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 0 C13 7 17 11 24 12 C17 13 13 17 12 24 C11 17 7 13 0 12 C7 11 11 7 12 0 Z" fill={color} />
      </Svg>
    </View>
  );
}

/**
 * Arch-framed portrait (Mira / Balanza): a coloured arch plate, the photo in an arch and a
 * pink + white leaf pair peeking from behind the top.
 */
export function ArchPortrait({
  photo,
  width = 190,
  height = 240,
  plate = palette.butter[300],
  leaves = true,
  alt,
  position = 'top',
  style,
  leafColors,
}: {
  photo: PhotoKey;
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
  return (
    <View style={[{ width, height: height + top }, style]} pointerEvents="none">
      {leaves ? <LeafPair size={leaf} pink={leafColors?.[0]} white={leafColors?.[1]} style={{ top: 0, left: width * 0.04 }} /> : null}
      <View style={{ position: 'absolute', left: 0, bottom: 0, width, height, borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: plate, ...shadow.lift }} />
      <Photo photo={photo} shape="arch" radius={24} alt={alt} position={position} style={{ position: 'absolute', left: 9, bottom: 9, width: width - 18, height: height - 18 }} />
    </View>
  );
}
