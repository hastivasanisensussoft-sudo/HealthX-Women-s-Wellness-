/** Habits, goals & badges (SRS §33, §45, §52, §53, §65). Phase 2 modules — forest progress hero, 4-week consistency grid, per-habit streak strips, goal rings and a badge gallery. */
import { formatDate, goalProgress, habitDone, habitsDueOn, lastNDays, streak, type Habit, type WellnessGoal } from '@healthx/shared';
import { Check, Flame, Lock, Plus, Repeat, Target, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar, ProgressRing } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Chip, Segmented, Stepper, TextField } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { GroupHeader, HeroPanel, PageIntro, ON_DARK } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const METRICS: { key: WellnessGoal['metric']; label: string; unit: string; period: WellnessGoal['period']; def: number; step: number }[] = [
  { key: 'steps', label: 'Steps', unit: 'steps', period: 'daily', def: 8000, step: 500 },
  { key: 'water', label: 'Water', unit: 'ml', period: 'daily', def: 2000, step: 100 },
  { key: 'sleep', label: 'Sleep', unit: 'h', period: 'daily', def: 7.5, step: 0.5 },
  { key: 'workouts', label: 'Workouts', unit: 'sessions', period: 'weekly', def: 3, step: 1 },
  { key: 'checkins', label: 'Check-ins', unit: 'check-ins', period: 'weekly', def: 5, step: 1 },
  { key: 'mindful', label: 'Mindful minutes', unit: 'sessions', period: 'weekly', def: 4, step: 1 },
];
const GRID_TONES = [palette.ink[100], palette.green[200], palette.green[400], palette.green[600]];

