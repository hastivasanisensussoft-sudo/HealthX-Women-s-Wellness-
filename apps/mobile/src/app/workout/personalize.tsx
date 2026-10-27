/**
 * Personalised workout (SRS §27, §59 Workout Engine) — Premium, Phase 2. The shared rules-based builder
 * turns goal, level, time, kit and place into Warm-up → Main set → Core → Cool-down. No AI, and never
 * based on cycle phase or assumed hormonal state (§26).
 */
import { WORKOUT_CATEGORIES, buildWorkoutSession, type BlockKind, type BuilderGoal, type BuiltSession, type Workout, type WorkoutCategory } from '@healthx/shared';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, CircleCheck, Clock, Dumbbell, Flame, Gauge, Heart, MapPin, Play, Target, Wand2, Wind, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackendNote, Disclaimer, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Chip, Segmented } from '@/components/Inputs';
import { CheckRow } from '@/components/Kit';
import { PremiumGate, usePremium } from '@/components/PremiumGate';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GlassStat, GroupHeader, HScroll, HeroPanel, PageIntro, TintIcon, type Tone, ON_DARK } from '@/components/b-kit';
import { WorkoutCard, categoryName } from '@/components/b-workout';
import { simulate } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { track } from '@/lib/track';

/** Goal → library categories, used only to suggest similar library workouts. */
const GOAL_CATS: Record<BuilderGoal, WorkoutCategory[]> = {
  strength: ['strength', 'pilates'],
  energy: ['cardio', 'walking'],
  flexibility: ['yoga', 'mobility', 'stretching'],
  relax: ['meditation', 'stretching', 'yoga'],
};
const STEPS = ['Pick a goal', 'Level, time & kit', 'Get today’s plan'];
const BLOCK: Record<BlockKind, { icon: LucideIcon; tone: Tone }> = {
  warmup: { icon: Flame, tone: 'peach' },
  main: { icon: Dumbbell, tone: 'green' },
  core: { icon: Target, tone: 'rose' },
  cooldown: { icon: Wind, tone: 'sky' },
};
const SAFETY = 'General fitness guidance, not a medical prescription; never based on your cycle phase. Stop if anything hurts.';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Personalize() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const premium = usePremium();
  const [goal, setGoal] = useState<BuilderGoal>('strength');
  const [level, setLevel] = useState<Workout['level']>('beginner');
  const [duration, setDuration] = useState(20);
  const [equipment, setEquipment] = useState<Workout['equipment']>('none');
  const [location, setLocation] = useState<Workout['location']>('home');
  const [preferred, setPreferred] = useState<WorkoutCategory | null>(null);
  const [session, setSession] = useState<BuiltSession | null>(null);
  const [matches, setMatches] = useState<Workout[]>([]);
  /** null = overview; a number = the step being shown in "Start session". */
  const [step, setStep] = useState<number | null>(null);
  const [logged, setLogged] = useState(false);
  const [busy, setBusy] = useState(false);

  const build = async () => {
    setBusy(true);
    await simulate(null, 700);
    setSession(buildWorkoutSession({ goal, level, minutes: duration, equipment, location, preferred }));
    const cats = preferred ? [preferred, ...GOAL_CATS[goal]] : GOAL_CATS[goal];
    const scored = state.workouts
      .map((w) => {
        let s = 0;
        if (cats.includes(w.category)) s += 4 - cats.indexOf(w.category);
        if (w.level === level) s += 2;
        if (w.equipment === equipment || w.equipment === 'none') s += 2;
        if (w.location === location) s += 1;
        s -= Math.abs(w.durationMin - duration) / 10;
        return { w, s };
      })
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.w);
    setMatches(scored);
    setStep(null);
    setLogged(false);
    setBusy(false);
  };

  const steps = session ? session.blocks.flatMap((b) => b.items.map((it) => ({ ...it, block: b.label }))) : [];
  const n = steps.length;
  const cur = step !== null ? steps[Math.min(step, n - 1)] : null;

  const start = () => {
    setStep(0);
    track('workout_started', 'personalised');
  };

  const markDone = () => {
    if (!session || logged) return;
    dispatch({ type: 'LOG_WORKOUT', session: { title: session.title, category: session.category, durationMin: session.totalMin, date: state.today, status: 'completed' } });
    setLogged(true);
    setStep(null);
    toast('Workout completed — great job!', 'success');
  };

  const open = (w: Workout) => router.push({ pathname: '/workout/[id]', params: { id: w.id } });

  const inputs = (
    <Card style={{ marginTop: 16, gap: 18 }}>
      <Group icon={Target} tone="rose" label="Goal">
        {(['strength', 'energy', 'flexibility', 'relax'] as BuilderGoal[]).map((g) => (
          <Chip key={g} label={cap(g)} selected={goal === g} onPress={() => setGoal(g)} />
        ))}
      </Group>
      <View>
        <Label icon={Gauge} tone="green" label="Fitness level" />
        <Segmented value={level} onChange={setLevel} options={[{ key: 'beginner', label: 'Beginner' }, { key: 'intermediate', label: 'Intermediate' }, { key: 'advanced', label: 'Advanced' }]} />
      </View>
      <Group icon={Clock} tone="sky" label="Duration">
        {[10, 20, 30, 45].map((d) => (
          <Chip key={d} label={`${d} min`} selected={duration === d} onPress={() => setDuration(d)} />
        ))}
      </Group>
      <Group icon={Dumbbell} tone="peach" label="Equipment">
        {(['none', 'mat', 'band', 'dumbbells'] as const).map((e) => (
          <Chip key={e} label={e === 'none' ? 'None' : cap(e)} selected={equipment === e} onPress={() => setEquipment(e)} />
        ))}
      </Group>
      <Group icon={MapPin} tone="lavender" label="Location">
        {(['home', 'gym', 'outdoors'] as const).map((l) => (
          <Chip key={l} label={cap(l)} selected={location === l} onPress={() => setLocation(l)} />
        ))}
      </Group>
      <Group icon={Heart} tone="butter" label="Preferred exercise (optional)">
        {WORKOUT_CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} selected={preferred === c.key} onPress={() => setPreferred(preferred === c.key ? null : c.key)} />
        ))}
      </Group>
    </Card>
  );

  return (
    <Screen back right={<PhaseBadge phase={2} />} footer={premium ? <Button label="Build my workout" icon={Wand2} full loading={busy} onPress={build} /> : undefined}>
      <PageIntro eyebrow="Personalised · rules-based" title="Build my workout" subtitle="Tell us what you need today. We’ll build a session from simple rules and suggest similar workouts from the library." />

      <HeroPanel style={{ paddingVertical: 16 }}>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={styles.stepNum}>
                <AppText variant="caption" color={palette.green[950]} style={{ fontFamily: font.monoMedium }}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="caption" color={ON_DARK.text} center>
                {s}
              </AppText>
            </View>
          ))}
        </View>
      </HeroPanel>

      <PremiumGate
        feature="programs"
        preview={
          <>
            {inputs}
            <View style={{ height: 14 }} />
          </>
        }>
        {inputs}

        {session ? (
          <>
            <GroupHeader eyebrow="Built from your choices" title="Your session for today" />
            <HeroPanel>
              <AppText variant="overline" color={ON_DARK.soft}>
                {categoryName(session.category)} · {cap(level)} · {equipment === 'none' ? 'No equipment' : cap(equipment)} · {cap(location)}
              </AppText>
              <AppText variant="title" color="#fff" style={{ marginTop: 4 }}>
                {session.title}
              </AppText>
              <View style={styles.glassRow}>
                {session.blocks.map((b) => (
                  <GlassStat key={b.kind} label={b.label} value={`${b.minutes} min`} style={styles.glassCell} />
                ))}
              </View>
              <AppText variant="caption" color={ON_DARK.text} style={{ marginTop: 10 }}>
                {session.totalMin} minutes in total — the time you chose.
              </AppText>
            </HeroPanel>

            {logged ? (
              <Card tone="mint" style={{ alignItems: 'center', gap: 8, marginTop: 12 }}>
                <CircleCheck size={44} color={palette.green[700]} />
                <AppText variant="title">Session saved</AppText>
                <AppText variant="small" muted center>
                  {session.totalMin} min recorded. It now counts towards your weekly summary and goals.
                </AppText>
              </Card>
            ) : cur && step !== null ? (
              <>
                <Card tone="mint" style={{ marginTop: 12 }}>
                  <AppText variant="overline" color={palette.green[700]}>
                    Step {step + 1} of {n} · {cur.block}
                  </AppText>
                  <AppText variant="h2" style={{ marginTop: 4 }}>
                    {cur.name}
                  </AppText>
                  <AppText variant="smallMedium" color={palette.green[700]} style={{ marginTop: 2 }}>
                    {cur.prescription}
                  </AppText>
                  <AppText variant="small" muted style={{ marginTop: 2 }}>
                    {cur.cue}
                  </AppText>
                  <ProgressBar value={(step + 1) / n} style={{ marginTop: 14 }} />
                  <View style={styles.actions}>
                    <Button label="Back" icon={ChevronLeft} variant="secondary" size="sm" disabled={step === 0} onPress={() => setStep(step - 1)} />
                    {step >= n - 1 ? (
                      <Button label="Mark as done" icon={CircleCheck} size="sm" onPress={markDone} style={{ flex: 1 }} />
                    ) : (
                      <Button label="Next step" iconRight={ChevronRight} size="sm" onPress={() => setStep(step + 1)} style={{ flex: 1 }} />
                    )}
                  </View>
                </Card>
                <Card style={{ marginTop: 12 }}>
                  <AppText variant="overline" color={palette.green[700]}>
                    {n} steps
                  </AppText>
                  <AppText variant="h2" style={{ marginTop: 2, marginBottom: 6 }}>
                    Checklist
                  </AppText>
                  {steps.map((s, i) => (
                    <CheckRow key={`${s.block}-${s.name}`} label={s.name} sub={`${s.block} · ${s.prescription}`} done={i < step} current={i === step} onPress={() => setStep(i)} last={i === n - 1} />
                  ))}
                </Card>
                <View style={styles.actions}>
                  <Button label="Back to overview" variant="ghost" size="sm" onPress={() => setStep(null)} />
                  <Button label="Mark as done" icon={CircleCheck} variant="secondary" size="sm" onPress={markDone} style={{ flex: 1 }} />
                </View>
              </>
            ) : (
              <>
                {session.blocks.map((b) => (
                  <Card key={b.kind} style={{ marginTop: 12 }}>
                    <View style={styles.blockHead}>
                      <TintIcon icon={BLOCK[b.kind].icon} tone={BLOCK[b.kind].tone} size={38} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="h3">{b.label}</AppText>
                        <AppText variant="caption" muted>
                          {b.items.length ? `${b.items.length} move${b.items.length === 1 ? '' : 's'}` : 'Move freely at an easy pace'}
                        </AppText>
                      </View>
                      <View style={styles.minPill}>
                        <AppText variant="caption" color={brandText} style={{ fontFamily: font.semibold }}>
                          {b.minutes} min
                        </AppText>
                      </View>
                    </View>
                    {b.items.map((it, i) => (
                      <View key={it.name} style={[styles.item, i < b.items.length - 1 && styles.itemBorder]}>
                        <AppText variant="bodyMedium">{it.name}</AppText>
                        <AppText variant="smallMedium" color={palette.green[700]}>
                          {it.prescription}
                        </AppText>
                        <AppText variant="caption" muted>
                          {it.cue}
                        </AppText>
                      </View>
                    ))}
                  </Card>
                ))}
                <View style={styles.actions}>
                  <Button label="Start session" icon={Play} onPress={start} disabled={!n} style={{ flex: 1 }} />
                  <Button label="Mark as done" icon={CircleCheck} variant="secondary" onPress={markDone} style={{ flex: 1 }} />
                </View>
              </>
            )}

            <GroupHeader eyebrow="From the library" title="Similar workouts in the library" />
            {matches.length ? (
              <HScroll>
                {matches.map((w) => (
                  <WorkoutCard key={w.id} workout={w} onPress={() => open(w)} style={{ width: 172 }} />
                ))}
              </HScroll>
            ) : (
              <Card tone="mint">
                <EmptyState title="No match" text="Try a different goal, time or equipment." />
              </Card>
            )}
          </>
        ) : null}
      </PremiumGate>

      <Disclaimer style={{ marginTop: 16 }} text={SAFETY} />
      <BackendNote style={{ marginTop: 12 }} text="Sessions are built on this device with simple rules. The production Workout Engine (SRS §59) will be shared with other HealthX apps." />
    </Screen>
  );
}

function Label({ icon, tone, label }: { icon: LucideIcon; tone: Tone; label: string }) {
  return (
    <View style={styles.label}>
      <TintIcon icon={icon} tone={tone} size={30} />
      <AppText variant="h3">{label}</AppText>
    </View>
  );
}

function Group({ icon, tone, label, children }: { icon: LucideIcon; tone: Tone; label: string; children: ReactNode }) {
  return (
    <View>
      <Label icon={icon} tone={tone} label={label} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 8 },
  stepItem: { flex: 1, alignItems: 'center', gap: 6 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.butter[400], alignItems: 'center', justifyContent: 'center' },
  label: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  glassRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  glassCell: { flexBasis: '46%', flexGrow: 1 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  minPill: { backgroundColor: palette.green[50], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  item: { paddingVertical: 10, gap: 1 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
});
