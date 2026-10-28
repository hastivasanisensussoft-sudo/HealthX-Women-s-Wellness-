/**
 * Cycle-tab hero dial: dotted outer halo, thick glossy phase arcs (period, follicular, fertile, luteal),
 * a white tick-marked face with "DAY n / OF L DAYS", and a knob on today. Same cycle maths as CycleRing;
 * the colours are this card's own (pink / lavender / blue / green), not the app-wide phase tokens.
 */
import { diffDays, type CycleState } from '@healthx/shared';
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/Text';
import { colors, font, palette } from '@/lib/theme';

export type HeroPhase = 'period' | 'follicular' | 'fertile' | 'luteal';

/** [light, solid] per arc — shared with the hero legend so dots match the ring. */
export const HERO_COLORS: Record<HeroPhase, [string, string]> = {
  period: [palette.rose[300], palette.rose[500]],
  follicular: [palette.lavender[200], palette.lavender[400]],
  fertile: [palette.sky[200], palette.sky[400]],
  luteal: [palette.green[200], palette.green[400]],
};

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
};

/** Day spans of each arc for the current cycle (null fertile window → follicular runs to the end). */
export function heroSpans(state: CycleState) {
  const L = state.avgCycleLength ?? 28; // drawing only; never shown as a "28-day assumption"
  const periodLen = Math.min(state.avgPeriodLength ?? 5, L);
  const fwStart = state.fertileWindow && state.currentCycleStart ? diffDays(state.currentCycleStart, state.fertileWindow.start) + 1 : null;
  const fwEnd = state.fertileWindow && state.currentCycleStart ? Math.min(L, diffDays(state.currentCycleStart, state.fertileWindow.end) + 1) : null;
  const spans: { phase: HeroPhase; d0: number; d1: number }[] = [{ phase: 'period', d0: 1, d1: periodLen }];
  if (fwStart && fwEnd) {
    if (fwStart - 1 >= periodLen + 1) spans.push({ phase: 'follicular', d0: periodLen + 1, d1: fwStart - 1 });
    spans.push({ phase: 'fertile', d0: Math.max(fwStart, periodLen + 1), d1: fwEnd });
    if (fwEnd < L) spans.push({ phase: 'luteal', d0: fwEnd + 1, d1: L });
  } else if (L > periodLen) spans.push({ phase: 'follicular', d0: periodLen + 1, d1: L });
  return { L, spans };
}

export function HeroDial({ state, size = 156 }: { state: CycleState; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { L, spans } = heroSpans(state);
  const c = size / 2;
  const B = size * 0.095; // arc thickness
  const R = c - size * 0.1; // arc centre line
  const face = R - B / 2 - size * 0.03; // white face radius
  const step = 360 / L;
  const start = (d: number) => -90 + (d - 1) * step;
  const end = (d: number) => -90 + d * step;
  const gap = Math.min(2.4, step * 0.3);
  const capDeg = (B / 2 / R) * (180 / Math.PI);
  const today = Math.min(Math.max(state.cycleDay ?? 1, 1), L);
  const todayAngle = start(today) + step / 2;
  const knob = polar(c, c, R, todayAngle);
  const todayPhase = spans.find((s) => today >= s.d0 && today <= s.d1)?.phase ?? 'period';

  const seg = (s: (typeof spans)[number]) => {
    let a0 = start(s.d0) + gap;
    let a1 = end(s.d1) - gap;
    if (a1 <= a0) return null;
    const round = a1 - a0 > capDeg * 2.2;
    if (round) { a0 += capDeg; a1 -= capDeg; }
    const hi = Math.max(0, (a1 - a0) * 0.12);
    return (
      <G key={s.phase}>
        <Path d={arc(c, c, R, a0, a1)} stroke={`url(#${uid}${s.phase})`} strokeWidth={B} strokeLinecap={round ? 'round' : 'butt'} fill="none" />
        {/* gloss: a thin light streak along the outer edge of the arc */}
        <Path d={arc(c, c, R + B * 0.2, a0 + hi, a1 - hi)} stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={B * 0.16} strokeLinecap="round" fill="none" />
      </G>
    );
  };

  const dots = Array.from({ length: 60 }, (_, i) => {
    const big = i % 15 === 0;
    const p = polar(c, c, c - 3, i * 6 - 90);
    return <Circle key={i} cx={p.x} cy={p.y} r={big ? 2 : 0.95} fill="#FFFFFF" opacity={big ? 0.85 : 0.4} />;
  });
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const major = i % 3 === 0;
    const a = i * 30 - 90;
    const p0 = polar(c, c, face - 3, a);
    const p1 = polar(c, c, face - (major ? 8 : 6), a);
    return <Line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={palette.ink[300]} strokeWidth={major ? 1.6 : 1.1} strokeLinecap="round" />;
  });

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Cycle day ${state.cycleDay ?? 'unknown'} of an estimated ${L}-day cycle`}>
      <Svg width={size} height={size}>
        <Defs>
          {spans.map((s) => (
            <LinearGradient key={s.phase} id={`${uid}${s.phase}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={HERO_COLORS[s.phase][0]} />
              <Stop offset="1" stopColor={HERO_COLORS[s.phase][1]} />
            </LinearGradient>
          ))}
          <RadialGradient id={`${uid}glow`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${uid}face`} cx="50%" cy="40%" r="62%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor={palette.green[50]} />
          </RadialGradient>
          <RadialGradient id={`${uid}knob`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.45" stopColor={HERO_COLORS[todayPhase][1]} stopOpacity={0.45} />
            <Stop offset="1" stopColor={HERO_COLORS[todayPhase][1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill={`url(#${uid}glow)`} />
        {dots}
        <Circle cx={c} cy={c} r={R} stroke="#FFFFFF" strokeOpacity={0.14} strokeWidth={B + 6} fill="none" />
        {spans.map(seg)}
        <Circle cx={c} cy={c} r={face + 3} fill={palette.green[200]} opacity={0.35} />
        <Circle cx={c} cy={c} r={face} fill={`url(#${uid}face)`} />
        {ticks}
        {/* today knob */}
        <Circle cx={knob.x} cy={knob.y} r={B * 1.05} fill={`url(#${uid}knob)`} />
        <Circle cx={knob.x} cy={knob.y} r={B * 0.66} fill="#FFFFFF" />
        <Circle cx={knob.x} cy={knob.y} r={B * 0.32} fill={HERO_COLORS[todayPhase][1]} />
      </Svg>
      {/* text block sized to the face (inside the ticks) so it never overlaps them */}
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <AppText style={[styles.small, { fontSize: face * 0.17, lineHeight: face * 0.22 }]}>DAY</AppText>
        <AppText style={[styles.num, { fontSize: face * 0.62, lineHeight: face * 0.7 }]}>{state.cycleDay ?? '—'}</AppText>
        <View style={[styles.bar, { width: face * 0.28, backgroundColor: HERO_COLORS.period[1] }]} />
        {state.avgCycleLength ? <AppText style={[styles.small, { fontSize: face * 0.13, lineHeight: face * 0.18, marginTop: face * 0.06 }]}>{`OF ${state.avgCycleLength} DAYS*`}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  small: { fontFamily: font.monoMedium, color: palette.ink[500], letterSpacing: 1.4 },
  num: { fontFamily: font.displayBold, color: colors.text, letterSpacing: -1 },
  bar: { height: 3, borderRadius: 2, marginTop: 2 },
});
