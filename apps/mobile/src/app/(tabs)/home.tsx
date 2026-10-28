/**
 * Home — "My Day" (mockup M11, SRS §7/§32/§33; Eva / Mira / Myflo references): illustrated hero with the
 * greeting, four shortcuts (period, wellness, workouts, nutrition), picture cards, week strip, quick logs,
 * score, check-in, plan, videos, insight, water, reading. The full cycle dial lives on Today and the Cycle tab.
 */
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
  pregnancyEstimate,
  sleepHoursOn,
  stepsOn,
  waterOn,
  wellnessScore,
  wellnessScoreSeries,
} from '@healthx/shared';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Apple,
  ArrowRight,
  Baby,
  CalendarDays,
  Check,
  ChevronRight,
  Droplet,
  Droplets,
  Dumbbell,
  Flower2,
  Footprints,
  Lightbulb,
  Moon,
  Plus,
  Salad,
  Smile,
  Stethoscope,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
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
import { useDemoLoading } from '@/lib/hooks';
import { PICTURES } from '@/lib/pictures';
import { useProfilePhoto } from '@/lib/profilePhoto';
import { useStore } from '@/lib/store';
import { brandText, colors, font, layout, onDark, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** The library article behind the "Period comfort" tile (falls back to the library if it's unpublished). */
const COMFORT_ARTICLE = 'a_cramps_comfort';
/** Picture cards in the "For you" row: width and gap (also the snap interval). */
const TILE_W = 132;
const TILE_GAP = 12;

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export default function Home() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const photo = useProfilePhoto();
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
  const stage = state.profile.mode;
  const preg = stage === 'pregnancy' ? pregnancyEstimate(state) : null;
  const STAGE_GOALS = { pregnancy_wellness: 'pregnancy', perimenopause: 'perimenopause', menopause: 'menopause' } as const;
  const STAGE_TITLE = { pregnancy: 'Pregnancy wellness', perimenopause: 'Perimenopause', menopause: 'Menopause' } as const;
  // Suggest a life-stage mode only when the person picked it as a goal and is still in cycle mode.
  const suggested = stage === 'cycle' ? state.profile.goals.map((g) => STAGE_GOALS[g as keyof typeof STAGE_GOALS]).find(Boolean) : undefined;
  // The first shortcut: pregnancy mode pauses period tracking, so it shows the estimated week instead.
  const firstShortcut: Shortcut =
    stage === 'pregnancy'
      ? { label: 'Pregnancy', hint: preg ? `Week ${preg.weeks}*` : 'Add a date', icon: Baby, tone: 'rose', a11y: preg ? `Pregnancy: estimated week ${preg.weeks}` : 'Pregnancy: add your last period date', open: () => router.push({ pathname: '/life-stage/[mode]', params: { mode: 'pregnancy' } }) }
      : { label: 'Track Period', hint: 'Log your cycle', icon: Droplet, tone: 'rose', a11y: 'Track period: log your cycle', open: () => router.push('/log-period') };
  const shortcuts: Shortcut[] = [
    firstShortcut,
    { label: 'Wellness', hint: 'Mind & body', icon: Flower2, tone: 'green', a11y: 'Wellness: mind and body', open: () => router.push('/wellness') },
    { label: 'Workouts', hint: 'Stay active', icon: Dumbbell, rotate: '45deg', tone: 'lavender', a11y: 'Workouts: stay active', open: () => router.push('/fitness') },
    { label: 'Nutrition', hint: 'Eat healthy', icon: Apple, tone: 'peach', a11y: 'Nutrition: eat healthy', open: () => router.push('/nutrition') },
  ];
  const comfort = state.articles.find((a) => a.id === COMFORT_ARTICLE && a.status === 'published');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: layout.tabBarHeight + 24 + insets.bottom }}>
        <HomeHero date={formatDate(today, 'long')} greeting={`${greeting()}, ${firstName}`} unread={unread} name={state.profile.name} photoUri={photo.uri} avatar={state.profile.avatar} />

      <View style={styles.body}>
      {loading ? (
        <View style={{ marginTop: 14 }}>
          <SkeletonCard height={128} />
        </View>
      ) : (
        <View style={styles.shortcuts}>
          {shortcuts.map((s) => (
            <ShortcutTile key={s.label} shortcut={s} />
          ))}
        </View>
      )}
      {!loading && cs.hasData && stage !== 'pregnancy' ? <EstimateNote compact icon={CalendarDays} style={styles.estimate} /> : null}
      <VerifyEmailHint />

      {loading ? (
        <View style={{ marginTop: 16, gap: 12 }}>
          <SkeletonCard height={150} />
          <SkeletonCard height={90} />
          <SkeletonCard />
        </View>
      ) : (
        <>
          {/* Week strip (Mira), above the For you row */}
          {cs.hasData ? (
            <View style={styles.week}>
              <WeekStrip state={cs} periods={state.periods} onSelect={(d) => router.push({ pathname: '/day/[date]', params: { date: d } })} />
            </View>
          ) : null}

          {/* Every supplied picture in one swipeable row; each opens the screen it illustrates. */}
          <SectionHeader eyebrow="Swipe for more" title="For you" action="See all" onAction={() => router.push('/wellness')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TILE_W + TILE_GAP}
            decelerationRate="fast"
            accessibilityLabel="For you pictures"
            style={styles.picRow}
            contentContainerStyle={styles.picRowContent}>
            <ArtTile label="Today's cycle" hint="Your cycle at a glance" tone="rose" picture={PICTURES.calendarSurprise} a11y="Today's cycle: ring, phase and mood" onPress={() => router.push('/today')} />
            <ArtTile label="My symptoms" hint="Track how you feel" tone="rose" picture={PICTURES.cramps} a11y="My symptoms: track how you feel" onPress={() => router.push('/symptoms')} />
            <ArtTile label="Mood & energy" hint="Feel your best" tone="butter" picture={PICTURES.thoughtful} position="center" a11y="Mood and energy: log how you feel" onPress={() => router.push('/mood')} />
            <ArtTile
              label="Period comfort"
              hint="Ideas for cramps"
              tone="rose"
              picture={PICTURES.resting}
              a11y="Period comfort: ideas for cramps"
              onPress={() => (comfort ? router.push({ pathname: '/learn/[id]', params: { id: comfort.id } }) : router.push('/learn'))}
            />
            <ArtTile label="My journal" hint="Today's notes" tone="lavender" picture={PICTURES.windowDaydream} a11y="My journal: today's notes" onPress={() => router.push({ pathname: '/day/[date]', params: { date: today } })} />
            <ArtTile label="Self-care plan" hint="Today's plan" tone="sky" picture={PICTURES.softerMe} position="center" a11y="Self-care plan: today's plan" onPress={() => router.push('/plan')} />
            <ArtTile label="My goals" hint="You come first" tone="green" picture={PICTURES.highestPriority} position="center" a11y="My goals: I'm my highest priority" onPress={() => router.push('/goals')} />
          </ScrollView>


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

type Shortcut = { label: string; hint: string; icon: LucideIcon; tone: TileTone; a11y: string; open: () => void; rotate?: string };

/** One of the four shortcuts under the hero: a tinted icon, the name, a hint and an arrow. */
function ShortcutTile({ shortcut: s }: { shortcut: Shortcut }) {
  const t = TILE_TONES[s.tone];
  const Icon = s.icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={s.a11y}
      onPress={s.open}
      style={({ pressed }) => [styles.shortcut, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}>
      <View style={[styles.shortcutIcon, { backgroundColor: t.bg }]}>
        {/* Rotate a wrapper, not the SVG: on web the SVG's own transform is applied twice. */}
        <View style={s.rotate ? { transform: [{ rotate: s.rotate }] } : undefined}>
          <Icon size={22} color={t.icon} />
        </View>
      </View>
      <AppText style={styles.shortcutLabel} numberOfLines={1}>
        {s.label}
      </AppText>
      <AppText style={styles.shortcutHint} numberOfLines={1}>
        {s.hint}
      </AppText>
      <ArrowRight size={16} color={brandText} style={{ marginTop: 8 }} />
    </Pressable>
  );
}

/** Picture card: the picture on top, then an uppercase name, a short hint and a round arrow. */
function ArtTile({ label, hint, tone, picture, position = 'top', a11y, onPress }: { label: string; hint: string; tone: TileTone; picture: ImageSourcePropType; position?: 'top' | 'center'; a11y: string; onPress: () => void }) {
  const t = TILE_TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [styles.artTile, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }]}>
      <View style={[styles.artPic, { backgroundColor: t.bg }]}>
        <Image source={picture as never} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={position} transition={250} accessible={false} />
      </View>
      <View style={styles.artText}>
        <AppText style={[styles.artLabel, { color: brandText }]} numberOfLines={1}>
          {label}
        </AppText>
        <View style={styles.artFoot}>
          <AppText style={styles.artHint} numberOfLines={2}>
            {hint}
          </AppText>
          <View style={styles.artArrow}>
            <ArrowRight size={13} color={brandText} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stageIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  // 16 at the sides, like the hero card above.
  body: { paddingHorizontal: 16 },
  // Four shortcuts under the hero
  shortcuts: { flexDirection: 'row', gap: 6, marginTop: 14 },
  shortcut: { flex: 1, minWidth: 0, alignItems: 'center', paddingTop: 12, paddingBottom: 12, paddingHorizontal: 2, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  shortcutIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  // 12 px with tight tracking keeps "Track Period" on one line down to 375 px wide screens.
  shortcutLabel: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: -0.3, color: colors.text, textAlign: 'center' },
  shortcutHint: { fontFamily: font.regular, fontSize: 11, lineHeight: 15, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  estimate: { marginTop: 14, paddingVertical: 10, borderRadius: 18, borderStyle: 'solid' },
  // Picture cards: the row bleeds to the screen edges; cards snap one at a time.
  picRow: { marginHorizontal: -16 },
  picRowContent: { gap: TILE_GAP, paddingHorizontal: 16, paddingVertical: 4 },
  artTile: { width: TILE_W, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100] },
  artPic: { height: 120, overflow: 'hidden' },
  artText: { paddingHorizontal: 10, paddingTop: 9, paddingBottom: 10 },
  artLabel: { fontFamily: font.displayBold, fontSize: 11.5, lineHeight: 15, letterSpacing: 0.4, textTransform: 'uppercase' },
  artFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  artHint: { flex: 1, fontFamily: font.regular, fontSize: 11, lineHeight: 14.5, color: colors.textMuted },
  artArrow: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green[50] },
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
