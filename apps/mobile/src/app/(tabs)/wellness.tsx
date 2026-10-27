/** Wellness hub (mockup M20; Mira / Myflo references): photo check-in hero, today at a glance, a tile for every module, guided videos, library, coach and community. */
import { VIDEO_LIST, addDays, checkInOn, formatDate, nutritionTotals, sleepHoursOn, stepsOn, waterOn, workoutsOn } from '@healthx/shared';
import { router } from 'expo-router';
import {
  Activity,
  Apple,
  Award,
  BookOpen,
  ChartColumn,
  ChevronRight,
  Droplets,
  Dumbbell,
  Footprints,
  ListChecks,
  MessageCircle,
  MessageCircleQuestion,
  Moon,
  Repeat,
  Smile,
  Target,
  Users,
  Zap,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { MoodFace } from '@/components/Art';
import { PhaseBadge } from '@/components/Badges';
import { GlassTag, GroupHeader, HScroll, HeroPanel, PageIntro, PhotoPanel, RingStat, TintIcon, ON_DARK } from '@/components/b-kit';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { QuickTile } from '@/components/Tiles';
import { VideoCard } from '@/components/Video';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';

export default function WellnessHub() {
  const { state } = useStore();
  const t = state.today;
  const ci = checkInOn(state, t);
  const water = waterOn(state, t);
  const steps = stepsOn(state, t);
  const sleep = sleepHoursOn(state, t) ?? sleepHoursOn(state, addDays(t, -1));
  const weekWorkouts = Array.from({ length: 7 }, (_, i) => workoutsOn(state, addDays(t, -i)).length).reduce((a, b) => a + b, 0);
  const activeGoals = state.goals.filter((g) => g.status === 'active').length;
  const planDone = state.plan.items.filter((i) => i.done).length;
  const symptomsToday = state.symptomLogs.filter((l) => l.date === t).length;
  const go = (to: string) => () => router.push(to as never);

  return (
    <Screen tabBarSpace>
      <PageIntro eyebrow={formatDate(t, 'long')} title="Wellness" subtitle="Everything you track, in one calm place." />

      {/* Photo hero: daily check-in */}
      <PhotoPanel photo="meditation" height={214} onPress={go('/check-in')} accessibilityLabel="Daily check-in">
        <GlassTag label={ci ? 'Checked in today' : 'Under 30 seconds'} />
        <AppText variant="overline" color={palette.butter[400]} style={{ marginTop: 'auto' }}>
          Daily check-in
        </AppText>
        <AppText variant="title" color="#fff" style={{ marginTop: 2 }}>
          {ci ? 'Checked in today — nice!' : 'How are you feeling today?'}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          {(['excellent', 'good', 'neutral', 'low', 'very_low'] as const).map((m) => (
            <MoodFace key={m} mood={m} size={32} ring={ci?.mood === m ? '#fff' : undefined} />
          ))}
          <View style={styles.heroGo}>
            <ChevronRight size={18} color={palette.green[900]} />
          </View>
        </View>
      </PhotoPanel>

      {/* Today at a glance */}
      <View style={styles.glance}>
        <RingStat icon={Droplets} label="Water" text={`${(water / 1000).toFixed(1)} L`} value={water / state.waterTargetMl} color={palette.sky[500]} track={palette.sky[100]} onPress={go('/hydration')} />
        <RingStat icon={Footprints} label="Steps" text={steps.toLocaleString()} value={steps / state.stepTarget} color={palette.green[600]} track={palette.green[100]} onPress={go('/steps')} />
        <RingStat icon={Moon} label="Sleep" text={sleep ? `${sleep} h` : '—'} value={(sleep ?? 0) / state.sleepTargetHours} color={palette.indigo[500]} track={palette.indigo[100]} onPress={go('/sleep')} />
        <RingStat icon={Zap} label="Energy" text={ci ? `${ci.energy}/10` : '—'} value={(ci?.energy ?? 0) / 10} color={palette.peach[500]} track={palette.peach[100]} onPress={go('/check-in')} />
      </View>

      {/* Every daily tracker */}
      <GroupHeader eyebrow="Track" title="Daily trackers" action="Plan" onAction={go('/plan')} />
      <View style={styles.grid}>
        <QuickTile tone="sky" icon={Droplets} label="Water" hint={`${(water / 1000).toFixed(1)} of ${(state.waterTargetMl / 1000).toFixed(1)} L`} onPress={go('/hydration')} style={styles.cell} />
        <QuickTile tone="green" icon={Footprints} label="Steps" hint={`${steps.toLocaleString()} today`} onPress={go('/steps')} style={styles.cell} />
        <QuickTile tone="peach" icon={Dumbbell} label="Workouts" hint={`${weekWorkouts} this week`} onPress={go('/fitness')} style={styles.cell} />
        <QuickTile tone="lavender" icon={Smile} label="Mood" hint={ci ? `Energy ${ci.energy}/10` : 'Not logged'} onPress={go('/mood')} style={styles.cell} />
        <QuickTile tone="rose" icon={Activity} label="Symptoms" hint={`${symptomsToday} today`} onPress={go('/symptoms')} style={styles.cell} />
        <QuickTile tone="butter" icon={Target} label="Goals" hint={`${activeGoals} active`} onPress={go('/goals')} style={styles.cell} />
        <QuickTile tone="green" icon={ListChecks} label="Daily plan" hint={`${planDone}/${state.plan.items.length} done`} onPress={go('/plan')} style={styles.cell} />
        <QuickTile tone="indigo" icon={ChartColumn} label="Report" hint="This week" onPress={go('/weekly-report')} style={styles.cell} />
        <QuickTile tone="sky" icon={BookOpen} label="Library" hint="Read & listen" onPress={go('/learn')} style={styles.cell} />
      </View>

      <GroupHeader eyebrow="More to explore" title="Sleep, food & habits" badge={<PhaseBadge phase={2} />} />
      <View style={styles.grid}>
        <QuickTile tone="indigo" icon={Moon} label="Sleep" hint={sleep ? `${sleep} h` : 'Not logged'} onPress={go('/sleep')} style={styles.cell} />
        <QuickTile tone="peach" icon={Apple} label="Nutrition" hint={`${nutritionTotals(state, t).kcal} kcal`} onPress={go('/nutrition')} style={styles.cell} />
        <QuickTile tone="lavender" icon={Repeat} label="Habits" hint={`${state.habits.length} habits`} onPress={go('/habits')} style={styles.cell} />
      </View>

      {/* Guided videos */}
      <GroupHeader eyebrow="Watch & follow along" title="Guided sessions" action="Workouts" onAction={go('/fitness')} />
      <HScroll>
        {VIDEO_LIST.map((v) => (
          <VideoCard key={v.key} video={v.key} width={230} height={170} />
        ))}
      </HScroll>

      {/* Library */}
      <GroupHeader eyebrow="Learn" title="Your library" />
      <Pressable accessibilityRole="button" accessibilityLabel="Library: articles, videos and Quick Help" onPress={go('/learn')} style={({ pressed }) => [styles.lib, pressed && { opacity: 0.94 }]}>
        <View style={styles.libText}>
          <View style={styles.pill}>
            <AppText variant="caption" color={brandText} style={{ fontFamily: font.semibold }}>
              Library
            </AppText>
          </View>
          <View>
            <AppText variant="h2">Articles, videos & Quick Help</AppText>
            <AppText variant="small" muted style={{ marginTop: 2 }}>
              Reviewed guides for every life stage
            </AppText>
          </View>
        </View>
        <Photo photo="woman-reading" shape="arch" radius={20} style={styles.libImg} />
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Most asked questions" onPress={go('/learn/faq')} style={({ pressed }) => [styles.small, pressed && { opacity: 0.9 }]}>
          <TintIcon icon={MessageCircleQuestion} tone="green" size={38} />
          <AppText variant="h3" style={{ marginTop: 10 }}>
            Most asked questions
          </AppText>
          <AppText variant="caption" muted>
            Hormones, check-ups, mood
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Achievements" onPress={go('/achievements')} style={({ pressed }) => [styles.small, { backgroundColor: palette.butter[50], borderColor: palette.butter[100] }, pressed && { opacity: 0.9 }]}>
          <TintIcon icon={Award} tone="butter" size={38} solid />
          <AppText variant="h3" style={{ marginTop: 10 }}>
            Streaks & badges
          </AppText>
          <AppText variant="caption" muted>
            {state.badges.filter((b) => b.earnedAt).length} of {state.badges.length} earned
          </AppText>
        </Pressable>
      </View>

      {/* Coach & community */}
      <GroupHeader eyebrow="Support" title="Coach & community" />
      <HeroPanel onPress={go('/coach')} accessibilityLabel="Open AI wellness coach" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}>
        <View style={styles.coachIcon}>
          <MessageCircle size={22} color={palette.butter[400]} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppText variant="h3" color="#fff">
              AI wellness coach
            </AppText>
            <PhaseBadge phase={2} />
          </View>
          <AppText variant="small" color={ON_DARK.text} style={{ marginTop: 3 }}>
            Ask about sleep, movement, stress & more (simulated)
          </AppText>
        </View>
        <ChevronRight size={18} color={ON_DARK.text} />
      </HeroPanel>
      <Pressable accessibilityRole="button" accessibilityLabel="Community" onPress={go('/community')} style={({ pressed }) => [styles.community, pressed && { opacity: 0.92 }]}>
        <View style={styles.avatars}>
          {(['avatar-1', 'avatar-2', 'avatar-3'] as const).map((a, i) => (
            <Photo key={a} photo={a} shape="circle" style={[styles.face, { marginLeft: i ? -12 : 0 }]} />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppText variant="h3">Community</AppText>
            <PhaseBadge phase={4} />
          </View>
          <AppText variant="small" muted style={{ marginTop: 2 }}>
            Moderated groups — sample posts
          </AppText>
        </View>
        <Users size={20} color={palette.green[700]} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroGo: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  glance: { flexDirection: 'row', gap: 4, marginTop: 14, backgroundColor: colors.surface, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 8, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '31%', flexGrow: 1 },
  lib: { flexDirection: 'row', height: 132, borderRadius: 24, overflow: 'hidden', backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100] },
  libText: { flex: 1, padding: 16, justifyContent: 'space-between' },
  libImg: { width: 112, height: 120, marginTop: 12, marginRight: 14 },
  pill: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  small: { flex: 1, borderRadius: 22, padding: 14, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100], minHeight: 128 },
  coachIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  community: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  avatars: { flexDirection: 'row' },
  face: { width: 36, height: 36, borderWidth: 2, borderColor: colors.surface },
});
