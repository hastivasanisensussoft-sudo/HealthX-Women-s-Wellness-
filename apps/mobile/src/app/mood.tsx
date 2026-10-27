/** Mood log (SRS §16, mockup M17; Myflo mood faces + chips): mood, stress, anxiety, energy and what's affecting it. Merges into the day's check-in. */
import { MOOD_FACTORS, MOODS, checkInOn, formatDate, type ISODate, type MoodLevel } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Brain, CircleAlert, HeartPulse, Sparkles, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MoodFace } from '@/components/Art';
import { Disclaimer } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, Slider } from '@/components/Inputs';
import { Screen, goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function MoodLog() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ date?: string }>();
  const date: ISODate = params.date && params.date <= state.today ? params.date : state.today;
  const existing = checkInOn(state, date);
  const [mood, setMood] = useState<MoodLevel | null>(existing?.mood ?? null);
  const [stress, setStress] = useState(existing?.stress ?? 4);
  const [anxiety, setAnxiety] = useState(existing?.anxiety ?? 3);
  const [energy, setEnergy] = useState(existing?.energy ?? 6);
  const [factors, setFactors] = useState<string[]>(existing?.moodFactors ?? []);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: string) => setFactors((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  const save = () => {
    if (!mood) return setError('Choose how your mood is today.');
    dispatch({
      type: 'SAVE_CHECKIN',
      checkIn: { ...(existing ?? { symptomIds: [] }), date, mood, stress, anxiety, energy, moodFactors: factors },
    });
    toast(`Mood saved for ${date === state.today ? 'today' : formatDate(date, 'short')}`);
    goBack();
  };

  return (
    <Screen back title="Mood" eyebrow={date === state.today ? 'Today' : formatDate(date, 'short')} footer={<Button label="Save mood" size="lg" full onPress={save} />}>
      <View style={styles.hero}>
        <LinearGradient colors={[palette.lavender[100], palette.lavender[50], palette.rose[50]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <AppText style={styles.heroTitle}>{date === state.today ? 'How is your mood today?' : `Your mood on ${formatDate(date, 'medium')}`}</AppText>
        <View style={styles.moods} accessibilityRole="radiogroup">
          {MOODS.map((m) => {
            const on = mood === m.key;
            return (
              <Pressable
                key={m.key}
                accessibilityRole="radio"
                aria-selected={on}
                accessibilityLabel={m.label}
                onPress={() => {
                  setMood(m.key);
                  setError(null);
                }}
                style={styles.moodItem}>
                <View style={[styles.face, on && styles.faceOn, !!mood && !on && { opacity: 0.55 }]}>
                  <MoodFace mood={m.key} size={on ? 54 : 46} />
                </View>
                <AppText variant="caption" color={on ? palette.lavender[700] : palette.ink[600]} style={{ fontSize: 11, fontFamily: on ? font.bold : font.medium }} numberOfLines={1}>
                  {m.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {error ? (
          <View style={styles.error}>
            <CircleAlert size={14} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} style={{ fontSize: 12.5 }}>
              {error}
            </AppText>
          </View>
        ) : null}
      </View>

      <Card style={{ marginTop: 14, gap: 18 }}>
        <Slider label="Stress" value={stress} onChange={setStress} color={palette.lavender[500]} icon={<Brain size={17} color={palette.lavender[600]} />} />
        <Slider label="Anxiety" value={anxiety} onChange={setAnxiety} color={palette.rose[400]} icon={<HeartPulse size={17} color={palette.rose[500]} />} />
        <Slider label="Energy" value={energy} onChange={setEnergy} color={palette.peach[500]} icon={<Zap size={17} color={palette.peach[600]} />} />
      </Card>

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View style={styles.panelIcon}>
            <Sparkles size={15} color={palette.lavender[600]} />
          </View>
          <AppText style={styles.panelTitle}>What’s affecting your mood?</AppText>
        </View>
        <View style={styles.wrap}>
          {MOOD_FACTORS.map((f) => (
            <Chip key={f.key} label={f.label} tone="lavender" selected={factors.includes(f.key)} icon={<KeyIcon name={f.icon} size={14} color={palette.lavender[600]} />} onPress={() => toggle(f.key)} />
          ))}
        </View>
      </View>

      {mood === 'very_low' || stress >= 8 || anxiety >= 8 ? (
        <Disclaimer
          tone="lavender"
          style={{ marginTop: 16 }}
          text="Thanks for sharing. If stress or low mood is affecting your daily life, consider talking to someone you trust or a mental-health professional. If you feel unsafe, contact your local emergency number."
        />
      ) : null}
      <AppText variant="caption" muted style={{ marginTop: 16 }}>
        Mood logs help you notice your own patterns over time — they are not a diagnosis.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, overflow: 'hidden', paddingHorizontal: 12, paddingTop: 18, paddingBottom: 16, borderWidth: 1, borderColor: palette.lavender[100] },
  heroTitle: { fontFamily: font.display, fontSize: 21, lineHeight: 27, letterSpacing: -0.3, color: colors.text, textAlign: 'center' },
  moods: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 },
  moodItem: { flex: 1, alignItems: 'center', gap: 6 },
  face: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  faceOn: { width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: palette.lavender[500] },
  error: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  panel: { marginTop: 14, backgroundColor: palette.lavender[50], borderRadius: 26, padding: 14, borderWidth: 1, borderColor: palette.lavender[100] },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panelIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { flex: 1, fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
