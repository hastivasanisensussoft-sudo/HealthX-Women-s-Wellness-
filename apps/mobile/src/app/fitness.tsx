/** Workouts (SRS §26, §27; mockup M22): steps summary, personalised builder, video previews, filterable photo library, history and external workout logging. */
import { WORKOUT_CATEGORIES, formatDate, stepsOn, type VideoKey, type WorkoutCategory } from '@healthx/shared';
import { router } from 'expo-router';
import { ChevronRight, Dumbbell, Footprints, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/Charts';
import { EmptyState, Skeleton } from '@/components/Feedback';
import { Chip, SearchBar, Segmented, Stepper } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GroupHeader, HScroll, HeroPanel, PageIntro, TintIcon, ON_DARK } from '@/components/b-kit';
import { WorkoutCard, categoryName } from '@/components/b-workout';
import { useDemoLoading } from '@/lib/hooks';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const MOVE_VIDEOS: VideoKey[] = ['yoga-flow', 'strength', 'walk-outdoors', 'breathing'];

export default function Fitness() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const loading = useDemoLoading(500);
  const [tab, setTab] = useState<'library' | 'history'>('library');
  const [cat, setCat] = useState<WorkoutCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [logCat, setLogCat] = useState<WorkoutCategory>('walking');
  const [logMin, setLogMin] = useState(30);
  const steps = stepsOn(state, state.today);

  const list = state.workouts.filter((w) => (cat === 'all' || w.category === cat) && `${w.title} ${w.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const sessions = [...state.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const doneCount = (id: string) => state.sessions.filter((s) => s.workoutId === id && s.status === 'completed').length;
  const filtered = cat !== 'all' || !!query.trim();

  return (
    <Screen back>
      <PageIntro eyebrow="Move your way" title="Workouts" subtitle="Gentle, flexible routines for every level and life stage." />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Steps today ${steps}`} onPress={() => router.push('/steps' as never)} style={({ pressed }) => [styles.steps, pressed && { opacity: 0.9 }]}>
          <ProgressRing value={steps / state.stepTarget} size={54} stroke={6} color={palette.green[700]} track={palette.green[200]}>
            <Footprints size={17} color={palette.green[700]} />
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <AppText variant="h3">{steps.toLocaleString()}</AppText>
            <AppText variant="caption" color={palette.green[700]}>
              steps · goal {state.stepTarget.toLocaleString()}
            </AppText>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Workout history" onPress={() => setTab('history')} style={({ pressed }) => [styles.steps, { backgroundColor: palette.peach[50], borderColor: palette.peach[100], flex: 0.8 }, pressed && { opacity: 0.9 }]}>
          <TintIcon icon={Dumbbell} tone="peach" size={44} solid />
          <View style={{ flex: 1 }}>
            <AppText variant="h3">{sessions.length}</AppText>
            <AppText variant="caption" color={palette.peach[700]}>
              sessions
            </AppText>
          </View>
        </Pressable>
      </View>

      <HeroPanel onPress={() => router.push('/workout/personalize')} accessibilityLabel="Build my workout" style={styles.build}>
        <View style={styles.buildIcon}>
          <Sparkles size={22} color={palette.green[950]} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppText variant="h3" color="#fff">
              Build my workout
            </AppText>
            <PhaseBadge phase={2} />
          </View>
          <AppText variant="small" color={ON_DARK.text} style={{ marginTop: 2 }}>
            Goal, level, time, equipment & place → a plan for today
          </AppText>
        </View>
        <ChevronRight size={18} color={ON_DARK.text} />
      </HeroPanel>

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
  steps: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 22, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100] },
  build: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  buildIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.butter[400], alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cell: { width: '48.3%' },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  histIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.green[50], alignItems: 'center', justifyContent: 'center' },
  del: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
});
