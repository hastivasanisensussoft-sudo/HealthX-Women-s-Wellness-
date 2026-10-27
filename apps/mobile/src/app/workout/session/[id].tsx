/** Workout session (SRS §26, §53 workout_started/completed; mockup M23): full-screen timer ring, current exercise, pause / next / finish, checklist and the related video. */
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, Dumbbell, Pause, Play, Video as VideoIcon, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { CheckRow } from '@/components/Kit';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { VideoCard, openVideo } from '@/components/Video';
import { Leaf, ON_DARK } from '@/components/b-kit';
import { workoutVideo } from '@/components/b-workout';
import { useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { track } from '@/lib/track';

export default function WorkoutSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const w = state.workouts.find((x) => x.id === id);
  const [running, setRunning] = useState(true);
  const [secs, setSecs] = useState(0);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id) track('workout_started', id);
  }, [id]);

  useEffect(() => {
    if (running && !done) timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, done]);

  if (!w) {
    return (
      <Screen back title="Workout">
        <EmptyState icon={Dumbbell} title="Workout not found" text="It may have been removed from the library." action="Back to workouts" onAction={() => router.replace('/fitness')} />
      </Screen>
    );
  }

  const n = w.exercises.length;
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const last = current >= n - 1;
  const ex = w.exercises[Math.min(current, n - 1)];
  const video = workoutVideo(w);

  const save = (completed: boolean) => {
    dispatch({
      type: 'LOG_WORKOUT',
      session: { workoutId: w.id, title: w.title, category: w.category, durationMin: Math.max(1, Math.round(secs / 60)), date: state.today, status: completed ? 'completed' : 'abandoned' },
    });
    setRunning(false);
    setDone(true);
    toast(completed ? 'Workout completed — great job!' : 'Session saved as not completed', completed ? 'success' : 'info');
  };

  const close = () => {
    if (done || secs < 5) return router.back();
    setRunning(false);
    setQuitOpen(true);
  };

  const watch = () => {
    setRunning(false);
    openVideo(video);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[palette.green[800], palette.green[950]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Leaf size={220} color="rgba(147,207,184,0.10)" vein={false} rotate={20} style={{ position: 'absolute', top: 40, right: -80 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close workout" onPress={close} style={styles.round} hitSlop={8}>
            <X size={18} color="#fff" />
          </Pressable>
          <AppText variant="overline" color={ON_DARK.soft} numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
            {done ? 'Session complete' : `Exercise ${current + 1} of ${n}`}
          </AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Watch the video preview" onPress={watch} style={styles.round} hitSlop={8}>
            <VideoIcon size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Timer */}
        <View style={styles.timerWrap}>
          <ProgressRing value={done ? 1 : (current + 1) / n} size={232} stroke={14} color={palette.butter[400]} track="rgba(255,255,255,0.12)">
            <View accessible accessibilityLabel={`Elapsed ${mm} minutes ${ss} seconds`}>
              <AppText style={styles.clock}>
                {mm}:{ss}
              </AppText>
            </View>
            <AppText variant="small" color={ON_DARK.text} center accessibilityLiveRegion="polite">
              {done ? 'Recorded' : running ? 'Elapsed' : 'Paused'}
            </AppText>
          </ProgressRing>
          <AppText variant="title" color="#fff" center style={{ marginTop: 18, paddingHorizontal: 24 }}>
            {w.title}
          </AppText>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {done ? (
            <Card tone="mint" style={{ alignItems: 'center', gap: 8, marginTop: 18 }}>
              <CircleCheck size={48} color={palette.green[700]} />
              <AppText variant="title">Session saved</AppText>
              <AppText variant="small" muted center>
                {mm}:{ss} recorded. It now counts towards your weekly summary and goals.
              </AppText>
              <Button label="Back to workouts" full onPress={() => router.replace('/fitness')} style={{ marginTop: 8 }} />
            </Card>
          ) : (
            <>
              <View style={styles.now}>
                <AppText variant="overline" color={palette.butter[400]}>
                  Now
                </AppText>
                <AppText variant="h2" color="#fff" style={{ marginTop: 2 }}>
                  {ex.name}
                </AppText>
                <AppText variant="small" color={ON_DARK.text} style={{ marginTop: 2 }}>
                  {ex.detail}
                </AppText>
              </View>
              <View style={styles.controls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={running ? 'Pause' : 'Resume'}
                  onPress={() => setRunning((r) => !r)}
                  style={({ pressed }) => [styles.pause, pressed && { opacity: 0.85 }]}>
                  {running ? <Pause size={20} color="#fff" fill="#fff" /> : <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />}
                  <AppText variant="bodyBold" color="#fff">
                    {running ? 'Pause' : 'Resume'}
                  </AppText>
                </Pressable>
                {last ? (
                  <Button label="Finish workout" variant="light" size="lg" style={{ flex: 1.4 }} onPress={() => save(true)} />
                ) : (
                  <Button label="Next exercise ›" variant="light" size="lg" style={{ flex: 1.4 }} onPress={() => setCurrent((c) => c + 1)} />
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.sheet}>
          <AppText variant="overline" color={palette.green[700]}>
            {n} exercises
          </AppText>
          <AppText variant="h2" style={{ marginTop: 2, marginBottom: 6 }}>
            Your routine
          </AppText>
          {w.exercises.map((e, i) => (
            <CheckRow key={e.name} label={e.name} sub={e.detail} done={done || i < current} current={!done && i === current} onPress={done ? undefined : () => setCurrent(i)} last={i === n - 1} />
          ))}
          <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 20, marginBottom: 10 }}>
            Related video
          </AppText>
          <VideoCard video={video} width="100%" height={176} />
          <AppText variant="caption" muted center style={{ marginTop: 14 }}>
            Stop if anything hurts. This is general guidance, not a medical prescription.
          </AppText>
        </View>
      </ScrollView>

      <Sheet
        visible={quitOpen}
        onClose={() => {
          setQuitOpen(false);
          setRunning(true);
        }}
        title="End this workout?"
        subtitle={`${mm}:${ss} so far`}>
        <View style={{ gap: 10 }}>
          <Button
            label="Keep going"
            full
            onPress={() => {
              setQuitOpen(false);
              setRunning(true);
            }}
          />
          <Button
            label="Save as not completed"
            variant="secondary"
            full
            onPress={() => {
              setQuitOpen(false);
              save(false);
            }}
          />
          <Button
            label="Discard session"
            variant="ghost"
            full
            onPress={() => {
              setQuitOpen(false);
              router.back();
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.green[950] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  timerWrap: { alignItems: 'center', marginTop: 22 },
  clock: { fontFamily: font.displayBold, fontSize: 52, lineHeight: 58, color: '#fff', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  now: { marginTop: 20, padding: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  controls: { flexDirection: 'row', gap: 10, marginTop: 14 },
  pause: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  sheet: { marginTop: 24, marginHorizontal: 12, backgroundColor: colors.surface, borderRadius: 30, padding: 20 },
});
