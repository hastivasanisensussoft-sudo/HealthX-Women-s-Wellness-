/**
 * Insights hero (light, illustrated): Wellness Score ring wrapped in leaves and flowers, the week's
 * dates, a two-tone title, an encouragement pill, a painted illustration, and three pastel stat cards
 * with a 7-day bar strip and a chevron each. Every value comes from the caller; the ring shows the
 * real score (empty at 0), never a decorative fill.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarCheck, CalendarDays, ChevronDown, ChevronRight, Footprints, Info, Leaf as LeafIcon, Moon, type LucideIcon } from 'lucide-react-native';
import { useId } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from './Text';
import { font, palette } from '@/lib/theme';

const ILLUSTRATION = require('../../assets/images/insights/woman.png');
const INK = '#14271F';

type Tone = 'mint' | 'lavender' | 'peach';
const TONE: Record<Tone, { bg: [string, string]; tile: string; icon: string; bar: string; wave: string }> = {
  mint: { bg: ['#F4FCF7', '#E3F6EA'], tile: '#D5F2E1', icon: '#155C43', bar: '#25C38A', wave: '#BFEBD3' },
  lavender: { bg: ['#F7F6FF', '#ECEAFE'], tile: '#E3DFFD', icon: '#6B4FD8', bar: '#8C7BEA', wave: '#D3CCFA' },
  peach: { bg: ['#FFF9F3', '#FDEDE0'], tile: '#FDE2CF', icon: '#E8742E', bar: '#F08A44', wave: '#F9D9C1' },
};

export interface ScoreStat {
  key: 'checkins' | 'sleep' | 'steps';
  label: string;
  value: string;
  /** 7 values, oldest first, each 0–1 (null = nothing logged that day). */
  week: (number | null)[];
  onPress: () => void;
}
const ICONS: Record<ScoreStat['key'], { icon: LucideIcon; tone: Tone }> = {
  checkins: { icon: CalendarCheck, tone: 'mint' },
  sleep: { icon: Moon, tone: 'lavender' },
  steps: { icon: Footprints, tone: 'peach' },
};

/** Five-petal white flower with a yellow centre. */
function Flower({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <Ellipse key={a} cx={0} cy={-r * 0.62} rx={r * 0.42} ry={r * 0.62} fill="#FFFFFF" transform={`rotate(${a})`} />
      ))}
      <Circle r={r * 0.32} fill="#F5B83D" />
    </G>
  );
}
/** Pointed leaf with a midrib, drawn along +y from the origin. */
function SvgLeaf({ x, y, s, rot, c }: { x: number; y: number; s: number; rot: number; c: string }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <Path d="M0 0 C9 6 11 20 0 34 C-11 20 -9 6 0 0 Z" fill={c} />
      <Path d="M0 2 L0 31" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} />
    </G>
  );
}

