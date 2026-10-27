/** Water glass with a wave fill level (hydration hero). Decorative: the screen states the amount in text. */
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, palette } from '@/lib/theme';

const GLASS = 'M12 10 L108 10 L97 160 Q96 168 88 168 L32 168 Q24 168 23 160 Z';

function wave(y: number, amp: number, phase: number) {
  let d = `M-30 ${y}`;
  for (let x = -30; x < 150; x += 30) d += ` Q ${x + 15} ${y + (Math.floor((x + phase) / 30) % 2 === 0 ? -amp : amp)} ${x + 30} ${y}`;
  return `${d} L150 180 L-30 180 Z`;
}

export function WaterGlass({ value, width = 120 }: { value: number; width?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const top = 10 + (1 - pct) * 158;
  const height = (width * 180) / 120;
  return (
    <View style={{ width, height }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox="0 0 120 180">
        <Defs>
          <ClipPath id="hxGlass">
            <Path d={GLASS} />
          </ClipPath>
          <LinearGradient id="hxWater" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.sky[400]} />
            <Stop offset="1" stopColor={palette.sky[500]} />
          </LinearGradient>
        </Defs>
        <Path d={GLASS} fill={colors.surface} />
        {pct > 0 ? (
          <G clipPath="url(#hxGlass)">
            <Path d={wave(top - 2, 5, 30)} fill={palette.sky[200]} opacity={0.8} />
            <Path d={wave(top + 2, 6, 0)} fill="url(#hxWater)" />
          </G>
        ) : null}
        <Path d={GLASS} fill="none" stroke={palette.sky[400]} strokeWidth={3} strokeLinejoin="round" />
        <Path d="M26 26 L33 140" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
