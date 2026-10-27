/**
 * Large cycle ring (Mira / Moonly references): blush arc for period days, sky follicular,
 * a dashed mint arc for the ESTIMATED fertile window, lavender luteal and a white knob for
 * today. Dashed = estimate — the ring never implies confirmed ovulation.
 */
import { diffDays, type CycleState } from '@healthx/shared';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import { brandText, colors, fertile, font, palette } from '@/lib/theme';

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function CycleRing({ state, size = 300, children, labels = true }: { state: CycleState; size?: number; children?: ReactNode; labels?: boolean }) {
  const L = state.avgCycleLength ?? 28; // drawing only; never shown as a "28-day assumption"
  const cx = size / 2;
  const cy = size / 2;
  const stroke = Math.round(size * 0.07);
  const R = size / 2 - stroke / 2 - 6;
  const step = 360 / L;
  const angleStart = (day: number) => -90 + (day - 1) * step;
  const angleEnd = (day: number) => -90 + day * step;
  const gap = Math.min(2.2, step * 0.3);

  const periodLen = Math.min(state.avgPeriodLength ?? 5, L);
  const fwStart = state.fertileWindow && state.currentCycleStart ? diffDays(state.currentCycleStart, state.fertileWindow.start) + 1 : null;
  const fwEnd = state.fertileWindow && state.currentCycleStart ? Math.min(L, diffDays(state.currentCycleStart, state.fertileWindow.end) + 1) : null;
  const today = Math.min(state.cycleDay ?? 1, L);
  const todayPos = polar(cx, cy, R, (angleStart(today) + angleEnd(today)) / 2);

  const seg = (d0: number, d1: number, color: string, dashed?: boolean) =>
    d1 >= d0 ? (
      <Path d={arc(cx, cy, R, angleStart(d0) + gap, angleEnd(d1) - gap)} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={dashed ? `${stroke * 0.55} ${stroke * 0.42}` : undefined} />
    ) : null;

  const label = (text: string, day: number, color: string) => {
    const p = polar(cx, cy, R - stroke - 10, (angleStart(day) + angleEnd(day)) / 2);
    return (
      <SvgText x={p.x} y={p.y + 3} fontSize={size * 0.031} fontFamily={font.monoMedium} fill={color} textAnchor="middle" letterSpacing={0.8}>
        {text}
      </SvgText>
    );
  };

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Cycle ring, day ${state.cycleDay ?? 'unknown'} of an estimated ${L}-day cycle`}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringPeriod" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.rose[300]} />
            <Stop offset="1" stopColor={palette.rose[500]} />
          </LinearGradient>
          <RadialGradient id="ringCore" cx="50%" cy="40%" r="65%">
            <Stop offset="0" stopColor={colors.surface} />
            <Stop offset="1" stopColor={palette.green[50]} />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={R - stroke / 2 - 5} fill="url(#ringCore)" />
        <Circle cx={cx} cy={cy} r={R} stroke={palette.ink[100]} strokeWidth={stroke} fill="none" />
        <G>
          {fwStart ? seg(periodLen + 1, fwStart - 1, palette.sky[200]) : seg(periodLen + 1, L, palette.sky[200])}
          {fwEnd && fwEnd < L ? seg(fwEnd + 1, L, palette.lavender[200]) : null}
          {fwStart && fwEnd ? seg(fwStart, fwEnd, fertile[300], true) : null}
          {seg(1, periodLen, 'url(#ringPeriod)')}
        </G>
        {labels ? (
          <G>
            {label('PERIOD', Math.ceil(periodLen / 2), palette.rose[600])}
            {fwStart && fwEnd ? label('FERTILE*', Math.round((fwStart + fwEnd) / 2), fertile[700]) : null}
            {fwStart ? label('FOLLICULAR', Math.round((periodLen + fwStart) / 2), palette.sky[600]) : null}
            {fwEnd && fwEnd < L ? label('LUTEAL', Math.round((fwEnd + L) / 2), palette.lavender[600]) : null}
          </G>
        ) : null}
        {/* today marker */}
        <Circle cx={todayPos.x} cy={todayPos.y} r={stroke / 2 + 6} fill={colors.surface} stroke={brandText} strokeWidth={3} />
        <Circle cx={todayPos.x} cy={todayPos.y} r={4.5} fill={brandText} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center, { padding: size * 0.23 }]} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