function ScoreRing({ score, size }: { score: number | null; size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pad = size * 0.16; // room for the foliage around the ring
  const box = size + pad * 2;
  const c = box / 2;
  const B = size * 0.11;
  const R = size / 2 - B / 2 - size * 0.05;
  const frac = Math.max(0, Math.min(1, (score ?? 0) / 100));
  const pt = (deg: number, r = R) => ({ x: c + r * Math.cos((deg * Math.PI) / 180), y: c + r * Math.sin((deg * Math.PI) / 180) });
  const a1 = -90 + frac * 359.9;
  const s = pt(-90);
  const e = pt(a1);
  const inner = R - B / 2 - size * 0.04;
  const k = size / 100;
  return (
    <View style={{ width: box, height: box, margin: -pad }}>
      <Svg width={box} height={box}>
        <Defs>
          <SvgGradient id={`${uid}p`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#12C483" />
            <Stop offset="1" stopColor="#BDEB6A" />
          </SvgGradient>
          <RadialGradient id={`${uid}i`} cx="50%" cy="40%" r="62%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#E9F8EF" />
          </RadialGradient>
        </Defs>
        {/* foliage behind the ring */}
        <SvgLeaf x={c - size * 0.44} y={c - size * 0.2} s={k * 1.2} rot={140} c="#3E9B5B" />
        <SvgLeaf x={c - size * 0.4} y={c + size * 0.25} s={k * 1.1} rot={60} c="#2F7D4A" />
        <SvgLeaf x={c + size * 0.42} y={c - size * 0.28} s={k} rot={-140} c="#4CAF68" />
        <SvgLeaf x={c + size * 0.38} y={c + size * 0.3} s={k * 1.15} rot={-60} c="#2F7D4A" />
        <SvgLeaf x={c - size * 0.18} y={c - size * 0.47} s={k * 0.8} rot={170} c="#5BBE77" />
        {/* soft glass halo */}
        <Circle cx={c} cy={c} r={size / 2} fill="#FFFFFF" opacity={0.55} />
        <Circle cx={c} cy={c} r={size / 2} fill="none" stroke="#FFFFFF" strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={R} fill="none" stroke="#D9F2E3" strokeWidth={B} />
        {frac > 0 ? <Path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${e.x} ${e.y}`} stroke={`url(#${uid}p)`} strokeWidth={B} strokeLinecap="round" fill="none" /> : null}
        <Circle cx={c} cy={c} r={inner} fill={`url(#${uid}i)`} />
        <Circle cx={c} cy={c} r={inner} fill="none" stroke="#FFFFFF" strokeWidth={2} />
        {/* knob */}
        <Circle cx={e.x} cy={e.y + 1.5} r={B * 0.75} fill="#000" opacity={0.1} />
        <Circle cx={e.x} cy={e.y} r={B * 0.75} fill="#FFFFFF" />
        {/* flowers on the foliage */}
        <Flower x={c - size * 0.49} y={c - size * 0.02} r={size * 0.07} />
        <Flower x={c - size * 0.42} y={c + size * 0.14} r={size * 0.055} />
        <Flower x={c + size * 0.47} y={c + size * 0.18} r={size * 0.065} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <LeafIcon size={size * 0.13} color="#1F9D5C" fill="#47B86E" />
        <AppText style={[styles.score, { fontSize: size * 0.27, lineHeight: size * 0.31 }]}>{score ?? '—'}</AppText>
        <AppText style={[styles.of, { fontSize: size * 0.1, lineHeight: size * 0.13 }]}>/100</AppText>
      </View>
    </View>
  );
}

function Bars({ week, color }: { week: (number | null)[]; color: string }) {
  return (
    <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {week.map((v, i) => (
        <View key={i} style={[styles.bar, v ? { backgroundColor: color, opacity: 0.45 + 0.55 * Math.min(1, v) } : styles.barEmpty]} />
      ))}
    </View>
  );
}

function StatCard({ stat, wide }: { stat: ScoreStat; wide: boolean }) {
  const { icon: Icon, tone } = ICONS[stat.key];
  const t = TONE[tone];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${stat.label}: ${stat.value}`} onPress={stat.onPress} style={({ pressed }) => [styles.card, wide && styles.cardWide, pressed && { transform: [{ scale: 0.98 }] }]}>
      <LinearGradient colors={t.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={styles.wave} viewBox="0 0 200 60" preserveAspectRatio="none" pointerEvents="none">
        <Path d="M0 30 C40 10 80 50 120 30 C150 15 175 22 200 28 L200 60 L0 60 Z" fill={t.wave} opacity={0.7} />
      </Svg>
      <View style={[styles.tile, { backgroundColor: t.tile }, wide && styles.tileWide]}>
        <Icon size={wide ? 24 : 17} color={t.icon} />
      </View>
      <View style={wide ? { flex: 1 } : undefined}>
        <AppText style={styles.cardLabel} numberOfLines={1}>
          {stat.label}
        </AppText>
        <AppText style={[styles.cardValue, wide && styles.cardValueWide]} numberOfLines={1}>
          {stat.value}
        </AppText>
        <Bars week={stat.week} color={t.bar} />
      </View>
      <View style={[styles.go, wide && styles.goWide]}>
        <ChevronRight size={wide ? 16 : 13} color={INK} />
      </View>
    </Pressable>
  );
}

/** Week chooser chip for the page header (opens the caller's week picker). */
export function WeekChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Week ${label}. Choose another week`} onPress={onPress} style={({ pressed }) => [styles.weekChip, pressed && { opacity: 0.85 }]}>
      <CalendarDays size={15} color={INK} />
      <AppText style={styles.weekChipText} numberOfLines={1}>
        {label}
      </AppText>
      <ChevronDown size={15} color={INK} />
    </Pressable>
  );
}

export function ScoreHero({ score, range, stats, onPress, accessibilityLabel, style }: { score: number | null; range: string; stats: ScoreStat[]; onPress: () => void; accessibilityLabel: string; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const wide = width >= 620;
  const ring = Math.round(wide ? Math.min(190, width * 0.2) : Math.min(150, Math.max(118, (width - 72) * 0.42)));
  const art = wide ? Math.min(260, width * 0.26) : Math.max(130, width - 72 - ring - 8);
  const text = (
    <View style={[styles.text, wide && { flex: 1 }]}>
      <View style={styles.datePill}>
        <CalendarDays size={14} color={INK} />
        <AppText style={styles.datePillText} numberOfLines={1}>
          {range}
        </AppText>
      </View>
      <AppText style={[styles.title, wide && styles.titleWide]}>
        Wellness <AppText style={[styles.title, wide && styles.titleWide, { color: '#14A06B' }]}>Score</AppText>
      </AppText>
      <View style={styles.subRow}>
        <AppText style={styles.sub}>Engagement metric, not a medical score.</AppText>
        <Info size={16} color={palette.ink[600]} />
      </View>
      <View style={styles.habit}>
        <LeafIcon size={18} color="#1F9D5C" fill="#47B86E" />
        <AppText style={styles.habitText}>Small habits make a big difference!</AppText>
      </View>
    </View>
  );
  // The score area and each stat card are separate buttons (no button inside a button).
  return (
    <View style={[styles.hero, style]}>
      <LinearGradient colors={['#EAF8F0', '#F4FBF6', '#FBF8EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* soft waves pinned to fixed heights (not stretched with the card, which would band across the text) */}
      <Svg style={styles.waveBottom} viewBox="0 0 400 150" preserveAspectRatio="none" pointerEvents="none">
        <Path d="M0 40 C70 10 130 60 220 34 C290 16 340 26 400 8 L400 150 L0 150 Z" fill="#DFF3E7" opacity={0.55} />
      </Svg>
      <Svg style={styles.waveTop} viewBox="0 0 400 120" preserveAspectRatio="none" pointerEvents="none">
        <Path d="M240 0 C280 50 340 40 400 80 L400 0 Z" fill="#E4F4EC" opacity={0.8} />
      </Svg>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.94 }}>
        <View style={[styles.top, wide && styles.topWide]}>
          <ScoreRing score={score} size={ring} />
          {wide ? text : null}
          {/* bleeds to the card's top-right edge so only its feathered left/bottom edges meet the background */}
          <Image source={ILLUSTRATION} style={{ width: art, height: art * 0.94, marginRight: -14, marginTop: -14, alignSelf: 'flex-start' }} contentFit="cover" contentPosition="top right" accessible={false} />
        </View>
        {wide ? null : text}
      </Pressable>
      <View style={styles.cards}>
        {stats.map((s) => (
          <StatCard key={s.key} stat={s} wide={wide} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 30, padding: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFFFFF', shadowColor: '#0D4336', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  waveBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  waveTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 120 },
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  topWide: { alignItems: 'center', gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  score: { fontFamily: font.displayBold, color: INK, letterSpacing: -1 },
  of: { fontFamily: font.semibold, color: INK, opacity: 0.85 },
  text: { gap: 8, marginTop: 8 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#FFFFFF' },
  datePillText: { fontFamily: font.semibold, fontSize: 12.5, letterSpacing: 0.4, color: INK, textTransform: 'uppercase' },
  title: { fontFamily: font.displayBold, fontSize: 26, lineHeight: 31, letterSpacing: -0.6, color: INK },
  titleWide: { fontSize: 34, lineHeight: 40 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: palette.ink[600], flexShrink: 1 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#FFFFFF', maxWidth: '100%' },
  habitText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: '#127A50', flexShrink: 1 },
  cards: { flexDirection: 'row', gap: 8, marginTop: 14 },
  card: { flex: 1, borderRadius: 20, padding: 10, paddingBottom: 12, overflow: 'hidden', gap: 6, borderWidth: 1.5, borderColor: '#FFFFFF' },
  cardWide: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingBottom: 18 },
  wave: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  tile: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tileWide: { width: 56, height: 56, borderRadius: 18 },
  cardLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.5, color: palette.ink[600], textTransform: 'uppercase' },
  cardValue: { fontFamily: font.displayBold, fontSize: 20, lineHeight: 25, color: INK },
  cardValueWide: { fontSize: 28, lineHeight: 34 },
  bars: { flexDirection: 'row', gap: 3, marginTop: 5 },
  bar: { flex: 1, maxWidth: 6, height: 13, borderRadius: 3 },
  barEmpty: { backgroundColor: 'rgba(20,39,31,0.12)' },
  go: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  goWide: { top: 12, right: 12, width: 32, height: 32, borderRadius: 16 },
  weekChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F1FAF5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#0D4336', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  weekChipText: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.3, color: INK, textTransform: 'uppercase' },
});
