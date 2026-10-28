/**
 * Illustrated mood avatar (Wellness check-in row): a girl's face with a brown bob and centre parting,
 * rosy cheeks and one of five expressions, on a pastel disc inside a white ring.
 * Decorative; the parent supplies the accessible label.
 */
import type { MoodLevel } from '@healthx/shared';
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

const BG: Record<MoodLevel, [string, string]> = {
  excellent: ['#DDF6EA', '#BFEBD7'],
  good: ['#E3F6DF', '#C9EBC6'],
  neutral: ['#ECEBFD', '#D6D3F7'],
  low: ['#FDE8DC', '#F9D1BE'],
  very_low: ['#FDE2E8', '#F8C3CF'],
};
const INK = '#3B2A26';

export function MoodAvatar({ mood, size = 40, selected, selectedColor = '#F6C344' }: { mood: MoodLevel; size?: number; selected?: boolean; selectedColor?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const happy = mood === 'excellent' || mood === 'good';
  const sad = mood === 'low' || mood === 'very_low';
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={BG[mood][0]} />
            <Stop offset="1" stopColor={BG[mood][1]} />
          </LinearGradient>
          <LinearGradient id={`${id}hair`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6B4334" />
            <Stop offset="1" stopColor="#3F2720" />
          </LinearGradient>
          <RadialGradient id={`${id}skin`} cx="50%" cy="40%" r="62%">
            <Stop offset="0" stopColor="#FFEFE3" />
            <Stop offset="1" stopColor="#F7D2BC" />
          </RadialGradient>
        </Defs>

        {/* white ring with a soft shadow, pastel disc */}
        <Circle cx={50} cy={52} r={48} fill="#000" opacity={0.12} />
        <Circle cx={50} cy={50} r={48} fill="#FFFFFF" />
        <Circle cx={50} cy={50} r={43.5} fill={`url(#${id}bg)`} />
        {selected ? <Circle cx={50} cy={50} r={47} fill="none" stroke={selectedColor} strokeWidth={4} /> : null}

        {/* head, drawn at a 100 box and scaled up so it fills the disc like the reference */}
        <G transform="translate(50 57) scale(1.16) translate(-50 -57)">
        {/* back hair (bob) */}
        <Path d="M23 55 C21 35 34 23 50 23 C66 23 79 35 77 55 L78 70 C78 76 72 77 70 72 L69 62 L31 62 L30 72 C28 77 22 76 22 70 Z" fill={`url(#${id}hair)`} />
        {/* ears */}
        <Circle cx={29} cy={60} r={4.6} fill="#F4C7AE" />
        <Circle cx={71} cy={60} r={4.6} fill="#F4C7AE" />
        {/* face */}
        <Ellipse cx={50} cy={60} rx={21} ry={19.5} fill={`url(#${id}skin)`} />
        {/* fringe with a centre parting, plus a gloss streak */}
        <Path d="M24 56 C22 36 36 24 50 24 C64 24 78 36 76 56 C74 48 69 42 61 39.5 C56 38 52.5 35 50 31 C47.5 35 44 38 39 39.5 C31 42 26 48 24 56 Z" fill={`url(#${id}hair)`} />
        <Path d="M36 31 C40 28 45 27 48 27.5" stroke="#FFFFFF" strokeOpacity={0.28} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <Path d="M53 27.5 C58 27.5 63 29.5 66 33" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={2} strokeLinecap="round" fill="none" />

        {/* cheeks and nose */}
        <Ellipse cx={37.5} cy={66} rx={5.2} ry={3.4} fill="#F497A6" opacity={0.55} />
        <Ellipse cx={62.5} cy={66} rx={5.2} ry={3.4} fill="#F497A6" opacity={0.55} />
        <Ellipse cx={50} cy={63.5} rx={1.7} ry={1.2} fill="#E3A288" />

        {/* brows for worried faces */}
        {sad ? (
          <G stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none">
            <Path d="M35.5 52.5 Q39.5 49.5 43.5 49.5" />
            <Path d="M56.5 49.5 Q60.5 49.5 64.5 52.5" />
          </G>
        ) : null}

        {/* eyes */}
        {happy ? (
          <G stroke={INK} strokeWidth={2.4} strokeLinecap="round" fill="none">
            <Path d="M36 59 Q40 54 44 59" />
            <Path d="M56 59 Q60 54 64 59" />
          </G>
        ) : mood === 'very_low' ? (
          <G stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none">
            <Path d="M36 57.5 Q40 61 44 57.5" />
            <Path d="M56 57.5 Q60 61 64 57.5" />
          </G>
        ) : (
          <G>
            <Ellipse cx={40} cy={58} rx={2.6} ry={3} fill={INK} />
            <Ellipse cx={60} cy={58} rx={2.6} ry={3} fill={INK} />
            <Circle cx={40.9} cy={56.9} r={0.9} fill="#FFFFFF" />
            <Circle cx={60.9} cy={56.9} r={0.9} fill="#FFFFFF" />
          </G>
        )}

        {/* mouths */}
        {mood === 'excellent' ? (
          <G>
            <Path d="M41 66.5 Q50 81 59 66.5 Z" fill="#8E2F35" />
            <Path d="M44 67 L56 67 L55.2 69 L44.8 69 Z" fill="#FFFFFF" />
            <Path d="M44.8 74.5 Q50 70.5 55.2 74.5 Q50 78 44.8 74.5 Z" fill="#F27D8C" />
          </G>
        ) : mood === 'good' ? (
          <Path d="M43.5 68 Q50 73.5 56.5 68" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        ) : mood === 'neutral' ? (
          <Path d="M45 69 Q50 72 55 69" stroke={INK} strokeWidth={2.1} strokeLinecap="round" fill="none" />
        ) : (
          <Path d="M44.5 72 Q50 67 55.5 72" stroke={INK} strokeWidth={2.1} strokeLinecap="round" fill="none" />
        )}

        {/* extras: joy sparkles, a tear */}
        {mood === 'excellent' ? (
          <G stroke="#F6C344" strokeWidth={2.2} strokeLinecap="round">
            <Path d="M17 43 L22 46" />
            <Path d="M15.5 51 L21 51" />
            <Path d="M20 36 L24 40" />
            <Path d="M83 43 L78 46" />
            <Path d="M84.5 51 L79 51" />
            <Path d="M80 36 L76 40" />
          </G>
        ) : null}
        {mood === 'very_low' ? <Path d="M64 63 C61.5 67 60.5 69 60.5 70.5 C60.5 72.6 62.1 74 64 74 C65.9 74 67.5 72.6 67.5 70.5 C67.5 69 66.5 67 64 63 Z" fill="#4FA3E3" /> : null}
        </G>
      </Svg>
    </View>
  );
}
