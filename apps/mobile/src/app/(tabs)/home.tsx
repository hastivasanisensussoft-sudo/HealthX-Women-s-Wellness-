/** Home — "My Day" (mockup M11, SRS §7/§32/§33; Mira / Myflo references): greeting, week strip, cycle dial, quick logs, score, check-in, plan, videos, insight, water, reading. */
import {
  COPY,
  VIDEO_LIST,
  WATER_PRESETS_ML,
  checkInOn,
  computeInsights,
  cycleStateOf,
  formatDate,
  greeting,
  moodLabel,
  sleepHoursOn,
  stepsOn,
  waterOn,
  wellnessScore,
  wellnessScoreSeries,
} from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, CalendarDays, Check, ChevronRight, Droplets, Footprints, Lightbulb, MessageCircle, Moon, Plus, Salad, Smile, Stethoscope, Zap } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { MoodFace } from '@/components/Art';
import { EstimateNote, UnreadDot } from '@/components/Badges';
import { Button, IconButton } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { ProgressBar, ProgressRing } from '@/components/Charts';
import { CycleRing } from '@/components/cycle/CycleRing';
import { WeekStrip } from '@/components/cycle/Calendar';
import { EmptyState, SkeletonCard } from '@/components/Feedback';
import { StatTile, fmtSleep } from '@/components/Kit';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { QuickTile } from '@/components/Tiles';
import { VideoCard } from '@/components/Video';
import { VerifyEmailHint } from '@/components/VerifyEmailHint';
import { phaseText } from '@/lib/cycleText';
import { useDemoLoading } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { colors, font, onDark, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export default function Home() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const loading = useDemoLoading(500);
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const score = useMemo(() => wellnessScore(state), [state]);
  const insights = useMemo(() => computeInsights(state), [state]);
  const delta = useMemo(() => {
    const series = wellnessScoreSeries(state, 14).map((p) => p.score);
    const now = avg(series.slice(7));
    const before = avg(series.slice(0, 7));
    if (state.checkIns.length === 0) return null;
    return now !== null && before !== null ? Math.round(now - before) : null;
  }, [state]);
  const today = state.today;
  const checkIn = checkInOn(state, today);
  const water = waterOn(state, today);
  const steps = stepsOn(state, today);
  const sleepLast = sleepHoursOn(state, today);
  const unread = state.notifications.filter((n) => !n.read).length;
  const firstName = state.profile.name.split(' ')[0] || 'there';
  const items = state.plan.items;
  const done = items.filter((i) => i.done).length;
  const recommended = state.articles.filter((a) => a.status === 'published' && (cs.phase === 'menstrual' ? a.category === 'cycle' : true)).slice(0, 5);
  const insight = insights[0];
  const days = cs.daysUntilNextPeriod;
  const ring = cs.inPeriod
    ? { kicker: 'Period', big: `Day ${cs.periodDay}`, sub: `Cycle day ${cs.cycleDay}` }
    : cs.isLate
      ? { kicker: 'Period estimate', big: `+${cs.daysLate}d`, sub: 'later than estimated*' }
      : days !== null && days >= 0
        ? { kicker: 'Next period in', big: days === 0 ? 'Today*' : `~${days} days*`, sub: `Cycle day ${cs.cycleDay}` }
        : { kicker: 'Cycle day', big: String(cs.cycleDay ?? '—'), sub: 'Log more cycles for estimates' };

  return (
    <Screen tabBarSpace>
      {/* Greeting (M11) */}
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/profile')}>
          {state.profile.avatar ? (
            <Photo photo={state.profile.avatar} shape="circle" style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AppText variant="h3" color="#fff">
                {firstName.charAt(0)}
              </AppText>
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color={palette.green[700]}>
            {formatDate(today, 'long')}
          </AppText>
          <AppText variant="h2" numberOfLines={2} style={{ fontSize: 21, lineHeight: 26 }}>
            {greeting()}, {firstName}
          </AppText>
        </View>
        <IconButton icon={MessageCircle} label="AI coach" onPress={() => router.push('/coach')} />
        <IconButton icon={Bell} label={`Notifications, ${unread} unread`} onPress={() => router.push('/notifications')} badge={<UnreadDot count={unread} />} />
      </View>
      <VerifyEmailHint />

      {loading ? (
        <View style={{ marginTop: 16, gap: 12 }}>
          <SkeletonCard height={90} />
          <SkeletonCard height={320} />
          <SkeletonCard />
        </View>
      ) : (
        <>
          {/* Week strip (Mira) */}
          {cs.hasData ? (
            <View style={styles.week}>
              <WeekStrip state={cs} periods={state.periods} onSelect={(d) => router.push({ pathname: '/day/[date]', params: { date: d } })} />
            </View>
          ) : null}

          {/* Cycle dial */}
          <Card style={styles.cycleCard} padded={false}>
            <View style={[styles.blob, { backgroundColor: palette.rose[50], top: -70, right: -60 }]} />
            <View style={[styles.blob, { backgroundColor: palette.green[50], bottom: -80, left: -70 }]} />
            {cs.hasData ? (
              <View style={{ alignItems: 'center', padding: 18 }}>
                <CycleRing state={cs} size={272} labels>
                  <AppText variant="overline" color={colors.textSubtle}>
                    {ring.kicker}
                  </AppText>
                  <AppText style={{ fontFamily: font.display, fontSize: ring.big.length > 6 ? 30 : 40, lineHeight: ring.big.length > 6 ? 36 : 46, color: colors.text, letterSpacing: -0.8 }}>{ring.big}</AppText>
                  <AppText variant="caption" color={cs.inPeriod ? palette.rose[600] : colors.textMuted} center>
                    {ring.sub}
                  </AppText>
                </CycleRing>
                <View style={styles.phasePill}>
                  <AppText variant="smallMedium" color={colors.text}>
                    {phaseText(cs)}
                  </AppText>
                </View>
                <View style={styles.cycleActions}>
                  <Button label={cs.inPeriod ? 'Log flow' : 'Log period'} variant="rose" size="sm" icon={Plus} onPress={() => router.push('/log-period')} />
                  <Button label="Calendar" variant="soft" size="sm" icon={CalendarDays} onPress={() => router.push('/calendar')} />
                </View>
                <EstimateNote compact style={{ alignSelf: 'stretch', marginTop: 12 }} />
              </View>
            ) : (
              <EmptyState icon={CalendarDays} title="Start with your period" text="Log the first day of your last period to see your cycle and estimates." action="Log period" onAction={() => router.push('/log-period')} />
            )}
          </Card>

          {/* Quick logs (Myflo tiles) */}
          <SectionHeader eyebrow="Log in a tap" title="How’s today going?" action="Check in" onAction={() => router.push('/check-in')} />
          <View style={styles.grid}>
            <QuickTile tone="lavender" icon={Smile} label="Mood" hint={checkIn ? moodLabel(checkIn.mood) : 'How are you?'} onPress={() => router.push('/mood')} style={styles.gridCell} />
            <QuickTile tone="rose" icon={Stethoscope} label="Symptoms" hint="Anything to note?" onPress={() => router.push('/symptoms')} style={styles.gridCell} />
            <QuickTile tone="sky" icon={Droplets} label="Water" hint={`${(water / 1000).toFixed(1)} of ${(state.waterTargetMl / 1000).toFixed(1)} L`} onPress={() => router.push('/hydration')} style={styles.gridCell} />
            <QuickTile tone="indigo" icon={Moon} label="Sleep" hint={sleepLast != null ? fmtSleep(sleepLast) : 'Last night'} onPress={() => router.push('/sleep')} style={styles.gridCell} />
            <QuickTile tone="green" icon={Footprints} label="Movement" hint={`${steps.toLocaleString()} steps`} onPress={() => router.push('/fitness')} style={styles.gridCell} />
            <QuickTile tone="peach" icon={Salad} label="Meals" hint="Log a meal" onPress={() => router.push('/nutrition')} style={styles.gridCell} />
          </View>

          {/* Wellness score */}
          <Card tone="mint" style={styles.scoreCard} onPress={() => router.push('/insights')} accessibilityLabel={`Wellness score ${score.score ?? 'not available'}`}>
            <ProgressRing value={(score.score ?? 0) / 100} size={96} stroke={10} color={palette.green[700]} track={palette.green[200]}>
              <AppText variant="title">{score.score ?? '—'}</AppText>
              <AppText variant="caption" color={palette.green[700]}>
                /100
              </AppText>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <AppText variant="h2">Wellness Score</AppText>
              <AppText variant="small" color={palette.green[700]} style={{ marginVertical: 3 }}>
                {delta === null ? 'Keep logging to see your trend' : delta > 0 ? `▲ ${delta} since last week` : delta < 0 ? `▼ ${Math.abs(delta)} since last week` : 'Same as last week'}
              </AppText>
              <AppText variant="caption" color={palette.green[700]}>
                Engagement metric, not a medical score
              </AppText>
            </View>
            <ChevronRight size={18} color={palette.green[700]} />
          </Card>

          {/* Today's check-in */}
          <SectionHeader title="Today's Check-in" action={checkIn ? 'Edit' : 'Check in'} onAction={() => router.push('/check-in')} />
          {checkIn ? (
            <View style={styles.tiles}>
              <StatTile label="Mood" value={moodLabel(checkIn.mood)} icon={<MoodFace mood={checkIn.mood} size={26} />} onPress={() => router.push('/mood')} />
              <StatTile label="Energy" value={`${checkIn.energy}/10`} icon={<Zap size={20} color={palette.peach[500]} />} onPress={() => router.push('/check-in')} />
              <StatTile label="Sleep" value={checkIn.sleepHours != null ? fmtSleep(checkIn.sleepHours).replace(' h ', 'h ').replace(' m', 'm') : '—'} icon={<Moon size={20} color={palette.indigo[500]} />} onPress={() => router.push('/check-in')} />
            </View>
          ) : (
            <Card tone="lavender" onPress={() => router.push('/check-in')} accessibilityLabel="Start today's check-in" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row' }}>
                {(['excellent', 'good', 'neutral'] as const).map((m, i) => (
                  <View key={m} style={{ marginLeft: i ? -10 : 0 }}>
                    <MoodFace mood={m} size={38} ring="#fff" />
                  </View>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="h3">How are you feeling today?</AppText>
                <AppText variant="caption" color={palette.lavender[700]}>
                  Takes less than 30 seconds
                </AppText>
              </View>
              <ChevronRight size={18} color={palette.lavender[700]} />
            </Card>
          )}

          {/* Today's plan */}
          <SectionHeader title="Today's Plan" action={`${done} / ${items.length} done`} onAction={() => router.push('/plan')} />
          {items.length ? (
            <Card padded={false} style={{ paddingVertical: 4 }}>
              {items.slice(0, 5).map((item, i) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="checkbox"
                  aria-checked={item.done}
                  accessibilityLabel={item.title}
                  onPress={() => dispatch({ type: 'TOGGLE_PLAN_ITEM', id: item.id })}
                  style={[styles.planRow, i < Math.min(5, items.length) - 1 && styles.planBorder]}>
                  <View style={[styles.dot, item.done && styles.dotOn]}>{item.done ? <Check size={13} color="#fff" /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <AppText variant={item.done ? 'bodyBold' : 'bodyMedium'} style={item.done ? { color: colors.textMuted, textDecorationLine: 'line-through' } : undefined}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption" muted numberOfLines={1}>
                      {item.detail}
                    </AppText>
                  </View>
                </Pressable>
              ))}
              <Button label="Open full plan" variant="ghost" size="sm" iconRight={ChevronRight} onPress={() => router.push('/plan')} style={{ alignSelf: 'flex-start', marginLeft: 6 }} />
            </Card>
          ) : (
            <Card tone="mint">
              <EmptyState title="No plan yet" text="Complete today’s check-in to get a gentle plan." action="Check in" onAction={() => router.push('/check-in')} />
            </Card>
          )}

          {/* Guided sessions (video previews) */}
          <SectionHeader eyebrow="Watch & follow along" title="Guided sessions" action="Wellness" onAction={() => router.push('/wellness')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 6, paddingHorizontal: 2 }}>
            {VIDEO_LIST.map((v) => (
              <VideoCard key={v.key} video={v.key} width={236} height={176} />
            ))}
          </ScrollView>

          {/* Insight (forest card) */}
          <Pressable accessibilityRole="button" accessibilityLabel="Open insights" onPress={() => router.push('/insights')} style={({ pressed }) => [styles.insight, pressed && { opacity: 0.94 }]}>
            <LinearGradient colors={[palette.green[800], palette.green[950]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.leaf, { top: -26, right: -10, backgroundColor: 'rgba(147,207,184,0.22)' }]} />
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={styles.insightIcon}>
                <Lightbulb size={18} color={onDark.butter[300]} />
              </View>
              <AppText variant="bodyBold" color="#fff" style={{ flex: 1, fontFamily: font.display, fontSize: 16 }}>
                {insight ? insight.title : 'Keep logging — patterns appear after a few days of check-ins.'}
              </AppText>
            </View>
            {insight ? (
              <AppText variant="small" color="rgba(255,255,255,0.8)" style={{ marginTop: 8 }} numberOfLines={3}>
                {insight.body}
              </AppText>
            ) : null}
            <Pressable accessibilityRole="link" onPress={() => router.push('/weekly-report')} hitSlop={8} style={styles.reportLink}>
              <AppText variant="smallMedium" color={colors.text}>
                View Weekly Report ›
              </AppText>
            </Pressable>
          </Pressable>
          <AppText variant="caption" muted style={{ marginTop: 6 }}>
            {COPY.observedPattern}
          </AppText>

          {/* Hydration */}
          <Card style={{ marginTop: 18 }} tone="sky">
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.circleIcon, { backgroundColor: colors.surface }]}>
                  <Droplets size={20} color={palette.sky[500]} />
                </View>
                <View>
                  <AppText variant="h3">Water</AppText>
                  <AppText variant="small" muted>
                    {(water / 1000).toFixed(1)} of {(state.waterTargetMl / 1000).toFixed(1)} L
                  </AppText>
                </View>
              </View>
              <Pressable accessibilityRole="link" onPress={() => router.push('/hydration')}>
                <AppText variant="smallMedium" color={palette.sky[700]}>
                  Details
                </AppText>
              </Pressable>
            </View>
            <ProgressBar value={water / state.waterTargetMl} color={palette.sky[500]} track="#fff" height={12} style={{ marginTop: 14 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {WATER_PRESETS_ML.slice(1).map((ml) => (
                <Pressable
                  key={ml}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${ml} millilitres`}
                  onPress={() => {
                    dispatch({ type: 'ADD_WATER', ml });
                    toast(`Added ${ml} ml`);
                  }}
                  style={styles.waterBtn}>
                  <Plus size={14} color={palette.sky[600]} />
                  <AppText variant="smallMedium" color={palette.sky[700]}>
                    {ml} ml
                  </AppText>
                </Pressable>
              ))}
            </View>
          </Card>

          <SectionHeader eyebrow="Learn" title="Recommended reading" action="Library" onAction={() => router.push('/learn')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4, paddingHorizontal: 2, paddingBottom: 12 }}>
            {recommended.map((a) => (
              <ArticleCard key={a.id} article={a} bookmarked={state.bookmarks.includes(a.id)} />
            ))}
          </ScrollView>

          <AppText variant="caption" muted center style={{ marginTop: 16, paddingHorizontal: 12 }}>
            {COPY.notDiagnostic}
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  week: { marginTop: 16, backgroundColor: colors.surface, borderRadius: 24, padding: 6, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  cycleCard: { marginTop: 14, overflow: 'hidden' },
  blob: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  phasePill: { marginTop: 4, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100], paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  cycleActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: { width: '31%', flexGrow: 1 },
  scoreCard: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  tiles: { flexDirection: 'row', gap: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  planBorder: { borderBottomWidth: 1, borderBottomColor: palette.ink[100] },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: palette.green[300], alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  insight: { marginTop: 20, borderRadius: 24, padding: 18, overflow: 'hidden' },
  insightIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  leaf: { position: 'absolute', width: 110, height: 110, borderTopRightRadius: 80, borderBottomLeftRadius: 80 },
  reportLink: { marginTop: 14, alignSelf: 'flex-start', backgroundColor: palette.green[100], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  circleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  waterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 10 },
});
