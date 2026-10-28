/**
 * Steps hero (light, illustrated): a step ring on rolling hills with a walking woman, foliage and sun,
 * an encouragement line, today's goal pill, three pastel stat cards and the distance note.
 * The top scene is laid out in the design's own units (a 980-wide stage) and scaled to the card,
 * so every piece keeps its place on any width. All values come from the caller; the ring shows
 * real progress (empty at 0).
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Footprints, Info, MapPin, Target, TrendingUp, type LucideIcon } from 'lucide-react-native';
import { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from './Text';
import { font } from '@/lib/theme';

const ART = {
  woman: require('../../assets/images/steps/woman.png'),
  foliage: require('../../assets/images/steps/foliage.png'),
  leaves: require('../../assets/images/steps/leaves.png'),
  sun: require('../../assets/images/steps/sun.png'),
};
const INK = '#13261E';
const STAGE_W = 980; // design units
const STAGE_H = 690;

type Tone = 'mint' | 'sky' | 'lavender';
const TONE: Record<Tone, { bg: [string, string]; disc: string; icon: string; bar: string; wave: string }> = {
  mint: { bg: ['#F5FCF7', '#E6F6EC'], disc: '#D4F0DE', icon: '#178A4E', bar: '#2FAE68', wave: '#C6EBD3' },
  sky: { bg: ['#F5FAFF', '#E7F2FD'], disc: '#D6E9FB', icon: '#2F7FD8', bar: '#5BA4EE', wave: '#CFE4FA' },
  lavender: { bg: ['#F8F6FF', '#EDEAFD'], disc: '#E2DDFB', icon: '#7A5CE0', bar: '#A190EE', wave: '#DDD6FA' },
};

export interface StepsStat {
  label: string;
  value: string;
  tone: Tone;
  icon: 'distance' | 'active' | 'trend';
  /** recent days, oldest first, each 0–1 (null = nothing logged). */
  days: (number | null)[];
}
const ICON: Record<StepsStat['icon'], LucideIcon> = { distance: MapPin, active: Clock, trend: TrendingUp };

