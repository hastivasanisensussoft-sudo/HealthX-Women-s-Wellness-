/** Habits, goals & badges (SRS §33, §45, §52, §53, §65). Phase 2 modules — forest progress hero, 4-week consistency grid, per-habit streak strips, goal rings and a badge gallery. */
import { formatDate, goalProgress, habitDone, habitsDueOn, lastNDays, streak, type Habit, type WellnessGoal } from '@healthx/shared';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Check, ChevronLeft, ChevronRight, Flame, Leaf, Lock, Plus, Repeat, Target, Trash2 } from 'lucide-react-native';
import { useId, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar, ProgressRing } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Chip, Segmented, Stepper, TextField } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { GroupHeader, Leaf as LeafShape, PageIntro } from '@/components/b-kit';
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
const TARGET = require('../../assets/images/habits/target.png');
/** Calendar cell colour by level: 0 no data / not done, 1 less, 2 medium, 3 more, 4 all done. */
const LEVEL_BG = ['rgba(255,255,255,0.09)', '#C9F1DD', '#6CCB97', '#1E8A5A', '#0A5A3F'];
const LEGEND: [string, number][] = [['Not done', 0], ['Less', 1], ['Medium', 2], ['More', 3], ['All done', 4]];
const levelOf = (ratio: number) => (ratio <= 0 ? 0 : ratio >= 1 ? 4 : ratio < 0.4 ? 1 : ratio < 0.75 ? 2 : 3);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Glassy ring for the habits hero: done / total with "Done" below. */
function HabitRing({ done, total, size }: { done: number; total: number; size: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = size / 2;
  const B = size * 0.11;
  const R = c - B / 2 - size * 0.04;
  const frac = total ? Math.max(0, Math.min(1, done / total)) : 0;
  const pt = (deg: number) => ({ x: c + R * Math.cos((deg * Math.PI) / 180), y: c + R * Math.sin((deg * Math.PI) / 180) });
  const s = pt(-90);
  const e = pt(-90 + frac * 359.9);
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${done} of ${total} habits done`}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#CFF3DD" />
            <Stop offset="1" stopColor="#4FBF86" />
          </SvgGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c - 1} fill="#FFFFFF" opacity={0.06} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={R} fill="none" stroke="#4FBF86" strokeOpacity={0.35} strokeWidth={B} />
        {frac > 0 ? <Path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${e.x} ${e.y}`} stroke={`url(#${id})`} strokeWidth={B} strokeLinecap="round" fill="none" /> : null}
        <Circle cx={c} cy={c} r={R - B / 2 - 1} fill="#073F31" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <AppText style={styles.heroNum}>
          {done}/{total}
        </AppText>
        <AppText style={styles.heroDone}>Done</AppText>
      </View>
    </View>
  );
}

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
  // Month calendar (Sun-first, padded with the neighbouring months): share of the habits due each day that were done.
  const [monthOffset, setMonthOffset] = useState(0);
  const canPrev = monthOffset > -11;
  const cal = useMemo(() => {
    const [y, m] = state.today.split('-').map(Number);
    const first = Date.UTC(y, m - 1 + monthOffset, 1);
    const firstDate = new Date(first);
    const month = firstDate.getUTCMonth();
    const start = first - firstDate.getUTCDay() * 86400000;
    const lastDay = new Date(Date.UTC(firstDate.getUTCFullYear(), month + 1, 0)).getUTCDate();
    const weeks = Math.ceil((firstDate.getUTCDay() + lastDay) / 7);
    const cells = Array.from({ length: weeks * 7 }, (_, i) => {
      const d = iso(start + i * 86400000);
      const inMonth = new Date(start + i * 86400000).getUTCMonth() === month;
      const list = d <= state.today ? habitsDueOn(state, d) : [];
      const done = list.filter((h) => habitDone(state, h.id, d)).length;
      return { d, inMonth, level: list.length ? levelOf(done / list.length) : 0 };
    });
    const label = firstDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return { cells, label };
  }, [state, monthOffset]);
  const { width: winW } = useWindowDimensions();
  const artW = Math.round(Math.min(250, Math.max(160, winW * 0.42)));
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
      {/* header with the target illustration */}
      <View>
        <Image source={TARGET} style={[styles.headerArt, { width: artW, height: artW * 0.55 }]} contentFit="contain" accessible={false} />
        <PageIntro eyebrow="Small steps, every day" title="Habits & goals" style={{ paddingRight: artW * 0.62, minHeight: artW * 0.42 }} />
      </View>
      <Segmented
        solid
        value={tab}
        onChange={setTab}
        options={[
          { key: 'habits', label: 'Habits', icon: Leaf },
          { key: 'goals', label: 'Goals', icon: Target },
          { key: 'badges', label: 'Badges', icon: Award },
        ]}
      />

      {tab === 'habits' ? (
        <>
          <View style={styles.hero}>
            <LinearGradient colors={[palette.green[800], palette.green[900], palette.green[950]]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <LeafShape size={150} color="rgba(147,207,184,0.10)" vein={false} rotate={20} style={{ position: 'absolute', top: -40, right: -40 }} />
            <LeafShape size={110} color="rgba(147,207,184,0.08)" vein={false} rotate={200} style={{ position: 'absolute', bottom: -40, right: -30 }} />
            <View style={styles.heroTop}>
              <HabitRing done={doneCount} total={due.length} size={108} />
              <View style={{ flex: 1 }}>
                <AppText style={styles.heroEyebrow}>TODAY</AppText>
                <AppText style={styles.heroTitle}>
                  {doneCount} of {due.length} habits done
                </AppText>
                <View style={styles.flame}>
                  <Flame size={16} color="#F59A3C" />
                  <AppText style={styles.flameText}>
                    Best current streak: {bestStreak} day{bestStreak === 1 ? '' : 's'}
                  </AppText>
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.calHead}>
              <AppText style={styles.heroEyebrow}>CONSISTENCY</AppText>
              <View style={styles.monthNav}>
                <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={!canPrev} onPress={() => setMonthOffset((m) => m - 1)} style={({ pressed }) => [styles.navBtn, !canPrev && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}>
                  <ChevronLeft size={16} color="#FFFFFF" />
                </Pressable>
                <AppText style={styles.monthLabel}>{cal.label}</AppText>
                <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={monthOffset >= 0} onPress={() => setMonthOffset((m) => m + 1)} style={({ pressed }) => [styles.navBtn, monthOffset >= 0 && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}>
                  <ChevronRight size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
            <View style={styles.weekRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <AppText key={d} style={styles.weekDay}>
                  {d}
                </AppText>
              ))}
            </View>
            <View style={styles.cal} accessible accessibilityLabel={`${cal.label}: all habits done on ${cal.cells.filter((c) => c.inMonth && c.level === 4).length} days`}>
              {cal.cells.map((c) => (
                <View key={c.d} style={styles.calSlot}>
                  <View style={[styles.calCell, { backgroundColor: LEVEL_BG[c.level] }, c.level === 4 && styles.calAll, !c.inMonth && { opacity: 0.4 }, c.d === state.today && styles.calToday]}>
                    <AppText style={[styles.calNum, (c.level === 1 || c.level === 2) && { color: palette.green[900] }]}>{Number(c.d.slice(8))}</AppText>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              {LEGEND.map(([label, level]) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendCell, winW < 380 && styles.legendCellSm, { backgroundColor: LEVEL_BG[level] }, level === 4 && styles.calAll]} />
                  <AppText style={[styles.legendText, winW < 380 && { fontSize: 10 }]} numberOfLines={1}>
                    {label}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

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
  headerArt: { position: 'absolute', right: -14, top: -24 },
  hero: { marginTop: 16, borderRadius: 28, padding: 16, paddingVertical: 18, overflow: 'hidden', shadowColor: '#0D4336', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroNum: { fontFamily: font.displayBold, fontSize: 26, lineHeight: 30, color: '#fff' },
  heroDone: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 16, color: 'rgba(255,255,255,0.85)' },
  heroEyebrow: { fontFamily: font.monoMedium, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.78)' },
  heroTitle: { fontFamily: font.displayBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.3, color: '#FFFFFF', marginTop: 4 },
  flame: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  flameText: { fontFamily: font.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.88)', flexShrink: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 16 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontFamily: font.semibold, fontSize: 14, color: '#FFFFFF', minWidth: 98, textAlign: 'center' },
  weekRow: { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  weekDay: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: font.medium, fontSize: 12, color: 'rgba(255,255,255,0.82)' },
  cal: { flexDirection: 'row', flexWrap: 'wrap' },
  calSlot: { width: `${100 / 7}%`, padding: 2.5 },
  calCell: { height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  calAll: { borderColor: 'rgba(143,221,178,0.45)' },
  calToday: { borderWidth: 2, borderColor: '#F6C844' },
  calNum: { fontFamily: font.semibold, fontSize: 13, color: '#FFFFFF' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  legendCell: { width: 15, height: 15, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  legendCellSm: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontFamily: font.regular, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
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