export default function Habits() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<'habits' | 'goals' | 'badges'>('habits');
  const [goalOpen, setGoalOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [metric, setMetric] = useState(METRICS[0]);
  const [target, setTarget] = useState(METRICS[0].def);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitCat, setHabitCat] = useState<Habit['category']>('movement');
  const [err, setErr] = useState<string | null>(null);
  const due = habitsDueOn(state, state.today);
  const strip = lastNDays(state.today, 14);
  const doneCount = due.filter((h) => habitDone(state, h.id, state.today)).length;

  const habitStreak = useMemo(() => Object.fromEntries(state.habits.map((h) => [h.id, streak(state, (d) => habitDone(state, h.id, d))])), [state]);
  // 4-week consistency grid: share of the habits due each day that were done.
  const grid = useMemo(
    () =>
      lastNDays(state.today, 28).map((d) => {
        const list = habitsDueOn(state, d);
        const n = list.filter((h) => habitDone(state, h.id, d)).length;
        return { d, ratio: list.length ? n / list.length : -1 };
      }),
    [state],
  );
  const bestStreak = Math.max(0, ...Object.values(habitStreak).map(Number));

  const addGoal = () => {
    const titles: Record<string, string> = {
      steps: `Walk ${target.toLocaleString()} steps a day`,
      water: `Drink ${(target / 1000).toFixed(1)} L of water daily`,
      sleep: `Sleep ${target} hours a night`,
      workouts: `${target} workouts a week`,
      checkins: `Check in ${target} days a week`,
      mindful: `${target} mindful sessions a week`,
    };
    dispatch({ type: 'ADD_GOAL', goal: { title: titles[metric.key], metric: metric.key, target, unit: metric.unit, period: metric.period } });
    toast('Goal created');
    setGoalOpen(false);
  };

  const addHabit = () => {
    if (habitTitle.trim().length < 3) return setErr('Give your habit a short name (3+ characters).');
    dispatch({ type: 'ADD_HABIT', habit: { title: habitTitle.trim(), icon: habitCat === 'hydration' ? 'glass-water' : habitCat === 'sleep' ? 'moon' : habitCat === 'nutrition' ? 'apple' : habitCat === 'mindfulness' ? 'wind' : 'footprints', category: habitCat, days: [] } });
    toast('Habit added');
    setHabitTitle('');
    setErr(null);
    setHabitOpen(false);
  };

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      <PageIntro eyebrow="Small steps, every day" title="Habits & goals" />
      <Segmented value={tab} onChange={setTab} options={[{ key: 'habits', label: 'Habits' }, { key: 'goals', label: 'Goals' }, { key: 'badges', label: 'Badges' }]} />

      {tab === 'habits' ? (
        <>
          <HeroPanel style={{ marginTop: 16 }}>
            <View style={styles.heroTop}>
              <ProgressRing value={due.length ? doneCount / due.length : 0} size={84} stroke={9} color={palette.butter[400]} track="rgba(255,255,255,0.14)">
                <AppText style={styles.heroNum}>
                  {doneCount}/{due.length}
                </AppText>
              </ProgressRing>
              <View style={{ flex: 1 }}>
                <AppText variant="overline" color={ON_DARK.soft}>
                  Today
                </AppText>
                <AppText variant="title" color="#fff">
                  {doneCount} of {due.length} habits done
                </AppText>
                <View style={styles.flame}>
                  <Flame size={13} color={palette.peach[400]} />
                  <AppText variant="caption" color={ON_DARK.text}>
                    Best current streak: {bestStreak} day{bestStreak === 1 ? '' : 's'}
                  </AppText>
                </View>
              </View>
            </View>
            <AppText variant="overline" color={ON_DARK.soft} style={{ marginTop: 16, marginBottom: 8 }}>
              Last 4 weeks
            </AppText>
            <View style={styles.grid} accessible accessibilityLabel={`Consistency over the last 4 weeks: all habits done on ${grid.filter((g) => g.ratio === 1).length} of 28 days`}>
              {grid.map((g) => (
                <View
                  key={g.d}
                  style={[
                    styles.gridCell,
                    { backgroundColor: g.ratio < 0 ? 'rgba(255,255,255,0.06)' : g.ratio === 0 ? 'rgba(255,255,255,0.12)' : GRID_TONES[Math.min(3, Math.ceil(g.ratio * 3))] },
                    g.d === state.today && styles.gridToday,
                  ]}
                />
              ))}
            </View>
            <View style={styles.legend}>
              <AppText variant="caption" color={ON_DARK.soft}>
                Less
              </AppText>
              {GRID_TONES.slice(1).map((c) => (
                <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />
              ))}
              <AppText variant="caption" color={ON_DARK.soft}>
                All done
              </AppText>
            </View>
          </HeroPanel>

          <GroupHeader eyebrow={`${state.habits.length} habits`} title="Your habits" action="Add habit" onAction={() => setHabitOpen(true)} />
          {state.habits.length === 0 ? (
            <Card tone="mint">
              <EmptyState icon={Repeat} title="No habits yet" text="Start with one small thing you’d like to do most days." action="Add a habit" onAction={() => setHabitOpen(true)} />
            </Card>
          ) : null}
          {state.habits.map((h) => {
            const isDue = due.some((d) => d.id === h.id);
            const done = habitDone(state, h.id, state.today);
            return (
              <View key={h.id} style={styles.habit}>
                <View style={styles.habitTop}>
                  <Pressable
                    accessibilityRole="checkbox"
                    aria-checked={done} aria-disabled={!isDue}
                    accessibilityLabel={h.title}
                    disabled={!isDue}
                    onPress={() => dispatch({ type: 'TOGGLE_HABIT', habitId: h.id, date: state.today })}
                    style={[styles.check, done && styles.checkOn, !isDue && { opacity: 0.4 }]}>
                    {done ? <Check size={20} color="#fff" /> : <KeyIcon name={h.icon} size={19} color={palette.green[700]} />}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{h.title}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      {isDue ? <Flame size={13} color={palette.peach[500]} /> : null}
                      <AppText variant="caption" muted>
                        {isDue ? `${habitStreak[h.id] ?? 0}-day streak` : 'Not scheduled today'}
                      </AppText>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${h.title}`}
                    onPress={() => {
                      dispatch({ type: 'DELETE_HABIT', id: h.id });
                      toast('Habit removed', 'info');
                    }}
                    hitSlop={8}
                    style={styles.del}>
                    <Trash2 size={15} color={palette.ink[400]} />
                  </Pressable>
                </View>
                <View style={styles.strip} accessible accessibilityLabel={`Done on ${strip.filter((d) => habitDone(state, h.id, d)).length} of the last 14 days`}>
                  {strip.map((d) => {
                    const ok = habitDone(state, h.id, d);
                    return (
                      <View key={d} style={{ alignItems: 'center', gap: 3 }}>
                        <View style={[styles.sq, ok && styles.sqOn, d === state.today && styles.sqToday]} />
                        <AppText variant="caption" muted style={{ fontSize: 9, lineHeight: 11 }}>
                          {formatDate(d, 'weekday').charAt(0)}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </>
      ) : tab === 'goals' ? (
        <>
          <GroupHeader eyebrow="In progress" title="Active goals" action="New goal" onAction={() => setGoalOpen(true)} />
          {state.goals.filter((g) => g.status !== 'completed').length === 0 ? (
            <Card tone="mint">
              <EmptyState icon={Target} title="No active goals" text="Create a goal to track progress automatically." action="Create goal" onAction={() => setGoalOpen(true)} />
            </Card>
          ) : null}
          {state.goals
            .filter((g) => g.status !== 'completed')
            .map((g) => {
              const p = goalProgress(state, g);
              return (
                <View key={g.id} style={styles.goal}>
                  <ProgressRing value={p.pct} size={66} stroke={7} color={palette.green[600]} track={palette.green[100]}>
                    <AppText variant="smallMedium">{Math.round(p.pct * 100)}%</AppText>
                  </ProgressRing>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{g.title}</AppText>
                    <AppText variant="caption" muted>
                      {g.period === 'daily' ? 'Today' : 'This week'} · {p.label}
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Button
                        label="Mark complete"
                        size="sm"
                        variant="soft"
                        onPress={() => {
                          dispatch({ type: 'UPDATE_GOAL', id: g.id, patch: { status: 'completed' } });
                          toast('Goal completed 🎉');
                        }}
                      />
                      <Button label="Delete" size="sm" variant="ghost" onPress={() => dispatch({ type: 'DELETE_GOAL', id: g.id })} />
                    </View>
                  </View>
                </View>
              );
            })}
          <GroupHeader eyebrow="Celebrate" title="Completed" />
          {state.goals.filter((g) => g.status === 'completed').length === 0 ? (
            <AppText variant="small" muted>
              Completed goals will appear here.
            </AppText>
          ) : null}
          {state.goals
            .filter((g) => g.status === 'completed')
            .map((g) => (
              <Card key={g.id} tone="mint" style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.doneDot}>
                  <Check size={14} color="#fff" />
                </View>
                <AppText variant="bodyMedium" style={{ flex: 1 }}>
                  {g.title}
                </AppText>
                <Pill label="Done" tone="green" />
              </Card>
            ))}
        </>
      ) : (
        <>
          <AppText variant="small" muted style={{ marginTop: 14 }}>
            Badges celebrate everyday wellness habits — never reproductive or medical events.
          </AppText>
          <View style={styles.badges}>
            {state.badges.map((b) => {
              const earned = !!b.earnedAt;
              return (
                <View key={b.id} style={[styles.badge, earned && styles.badgeEarned]}>
                  <View style={[styles.badgeIcon, earned ? styles.medal : styles.medalLocked]}>
                    {earned ? <KeyIcon name={b.icon} size={26} color={palette.green[950]} /> : <Lock size={22} color={palette.ink[400]} />}
                  </View>
                  <AppText variant="h3" center style={{ marginTop: 10 }}>
                    {b.title}
                  </AppText>
                  <AppText variant="caption" muted center>
                    {b.description}
                  </AppText>
                  {earned ? (
                    <Pill label={`Earned ${formatDate(b.earnedAt!, 'short')}`} tone="butter" style={{ alignSelf: 'center', marginTop: 8 }} />
                  ) : (
                    <ProgressBar value={b.progress} height={6} style={{ marginTop: 10, alignSelf: 'stretch' }} color={palette.butter[500]} track={palette.ink[100]} />
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title="New goal" footer={<Button label="Create goal" full onPress={addGoal} />}>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
          <AppText variant="label">Target ({metric.period === 'daily' ? 'per day' : 'per week'})</AppText>
          <Stepper label="Target" value={target} onChange={setTarget} step={metric.step} min={metric.step} max={metric.key === 'steps' ? 30000 : metric.key === 'water' ? 4500 : 14} format={(v) => (metric.key === 'water' ? `${(v / 1000).toFixed(1)} L` : `${v} ${metric.key === 'sleep' ? 'h' : ''}`)} />
        </View>
      </Sheet>

      <Sheet visible={habitOpen} onClose={() => setHabitOpen(false)} title="New habit" footer={<Button label="Add habit" icon={Plus} full onPress={addHabit} />}>
        <View style={{ gap: 14 }}>
          <TextField label="Habit" value={habitTitle} onChangeText={setHabitTitle} placeholder="e.g. Morning stretch" error={err} maxLength={50} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['movement', 'hydration', 'mindfulness', 'nutrition', 'sleep'] as const).map((c) => (
              <Chip key={c} label={c[0].toUpperCase() + c.slice(1)} selected={habitCat === c} onPress={() => setHabitCat(c)} />
            ))}
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroNum: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 26, color: '#fff' },
  flame: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  gridCell: { width: '12.4%', aspectRatio: 1.6, borderRadius: 6 },
  gridToday: { borderWidth: 2, borderColor: palette.butter[400] },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-end' },
  legendCell: { width: 14, height: 10, borderRadius: 3 },
  habit: { marginBottom: 12, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  habitTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: palette.green[200], alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green[50] },
  checkOn: { backgroundColor: palette.green[600], borderColor: palette.green[600] },
  del: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  sq: { width: 17, height: 17, borderRadius: 5, backgroundColor: palette.ink[100] },
  sqOn: { backgroundColor: palette.green[500] },
  sqToday: { borderWidth: 2, borderColor: brandText },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, padding: 14, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  doneDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 14 },
  badge: { width: '48.3%', backgroundColor: colors.surface, borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft },
  badgeEarned: { backgroundColor: palette.butter[50], borderColor: palette.butter[100] },
  badgeIcon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  medal: { backgroundColor: palette.butter[400], borderWidth: 4, borderColor: palette.butter[100] },
  medalLocked: { backgroundColor: palette.ink[50], borderWidth: 2, borderStyle: 'dashed', borderColor: palette.ink[300] },
});
