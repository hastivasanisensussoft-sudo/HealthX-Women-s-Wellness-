/** Daily check-in (SRS §32, mockup M12; Myflo mood faces) — one screen, target < 30 seconds, with a success state. */
import { MOODS, checkInOn, formatDate, moodLabel, type MoodLevel } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Brain, Check, CircleAlert, ListChecks, Moon, Plus, Stethoscope, Timer, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Leaf, Sparkle } from '@/components/Art';
import { Disclaimer } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, Slider, Stepper } from '@/components/Inputs';
import { fmtSleep } from '@/components/Kit';
import { MoodAvatar } from '@/components/MoodAvatar';
import { Screen, goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { simulate } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const QUICK_SYMPTOMS = ['cramps', 'headache', 'bloating', 'fatigue', 'acne', 'back_pain', 'breast_tenderness'];

function Block({ icon, title, tint, children, right }: { icon: ReactNode; title: string; tint: string; children: ReactNode; right?: ReactNode }) {
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={styles.blockHead}>
        <View style={[styles.blockIcon, { backgroundColor: tint }]}>{icon}</View>
        <AppText style={styles.blockTitle}>{title}</AppText>
        {right}
      </View>
      {children}
    </Card>
  );
}

export default function CheckIn() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const existing = checkInOn(state, state.today);
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  const [mood, setMood] = useState<MoodLevel | null>(existing?.mood ?? null);
  // five faces share the card width: ~58 px on a 390 px phone, smaller on narrow ones (selected face +4)
  const { width: winW } = useWindowDimensions();
  const face = Math.round(Math.max(44, Math.min(60, (winW - 96) / 5)));
  const [energy, setEnergy] = useState(existing?.energy ?? 6);
  const [stress, setStress] = useState(existing?.stress ?? 4);
  const [sleep, setSleep] = useState(existing?.sleepHours ?? 7);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptomIds ?? []);
  const [none, setNone] = useState(existing ? existing.symptomIds.length === 0 : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ secs: number; symptoms: number } | null>(null);
  const defs = useMemo(
    () => [...state.symptomDefs.filter((s) => QUICK_SYMPTOMS.includes(s.id)), ...state.symptomDefs.filter((s) => s.custom)],
    [state.symptomDefs],
  );

  const save = async () => {
    if (!mood) return setError('Pick how you feel to finish your check-in.');
    setError(null);
    setSaving(true);
    await simulate(null, 450);
    const symptomIds = none ? [] : symptoms;
    dispatch({ type: 'SAVE_CHECKIN', checkIn: { ...(existing ?? {}), date: state.today, mood, energy, stress, sleepHours: sleep, symptomIds } });
    const fresh = symptomIds.filter((id) => !existing?.symptomIds.includes(id));
    if (fresh.length) {
      dispatch({
        type: 'LOG_SYMPTOMS',
        date: state.today,
        entries: fresh.map((symptomId) => ({ symptomId, severity: state.symptomDefs.find((s) => s.id === symptomId)?.defaultSeverity ?? 'mild' })),
      });
    }
    setSaving(false);
    const secs = Math.max(1, Math.round((Date.now() - started.current) / 1000));
    toast(`Check-in saved in ${secs}s — your plan is updated`);
    setDone({ secs, symptoms: symptomIds.length });
  };

  // ── Success state ─────────────────────────────────────────────
  if (done && mood) {
    return (
      <Screen close title="Daily Check-in" footer={<Button label="Done" size="lg" full onPress={goBack} />}>
        <View style={styles.success} accessibilityLiveRegion="polite">
          <View style={styles.successArt}>
            <View style={styles.successWash} />
            <Leaf size={70} color={palette.green[200]} rotate={-20} style={{ left: 0, top: 12 }} />
            <Leaf size={52} color={palette.rose[200]} rotate={80} style={{ right: 6, bottom: 14 }} />
            <Sparkle size={18} style={{ right: 26, top: 16 }} />
            <View style={styles.successDisc}>
              <Check size={42} color="#fff" strokeWidth={3} />
            </View>
          </View>
          <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 16 }}>
            {formatDate(state.today, 'long')}
          </AppText>
          <AppText variant="display" center style={{ marginTop: 6 }} accessibilityRole="header">
            Check-in saved
          </AppText>
          <View style={styles.timer}>
            <Timer size={14} color={brandText} />
            <AppText variant="smallMedium" color={brandText}>
              Done in {done.secs}s
            </AppText>
          </View>
        </View>
        <Card tone="mint" style={{ marginTop: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MoodAvatar mood={mood} size={56} />
            <View style={{ flex: 1 }}>
              <AppText variant="overline" color={palette.green[700]}>
                Today you feel
              </AppText>
              <AppText style={styles.successMood}>{moodLabel(mood)}</AppText>
            </View>
          </View>
          <View style={styles.summary}>
            {[
              { icon: <Zap size={14} color={palette.peach[600]} />, text: `Energy ${energy}/10` },
              { icon: <Brain size={14} color={palette.lavender[600]} />, text: `Stress ${stress}/10` },
              { icon: <Moon size={14} color={palette.indigo[600]} />, text: fmtSleep(sleep) },
              { icon: <Stethoscope size={14} color={palette.rose[600]} />, text: done.symptoms ? `${done.symptoms} symptom${done.symptoms === 1 ? '' : 's'}` : 'No symptoms' },
            ].map((s) => (
              <View key={s.text} style={styles.summaryChip}>
                {s.icon}
                <AppText variant="caption" color={palette.ink[800]} style={{ fontFamily: font.semibold }}>
                  {s.text}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/plan')} style={({ pressed }) => [styles.planLink, pressed && { opacity: 0.9 }]}>
          <View style={styles.planIcon}>
            <ListChecks size={18} color={palette.green[700]} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyBold">Your plan is updated</AppText>
            <AppText variant="caption" muted>
              Gentle suggestions based on today’s check-in
            </AppText>
          </View>
          <AppText variant="smallMedium" color={palette.green[700]}>
            Open
          </AppText>
        </Pressable>
        {mood === 'very_low' ? (
          <Disclaimer
            tone="lavender"
            style={{ marginTop: 14 }}
            text="Thanks for sharing. If you're struggling, consider reaching out to someone you trust or a mental-health professional. If you're in danger, contact local emergency services."
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      close
      title="Daily Check-in"
      eyebrow={formatDate(state.today, 'short')}
      footer={
        <View>
          <Button label={existing ? 'Update Check-in' : 'Save Check-in'} size="lg" full loading={saving} onPress={save} />
          <View style={styles.footNote}>
            <Timer size={13} color={palette.green[700]} />
            <AppText variant="caption" color={palette.green[700]}>
              Takes less than 30 seconds
            </AppText>
          </View>
        </View>
      }>
      {/* Mood faces hero */}
      <View style={styles.hero}>
        <LinearGradient colors={[palette.lavender[100], palette.rose[50], palette.green[50]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <AppText variant="overline" color={palette.lavender[700]} center>
          Mood
        </AppText>
        <AppText style={styles.heroTitle}>How are you feeling today?</AppText>
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
                <View style={[styles.mood, { width: face + 4, height: face + 4 }, !!mood && !on && { opacity: 0.55 }]}>
                  <MoodAvatar mood={m.key} size={on ? face + 4 : face} selected={on} selectedColor={palette.green[600]} />
                </View>
                <AppText variant="caption" color={on ? brandText : palette.ink[600]} style={{ fontFamily: on ? font.bold : font.medium, fontSize: 11 }} numberOfLines={1}>
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

      <Block icon={<Zap size={17} color={palette.peach[600]} />} tint={palette.peach[50]} title="Energy & stress">
        <View style={{ gap: 16, marginTop: 12 }}>
          <Slider label="Energy" value={energy} onChange={setEnergy} color={palette.peach[500]} lowLabel="Drained" highLabel="Energised" />
          <Slider label="Stress" value={stress} onChange={setStress} color={palette.lavender[500]} lowLabel="Calm" highLabel="Very stressed" />
        </View>
      </Block>

      <Block icon={<Moon size={17} color={palette.indigo[600]} />} tint={palette.indigo[50]} title="Sleep last night">
        <View style={{ marginTop: 12 }}>
          <Stepper label="Sleep last night" value={sleep} onChange={setSleep} step={0.25} min={0} max={14} format={fmtSleep} />
        </View>
      </Block>

      <Block icon={<Stethoscope size={17} color={palette.rose[600]} />} tint={palette.rose[50]} title="Symptoms">
        <View style={[styles.wrap, { marginTop: 12 }]}>
          <Chip
            label="None"
            selected={none}
            onPress={() => {
              setNone(!none);
              if (!none) setSymptoms([]);
            }}
          />
          {defs.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              tone="rose"
              selected={!none && symptoms.includes(s.id)}
              onPress={() => {
                setNone(false);
                setSymptoms((xs) => (xs.includes(s.id) ? xs.filter((x) => x !== s.id) : [...xs, s.id]));
              }}
            />
          ))}
          <Chip label="Custom" icon={<Plus size={14} color={palette.green[700]} />} onPress={() => router.push('/symptom-new')} style={styles.custom} />
        </View>
      </Block>
      {mood === 'very_low' ? (
        <Disclaimer
          tone="lavender"
          style={{ marginTop: 14 }}
          text="Thanks for sharing. If you're struggling, consider reaching out to someone you trust or a mental-health professional. If you're in danger, contact local emergency services."
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, overflow: 'hidden', paddingHorizontal: 12, paddingTop: 18, paddingBottom: 16, borderWidth: 1, borderColor: palette.lavender[100] },
  heroTitle: { fontFamily: font.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: colors.text, textAlign: 'center', marginTop: 4 },
  moods: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 },
  moodItem: { flex: 1, alignItems: 'center', gap: 6 },
  // the avatar draws its own white ring, shadow and (when selected) the green ring
  mood: { alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  blockTitle: { flex: 1, fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  custom: { borderStyle: 'dashed', borderColor: palette.green[400] },
  footNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 },
  success: { alignItems: 'center', marginTop: 12 },
  successArt: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  successWash: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: palette.green[50] },
  successDisc: { width: 92, height: 92, borderRadius: 46, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center', ...shadow.lift },
  successMood: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: colors.text },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: palette.green[50], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  planLink: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: colors.surface, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  planIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.green[50], alignItems: 'center', justifyContent: 'center' },
});
