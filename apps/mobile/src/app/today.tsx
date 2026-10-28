/**
 * Today (Eva "Today" reference; opened from the Home "My cycle" card): a week strip with estimated cycle
 * days, the cycle ring with a filled drop and Edit period, cycle day / phase / next period cards, a
 * one-tap mood log, the "Your cycle, understood" banner and an educational hormone chart (SRS §11, §16, §38).
 */
import {
  COPY,
  MOODS,
  addDays,
  checkInOn,
  classifyDay,
  cycleStateOf,
  diffDays,
  formatDate,
  moodLabel,
  type CheckIn,
  type CyclePhase,
  type CycleState,
  type ISODate,
  type MoodLevel,
} from '@healthx/shared';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BellRing, BookOpen, CalendarCheck, CalendarDays, CalendarHeart, Droplet, Flower2, HeartHandshake, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { MoodFace } from '@/components/Art';
import { EstimateNote } from '@/components/Badges';
import { IconButton } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { CycleRing } from '@/components/cycle/CycleRing';
import { EmptyState } from '@/components/Feedback';
import { Art } from '@/components/Illustration';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { dropFillSvg } from '@/lib/art';
import { nextPeriodDate } from '@/lib/cycleText';
import { PICTURES } from '@/lib/pictures';
import { useStore } from '@/lib/store';
import { brandText, colors, fertile, font, layout, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** Library article behind "Understand" and the Phase card (falls back to the library if unpublished). */
const PHASES_ARTICLE = 'a_cycle_phases';
/** One-word phase names that fit the Phase card (the full names are in PHASES). */
const PHASE_SHORT: Record<CyclePhase, string> = { menstrual: 'Period', follicular: 'Follicular', ovulatory: 'Ovulatory', luteal: 'Luteal' };

/** Cycle day of any date: the estimated next cycle after the next period start, else the cycle it falls in. */
function cycleDayOn(cs: CycleState, d: ISODate): number | null {
  if (cs.nextPeriodStart && !cs.isLate && d >= cs.nextPeriodStart) return diffDays(cs.nextPeriodStart, d) + 1;
  const start = cs.cycles
    .map((c) => c.start)
    .filter((s) => s <= d)
    .sort()
    .pop();
  return start ? diffDays(start, d) + 1 : null;
}

export default function Today() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const today = state.today;
  const checkIn = checkInOn(state, today);
  const pregnant = state.profile.mode === 'pregnancy';
  const menopause = state.profile.mode === 'menopause';
  const L = cs.avgCycleLength ?? 28; // drawing only; never shown as a "28-day assumption"
  const drop = useMemo(() => dropFillSvg((cs.cycleDay ?? 1) / L), [cs.cycleDay, L]);
  const ringSize = Math.round(Math.min(width - layout.screenPadding * 2, 440) * 0.54);
  const article = (id: string) => (state.articles.some((a) => a.id === id && a.status === 'published') ? router.push({ pathname: '/learn/[id]', params: { id } }) : router.push('/learn'));

  const saveMood = (mood: MoodLevel) => {
    const next: CheckIn = { ...(checkIn ?? { symptomIds: [], energy: 6 }), date: today, mood };
    dispatch({ type: 'SAVE_CHECKIN', checkIn: next });
    toast(`Mood saved for today: ${moodLabel(mood)}`);
  };

  const phaseValue = cs.phase ? PHASE_SHORT[cs.phase] + (cs.phase === 'menstrual' ? '' : '*') : cs.isLate ? 'Paused' : '—';
  const nextValue = cs.isLate ? `${cs.daysLate}d later*` : (nextPeriodDate(cs) ?? '—');

  return (
    <Screen back title="Today" right={<IconButton icon={CalendarDays} label="Calendar" onPress={() => router.push('/calendar')} />}>
      {/* Week strip with estimated cycle days */}
      {!pregnant && !menopause ? (
        <View style={styles.week}>
          {Array.from({ length: 7 }, (_, i) => addDays(today, i - 3)).map((d) => {
            const kind = cs.hasData ? classifyDay(d, state.periods, cs) : 'none';
            const tone: TileTone = kind === 'period' || kind === 'predicted_period' ? 'rose' : kind === 'none' ? 'sky' : 'green';
            const t = TILE_TONES[tone];
            const n = cs.hasData ? cycleDayOn(cs, d) : null;
            const isToday = d === today;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${formatDate(d, 'long')}${isToday ? ', today' : ''}${n ? `, cycle day ${n}${d > today ? ' (estimate)' : ''}` : ''}`}
                aria-selected={isToday}
                onPress={() => router.push({ pathname: '/day/[date]', params: { date: d } })}
                style={({ pressed }) => [
                  styles.day,
                  { backgroundColor: kind === 'fertile_estimate' || kind === 'ovulation_estimate' ? fertile[100] : t.bg, borderColor: t.border },
                  kind === 'predicted_period' && styles.dayPredicted,
                  isToday && styles.dayToday,
                  pressed && { opacity: 0.8 },
                ]}>
                <AppText style={[styles.dayName, { color: isToday ? brandText : colors.textSubtle }]}>{isToday ? 'Today' : formatDate(d, 'weekday').slice(0, 3)}</AppText>
                <AppText style={styles.dayNum}>{Number(d.slice(8))}</AppText>
                <AppText style={[styles.dayCd, { color: t.hint }]}>{n ? `D${n}` : ' '}</AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Ring + cycle cards (no estimates in pregnancy or menopause mode, P3-00) */}
      {pregnant ? (
        <Card tone="mint" style={{ marginTop: 6 }} onPress={() => router.push({ pathname: '/life-stage/[mode]', params: { mode: 'pregnancy' } })} accessibilityLabel="Open Pregnancy wellness">
          <AppText variant="h3">Pregnancy mode is on</AppText>
          <AppText variant="small" muted style={{ marginTop: 4 }}>
            Cycle estimates are paused. Open Pregnancy wellness for your week-by-week view.
          </AppText>
        </Card>
      ) : menopause ? (
        <Card tone="lavender" style={{ marginTop: 6 }} onPress={() => router.push({ pathname: '/life-stage/[mode]', params: { mode: 'menopause' } })} accessibilityLabel="Open Menopause">
          <AppText variant="h3">Menopause mode is on</AppText>
          <AppText variant="small" muted style={{ marginTop: 4 }}>
            Period estimates are off. Open Menopause for your symptoms, sleep and strength view.
          </AppText>
        </Card>
      ) : cs.hasData ? (
        <>
          <View style={styles.top}>
            <View style={{ alignItems: 'center' }}>
              <CycleRing state={cs} size={ringSize} labels={false}>
                <Art svg={drop} width={ringSize * 0.5} height={ringSize * 0.5} />
              </CycleRing>
              <Pressable accessibilityRole="button" accessibilityLabel="Edit period" onPress={() => router.push('/log-period')} hitSlop={6} style={({ pressed }) => [styles.edit, pressed && { opacity: 0.85 }]}>
                <AppText variant="smallMedium" color="#fff">
                  Edit period
                </AppText>
              </Pressable>
            </View>
            <View style={styles.stats}>
              <Stat tone="rose" icon={Droplet} label="Cycle day" value={String(cs.cycleDay ?? '—')} onPress={() => router.push('/calendar')} />
              <Stat tone="butter" icon={Flower2} label="Phase" value={phaseValue} onPress={() => article(PHASES_ARTICLE)} />
              <Stat tone="sky" icon={CalendarHeart} label="Next period" value={nextValue} onPress={() => router.push('/calendar')} />
            </View>
          </View>
          <EstimateNote compact style={{ marginTop: 14 }} />
        </>
      ) : (
        <Card style={{ marginTop: 6 }}>
          <EmptyState icon={CalendarDays} title="Start with your period" text="Log the first day of your last period to see your cycle and estimates." action="Log period" onAction={() => router.push('/log-period')} />
        </Card>
      )}

      {/* One-tap mood */}
      <SectionHeader eyebrow="Log in a tap" title="How are you feeling?" action="More detail" onAction={() => router.push('/mood')} />
      <Card tone="lavender">
        <View style={styles.moods} accessibilityRole="radiogroup" accessibilityLabel="Today's mood">
          {MOODS.map((m) => {
            const on = checkIn?.mood === m.key;
            return (
              <Pressable key={m.key} accessibilityRole="radio" aria-checked={on} accessibilityLabel={m.label} onPress={() => saveMood(m.key)} style={({ pressed }) => [styles.mood, pressed && { transform: [{ scale: 0.95 }] }]}>
                <View style={[styles.moodRing, on && styles.moodRingOn]}>
                  <MoodFace mood={m.key} size={44} />
                </View>
                <AppText variant="caption" color={on ? palette.lavender[700] : colors.textMuted} style={on ? { fontFamily: font.semibold } : undefined} numberOfLines={1}>
                  {m.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption" color={palette.lavender[700]} center style={{ marginTop: 10 }}>
          {checkIn ? `Saved for today: ${moodLabel(checkIn.mood)} · tap another face to change it` : 'Tap a face to save today’s mood'}
        </AppText>
      </Card>

      {/* "Your cycle, understood." */}
      <View style={styles.banner}>
        <LinearGradient colors={[palette.rose[50], palette.lavender[50]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.bannerTitle}>Your cycle,</AppText>
            <AppText style={styles.bannerHand}>understood.</AppText>
          </View>
          <View accessible accessibilityRole="image" accessibilityLabel="Illustration: a girl holding a calendar with her period days circled" style={styles.bannerPic}>
            <Image source={PICTURES.calendarSurprise} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={250} accessible={false} />
          </View>
        </View>
        <View style={styles.actions}>
          <BannerAction icon={CalendarCheck} label="Track" tone="rose" onPress={() => router.push('/cycle-history')} />
          <BannerAction icon={BookOpen} label="Understand" tone="lavender" onPress={() => article(PHASES_ARTICLE)} />
          <BannerAction icon={BellRing} label="Feel prepared" tone="butter" onPress={() => router.push('/notification-settings')} />
          <BannerAction icon={HeartHandshake} label="Take care" tone="sky" onPress={() => router.push('/plan')} />
        </View>
      </View>

      <HormoneChart />

      <AppText variant="caption" muted center style={{ marginTop: 16, paddingHorizontal: 12 }}>
        {COPY.notDiagnostic}
      </AppText>
    </Screen>
  );
}

function Stat({ tone, icon: Icon, label, value, onPress }: { tone: TileTone; icon: LucideIcon; label: string; value: string; onPress: () => void }) {
  const t = TILE_TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value.replace('*', ' (estimate)')}`}
      onPress={onPress}
      style={({ pressed }) => [styles.stat, { backgroundColor: t.bg, borderColor: t.border }, pressed && { opacity: 0.85 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={styles.statIcon}>
          <Icon size={13} color={t.icon} />
        </View>
        <AppText variant="caption" color={t.hint} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </AppText>
      </View>
      <AppText style={styles.statValue} numberOfLines={1}>
        {value}
      </AppText>
    </Pressable>
  );
}

function BannerAction({ icon: Icon, label, tone, onPress }: { icon: LucideIcon; label: string; tone: TileTone; onPress: () => void }) {
  const t = TILE_TONES[tone];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}>
      <View style={[styles.actionIcon, { backgroundColor: t.bg, borderColor: t.border }]}>
        <Icon size={18} color={t.icon} />
      </View>
      <AppText variant="caption" center numberOfLines={1} style={{ fontSize: 11.5 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const g = (x: number, m: number, s: number) => Math.exp(-((x - m) ** 2) / (2 * s * s));
/** Textbook-shaped curves (0–1) across one cycle — illustrative only, never the person's own levels. */
const HORMONES = [
  { key: 'Estrogen', color: palette.rose[400], fn: (x: number) => 0.12 + 0.62 * g(x, 0.44, 0.075) + 0.3 * g(x, 0.75, 0.09) },
  { key: 'LH', color: palette.lavender[500], fn: (x: number) => 0.05 + 0.88 * g(x, 0.5, 0.024) },
  { key: 'Progesterone', color: palette.butter[500], fn: (x: number) => 0.05 + 0.62 * g(x, 0.75, 0.1) },
];
const PHASE_BANDS = [
  { label: 'Period', from: 0, to: 0.18, color: palette.rose[600] },
  { label: 'Follicular', from: 0.18, to: 0.46, color: palette.sky[600] },
  { label: 'Ovulation', from: 0.46, to: 0.55, color: palette.lavender[600] },
  { label: 'Luteal', from: 0.55, to: 1, color: palette.butter[600] },
];

function HormoneChart() {
  const [w, setW] = useState(0);
  const h = 128;
  const path = (fn: (x: number) => number) =>
    Array.from({ length: 81 }, (_, i) => i / 80)
      .map((x, i) => `${i ? 'L' : 'M'}${(x * w).toFixed(1)} ${(h - fn(x) * (h - 8)).toFixed(1)}`)
      .join(' ');
  return (
    <Card style={{ marginTop: 18 }}>
      <AppText variant="h3">Hormone levels</AppText>
      <View style={styles.legend}>
        {HORMONES.map((s) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: s.color }} />
            <AppText variant="caption" muted>
              {s.key}
            </AppText>
          </View>
        ))}
      </View>
      <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ height: h + 36, marginTop: 10 }} accessible accessibilityLabel="Chart of the typical pattern of estrogen, LH and progesterone across a cycle">
        {w ? (
          <Svg width={w} height={h + 36}>
            <Defs>
              <SvgGradient id="estrogenFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={palette.rose[300]} stopOpacity={0.45} />
                <Stop offset="1" stopColor={palette.rose[300]} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            {PHASE_BANDS.map((b, i) => (i % 2 ? <Rect key={b.label} x={b.from * w} y={0} width={(b.to - b.from) * w} height={h} fill={palette.ink[50]} /> : null))}
            <Path d={`${path(HORMONES[0].fn)} L${w} ${h} L0 ${h} Z`} fill="url(#estrogenFill)" />
            {HORMONES.map((s) => (
              <Path key={s.key} d={path(s.fn)} stroke={s.color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            <Path d={`M0 ${h} L${w} ${h}`} stroke={palette.ink[200]} strokeWidth={1} />
            {/* The ovulation band is narrow, so its label sits on a second line under a small tick. */}
            <Path d={`M${0.505 * w} ${h} L${0.505 * w} ${h + 20}`} stroke={palette.lavender[300]} strokeWidth={1} strokeDasharray="2 2" />
            {PHASE_BANDS.map((b, i) => (
              <SvgText key={b.label} x={((b.from + b.to) / 2) * w} y={i === 2 ? h + 32 : h + 16} fontSize={10} fontFamily={font.monoMedium} fill={b.color} textAnchor="middle">
                {b.label}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
      <AppText variant="caption" muted style={{ marginTop: 8 }}>
        A typical textbook pattern, for learning only. It isn’t your own hormone levels and can’t show when ovulation happens for you.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 1.5 },
  dayPredicted: { borderStyle: 'dashed' },
  dayToday: { borderColor: brandText, borderWidth: 2, ...shadow.card },
  dayName: { fontFamily: font.medium, fontSize: 11, lineHeight: 14 },
  dayNum: { fontFamily: font.displayBold, fontSize: 18, lineHeight: 23, color: colors.text },
  dayCd: { fontFamily: font.monoMedium, fontSize: 9.5, lineHeight: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  edit: { marginTop: 10, backgroundColor: palette.rose[500], paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, ...shadow.card },
  stats: { flex: 1, gap: 8 },
  stat: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9 },
  statIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: font.displayBold, fontSize: 18, lineHeight: 23, color: colors.text, marginTop: 4 },
  moods: { flexDirection: 'row', justifyContent: 'space-between' },
  mood: { alignItems: 'center', gap: 4, width: '19%' },
  moodRing: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  moodRingOn: { borderColor: palette.lavender[500], backgroundColor: colors.surface },
  banner: { marginTop: 18, borderRadius: 24, padding: 16, overflow: 'hidden', borderWidth: 1, borderColor: palette.rose[100] },
  bannerTitle: { fontFamily: font.displayBold, fontSize: 26, lineHeight: 30, color: colors.text },
  bannerHand: { fontFamily: font.handBold, fontSize: 36, lineHeight: 38, color: palette.rose[500] },
  bannerPic: { width: 140, height: 154, borderRadius: 20, overflow: 'hidden', backgroundColor: palette.rose[100] },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  action: { alignItems: 'center', gap: 5, width: '24%' },
  actionIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 },
});
