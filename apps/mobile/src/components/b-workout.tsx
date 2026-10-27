/** Workout library pieces: varied display photos, the related video preview and the photo card. */
import { WORKOUT_CATEGORIES, type PhotoKey, type VideoKey, type Workout, type WorkoutCategory } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Photo } from './Photo';
import { AppText } from './Text';
import { colors, font, palette, shadow } from '@/lib/theme';

/** Display photo per sample workout so the library doesn't repeat the same image (falls back to the workout's own photo). */
const PHOTO_FOR: Record<string, PhotoKey> = {
  w_cardio_hiit: 'woman-running',
  w_pilates_core: 'pilates-mat',
  w_stretch_evening: 'friends-yoga',
  w_walk_mindful: 'nature-leaves',
};

export const workoutPhoto = (w: Workout): PhotoKey => PHOTO_FOR[w.id] ?? w.photo;

const VIDEO_FOR: Record<WorkoutCategory, VideoKey> = {
  strength: 'strength',
  walking: 'walk-outdoors',
  yoga: 'yoga-flow',
  mobility: 'yoga-flow',
  cardio: 'walk-outdoors',
  pilates: 'yoga-flow',
  stretching: 'yoga-flow',
  meditation: 'breathing',
};

export const workoutVideo = (w: Workout): VideoKey => (w.id === 'w_meditation_sleep' ? 'sleep-winddown' : VIDEO_FOR[w.category]);

export const categoryName = (c: WorkoutCategory) => WORKOUT_CATEGORIES.find((x) => x.key === c)?.label ?? c;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function WorkoutCard({ workout: w, onPress, style, done }: { workout: Workout; onPress: () => void; style?: StyleProp<ViewStyle>; done?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${w.title}, ${w.durationMin} minutes`} onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}>
      <Photo photo={workoutPhoto(w)} radius={0} shape="none" style={styles.img}>
        <LinearGradient colors={['rgba(8,45,36,0)', 'rgba(8,45,36,0.55)']} style={StyleSheet.absoluteFill} />
        <View style={styles.time}>
          <Clock size={11} color={palette.green[900]} />
          <AppText variant="caption" color={palette.green[900]} style={{ fontFamily: font.semibold }}>
            {w.durationMin} min
          </AppText>
        </View>
        <AppText variant="overline" color="#fff" style={styles.cat}>
          {categoryName(w.category)}
        </AppText>
      </Photo>
      <View style={styles.body}>
        <AppText variant="h3" numberOfLines={2} style={{ fontSize: 15, lineHeight: 20 }}>
          {w.title}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1} style={{ marginTop: 4 }}>
          {cap(w.level)} · {w.equipment === 'none' ? 'No equipment' : cap(w.equipment)}
        </AppText>
        {done ? (
          <AppText variant="caption" color={palette.green[700]} style={{ marginTop: 2 }}>
            Done {done}×
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  img: { height: 118, width: '100%' },
  time: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  cat: { position: 'absolute', left: 12, bottom: 10 },
  body: { padding: 12, flex: 1 },
});
