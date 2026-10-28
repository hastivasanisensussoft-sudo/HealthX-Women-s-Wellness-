/** Goals (SRS §33, mockup M25): summary hero, active goals as progress rings, new goal, completed goals and a manage sheet. */
import { goalProgress, type WellnessGoal } from '@healthx/shared';
import { router } from 'expo-router';
import { Award, Check, ChevronRight, Pause, Play, Plus, Target, Trash2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Chip, Stepper } from '@/components/Inputs';
import { CheckRow } from '@/components/Kit';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { GroupHeader, PageIntro, TintIcon, type Tone } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const METRICS: { key: WellnessGoal['metric']; label: string; unit: string; period: WellnessGoal['period']; def: number; step: number; min: number; max: number; icon: string; tone: Tone }[] = [
  { key: 'steps', label: 'Steps', unit: 'steps', period: 'daily', def: 8000, step: 500, min: 1000, max: 30000, icon: 'footprints', tone: 'green' },
  { key: 'water', label: 'Water', unit: 'ml', period: 'daily', def: 2400, step: 100, min: 500, max: 6000, icon: 'glass-water', tone: 'sky' },
  { key: 'sleep', label: 'Sleep', unit: 'h', period: 'daily', def: 7.5, step: 0.5, min: 5, max: 10, icon: 'moon', tone: 'indigo' },
  { key: 'workouts', label: 'Workouts', unit: 'sessions', period: 'weekly', def: 3, step: 1, min: 1, max: 14, icon: 'dumbbell', tone: 'peach' },
  { key: 'checkins', label: 'Check-ins', unit: 'check-ins', period: 'weekly', def: 7, step: 1, min: 1, max: 7, icon: 'smile', tone: 'lavender' },
  { key: 'mindful', label: 'Mindful sessions', unit: 'sessions', period: 'weekly', def: 4, step: 1, min: 1, max: 14, icon: 'wind', tone: 'rose' },
];
const RING: Record<Tone, string> = { green: palette.green[600], sky: palette.sky[500], indigo: palette.indigo[500], peach: palette.peach[500], lavender: palette.lavender[500], rose: palette.rose[500], butter: palette.butter[500] };
const TRACK: Record<Tone, string> = { green: palette.green[100], sky: palette.sky[100], indigo: palette.indigo[100], peach: palette.peach[100], lavender: palette.lavender[100], rose: palette.rose[100], butter: palette.butter[100] };

const titleFor = (m: WellnessGoal['metric'], t: number) =>
  ({
    steps: `Walk ${t.toLocaleString()} steps a day`,
    water: `Drink ${(t / 1000).toFixed(1)} L daily`,
    sleep: `Sleep ${t} hours a night`,
    workouts: `${t} workouts a week`,
    checkins: t === 7 ? 'Check in every day' : `Check in ${t} days a week`,
    mindful: `${t} mindful sessions a week`,
  })[m];

const ART = {
  target: require('../../assets/images/goals/target.png'),
  plant: require('../../assets/images/goals/plant.png'),
  sprout: require('../../assets/images/goals/sprout.png'),
};