function StepsRing({ pct, k }: { pct: number; k: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const size = 536 * k; // halo diameter
  const c = size / 2;
  const R = 211 * k;
  const B = 48 * k;
  const frac = Math.max(0, Math.min(1, pct));
  const pt = (deg: number) => ({ x: c + R * Math.cos((deg * Math.PI) / 180), y: c + R * Math.sin((deg * Math.PI) / 180) });
  const s = pt(-90);
  const e = pt(-90 + frac * 359.9);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id={`${uid}p`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2FB463" />
          <Stop offset="1" stopColor="#A3DE5C" />
        </SvgGradient>
        <RadialGradient id={`${uid}i`} cx="50%" cy="40%" r="62%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#EEF9F2" />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="#FFFFFF" opacity={0.42} />
      <Circle cx={c} cy={c} r={c - 1} fill="none" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.9} />
      <Circle cx={c} cy={c} r={R} fill="none" stroke="#D2EDDA" strokeWidth={B} />
      {frac > 0 ? <Path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${e.x} ${e.y}`} stroke={`url(#${uid}p)`} strokeWidth={B} strokeLinecap="round" fill="none" /> : null}
      <Circle cx={c} cy={c} r={R - B / 2 - 6 * k} fill={`url(#${uid}i)`} />
      <Circle cx={e.x} cy={e.y + 3 * k} r={B * 0.66} fill="#000" opacity={0.1} />
      <Circle cx={e.x} cy={e.y} r={B * 0.66} fill="#FFFFFF" />
    </Svg>
  );
}

function StatCard({ stat }: { stat: StepsStat }) {
  const t = TONE[stat.tone];
  const Icon = ICON[stat.icon];
  return (
    <View style={styles.card} accessible accessibilityLabel={`${stat.label.replace('*', ', estimate')}: ${stat.value}`}>
      <LinearGradient colors={t.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={styles.cardWave} viewBox="0 0 200 60" preserveAspectRatio="none" pointerEvents="none">
        <Path d="M0 46 C50 40 90 54 130 34 C160 20 182 12 200 4 L200 60 L0 60 Z" fill={t.wave} opacity={0.75} />
      </Svg>
      <View style={[styles.disc, { backgroundColor: t.disc }]}>
        <Icon size={17} color={t.icon} />
      </View>
      <AppText style={styles.cardLabel} numberOfLines={1}>
        {stat.label}
      </AppText>
      <AppText style={styles.cardValue} numberOfLines={1} adjustsFontSizeToFit>
        {stat.value}
      </AppText>
      <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {stat.days.map((v, i) => (
          <View key={i} style={[styles.bar, v ? { backgroundColor: t.bar, opacity: 0.45 + 0.55 * Math.min(1, v) } : { backgroundColor: t.bar, opacity: 0.18 }]} />
        ))}
      </View>
    </View>
  );
}

export function StepsHero({ steps, target, stats, note }: { steps: number; target: number; stats: StepsStat[]; note: string }) {
  const fadeId = 'shf' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [cardW, setCardW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setCardW(e.nativeEvent.layout.width);
  const stageW = Math.min(cardW, 620);
  const k = stageW / STAGE_W;
  const side = (cardW - stageW) / 2; // empty margin either side of the centred stage on wide cards
  const pct = target > 0 ? steps / target : 0;
  const at = (x: number, y: number, w?: number, h?: number) => ({ position: 'absolute' as const, left: x * k, top: y * k, width: w !== undefined ? w * k : undefined, height: h !== undefined ? h * k : undefined });
  const fs = (n: number, min: number) => Math.max(min, n * k);

  return (
    <View style={styles.hero} onLayout={onLayout}>
      <LinearGradient colors={['#E7F7EE', '#F1FBF5', '#F3FBF5']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* rolling hills across the full card width */}
      <Svg style={[styles.hills, { height: STAGE_H * k }]} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} preserveAspectRatio="none" pointerEvents="none">
        <Path d="M0 330 C150 262 300 300 450 270 C600 240 750 228 980 280 L980 690 L0 690 Z" fill="#D5EFDD" />
        <Path d="M0 430 C200 378 380 440 560 400 C720 364 860 358 980 392 L980 690 L0 690 Z" fill="#C2E6CD" />
        <Path d="M0 560 C180 518 400 600 620 560 C780 530 880 542 980 520 L980 690 L0 690 Z" fill="#AEDDBC" opacity={0.85} />
        {/* melt the hills into the card colour where the stat cards begin (no hard edge) */}
        <Defs>
          <SvgGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F3FBF5" stopOpacity={0} />
            <Stop offset="1" stopColor="#F3FBF5" stopOpacity={1} />
          </SvgGradient>
        </Defs>
        <Path d="M0 600 L980 600 L980 690 L0 690 Z" fill={`url(#${fadeId})`} />
      </Svg>

      {cardW > 0 ? (
        <View style={{ width: stageW, height: STAGE_H * k, alignSelf: 'center' }}>
          <Image source={ART.sun} style={at(750, 45, 210, 130)} contentFit="contain" accessible={false} />
          <Image source={ART.leaves} style={at(65, 120, 120, 95)} contentFit="contain" accessible={false} />
          {/* these two are cut flush with the card's edges, so on wide cards they stick to the card edges, not the centred stage */}
          <Image source={ART.foliage} style={[at(0, 470, 275, 205), { left: -side }]} contentFit="contain" accessible={false} />
          <Image source={ART.woman} style={[at(723, 198, 257, 487), { left: stageW + side - 257 * k }]} contentFit="cover" contentPosition="top left" accessible={false} />

          {/* encouragement, left of the ring */}
          <View style={at(42, 228, 175)} accessibilityRole="text">
            <AppText style={[styles.motto, { fontSize: fs(30, 11.5), lineHeight: fs(42, 15) }]}>{'Small\nsteps\nmake big'}</AppText>
            <AppText style={[styles.motto, styles.mottoStrong, { fontSize: fs(35, 13), lineHeight: fs(46, 17) }]}>changes</AppText>
            <View style={[styles.mottoBar, { width: 70 * k, height: Math.max(2, 5 * k), marginTop: 10 * k }]} />
          </View>

          {/* ring */}
          <View style={at(488 - 268, 303 - 268, 536, 536)} accessible accessibilityRole="progressbar" accessibilityLabel={`${steps.toLocaleString()} of ${target.toLocaleString()} steps`}>
            <StepsRing pct={pct} k={k} />
            <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
              <Footprints size={fs(62, 18)} color="#2E9B5C" />
              <AppText style={[styles.big, { fontSize: fs(104, 30), lineHeight: fs(118, 34) }]}>{steps.toLocaleString()}</AppText>
              <AppText style={[styles.of, { fontSize: fs(31, 11.5), lineHeight: fs(40, 15) }]}>of {target.toLocaleString()} steps</AppText>
            </View>
          </View>

          {/* goal pill: sized by its text, centred under the ring */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: (623 - 41) * k, alignItems: 'center' }}>
            <View style={[styles.pill, { left: (488 - STAGE_W / 2) * k, minHeight: 82 * k, borderRadius: 41 * k, paddingHorizontal: Math.max(10, 24 * k), gap: Math.max(6, 14 * k) }]}>
              <Target size={fs(44, 14)} color="#1F8A4C" />
              <AppText style={[styles.pillText, { fontSize: fs(28, 11) }]} numberOfLines={1}>
                {pct >= 1 ? 'Goal reached today' : `${Math.round(pct * 100)}% of today’s goal`}
              </AppText>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ height: 240 }} />
      )}

      <View style={[styles.cards, { marginTop: -6 * Math.max(k, 0.3) }]}>
        {stats.map((s) => (
          <StatCard key={s.icon} stat={s} />
        ))}
      </View>
      <View style={styles.note}>
        <View style={styles.noteIcon}>
          <Info size={13} color="#FFFFFF" />
        </View>
        <AppText style={styles.noteText}>{note}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 30, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFFFFF', paddingBottom: 12, shadowColor: '#0D4336', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  hills: { position: 'absolute', left: 0, right: 0, top: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  motto: { fontFamily: font.medium, color: INK },
  mottoStrong: { fontFamily: font.bold, color: '#17924F' },
  mottoBar: { backgroundColor: '#17924F', borderRadius: 3 },
  big: { fontFamily: font.displayBold, color: INK, letterSpacing: -1 },
  of: { fontFamily: font.medium, color: '#33463E' },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(240,250,244,0.92)', borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#0D4336', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  pillText: { fontFamily: font.bold, color: INK },
  cards: { flexDirection: 'row', gap: 8, paddingHorizontal: 9 },
  card: { flex: 1, borderRadius: 18, padding: 10, paddingBottom: 12, gap: 4, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFFFFF', shadowColor: '#0D4336', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  cardWave: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '48%' },
  disc: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardLabel: { fontFamily: font.semibold, fontSize: 9.5, letterSpacing: 0.6, color: '#3E5249', textTransform: 'uppercase' },
  cardValue: { fontFamily: font.displayBold, fontSize: 19, lineHeight: 24, color: INK },
  bars: { flexDirection: 'row', gap: 4, marginTop: 6 },
  bar: { width: 5, height: 14, borderRadius: 3 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginHorizontal: 9, backgroundColor: 'rgba(224,240,231,0.7)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 },
  noteIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#6B7C74', alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: '#33463E' },
});
