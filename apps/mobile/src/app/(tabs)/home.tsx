/**
 * Home — "My Day" (mockup M11, SRS §7/§32/§33; Eva / Mira / Myflo references): illustrated hero with the
 * greeting, glance cards (cycle estimate → the Today screen, mood), illustrated tiles, week strip, quick logs,
 * score, check-in, plan, videos, insight, water, reading. The full cycle dial lives on Today and the Cycle tab.
 */
import {
  COPY,
  VIDEO_LIST,
  WATER_PRESETS_ML,
  checkInOn,
  computeInsights,
  cycleStateOf,
  diffDays,
  formatDate,
  greeting,
  moodLabel,
  pregnancyEstimate,
  sleepHoursOn,
  stepsOn,
  waterOn,
  wellnessScore,
  wellnessScoreSeries,
  type CycleState,
} from '@healthx/shared';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Baby, Check, ChevronRight, Droplets, Flower2, Footprints, Lightbulb, Moon, Plus, Salad, Smile, Stethoscope, Zap } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/ArticleCard';
import { MoodFace } from '@/components/Art';
import { EstimateNote } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { ProgressBar, ProgressRing } from '@/components/Charts';
import { WeekStrip } from '@/components/cycle/Calendar';
import { EmptyState, SkeletonCard } from '@/components/Feedback';
import { HomeHero } from '@/components/HomeHero';
import { StatTile, fmtSleep } from '@/components/Kit';
import { AppText } from '@/components/Text';
import { QuickTile, TILE_TONES, type TileTone } from '@/components/Tiles';
import { VideoCard } from '@/components/Video';
import { VerifyEmailHint } from '@/components/VerifyEmailHint';
import { phaseText } from '@/lib/cycleText';
import { useDemoLoading } from '@/lib/hooks';
import { PICTURES } from '@/lib/pictures';
import { useStore } from '@/lib/store';
import { colors, fertile, font, layout, onDark, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** The library article behind the "Period comfort" tile (falls back to the library if it's unpublished). */
const COMFORT_ARTICLE = 'a_cramps_comfort';
/** Picture tiles in the "For you" row: width and gap (also the snap interval). */
const TILE_W = 150;
const TILE_GAP = 12;

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export default function Home() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
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
  const stage = state.profile.mode;
  const preg = stage === 'pregnancy' ? pregnancyEstimate(state) : null;
  const STAGE_GOALS = { pregnancy_wellness: 'pregnancy', perimenopause: 'perimenopause', menopause: 'menopause' } as const;
  const STAGE_TITLE = { pregnancy: 'Pregnancy wellness', perimenopause: 'Perimenopause', menopause: 'Menopause' } as const;
  // Suggest a life-stage mode only when the person picked it as a goal and is still in cycle mode.
  const suggested = stage === 'cycle' ? state.profile.goals.map((g) => STAGE_GOALS[g as keyof typeof STAGE_GOALS]).find(Boolean) : undefined;
  // The cycle glance card (pregnancy mode pauses cycle estimates, so it shows the week instead).
  const glance =
    stage === 'pregnancy'
      ? { label: 'Pregnancy', big: preg ? `Week ${preg.weeks}*` : 'Week —', sub: preg ? `+ ${preg.days} days · cycle estimates paused` : 'Add your last period date', open: () => router.push({ pathname: '/life-stage/[mode]', params: { mode: 'pregnancy' } }) }
      : !cs.hasData
        ? { label: 'My cycle', big: 'Start here', sub: 'Log your last period to see estimates', open: () => router.push('/log-period') }
        : {
            label: 'My cycle',
            big: `Day ${cs.cycleDay}`,
            sub: cs.inPeriod
              ? `Period day ${cs.periodDay}`
              : cs.isLate
                ? `${cs.daysLate} ${cs.daysLate === 1 ? 'day' : 'days'} later than estimated*`
                : days !== null && days >= 0
                  ? days === 0
                    ? 'Next period may start today*'
                    : `Next period in ~${days} ${days === 1 ? 'day' : 'days'}*`
                  : 'Log more cycles for estimates',
            open: () => router.push('/today'),
          };
  const comfort = state.articles.find((a) => a.id === COMFORT_ARTICLE && a.status === 'published');

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: layout.tabBarHeight + 24 + insets.bottom }}>
        <HomeHero date={formatDate(today, 'long')} greeting={`${greeting()}, ${firstName}`} unread={unread}>
          {loading ? (
            <View style={{ paddingHorizontal: 16 }}>
              <SkeletonCard height={116} />
            </View>
          ) : (
            <View style={styles.glance}>
              <View style={[styles.glanceCard, styles.cycleCard]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${glance.label}: ${glance.big.replace('*', '')}. ${glance.sub.replace('*', '')}${cs.hasData && stage !== 'pregnancy' ? `. ${phaseText(cs)}` : ''}`}
                  onPress={glance.open}
                  style={({ pressed }) => [{ flexGrow: 1 }, pressed && { opacity: 0.8 }]}>
                  <View style={styles.cardHead}>
                    <AppText style={styles.cardLabel}>{glance.label}</AppText>
                    <ChevronRight size={15} color={palette.rose[500]} />
                  </View>
                  <AppText style={[styles.big, glance.big.length > 8 && { fontSize: 23, lineHeight: 30 }]} numberOfLines={1}>
                    {glance.big}
                  </AppText>
                  <AppText variant="caption" muted numberOfLines={1}>
                    {glance.sub}
                  </AppText>
                  {cs.hasData && stage !== 'pregnancy' ? <PhaseTrack cs={cs} /> : null}
                </Pressable>
                {/* In the top-right corner (not under the track) to keep the card short. */}
                {cs.hasData && stage !== 'pregnancy' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={cs.inPeriod ? 'Log flow' : 'Log period'}
                    onPress={() => router.push('/log-period')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.logChip, pressed && { opacity: 0.8 }]}>
                    <Plus size={12} color={palette.rose[600]} />
                    <AppText variant="caption" color={palette.rose[700]} style={{ fontFamily: font.semibold }}>
                      {cs.inPeriod ? 'Flow' : 'Period'}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={checkIn ? `Mood: ${moodLabel(checkIn.mood)}. Open mood` : 'Mood: not logged today. Open mood'}
                onPress={() => router.push('/mood')}
                style={({ pressed }) => [styles.glanceCard, styles.moodCard, pressed && { opacity: 0.85 }]}>
                <View style={styles.cardHead}>
                  <AppText style={styles.cardLabel}>Mood</AppText>
                  <ChevronRight size={15} color={palette.rose[500]} />
                </View>
                <View style={styles.moodRow}>
                  <MoodFace mood={checkIn?.mood ?? 'good'} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText style={styles.moodValue} numberOfLines={1}>
                      {checkIn ? moodLabel(checkIn.mood) : 'Log it'}
                    </AppText>
                    <AppText variant="caption" muted numberOfLines={2}>
                      {checkIn ? 'Today' : 'How are you?'}
                    </AppText>
                  </View>
                </View>
              </Pressable>
            </View>
          )}
        </HomeHero>

      <View style={styles.body}>
      {!loading && cs.hasData && stage !== 'pregnancy' ? <EstimateNote compact style={{ marginTop: 12 }} /> : null}
      <VerifyEmailHint />

      {loading ? (
        <View style={{ marginTop: 16, gap: 12 }}>
          <SkeletonCard height={150} />
          <SkeletonCard height={90} />
          <SkeletonCard />
        </View>
      ) : (
        <>
          {/* Every supplied picture in one swipeable row; each opens the screen it illustrates. */}
          <SectionHeader eyebrow="Swipe for more" title="For you" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TILE_W + TILE_GAP}
            decelerationRate="fast"
            accessibilityLabel="For you pictures"
            style={styles.picRow}
            contentContainerStyle={styles.picRowContent}>
            <ArtTile label="Today's cycle" tone="rose" picture={PICTURES.calendarSurprise} a11y="Today's cycle: ring, phase and mood" onPress={() => router.push('/today')} />
            <ArtTile label="My symptoms" tone="lavender" picture={PICTURES.cramps} a11y="My symptoms" onPress={() => router.push('/symptoms')} />
            <ArtTile label="My journal" tone="butter" picture={PICTURES.thoughtful} a11y="My journal: today's notes" onPress={() => router.push({ pathname: '/day/[date]', params: { date: today } })} />
            <ArtTile
              label="Period comfort"
              tone="rose"
              picture={PICTURES.resting}
              a11y="Period comfort: ideas for cramps"
              onPress={() => (comfort ? router.push({ pathname: '/learn/[id]', params: { id: comfort.id } }) : router.push('/learn'))}
            />
            <ArtTile label="My mood" tone="lavender" picture={PICTURES.windowDaydream} a11y="My mood: log how you feel" onPress={() => router.push('/mood')} />
            <ArtTile label="Self-care plan" tone="sky" picture={PICTURES.softerMe} position="center" a11y="Self-care plan: today's plan" onPress={() => router.push('/plan')} />
            <ArtTile label="My goals" tone="green" picture={PICTURES.highestPriority} position="center" a11y="My goals: I'm my highest priority" onPress={() => router.push('/goals')} />
          </ScrollView>

          {/* Week strip (Mira) */}
          {cs.hasData ? (
            <View style={styles.week}>
              <WeekStrip state={cs} periods={state.periods} onSelect={(d) => router.push({ pathname: '/day/[date]', params: { date: d } })} />
            </View>
          ) : null}

          {/* Life stage (Phase 3 preview) */}
          {stage !== 'cycle' ? (
            <Card
              tone="mint"
              style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              onPress={() => router.push({ pathname: '/life-stage/[mode]', params: { mode: stage } })}
              accessibilityLabel={`Open ${STAGE_TITLE[stage]}`}>
              <View style={styles.stageIcon}>{stage === 'pregnancy' ? <Baby size={20} color={palette.green[700]} /> : <Flower2 size={20} color={palette.green[700]} />}</View>
              <View style={{ flex: 1 }}>
                <AppText variant="overline" color={palette.green[700]}>
                  {STAGE_TITLE[stage]} mode
                </AppText>
                <AppText variant="h3">
                  {stage === 'pregnancy'
                    ? preg
                      ? `Week ${preg.weeks} + ${preg.days}d*`
                      : 'Add your last period date'
                    : 'Your 7-day wellness view'}
                </AppText>
                <AppText variant="caption" muted>
                  {stage === 'pregnancy' ? (preg ? `Estimated due date around ${formatDate(preg.dueDate, 'short')}* · cycle estimates paused` : 'To estimate your pregnancy week') : 'Sleep, energy, mood, activity & symptoms'}
                </AppText>
              </View>
              <ChevronRight size={18} color={palette.green[700]} />
            </Card>
          ) : suggested ? (
            <Card
              tone="lavender"
              style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              onPress={() => router.push({ pathname: '/life-stage/[mode]', params: { mode: suggested } })}
              accessibilityLabel={`Try ${STAGE_TITLE[suggested]} mode`}>
              <View style={[styles.stageIcon, { backgroundColor: palette.lavender[100] }]}>
                <Flower2 size={20} color={palette.lavender[700]} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">Try {STAGE_TITLE[suggested]} mode</AppText>
                <AppText variant="caption" muted>
                  You chose it as a goal. Preview it first — your history is kept.
                </AppText>
              </View>
              <ChevronRight size={18} color={palette.lavender[700]} />
            </Card>
          ) : null}

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
      </View>
      </ScrollView>
    </View>
  );
}

/**
 * The cycle as a dotted line: a dot where each estimated phase starts (period, follicular, fertile
 * window, luteal, next period) and a ring for today. Positions are proportional to the estimated length.
 */
function PhaseTrack({ cs }: { cs: CycleState }) {
  const L = cs.avgCycleLength ?? 28; // drawing only; never shown as a "28-day assumption"
  const pos = (day: number) => `${(Math.min(Math.max(day, 1), L) - 1) / (L - 1) * 100}%` as const;
  const periodLen = Math.min(cs.avgPeriodLength ?? 5, L);
  const fwStart = cs.fertileWindow && cs.currentCycleStart ? diffDays(cs.currentCycleStart, cs.fertileWindow.start) + 1 : null;
  const fwEnd = cs.fertileWindow && cs.currentCycleStart ? diffDays(cs.currentCycleStart, cs.fertileWindow.end) + 1 : null;
  const marks = [
    { day: 1, color: palette.rose[400] },
    { day: periodLen + 1, color: palette.sky[300] },
    ...(fwStart ? [{ day: fwStart, color: fertile[300] }] : []),
    ...(fwEnd && fwEnd < L ? [{ day: fwEnd + 1, color: palette.lavender[300] }] : []),
    { day: L, color: palette.rose[300] },
  ];
  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.trackLine} />
      {marks.map((m) => (
        <View key={m.day} style={[styles.trackDot, { left: pos(m.day), backgroundColor: m.color }]} />
      ))}
      <View style={[styles.trackToday, { left: pos(cs.cycleDay ?? 1) }]} />
    </View>
  );
}

/** Picture shortcut tile: the picture fills the card, with an uppercase label on a soft pill at the bottom. */
function ArtTile({ label, tone, picture, position = 'top', a11y, onPress }: { label: string; tone: TileTone; picture: ImageSourcePropType; position?: 'top' | 'center'; a11y: string; onPress: () => void }) {
  const t = TILE_TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [styles.artTile, { backgroundColor: t.bg, borderColor: t.border }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }]}>
      <Image source={picture as never} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={position} transition={250} accessible={false} />
      {/* Fixed light pill: the pictures are light in both themes. */}
      <View style={styles.artPill}>
        <AppText style={[styles.artLabel, { color: palette.green[800] }]} numberOfLines={2}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stageIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: layout.screenPadding },
  // Glance cards overlapping the hero
  glance: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  glanceCard: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1.5, borderColor: palette.rose[100], ...shadow.lift, shadowOpacity: 0.1 },
  cycleCard: { flex: 1.1, paddingHorizontal: 12, paddingVertical: 11 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardLabel: { fontFamily: font.semibold, fontSize: 13.5, lineHeight: 18, color: colors.text },
  big: { fontFamily: font.displayBold, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: colors.text, marginTop: 2 },
  track: { height: 18, marginTop: 6, marginHorizontal: 6, justifyContent: 'center' },
  trackLine: { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1, backgroundColor: palette.ink[100] },
  trackDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, marginLeft: -5 },
  trackToday: { position: 'absolute', width: 18, height: 18, borderRadius: 9, marginLeft: -9, borderWidth: 3.5, borderColor: palette.green[600], backgroundColor: colors.surface },
  logChip: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100] },
  moodCard: { flex: 0.9, paddingHorizontal: 12, paddingVertical: 11 },
  moodRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  moodValue: { fontFamily: font.displayBold, fontSize: 18, lineHeight: 23, color: colors.text },
  // Illustrated tiles
  // The row bleeds to the screen edges; tiles snap one at a time.
  picRow: { marginHorizontal: -layout.screenPadding },
  picRowContent: { gap: TILE_GAP, paddingHorizontal: layout.screenPadding, paddingVertical: 4 },
  artTile: { width: TILE_W, height: 200, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  artPill: { position: 'absolute', left: 6, right: 6, bottom: 6, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.88)' },
  artLabel: { fontFamily: font.displayBold, fontSize: 11, lineHeight: 13.5, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' },
  week: { marginTop: 16, backgroundColor: colors.surface, borderRadius: 24, padding: 6, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
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
