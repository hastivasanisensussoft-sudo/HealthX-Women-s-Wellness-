/** Lightweight SVG charts (react-native-svg) — rounded bars, smooth line/area, ring, progress bar, legend. */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { AppText } from './Text';
import { colors, font, palette } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function useWidth(initial = 300) {
  const [w, setW] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.max(120, Math.round(e.nativeEvent.layout.width)));
  return { w, onLayout };
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  color = palette.green[600],
  track = palette.green[100],
  children,
  animated = true,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  animated?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [anim] = useState(() => new Animated.Value(animated ? 0 : value));
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.max(0, Math.min(1, value)), duration: 900, useNativeDriver: false }).start();
  }, [anim, value]);
  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });
  // Animated SVG props leak `collapsable` onto DOM nodes on web, so web renders statically.
  const RingCircle = Platform.OS === 'web' ? Circle : AnimatedCircle;
  const dashOffset = Platform.OS === 'web' ? c * (1 - Math.max(0, Math.min(1, value))) : offset;
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <RingCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dashOffset as number}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

export function ProgressBar({ value, color = palette.green[600], track = palette.green[100], height = 10, style }: { value: number; color?: string; track?: string; height?: number; style?: ViewStyle }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.max(0, Math.min(1, value)), duration: 700, useNativeDriver: false }).start();
  }, [anim, value]);
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export interface BarDatum {
  label: string;
  value: number | null;
  highlight?: boolean;
  /** Short tag printed at the top of a highlighted bar's band (e.g. "Varies"). */
  note?: string;
}

