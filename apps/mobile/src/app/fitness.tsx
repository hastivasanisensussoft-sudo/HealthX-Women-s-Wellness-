/** Workouts (SRS §26, §27; mockup M22): steps summary, personalised builder, video previews, filterable photo library, history and external workout logging. */
import { WORKOUT_CATEGORIES, formatDate, stepsOn, type VideoKey, type WorkoutCategory } from '@healthx/shared';
import { router } from 'expo-router';
import { ChevronRight, Dumbbell, Footprints, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useId, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, Skeleton } from '@/components/Feedback';
import { Chip, SearchBar, Segmented, Stepper } from '@/components/Inputs';
import { PictureSlider, type Slide } from '@/components/PictureSlider';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GroupHeader, HScroll, PageIntro } from '@/components/b-kit';
import { WorkoutCard, categoryName } from '@/components/b-workout';
import { useDemoLoading } from '@/lib/hooks';
import { KeyIcon } from '@/lib/icons';
import { PICTURES } from '@/lib/pictures';
import { useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const MOVE_VIDEOS: VideoKey[] = ['yoga-flow', 'strength', 'walk-outdoors', 'breathing'];
/** Header slider height as a share of its width: taller than Home's, since these pictures are portrait. */
const SLIDER_RATIO = 0.85;
/** Header pictures. `position` keeps each person in the frame. */
const SLIDES: Slide[] = [
  { key: 'namaste', source: PICTURES.workoutNamaste, position: 'top', alt: 'A smiling woman sitting cross-legged on a yoga mat, hands pressed together.' },
  { key: 'inhale-exhale', source: PICTURES.workoutInhaleExhale, position: { top: '74%', left: '50%' }, alt: 'A woman in a seated side stretch on a mat, eyes closed, in a sunny room.' },
  { key: 'backbend', source: PICTURES.workoutBackbend, position: { top: '90%', left: '50%' }, alt: 'A woman in a backbend on a lilac yoga mat.' },
  { key: 'lunge', source: PICTURES.workoutLunge, position: 'top', alt: 'A woman in a lunge on a blue mat, hands pressed together.' },
];

const GEAR = require('../../assets/images/workouts/gear.png');

/** Steps ring for the stat card: green gradient progress with a knob, footprints in the middle. */
function StepRing({ value, size }: { value: number; size: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = size / 2;
  const B = size * 0.13;
  const R = c - B / 2 - 1;
  const frac = Math.max(0, Math.min(1, value));
  const pt = (deg: number) => ({ x: c + R * Math.cos((deg * Math.PI) / 180), y: c + R * Math.sin((deg * Math.PI) / 180) });
  const s = pt(-90);
  const e = pt(-90 + frac * 359.9);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#1FAA63" />
            <Stop offset="1" stopColor="#7FD86E" />
          </SvgGradient>
        </Defs>
        <Circle cx={c} cy={c} r={R} fill="none" stroke="#D3EEDC" strokeWidth={B} />
        {frac > 0 ? <Path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${e.x} ${e.y}`} stroke={`url(#${id})`} strokeWidth={B} strokeLinecap="round" fill="none" /> : null}
        <Circle cx={e.x} cy={e.y} r={B * 0.42} fill={palette.green[700]} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Footprints size={size * 0.34} color={palette.green[700]} />
      </View>
    </View>
  );
}

export default function Fitness() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const loading = useDemoLoading(500);
  const { width } = useWindowDimensions();
  const sliderWidth = width - 40;
  const [tab, setTab] = useState<'library' | 'history'>('library');
  const [cat, setCat] = useState<WorkoutCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [logCat, setLogCat] = useState<WorkoutCategory>('walking');
  const [logMin, setLogMin] = useState(30);
  const steps = stepsOn(state, state.today);
  const { width: winW } = useWindowDimensions();
  const gearW = Math.round(Math.min(230, Math.max(140, winW * 0.4)));

  const list = state.workouts.filter((w) => (cat === 'all' || w.category === cat) && `${w.title} ${w.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const sessions = [...state.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const doneCount = (id: string) => state.sessions.filter((s) => s.workoutId === id && s.status === 'completed').length;
  const filtered = cat !== 'all' || !!query.trim();

  return (
    <Screen back>
      {/* header with the workout-gear illustration on the right */}
      <View>
        <Image source={GEAR} style={[styles.gear, { width: gearW, height: gearW * 0.92 }]} contentFit="contain" accessible={false} />
        <PageIntro eyebrow="Move your way" title="Workouts" subtitle="Gentle, flexible routines for every level and life stage." style={{ paddingRight: gearW * 0.76, minHeight: gearW * 0.86 }} />
      </View>
      <PictureSlider slides={SLIDES} width={sliderWidth} height={Math.round(sliderWidth * SLIDER_RATIO)} label="Workout pictures, swipe for more" style={{ marginBottom: 16 }} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Steps today ${steps} of ${state.stepTarget}`} onPress={() => router.push('/steps' as never)} style={({ pressed }) => [styles.stat, styles.statMint, pressed && styles.statPressed]}>
          <LinearGradient colors={['#F3FBF6', '#E4F6EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Svg width="100%" height="100%" style={styles.statWave} viewBox="0 0 200 60" preserveAspectRatio="none" pointerEvents="none">
            <Path d="M0 50 C50 46 90 58 130 38 C160 22 182 14 200 6 L200 60 L0 60 Z" fill="#CDEED9" opacity={0.7} />
          </Svg>
          <StepRing value={steps / state.stepTarget} size={58} />
          <View style={{ flex: 1 }}>
            <AppText style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>
              {steps.toLocaleString()}
            </AppText>
            <AppText style={styles.statSub}>steps · goal</AppText>
            <AppText style={styles.statGoal}>{state.stepTarget.toLocaleString()}</AppText>
          </View>
          <View style={styles.statGo}>
            <ChevronRight size={13} color={palette.green[800]} />
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Workout history, ${sessions.length} sessions`} onPress={() => setTab('history')} style={({ pressed }) => [styles.stat, styles.statPeach, { flex: 0.85 }, pressed && styles.statPressed]}>
          <LinearGradient colors={['#FFF8F2', '#FDEADB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Svg width="100%" height="100%" style={styles.statWave} viewBox="0 0 200 60" preserveAspectRatio="none" pointerEvents="none">
            <Path d="M0 50 C50 46 90 58 130 38 C160 22 182 14 200 6 L200 60 L0 60 Z" fill="#F9DCC6" opacity={0.6} />
          </Svg>
          <View style={styles.sessionsDisc}>
            <Dumbbell size={22} color="#E8742E" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.statNum}>{sessions.length}</AppText>
            <AppText style={[styles.statSub, { color: palette.peach[700] }]}>sessions</AppText>
          </View>
          <View style={styles.statGo}>
            <ChevronRight size={13} color={palette.peach[700]} />
          </View>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Build my workout" onPress={() => router.push('/workout/personalize')} style={({ pressed }) => [styles.build, pressed && { opacity: 0.95 }]}>
        <LinearGradient colors={[palette.green[800], palette.green[900], palette.green[950]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 360 120" preserveAspectRatio="none" pointerEvents="none">
          <Path d="M0 120 C10 92 36 78 64 84 C52 98 40 110 30 120 Z" fill="#FFFFFF" opacity={0.05} />
          <Path d="M300 0 C330 6 352 22 360 40 L360 0 Z" fill="#FFFFFF" opacity={0.06} />
          <Path d="M210 120 C240 96 290 92 330 110 C320 116 310 118 300 120 Z" fill="#FFFFFF" opacity={0.05} />
        </Svg>
        <View style={styles.buildIcon}>
          <Sparkles size={24} color={palette.green[950]} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppText style={styles.buildTitle}>Build my workout</AppText>
            <PhaseBadge phase={2} />
          </View>
          <AppText style={styles.buildSub}>Goal, level, time, equipment & place → a plan for today</AppText>
        </View>
        {/* own view so it paints above the absolutely positioned background layers on web */}
        <View>
          <ChevronRight size={22} color="#FFFFFF" />
        </View>
      </Pressable>

      <Segmented value={tab} onChange={setTab} options={[{ key: 'library', label: 'Library' }, { key: 'history', label: `History (${sessions.length})` }]} style={{ marginTop: 18 }} />

      {tab === 'library' ? (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search workouts…" style={{ marginTop: 14, marginBottom: 10 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 20 }}>
            <Chip label="All" selected={cat === 'all'} onPress={() => setCat('all')} />
            {WORKOUT_CATEGORIES.map((c) => (
              <Chip key={c.key} label={c.label} selected={cat === c.key} onPress={() => setCat(c.key)} icon={<KeyIcon name={c.icon} size={14} color={palette.green[700]} />} />
            ))}
          </ScrollView>

          {!filtered ? (
            <>
              <GroupHeader eyebrow="Video previews" title="Follow along" />
              <HScroll>
                {MOVE_VIDEOS.map((v) => (
                  <VideoCard key={v} video={v} width={220} height={160} />
                ))}
              </HScroll>
            </>
          ) : null}

          <GroupHeader eyebrow={filtered ? `${list.length} match${list.length === 1 ? '' : 'es'}` : `${list.length} routines`} title={cat === 'all' ? 'Workout library' : categoryName(cat)} />
          {loading ? (
            <View style={styles.grid} accessibilityLabel="Loading">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={196} radius={22} style={styles.cell} />
              ))}
            </View>
          ) : list.length ? (
            <View style={styles.grid}>
              {list.map((w) => (
                <WorkoutCard key={w.id} workout={w} done={doneCount(w.id)} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })} style={styles.cell} />
              ))}
            </View>
          ) : (
            <Card tone="mint">
              <EmptyState
                icon={Dumbbell}
                title="No workouts match"
                text="Try another category or search term."
                action="Clear filters"
                onAction={() => {
                  setCat('all');
                  setQuery('');
                }}
              />
            </Card>
          )}
        </>
      ) : (
        <View style={{ marginTop: 14 }}>
          <Button label="Log a workout done elsewhere" icon={Plus} variant="secondary" full onPress={() => setLogOpen(true)} />
          <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
            {sessions.length ? (
              sessions.slice(0, 25).map((s, i) => (
                <View key={s.id} style={[styles.hist, i < Math.min(25, sessions.length) - 1 && styles.border]}>
                  <View style={[styles.histIcon, s.status === 'abandoned' && { backgroundColor: palette.ink[50] }]}>
                    <KeyIcon name={WORKOUT_CATEGORIES.find((c) => c.key === s.category)?.icon ?? 'dumbbell'} size={18} color={s.status === 'abandoned' ? palette.ink[500] : palette.green[700]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium">{s.title}</AppText>
                    <AppText variant="caption" muted>
                      {formatDate(s.date, 'medium')} · {s.durationMin} min{s.status === 'abandoned' ? ' · not completed' : ''}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${s.title}`}
                    onPress={() => {
                      dispatch({ type: 'DELETE_WORKOUT', id: s.id });
                      toast('Workout removed', 'info');
                    }}
                    hitSlop={8}
                    style={styles.del}>
                    <Trash2 size={15} color={palette.ink[500]} />
                  </Pressable>
                </View>
              ))
            ) : (
              <EmptyState title="No workouts yet" text="Start one from the library or log one you did elsewhere." />
            )}
          </Card>
        </View>
      )}
      <BackendNote style={{ marginTop: 16 }} text="Steps & workouts are entered manually in the MVP. Apple Health / Health Connect sync is Phase 2." />
      <AppText variant="caption" muted style={{ marginTop: 10 }}>
        Workouts are general wellness suggestions — listen to your body and stop if anything hurts.
      </AppText>

      <Sheet
        visible={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log a workout"
        footer={
          <Button
            label="Save workout"
            full
            onPress={() => {
              dispatch({ type: 'LOG_WORKOUT', session: { title: `${categoryName(logCat)} session`, category: logCat, durationMin: logMin, date: state.today, status: 'completed' } });
              toast('Workout logged');
              setLogOpen(false);
            }}
          />
        }>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {WORKOUT_CATEGORIES.map((c) => (
              <Chip key={c.key} label={c.label} selected={logCat === c.key} onPress={() => setLogCat(c.key)} />
            ))}
          </View>
          <AppText variant="label">Duration</AppText>
          <Stepper label="Duration" value={logMin} onChange={setLogMin} step={5} min={5} max={240} format={(v) => `${v} min`} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gear: { position: 'absolute', right: -14, top: -6 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingRight: 10, borderRadius: 22, borderWidth: 1.5, overflow: 'hidden', minHeight: 96 },
  statMint: { borderColor: '#D7F0E0' },
  statPeach: { borderColor: '#FBE2CF' },
  statPressed: { transform: [{ scale: 0.98 }] },
  statWave: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  statNum: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 28, color: '#13261E' },
  statSub: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 16, color: palette.ink[600] },
  statGoal: { fontFamily: font.bold, fontSize: 15, lineHeight: 19, color: palette.green[700] },
  statGo: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  sessionsDisc: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#E8742E', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  build: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingVertical: 18, borderRadius: 28, overflow: 'hidden', shadowColor: '#0D4336', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  buildIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F6C844', alignItems: 'center', justifyContent: 'center' },
  buildTitle: { fontFamily: font.displayBold, fontSize: 19, lineHeight: 24, color: '#FFFFFF' },
  buildSub: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.82)', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cell: { width: '48.3%' },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  histIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.green[50], alignItems: 'center', justifyContent: 'center' },
  del: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
});
