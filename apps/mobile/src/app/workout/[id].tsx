/** Workout detail (SRS §26; mockup M23): full-bleed photo hero, stats, numbered steps and the related video; "Start workout" opens the session. */
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Dumbbell, Flame, Gauge, MapPin, Play } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill } from '@/components/Badges';
import { Button, IconButton } from '@/components/Button';
import { EmptyState } from '@/components/Feedback';
import { Screen, goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GlassTag, GroupHeader, PhotoPanel, StatCardB, ON_DARK } from '@/components/b-kit';
import { categoryName, workoutPhoto, workoutVideo } from '@/components/b-workout';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette } from '@/lib/theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const w = state.workouts.find((x) => x.id === id);

  if (!w) {
    return (
      <Screen back title="Workout">
        <EmptyState icon={Dumbbell} title="Workout not found" text="It may have been removed from the library." action="Back to workouts" onAction={() => router.replace('/fitness')} />
      </Screen>
    );
  }

  const done = state.sessions.filter((s) => s.workoutId === w.id && s.status === 'completed').length;

  return (
    <Screen padded={false} footer={<Button label="Start workout" icon={Play} full size="lg" onPress={() => router.push({ pathname: '/workout/session/[id]', params: { id: w.id } })} />}>
      <PhotoPanel photo={workoutPhoto(w)} height={340 + insets.top} radius={0} alt={w.title} style={styles.hero}>
        <View style={[styles.bar, { top: insets.top + 10 }]}>
          <IconButton icon={ChevronLeft} label="Go back" onPress={goBack} />
        </View>
        <GlassTag label={categoryName(w.category)} />
        <AppText variant="display" color="#fff" style={{ marginTop: 10 }}>
          {w.title}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          <Meta icon={<Clock size={14} color={ON_DARK.text} />} text={`${w.durationMin} min`} />
          <Meta icon={<Flame size={14} color={ON_DARK.text} />} text={`~${w.kcalEstimate} kcal (estimate)`} />
        </View>
        <View style={{ height: 28 }} />
      </PhotoPanel>

      <View style={styles.sheet}>
        <View style={styles.stats}>
          <StatCardB compact icon={Gauge} tone="green" label="Level" value={cap(w.level)} style={{ flex: 1.25 }} />
          <StatCardB compact icon={Dumbbell} tone="peach" label="Kit" value={w.equipment === 'none' ? 'None' : cap(w.equipment)} />
          <StatCardB compact icon={MapPin} tone="sky" label="Where" value={cap(w.location)} />
        </View>
        <AppText variant="body" style={{ marginTop: 18, fontSize: 16, lineHeight: 25 }}>
          {w.description}
        </AppText>
        {done ? <Pill label={`Completed ${done}×`} tone="peach" style={{ marginTop: 12 }} /> : null}

        <GroupHeader eyebrow={`${w.exercises.length} steps`} title="What you'll do" />
        <View>
          {w.exercises.map((e, i) => (
            <View key={e.name} style={styles.step}>
              <View style={styles.rail}>
                <View style={styles.num}>
                  <AppText variant="smallMedium" color={brandText} style={{ fontFamily: font.monoMedium }}>
                    {i + 1}
                  </AppText>
                </View>
                {i < w.exercises.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.stepBody}>
                <AppText variant="bodyBold">{e.name}</AppText>
                <AppText variant="small" muted>
                  {e.detail}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <GroupHeader eyebrow="Video preview" title="See the moves" />
        <VideoCard video={workoutVideo(w)} width="100%" height={188} />
        <AppText variant="caption" muted center style={{ marginTop: 14 }}>
          Stop if anything hurts. This is general guidance, not a medical prescription.
        </AppText>
      </View>
    </Screen>
  );
}

function Meta({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {icon}
      <AppText variant="small" color={ON_DARK.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%' },
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  sheet: { marginTop: -28, backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 20 },
  stats: { flexDirection: 'row', gap: 10 },
  step: { flexDirection: 'row', gap: 14 },
  rail: { width: 32, alignItems: 'center' },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[200], alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, backgroundColor: palette.green[100], marginVertical: 2 },
  stepBody: { flex: 1, paddingBottom: 18, paddingTop: 4 },
});