export function BarChart({
  data,
  height = 160,
  color = palette.green[500],
  highlightColor = palette.lavender[500],
  target,
  formatValue = (v: number) => String(Math.round(v)),
  showValues = false,
  colorFor,
  targetLabel,
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  highlightColor?: string;
  target?: number;
  formatValue?: (v: number) => string;
  showValues?: boolean;
  /** Per-bar colour override (additive). */
  colorFor?: (d: BarDatum, i: number) => string | undefined;
  /** Text at the right end of the dashed target line (additive). */
  targetLabel?: string;
}) {
  const { w, onLayout } = useWidth();
  const hasNote = data.some((d) => d.highlight && d.note);
  const padTop = (showValues ? 18 : 8) + (hasNote ? 16 : 0);
  const padBottom = 22;
  const vals = data.map((d) => d.value ?? 0);
  const max = Math.max(1, ...vals, target ?? 0) * 1.1;
  const slot = w / Math.max(1, data.length);
  const bw = Math.min(28, slot * 0.58);
  const ch = height - padTop - padBottom;
  const targetY = target ? padTop + ch - (target / max) * ch : 0;
  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id="barSheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {data.map((d, i) => {
          const v = d.value ?? 0;
          const h = d.value === null ? 0 : Math.max(4, (v / max) * ch);
          const x = i * slot + (slot - bw) / 2;
          const y = padTop + ch - h;
          const fill = colorFor?.(d, i) ?? (d.highlight ? highlightColor : color);
          return (
            <G key={i}>
              {d.highlight ? <Rect x={i * slot + 2} y={0} width={slot - 4} height={height - padBottom + 4} rx={14} fill={palette.lavender[100]} /> : null}
              {d.highlight && d.note ? (
                <SvgText x={i * slot + slot / 2} y={12} fontSize={9.5} fontFamily={font.monoMedium} fill={palette.lavender[700]} textAnchor="middle" letterSpacing={0.6}>
                  {d.note.toUpperCase()}
                </SvgText>
              ) : null}
              <Rect x={x} y={padTop} width={bw} height={ch} rx={bw / 2} fill={d.highlight ? palette.lavender[50] : palette.ink[50]} />
              {d.value !== null ? (
                <>
                  <Rect x={x} y={y} width={bw} height={h} rx={bw / 2} fill={fill} />
                  <Rect x={x} y={y} width={bw} height={Math.min(h, 24)} rx={bw / 2} fill="url(#barSheen)" />
                </>
              ) : null}
              {showValues && d.value !== null ? (
                <SvgText x={x + bw / 2} y={y - 5} fontSize={10.5} fontFamily={font.semibold} fill={colors.text} textAnchor="middle">
                  {formatValue(v)}
                </SvgText>
              ) : null}
              <SvgText x={x + bw / 2} y={height - 6} fontSize={10} fontFamily={font.medium} fill={d.highlight ? palette.lavender[700] : colors.textSubtle} textAnchor="middle">
                {d.label}
              </SvgText>
            </G>
          );
        })}
        {target ? <Line x1={0} x2={w} y1={targetY} y2={targetY} stroke={palette.green[700]} strokeDasharray="4 4" strokeWidth={1.3} opacity={0.75} /> : null}
        {target && targetLabel ? (
          <SvgText x={w - 2} y={targetY - 4} fontSize={9.5} fontFamily={font.monoMedium} fill={palette.green[700]} textAnchor="end" letterSpacing={0.5}>
            {targetLabel}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

export function LineChart({
  data,
  height = 160,
  color = palette.lavender[500],
  min,
  max,
  area = true,
  dashedFrom,
  yTicks,
  highlight,
  dots,
}: {
  data: { label: string; value: number | null }[];
  height?: number;
  color?: string;
  min?: number;
  max?: number;
  area?: boolean;
  /** Index from which the line is drawn dashed (e.g. estimates). */
  dashedFrom?: number;
  yTicks?: number[];
  /** Tinted vertical band behind one point, with an optional tag (additive). */
  highlight?: { index: number; label?: string };
  /** Dot on every logged point (additive). */
  dots?: boolean;
}) {
  const { w, onLayout } = useWidth();
  const padX = 22; // room for centred axis labels at both edges
  const padTop = highlight?.label ? 22 : 10;
  const padBottom = 22;
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  const lo = min ?? Math.min(...vals, 0);
  const hi = max ?? Math.max(...vals, 1);
  const ch = height - padTop - padBottom;
  const step = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => (d.value === null ? null : { x: padX + i * step, y: padTop + ch - ((d.value - lo) / Math.max(0.0001, hi - lo)) * ch }));
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  pts.forEach((p) => {
    if (p) cur.push(p);
    else if (cur.length) {
      segs.push(cur);
      cur = [];
    }
  });
  if (cur.length) segs.push(cur);
  const toPath = (s: { x: number; y: number }[]) =>
    s.reduce((acc, p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const prev = s[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `${acc} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
    }, '');
  const labelEvery = Math.ceil(data.length / 7);
  const gid = `g${color.replace('#', '')}`;
  const bandW = Math.max(26, Math.min(48, step * 1.6));
  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {highlight && data[highlight.index] ? (
          <G>
            <Rect x={padX + highlight.index * step - bandW / 2} y={0} width={bandW} height={height - padBottom + 4} rx={14} fill={palette.lavender[100]} />
            {highlight.label ? (
              <SvgText x={padX + highlight.index * step} y={14} fontSize={9.5} fontFamily={font.monoMedium} fill={palette.lavender[700]} textAnchor="middle" letterSpacing={0.6}>
                {highlight.label.toUpperCase()}
              </SvgText>
            ) : null}
          </G>
        ) : null}
        {(yTicks ?? []).map((t) => {
          const y = padTop + ch - ((t - lo) / Math.max(0.0001, hi - lo)) * ch;
          return <Line key={t} x1={padX} x2={w - padX} y1={y} y2={y} stroke={palette.ink[100]} strokeWidth={1} strokeDasharray="2 5" />;
        })}
        {segs.map((s, i) => (
          <G key={i}>
            {area && s.length > 1 ? <Path d={`${toPath(s)} L${s[s.length - 1].x},${padTop + ch} L${s[0].x},${padTop + ch} Z`} fill={`url(#${gid})`} /> : null}
            <Path d={toPath(s)} stroke={color} strokeWidth={2.8} fill="none" strokeLinecap="round" />
          </G>
        ))}
        {dashedFrom !== undefined && pts[dashedFrom] ? (
          <Line x1={pts[dashedFrom]!.x} x2={pts[dashedFrom]!.x} y1={padTop} y2={padTop + ch} stroke={palette.lavender[300]} strokeDasharray="3 4" />
        ) : null}
        {pts.map((p, i) =>
          p && (i === pts.length - 1 || (dots && segs.length) || (highlight && highlight.index === i)) ? (
            <Circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 || highlight?.index === i ? 5 : 3.2} fill={colors.surface} stroke={color} strokeWidth={2.5} />
          ) : null,
        )}
        {data.map((d, i) =>
          (data.length - 1 - i) % labelEvery === 0 ? (
            <SvgText key={i} x={padX + i * step} y={height - 6} fontSize={10} fontFamily={font.medium} fill={highlight?.index === i ? palette.lavender[700] : colors.textSubtle} textAnchor="middle">
              {d.label}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: it.dashed ? colors.surface : it.color, borderColor: it.color, borderStyle: it.dashed ? 'dashed' : 'solid' }]} />
          <AppText variant="caption" color={palette.ink[700]}>
            {it.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.ink[50], borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  legendDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
});