/** Average-progress ring: soft track, mint-to-green gradient progress, knob, % with a sprout below. */
function AvgRing({ value, size }: { value: number; size: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = size / 2;
  const B = size * 0.11;
  const R = c - B / 2 - 2;
  const frac = Math.max(0, Math.min(1, value));
  const pt = (deg: number) => ({ x: c + R * Math.cos((deg * Math.PI) / 180), y: c + R * Math.sin((deg * Math.PI) / 180) });
  const s = pt(-90);
  const e = pt(-90 + frac * 359.9);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7FE0C4" />
            <Stop offset="1" stopColor="#2FB463" />
          </SvgGradient>
        </Defs>
        <Circle cx={c} cy={c} r={R} fill="none" stroke="#D9F1E3" strokeWidth={B} />
        {frac > 0 ? <Path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${e.x} ${e.y}`} stroke={`url(#${id})`} strokeWidth={B} strokeLinecap="round" fill="none" /> : null}
        <Circle cx={c} cy={c} r={R - B / 2 - 2} fill="#FFFFFF" opacity={0.75} />
        <Circle cx={e.x} cy={e.y} r={B * 0.62} fill={palette.green[700]} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <AppText style={styles.sumNum}>{Math.round(frac * 100)}%</AppText>
        <Image source={ART.sprout} style={{ width: size * 0.22, height: size * 0.21 }} contentFit="contain" accessible={false} />
      </View>
    </View>
  );
}

export default function Goals() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [metric, setMetric] = useState(METRICS[0]);
  const [target, setTarget] = useState(METRICS[0].def);
  const [manage, setManage] = useState<WellnessGoal | null>(null);
  const active = state.goals.filter((g) => g.status !== 'completed');
  const completed = state.goals.filter((g) => g.status === 'completed');
  const meta = (m: WellnessGoal['metric']) => METRICS.find((x) => x.key === m);
  const avg = active.length ? active.reduce((a, g) => a + goalProgress(state, g).pct, 0) / active.length : 0;
  const { width: winW } = useWindowDimensions();
  const artW = Math.round(Math.min(240, Math.max(150, winW * 0.42)));
  const onTrack = active.filter((g) => goalProgress(state, g).pct >= 1).length;

  const create = () => {
    const title = titleFor(metric.key, target);
    if (state.goals.some((g) => g.status !== 'completed' && g.title === title)) return toast('You already have this goal', 'info');
    dispatch({ type: 'ADD_GOAL', goal: { title, metric: metric.key, target, unit: metric.unit, period: metric.period } });
    toast('Goal created');
    setNewOpen(false);
  };

  const update = (g: WellnessGoal, patch: Partial<WellnessGoal>, msg: string) => {
    dispatch({ type: 'UPDATE_GOAL', id: g.id, patch });
    toast(msg);
    setManage(null);
  };

  return (
    <Screen back>
      {/* header with the target illustration on the right */}
      <View>
        <Image source={ART.target} style={[styles.headerArt, { width: artW, height: artW * 0.8 }]} contentFit="contain" accessible={false} />
        <PageIntro eyebrow="Progress updates automatically" title="Goals" subtitle="Everyday habits you’re working towards." style={{ paddingRight: artW * 0.62, minHeight: artW * 0.86 }} />
      </View>

      <View style={styles.summary} accessible accessibilityLabel={`Average progress ${Math.round(avg * 100)}%. ${active.length} active, ${completed.length} done`}>
        <LinearGradient colors={['#F4FBF7', '#E8F7EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.summaryWave} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none">
            <Path d="M0 60 C60 44 120 52 180 46 C250 38 300 20 400 26 L400 80 L0 80 Z" fill="#D6F0DF" opacity={0.75} />
            <Path d="M0 72 C80 60 160 74 240 62 C300 52 350 50 400 56 L400 80 L0 80 Z" fill="#C3E9D1" opacity={0.6} />
          </Svg>
        </View>
        <Image source={ART.plant} style={styles.summaryPlant} contentFit="contain" accessible={false} />
        <AvgRing value={avg} size={94} />
        <View style={{ flex: 1, paddingRight: 34 }}>
          <AppText style={styles.sumEyebrow}>AVERAGE PROGRESS</AppText>
          <View style={styles.sumRow}>
            <AppText style={styles.sumTitle}>{active.length} active</AppText>
            <View style={styles.sumDot} />
            <AppText style={styles.sumTitle}>{completed.length} done</AppText>
          </View>
          <AppText style={styles.sumSub}>{onTrack ? `${onTrack} goal${onTrack === 1 ? '' : 's'} already met this period` : 'Every bit of progress counts'}</AppText>
        </View>
      </View>

      <GroupHeader eyebrow="In progress" title="Active goals" />
      {active.length === 0 ? (
        <Card tone="mint">
          <EmptyState icon={Target} title="No active goals" text="Create a goal and HealthX tracks your progress automatically from what you log." action="Create goal" onAction={() => setNewOpen(true)} />
        </Card>
      ) : (
        <View style={styles.grid}>
          {active.map((g) => {
            const p = goalProgress(state, g);
            const m = meta(g.metric);
            const tone = m?.tone ?? 'green';
            return (
              <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${g.title}, ${p.label}. Manage goal`} onPress={() => setManage(g)} style={({ pressed }) => [styles.goal, pressed && { opacity: 0.88 }, g.status === 'paused' && { opacity: 0.6 }]}>
                <ProgressRing value={p.pct} size={92} stroke={9} color={RING[tone]} track={TRACK[tone]}>
                  <KeyIcon name={m?.icon ?? 'target'} size={18} color={RING[tone]} />
                  <AppText variant="smallMedium" style={{ marginTop: 2 }}>
                    {Math.round(p.pct * 100)}%
                  </AppText>
                </ProgressRing>
                <AppText variant="bodyBold" center numberOfLines={2} style={{ marginTop: 10, fontSize: 14, lineHeight: 19 }}>
                  {g.title}
                </AppText>
                <AppText variant="caption" color={g.status === 'paused' ? colors.textMuted : palette.green[700]} center numberOfLines={1}>
                  {g.status === 'paused' ? 'Paused' : p.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      <Button label="New goal" icon={Plus} full style={{ marginTop: 14 }} onPress={() => setNewOpen(true)} />

      <GroupHeader eyebrow="Celebrate" title="Completed" />
      {completed.length ? (
        <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
          {completed.map((g, i) => (
            <CheckRow key={g.id} label={g.title} done right="Done" last={i === completed.length - 1} />
          ))}
        </Card>
      ) : (
        <AppText variant="small" muted>
          Completed goals will appear here. 🎉
        </AppText>
      )}

      <Pressable accessibilityRole="button" accessibilityLabel="Streaks and badges" onPress={() => router.push('/achievements' as never)} style={({ pressed }) => [styles.badges, pressed && { opacity: 0.92 }]}>
        <TintIcon icon={Award} tone="butter" size={42} solid />
        <View style={{ flex: 1 }}>
          <AppText variant="h3">See your streaks & badges</AppText>
          <AppText variant="caption" muted>
            {state.badges.filter((b) => b.earnedAt).length} of {state.badges.length} earned
          </AppText>
        </View>
        <ChevronRight size={18} color={palette.green[700]} />
      </Pressable>
      <AppText variant="caption" muted style={{ marginTop: 10 }}>
        Goals focus on everyday habits. Reproductive or medical outcomes aren’t available as goals.
      </AppText>

      <Sheet visible={newOpen} onClose={() => setNewOpen(false)} title="New goal" subtitle="Progress updates automatically from what you log." footer={<Button label="Create goal" full onPress={create} />}>
        <View style={{ gap: 14 }}>
          <View style={styles.wrap}>
            {METRICS.map((m) => (
              <Chip
                key={m.key}
                label={m.label}
                selected={metric.key === m.key}
                onPress={() => {
                  setMetric(m);
                  setTarget(m.def);
                }}
              />
            ))}
          </View>
          <AppText variant="label">{metric.period === 'daily' ? 'Daily target' : 'Weekly target'}</AppText>
          <Stepper label="Target" value={target} onChange={setTarget} step={metric.step} min={metric.min} max={metric.max} format={(v) => (metric.key === 'water' ? `${(v / 1000).toFixed(1)} L` : `${v.toLocaleString()} ${metric.unit}`)} />
          <Card tone="mint" padded={false} style={{ padding: 12 }}>
            <AppText variant="caption" color={palette.green[700]}>
              Preview
            </AppText>
            <AppText variant="bodyBold">{titleFor(metric.key, target)}</AppText>
          </Card>
        </View>
      </Sheet>

      <Sheet visible={!!manage} onClose={() => setManage(null)} title={manage?.title ?? ''} subtitle={manage ? goalProgress(state, manage).label : undefined}>
        {manage ? (
          <View style={{ gap: 10 }}>
            <Button label="Mark as completed" icon={Check} full onPress={() => update(manage, { status: 'completed' }, 'Goal completed — well done!')} />
            {manage.status === 'paused' ? (
              <Button label="Resume goal" icon={Play} variant="secondary" full onPress={() => update(manage, { status: 'active' }, 'Goal resumed')} />
            ) : (
              <Button label="Pause goal" icon={Pause} variant="secondary" full onPress={() => update(manage, { status: 'paused' }, 'Goal paused')} />
            )}
            <Button
              label="Delete goal"
              icon={Trash2}
              variant="ghost"
              full
              onPress={() => {
                dispatch({ type: 'DELETE_GOAL', id: manage.id });
                toast('Goal deleted', 'info');
                setManage(null);
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerArt: { position: 'absolute', right: -12, top: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, paddingVertical: 20, borderRadius: 28, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFFFFF', shadowColor: '#0D4336', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  summaryWave: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  summaryPlant: { position: 'absolute', right: 2, bottom: -4, width: 66, height: 122 },
  sumNum: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 26, color: '#13261E' },
  sumEyebrow: { fontFamily: font.monoMedium, fontSize: 10.5, letterSpacing: 1.6, color: palette.green[700] },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  sumTitle: { fontFamily: font.displayBold, fontSize: 21, lineHeight: 26, color: '#13261E' },
  sumDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3DBE7B' },
  sumSub: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: palette.ink[600], marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  goal: { width: '48.3%', alignItems: 'center', padding: 14, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, padding: 14, borderRadius: 22, backgroundColor: palette.butter[50], borderWidth: 1, borderColor: palette.butter[100] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
