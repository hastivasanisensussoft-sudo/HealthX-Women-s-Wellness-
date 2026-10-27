/** Personalised workout (SRS §27) — Phase 2 preview. Deterministic rules, no AI, no hormonal-state prescriptions (§26). */
import { WORKOUT_CATEGORIES, type Workout, type WorkoutCategory } from '@healthx/shared';
import { router } from 'expo-router';
import { Clock, Dumbbell, Gauge, Heart, MapPin, Sparkles, Target, Wand2, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/Feedback';
import { Chip, Segmented } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GlassTag, GroupHeader, HeroPanel, PageIntro, PhotoPanel, TintIcon, type Tone, ON_DARK } from '@/components/b-kit';
import { WorkoutCard, categoryName, workoutPhoto } from '@/components/b-workout';
import { simulate } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { font, palette } from '@/lib/theme';

type Goal = 'strength' | 'energy' | 'flexibility' | 'relax';
const GOAL_CATS: Record<Goal, WorkoutCategory[]> = {
  strength: ['strength', 'pilates'],
  energy: ['cardio', 'walking'],
  flexibility: ['yoga', 'mobility', 'stretching'],
  relax: ['meditation', 'stretching', 'yoga'],
};
const STEPS = ['Pick a goal', 'Level, time & kit', 'Get today’s plan'];

export default function Personalize() {
  const { state } = useStore();
  const [goal, setGoal] = useState<Goal>('strength');
  const [level, setLevel] = useState<Workout['level']>('beginner');
  const [duration, setDuration] = useState(20);
  const [equipment, setEquipment] = useState<Workout['equipment']>('none');
  const [location, setLocation] = useState<Workout['location']>('home');
  const [preferred, setPreferred] = useState<WorkoutCategory | null>(null);
  const [result, setResult] = useState<Workout[] | null>(null);
  const [busy, setBusy] = useState(false);

  const build = async () => {
    setBusy(true);
    await simulate(null, 700);
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
    setResult(scored);
    setBusy(false);
  };

  const open = (w: Workout) => router.push({ pathname: '/workout/[id]', params: { id: w.id } });
  const best = result?.[0];

  return (
    <Screen back right={<PhaseBadge phase={2} />} footer={<Button label="Build my workout" icon={Wand2} full loading={busy} onPress={build} />}>
      <PageIntro eyebrow="Personalised · rules-based" title="Build my workout" subtitle="Tell us what you need today. We’ll match workouts from the library using simple rules." />

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

      <Card style={{ marginTop: 16, gap: 18 }}>
        <Group icon={Target} tone="rose" label="Goal">
          {(['strength', 'energy', 'flexibility', 'relax'] as Goal[]).map((g) => (
            <Chip key={g} label={g[0].toUpperCase() + g.slice(1)} selected={goal === g} onPress={() => setGoal(g)} />
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
            <Chip key={e} label={e === 'none' ? 'None' : e[0].toUpperCase() + e.slice(1)} selected={equipment === e} onPress={() => setEquipment(e)} />
          ))}
        </Group>
        <Group icon={MapPin} tone="lavender" label="Location">
          {(['home', 'gym', 'outdoors'] as const).map((l) => (
            <Chip key={l} label={l[0].toUpperCase() + l.slice(1)} selected={location === l} onPress={() => setLocation(l)} />
          ))}
        </Group>
        <Group icon={Heart} tone="butter" label="Preferred exercise (optional)">
          {WORKOUT_CATEGORIES.map((c) => (
            <Chip key={c.key} label={c.label} selected={preferred === c.key} onPress={() => setPreferred(preferred === c.key ? null : c.key)} />
          ))}
        </Group>
      </Card>

      {result ? (
        <>
          <GroupHeader eyebrow="Built from your choices" title="Your plan for today" />
          {best ? (
            <>
              <PhotoPanel photo={workoutPhoto(best)} height={210} onPress={() => open(best)} accessibilityLabel={`Best match: ${best.title}, ${best.durationMin} minutes`}>
                <GlassTag label="Best match" icon={<Sparkles size={12} color={palette.green[800]} />} />
                <AppText variant="title" color="#fff" style={{ marginTop: 'auto' }}>
                  {best.title}
                </AppText>
                <AppText variant="small" color={ON_DARK.text}>
                  {categoryName(best.category)} · {best.durationMin} min · {best.level} · {best.equipment === 'none' ? 'no equipment' : best.equipment}
                </AppText>
              </PhotoPanel>
              {result.length > 1 ? (
                <>
                  <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 16, marginBottom: 10 }}>
                    Alternatives
                  </AppText>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {result.slice(1).map((w) => (
                      <WorkoutCard key={w.id} workout={w} onPress={() => open(w)} style={{ flex: 1 }} />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <Card tone="mint">
              <EmptyState title="No match" text="Try a different goal, time or equipment." />
            </Card>
          )}
        </>
      ) : null}
      <BackendNote style={{ marginTop: 16 }} text="Personalised programs are a Premium Phase 2 feature. The production Workout Engine (SRS §59) will be shared with other HealthX apps." />
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
});
