/** Life-stage mode switch (SRS §20–§25, P3-00; mockup M44). Each mode screen confirms the switch first; your history is always kept. */
import { COPY, type LifeStageMode, type PhotoKey } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check, History } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Disclaimer, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Option = LifeStageMode | 'fertility';
const MODES: { key: Option; title: string; text: string; photo: PhotoKey; phase?: 3 }[] = [
  { key: 'cycle', title: 'Cycle tracking', text: 'Periods, symptoms, mood and everyday wellness.', photo: 'portrait-indian' },
  { key: 'fertility', title: 'Fertility awareness', text: 'Fertile-window estimates*, BBT, cervical mucus and ovulation-test logs.', photo: 'woman-tea', phase: 3 },
  { key: 'pregnancy', title: 'Pregnancy wellness', text: 'Weekly education, reminders, hydration and gentle activity.', photo: 'pregnant-woman', phase: 3 },
  { key: 'perimenopause', title: 'Perimenopause', text: 'Cycle changes, hot flashes, sleep and mood.', photo: 'mature-woman', phase: 3 },
  { key: 'menopause', title: 'Menopause', text: 'Symptoms, strength and bone-health education.', photo: 'senior-woman-active', phase: 3 },
];

export default function LifeStages() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const current = state.profile.mode;
  const [picked, setPicked] = useState<Option>(current);

  const go = () => {
    if (picked === 'cycle') {
      dispatch({ type: 'SET_MODE', mode: 'cycle' });
      toast('Cycle tracking mode');
      return router.back();
    }
    if (picked === 'fertility') return router.push('/fertility');
    router.push({ pathname: '/life-stage/[mode]', params: { mode: picked } });
  };
  const stay = picked === current && picked === 'cycle';
  const label = stay ? 'Keep cycle tracking' : picked === current ? 'Open current mode' : picked === 'cycle' ? 'Switch to cycle tracking' : 'Open & switch mode';

  return (
    <Screen back largeTitle eyebrow="Every stage of life" title="Life stage mode" footer={<Button label={label} size="lg" full onPress={stay ? () => router.back() : go} />}>
      <View style={styles.keep}>
        <History size={16} color={palette.green[700]} />
        <AppText variant="small" color={brandText} style={{ flex: 1 }}>
          Choose the mode that fits you now. Switching changes your home screen, content and reminders — your history is kept.
        </AppText>
      </View>
      <View style={{ gap: 14, marginTop: 16 }} accessibilityRole="radiogroup">
        {MODES.map((m) => {
          const on = picked === m.key;
          const isCurrent = current === m.key;
          return (
            <Pressable
              key={m.key}
              accessibilityRole="radio"
              aria-selected={on}
              accessibilityLabel={m.title}
              onPress={() => setPicked(m.key)}
              style={({ pressed }) => [styles.card, on && styles.active, pressed && { transform: [{ scale: 0.985 }] }]}>
              <Photo photo={m.photo} style={styles.photo} radius={0} position="top">
                <LinearGradient colors={['rgba(8,45,36,0)', 'rgba(8,45,36,0.15)', 'rgba(8,45,36,0.8)']} style={StyleSheet.absoluteFill} />
                <View style={styles.photoTop}>
                  {m.phase ? <PhaseBadge phase={3} /> : <View />}
                  <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}</View>
                </View>
                <AppText style={styles.title}>{m.title}</AppText>
              </Photo>
              <View style={styles.body}>
                <AppText variant="small" color={palette.ink[700]} style={{ flex: 1 }}>
                  {m.text}
                </AppText>
                {isCurrent ? (
                  <View style={styles.current}>
                    <Check size={13} color={brandText} />
                    <AppText variant="caption" color={brandText} style={{ fontFamily: font.semibold }}>
                      Current mode
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Disclaimer style={{ marginTop: 16 }} text={COPY.notDiagnostic} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  keep: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: palette.green[50], borderRadius: 18, padding: 14, borderWidth: 1, borderColor: palette.green[100] },
  card: { backgroundColor: colors.surface, borderRadius: 26, overflow: 'hidden', borderWidth: 2, borderColor: palette.ink[100], ...shadow.card },
  active: { borderColor: palette.green[600] },
  photo: { height: 150, width: '100%', justifyContent: 'flex-end', padding: 14 },
  photoTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: font.display, fontSize: 21, lineHeight: 26, letterSpacing: -0.3, color: '#fff' },
  body: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.green[100], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(8,45,36,0.25)', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: palette.green[600], borderColor: palette.green[600] },
});
