/**
 * Life-stage modes (Phase 3 preview): Pregnancy (§22–§23), Perimenopause (§24), Menopause (§25).
 * - Pregnancy week: counted from the first day of the last period saved to the account (D-21, decided
 *   2026-10-27); due date = that date + 40 weeks, shown as an estimate. Appointments are dated reminders.
 * - Perimenopause / menopause dashboard: share of target over the last 7 days (D-36, decided 2026-10-27).
 * - Weight history and questions for a provider stay on this phone (the API can't store them yet).
 */
import {
  COPY,
  activeMinOn,
  addDays,
  dailySymptomCounts,
  formatClock,
  formatDate,
  lastPeriodStartOf,
  pregnancyEstimate,
  sleepHoursOn,
  stageDashboard,
  waterOn,
  type ISODate,
  type LifeStageMode,
  type VideoKey,
} from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Baby, CalendarClock, CalendarDays, Check, Droplets, Dumbbell, Flame, HeartPulse, MessageSquareText, Moon, Plus, Salad, Scale, Smile, Thermometer, Trash2, Zap, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackendNote, Disclaimer, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { BarChart, LineChart, ProgressBar } from '@/components/Charts';
import { DateSheet } from '@/components/DateSheet';
import { EmptyState } from '@/components/Feedback';
import { QuickHelpCard } from '@/components/LibraryCards';
import { Chip, TextField } from '@/components/Inputs';
import { Sheet } from '@/components/Sheet';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { VideoCard } from '@/components/Video';
import { DEVICE_ONLY_NOTE } from '@/lib/deviceData';
import { useStore } from '@/lib/store';
import { useDeviceData } from '@/lib/useDeviceData';
import { brandText, colors, font, onDark, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/** Menopause routine ideas — added as the person's own habits, so they sync and count in Habits. */
const ROUTINE = [
  { title: 'Strength training · 20 min', icon: 'dumbbell', category: 'movement' as const },
  { title: 'Balance practice · 5 min', icon: 'person-standing', category: 'movement' as const },
  { title: 'Calcium-rich foods', icon: 'salad', category: 'nutrition' as const },
  { title: 'Wind-down routine', icon: 'moon', category: 'sleep' as const },
];
const MAX_QUESTIONS = 12;
const MAX_WEIGHTS = 52;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
type WeightEntry = { date: ISODate; kg: number };

const META = {
  pregnancy: { title: 'Pregnancy wellness', photo: 'pregnant-woman' as const, tagline: 'Week-by-week education, gentle activity and reminders.', videos: ['breathing', 'walk-outdoors', 'hydration'] as VideoKey[] },
  perimenopause: { title: 'Perimenopause', photo: 'mature-woman' as const, tagline: 'Notice cycle changes, hot flashes, sleep and mood.', videos: ['breathing', 'sleep-winddown', 'yoga-flow'] as VideoKey[] },
  menopause: { title: 'Menopause', photo: 'senior-woman-active' as const, tagline: 'Strength, sleep and bone-health education.', videos: ['strength', 'walk-outdoors', 'healthy-cooking'] as VideoKey[] },
};

export default function LifeStageScreen() {
  const { mode } = useLocalSearchParams<{ mode: Exclude<LifeStageMode, 'cycle'> }>();
  const { state, dispatch } = useStore();
  const toast = useToast();
  const meta = META[mode as keyof typeof META];
  const active = state.profile.mode === mode;
  const [question, setQuestion] = useState('');
  const questionsStore = useDeviceData<string[]>(mode === 'pregnancy' ? 'provider-questions' : 'menopause-questions', []);
  const questions = questionsStore.value;
  const weights = useDeviceData<WeightEntry[]>('weights', []);
  const [weightText, setWeightText] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [appt, setAppt] = useState<{ title: string; date: ISODate | null; time: string }>({ title: 'Prenatal check-up', date: null, time: '10:30' });
  const [apptDateOpen, setApptDateOpen] = useState(false);
  const [apptError, setApptError] = useState<string | null>(null);
  const imperial = state.profile.units === 'imperial';

  if (!meta) {
    return (
      <Screen back title="Life stage">
        <EmptyState title="Unknown mode" action="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const article = (id: string) => state.articles.find((a) => a.id === id && a.status === 'published');
  const saveToggle = (id: string) => {
    const saved = state.bookmarks.includes(id);
    dispatch({ type: 'TOGGLE_BOOKMARK', articleId: id });
    toast(saved ? 'Removed from favorites' : 'Added to favorites');
  };
  const sleepLast = sleepHoursOn(state, state.today) ?? sleepHoursOn(state, addDays(state.today, -1));
  const preg = pregnancyEstimate(state);
  const trimester = preg ? (preg.trimester === 1 ? 'First trimester' : preg.trimester === 2 ? 'Second trimester' : 'Third trimester') : 'Pregnancy';
  const dash = stageDashboard(state);
  const flashDays = dailySymptomCounts(state, ['hot_flash', 'night_sweats'], 7);
  const allSymptomDays = dailySymptomCounts(state, state.symptomDefs.map((d) => d.id), 7);
  const appointments = state.reminders.filter((r) => r.type === 'appointment' && r.date).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const upcoming = appointments.filter((r) => (r.date as string) >= state.today);
  const toDisplayWeight = (kg: number) => (imperial ? Math.round(kg * 2.20462 * 10) / 10 : kg);
  const unit = imperial ? 'lb' : 'kg';
  const weekSymptoms = Object.entries(
    state.symptomLogs
      .filter((l) => l.date > addDays(state.today, -7))
      .reduce<Record<string, number>>((acc, l) => {
        const label = state.symptomDefs.find((d) => d.id === l.symptomId)?.label ?? 'Other';
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const pregArticle = article('a_pregnancy_wellness');
  const pregNutrition = article('a_pregnancy_nutrition');
  const midlifeNutrition = article('a_menopause_nutrition');
  const sitali = article('q_sitali');
  const bones = article('a_menopause_bones');

  const activate = () => {
    dispatch({ type: 'SET_MODE', mode: mode as LifeStageMode });
    toast(`${meta.title} mode on (preview)`);
    if (mode !== 'pregnancy') return;
    // Entering pregnancy mode saves the date the week is counted from (D-21): the newest known period
    // start, which the person can then correct. No date known → ask for it.
    const start = lastPeriodStartOf(state);
    if (!start) setDateOpen(true);
    else if (start !== state.cycleProfile.lastPeriodStart) dispatch({ type: 'UPDATE_CYCLE_PROFILE', patch: { lastPeriodStart: start } });
  };
  const addQuestion = () => {
    const q = question.trim();
    if (q.length < 4) return;
    if (questions.length >= MAX_QUESTIONS) return toast(`You can keep up to ${MAX_QUESTIONS} questions — remove one first.`, 'error');
    questionsStore.set((xs) => [...xs, q]);
    setQuestion('');
    toast('Question saved on this phone');
  };

  const questionsCard = (
    <Card style={{ gap: 10 }}>
      {questions.length === 0 ? (
        <AppText variant="small" muted>
          {mode === 'pregnancy' ? 'For example: “Which activities suit me right now?”' : 'For example: “Which of my symptoms should I mention?”'}
        </AppText>
      ) : null}
      {questions.map((q, i) => (
        <View key={`${i}-${q}`} style={styles.question}>
          <View style={styles.qIcon}>
            <MessageSquareText size={14} color={palette.lavender[600]} />
          </View>
          <AppText variant="small" style={{ flex: 1 }}>
            {q}
          </AppText>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove question: ${q}`} hitSlop={8} onPress={() => questionsStore.set((xs) => xs.filter((_, j) => j !== i))}>
            <Trash2 size={16} color={colors.textSubtle} />
          </Pressable>
        </View>
      ))}
      <TextField label="Add a question" value={question} onChangeText={setQuestion} placeholder="Type your question" maxLength={120} />
      <Button label="Add question" size="sm" variant="soft" onPress={addQuestion} style={{ alignSelf: 'flex-start' }} />
      <AppText variant="caption" muted>
        {DEVICE_ONLY_NOTE}
      </AppText>
    </Card>
  );

  const addWeight = () => {
    const n = Number(weightText.replace(',', '.'));
    const kg = imperial ? n / 2.20462 : n;
    if (!Number.isFinite(kg) || kg < 30 || kg > 250) return toast(`Enter a weight between ${imperial ? '66 and 551 lb' : '30 and 250 kg'}.`, 'error');
    const rounded = Math.round(kg * 10) / 10;
    weights.set((xs) => [...xs.filter((w) => w.date !== state.today), { date: state.today, kg: rounded }].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_WEIGHTS));
    dispatch({ type: 'UPDATE_PROFILE', patch: { weightKg: rounded } });
    setWeightText('');
    toast('Weight saved');
  };

  const weightCard = (
    <Card style={{ gap: 12 }}>
      {weights.value.length >= 2 ? (
        <LineChart data={weights.value.slice(-12).map((w) => ({ label: formatDate(w.date, 'short'), value: toDisplayWeight(w.kg) }))} color={palette.green[500]} height={140} />
      ) : (
        <AppText variant="small" muted>
          Log your weight now and then to see a trend. Latest in your profile: {state.profile.weightKg ? `${toDisplayWeight(state.profile.weightKg)} ${unit}` : 'not set'}.
        </AppText>
      )}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <TextField label={`Today’s weight (${unit})`} value={weightText} onChangeText={setWeightText} keyboardType="decimal-pad" placeholder={imperial ? '140' : '64.5'} />
        </View>
        <Button label="Save" icon={Scale} size="md" variant="soft" onPress={addWeight} />
      </View>
      <AppText variant="caption" muted>
        Your latest weight also updates your profile. The history is {DEVICE_ONLY_NOTE.charAt(0).toLowerCase() + DEVICE_ONLY_NOTE.slice(1)} Weight is one of many wellness signals — not a measure of health on its own.
      </AppText>
    </Card>
  );

  const saveAppointment = () => {
    const title = appt.title.trim();
    if (title.length < 2) return setApptError('Give the appointment a name.');
    if (!appt.date || appt.date < state.today) return setApptError('Choose today or a future date.');
    if (!TIME.test(appt.time)) return setApptError('Use a time like 09:30.');
    dispatch({ type: 'ADD_REMINDER', reminder: { title, type: 'appointment', time: appt.time, date: appt.date, enabled: true } });
    setApptOpen(false);
    setApptError(null);
    setAppt({ title: 'Prenatal check-up', date: null, time: '10:30' });
    toast('Appointment saved — we’ll remind you on the day');
  };

  const routineHabit = (title: string) => state.habits.find((h) => h.title === title);
  const habitDoneToday = (id: string) => state.habitCompletions.some((c) => c.habitId === id && c.date === state.today);

  return (
    <Screen
      back
      title={meta.title}
      eyebrow="Life stage"
      right={<PhaseBadge phase={3} />}
      footer={
        active ? (
          <Button
            label="Switch back to cycle tracking"
            variant="secondary"
            size="lg"
            full
            onPress={() => {
              dispatch({ type: 'SET_MODE', mode: 'cycle' });
              toast(mode === 'pregnancy' ? 'Cycle tracking resumed — log your next period when it starts so estimates can restart.' : 'Cycle tracking mode');
            }}
          />
        ) : (
          <Button label={`Use ${meta.title} mode`} size="lg" full onPress={activate} />
        )
      }>
      <Photo photo={meta.photo} style={styles.hero} radius={30} position="top">
        <LinearGradient colors={['rgba(8,45,36,0)', 'rgba(8,45,36,0.2)', 'rgba(8,45,36,0.86)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroText}>
          {active ? (
            <View style={styles.activeChip}>
              <Check size={12} color={brandText} />
              <AppText variant="caption" color={brandText} style={{ fontFamily: font.semibold }}>
                Active mode
              </AppText>
            </View>
          ) : null}
          <AppText style={styles.heroTitle}>{meta.title}</AppText>
          <AppText variant="small" color={onDark.green[100]}>
            {meta.tagline}
          </AppText>
        </View>
      </Photo>
      <Disclaimer tone="lavender" style={{ marginTop: 14 }} text="Phase 3 preview. Final content and features need medical review before launch." />

      {mode === 'pregnancy' ? (
        <>
          <Disclaimer tone="rose" style={{ marginTop: 10 }} text={COPY.pregnancy} />
          <SectionHeader eyebrow={trimester} title="Pregnancy week" />
          <Card tone="mint" style={{ alignItems: 'center', gap: 10 }}>
            <View style={styles.babyDisc}>
              <Baby size={28} color={palette.green[700]} />
            </View>
            {preg ? (
              <>
                <AppText style={styles.weekBig}>
                  Week {preg.weeks}
                  <AppText variant="h3" muted>
                    {' '}
                    + {preg.days} day{preg.days === 1 ? '' : 's'}*
                  </AppText>
                </AppText>
                <ProgressBar value={Math.min(1, preg.weeks / 40)} color={palette.green[600]} track={colors.surface} height={8} style={{ alignSelf: 'stretch' }} />
                <AppText variant="bodyMedium" center>
                  Estimated due date around {formatDate(preg.dueDate, 'long')}*
                </AppText>
                <AppText variant="caption" muted center>
                  Counted from the first day of your last period ({formatDate(preg.lastPeriodStart, 'long')}). {COPY.estimate} Your care provider confirms your dates.
                </AppText>
                {preg.outOfRange ? (
                  <Disclaimer tone="lavender" text="That date is more than 42 weeks ago — please update it, or switch back to cycle tracking." />
                ) : null}
              </>
            ) : (
              <AppText variant="small" muted center>
                Add the first day of your last period to see your estimated week and due date.
              </AppText>
            )}
            <Button label={preg ? 'Change last period date' : 'Add last period date'} icon={CalendarDays} size="sm" variant="soft" onPress={() => setDateOpen(true)} />
          </Card>
          {active ? <Disclaimer style={{ marginTop: 10 }} text="Cycle predictions and period reminders are paused while pregnancy mode is on." /> : null}
          {pregArticle ? (
            <>
              <SectionHeader eyebrow="Read" title="This week" />
              <QuickHelpCard article={pregArticle} saved={state.bookmarks.includes(pregArticle.id)} onToggleSave={() => saveToggle(pregArticle.id)} />
              {pregNutrition ? (
                <View style={{ marginTop: 10 }}>
                  <QuickHelpCard article={pregNutrition} saved={state.bookmarks.includes(pregNutrition.id)} onToggleSave={() => saveToggle(pregNutrition.id)} />
                </View>
              ) : null}
            </>
          ) : null}
          <SectionHeader eyebrow="Today" title="Wellness today" />
          <View style={styles.grid}>
            <Tile tone="sky" icon={Droplets} title={`${(waterOn(state, state.today) / 1000).toFixed(1)} L water`} text="Sip regularly through the day" onPress={() => router.push('/hydration')} />
            <Tile tone="green" icon={Dumbbell} title={`${activeMinOn(state, state.today)} min active`} text="Gentle activity, as agreed with your care team" />
            <Tile tone="indigo" icon={Moon} title={sleepLast !== null ? `${Math.floor(sleepLast)}h ${Math.round((sleepLast % 1) * 60)}m sleep` : 'Rest'} text="Notice how you sleep" onPress={() => router.push('/sleep')} />
            <Tile tone="butter" icon={Salad} title="Nutrition education" text="Balanced, regular meals" onPress={() => router.push({ pathname: '/learn/[id]', params: { id: 'a_pregnancy_nutrition' } })} />
          </View>
          <SectionHeader eyebrow="Reminders" title="Appointments" action="Add" onAction={() => setApptOpen(true)} />
          <Card style={{ gap: 12 }}>
            {upcoming.length === 0 ? (
              <AppText variant="small" muted>
                No upcoming appointments. Add one and the phone will remind you on the day.
              </AppText>
            ) : null}
            {upcoming.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.qIcon, { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.green[50] }]}>
                  <CalendarClock size={18} color={palette.green[700]} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMedium">{r.title}</AppText>
                  <AppText variant="caption" muted>
                    {formatDate(r.date as ISODate, 'long')} · {formatClock(r.time)}
                    {r.enabled ? '' : ' · reminder off'}
                  </AppText>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete appointment ${r.title}`} hitSlop={8} onPress={() => dispatch({ type: 'DELETE_REMINDER', id: r.id })}>
                  <Trash2 size={16} color={colors.textSubtle} />
                </Pressable>
              </View>
            ))}
            <Button label="Add appointment" icon={Plus} size="sm" variant="soft" onPress={() => setApptOpen(true)} style={{ alignSelf: 'flex-start' }} />
          </Card>
          <SectionHeader eyebrow="Bring to your visit" title="Questions for my healthcare provider" />
          {questionsCard}
          <View style={styles.emergency} accessibilityRole="alert">
            <View style={styles.emergencyIcon}>
              <HeartPulse size={20} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="h3" color={colors.danger}>
                Worrying symptoms?
              </AppText>
              <AppText variant="small" color={palette.ink[800]} style={{ marginTop: 4 }}>
                {COPY.emergency} Contact your prenatal care provider for anything that concerns you.
              </AppText>
            </View>
          </View>
        </>
      ) : (
        <>
          <SectionHeader eyebrow="Your last 7 days" title={`${meta.title} wellness`} />
          <Card style={{ gap: 14 }}>
            {[
              { label: 'Sleep', m: dash.sleep, c: palette.indigo[400], icon: <Moon size={16} color={palette.indigo[500]} />, bg: palette.indigo[50] },
              { label: 'Energy', m: dash.energy, c: palette.peach[400], icon: <Zap size={16} color={palette.peach[500]} />, bg: palette.peach[50] },
              { label: 'Mood', m: dash.mood, c: palette.lavender[400], icon: <Smile size={16} color={palette.lavender[500]} />, bg: palette.lavender[50] },
              { label: 'Activity', m: dash.activity, c: palette.green[500], icon: <Dumbbell size={16} color={palette.green[600]} />, bg: palette.green[50] },
            ].map((r) => (
              <View key={r.label}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.qIcon, { backgroundColor: r.bg }]}>{r.icon}</View>
                  <AppText variant="bodyMedium" style={{ flex: 1 }}>
                    {r.label}
                  </AppText>
                  <AppText style={styles.pct}>{r.m.pct === null ? '—' : `${r.m.pct}%`}</AppText>
                </View>
                <ProgressBar value={(r.m.pct ?? 0) / 100} color={r.c} track={palette.ink[100]} height={8} style={{ marginTop: 8 }} />
                <AppText variant="caption" muted style={{ marginTop: 4 }}>
                  {r.m.basis}
                </AppText>
              </View>
            ))}
            <AppText variant="caption" muted>
              Share of your own targets over the last 7 days, from what you logged. A wellness view, not a medical score — days with nothing logged are left out.
            </AppText>
          </Card>
          <SectionHeader eyebrow="Last 7 days" title={mode === 'perimenopause' ? 'Hot flashes & night sweats' : 'Symptoms this week'} />
          <Card>
            <BarChart
              data={(mode === 'perimenopause' ? flashDays : allSymptomDays).map((d) => ({ label: formatDate(d.date, 'weekday'), value: d.count }))}
              color={palette.peach[400]}
              showValues
              height={140}
            />
            {mode === 'perimenopause' ? (
              <AppText variant="caption" muted style={{ marginTop: 8 }}>
                This week: {flashDays.reduce((a, d) => a + d.bySymptom.hot_flash, 0)} hot flashes · {flashDays.reduce((a, d) => a + d.bySymptom.night_sweats, 0)} night sweats logged.
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button
                label="Log hot flash"
                icon={Thermometer}
                size="sm"
                variant="soft"
                style={{ flex: 1 }}
                onPress={() => {
                  dispatch({ type: 'LOG_SYMPTOMS', date: state.today, entries: [{ symptomId: 'hot_flash', severity: 'mild' }] });
                  toast('Hot flash logged');
                }}
              />
              <Button
                label="Night sweats"
                icon={Flame}
                size="sm"
                variant="soft"
                style={{ flex: 1 }}
                onPress={() => {
                  dispatch({ type: 'LOG_SYMPTOMS', date: state.today, entries: [{ symptomId: 'night_sweats', severity: 'mild' }] });
                  toast('Night sweats logged');
                }}
              />
            </View>
          </Card>
          {mode === 'perimenopause' && sitali ? (
            <>
              <SectionHeader eyebrow="Cool down" title="Quick Help" />
              <QuickHelpCard article={sitali} saved={state.bookmarks.includes(sitali.id)} onToggleSave={() => saveToggle(sitali.id)} />
            </>
          ) : null}
          <SectionHeader eyebrow="Track over time" title="Weight" />
          {weightCard}
          {mode === 'menopause' ? (
            <>
              <SectionHeader eyebrow="Daily habits" title="Today’s routine" />
              <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
                {ROUTINE.map((r, i) => {
                  const habit = routineHabit(r.title);
                  const done = !!habit && habitDoneToday(habit.id);
                  return (
                    <View key={r.title} style={[styles.check, i < ROUTINE.length - 1 && styles.border]}>
                      {habit ? (
                        <Pressable
                          accessibilityRole="checkbox"
                          aria-checked={done}
                          accessibilityLabel={r.title}
                          onPress={() => dispatch({ type: 'TOGGLE_HABIT', habitId: habit.id, date: state.today })}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.dot, done && styles.dotOn]}>{done ? <Check size={13} color="#fff" strokeWidth={3} /> : null}</View>
                          <AppText variant="body" style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }} muted={done}>
                            {r.title}
                          </AppText>
                        </Pressable>
                      ) : (
                        <>
                          <AppText variant="body" style={{ flex: 1 }}>
                            {r.title}
                          </AppText>
                          <Chip label="Add to my habits" onPress={() => {
                            dispatch({ type: 'ADD_HABIT', habit: { title: r.title, icon: r.icon, category: r.category, days: [] } });
                            toast('Added to your habits');
                          }} />
                        </>
                      )}
                    </View>
                  );
                })}
              </Card>
              <AppText variant="caption" muted style={{ marginTop: 6 }}>
                {ROUTINE.filter((r) => {
                  const h = routineHabit(r.title);
                  return h && habitDoneToday(h.id);
                }).length}{' '}
                / {ROUTINE.filter((r) => routineHabit(r.title)).length || ROUTINE.length} done today · these are your own habits, so they also show in Habits.
              </AppText>
              <SectionHeader eyebrow="Logged" title="Symptoms this week" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {weekSymptoms.length ? (
                  weekSymptoms.map(([label, n]) => (
                    <View key={label} style={styles.symChip}>
                      <AppText variant="smallMedium" color={palette.peach[700]}>
                        {label} · {n}
                      </AppText>
                    </View>
                  ))
                ) : (
                  <AppText variant="small" muted>
                    No symptoms logged this week.
                  </AppText>
                )}
              </View>
              {bones ? (
                <View style={{ marginTop: 14 }}>
                  <QuickHelpCard article={bones} saved={state.bookmarks.includes(bones.id)} onToggleSave={() => saveToggle(bones.id)} />
                </View>
              ) : null}
              {midlifeNutrition ? (
                <View style={{ marginTop: 10 }}>
                  <QuickHelpCard article={midlifeNutrition} saved={state.bookmarks.includes(midlifeNutrition.id)} onToggleSave={() => saveToggle(midlifeNutrition.id)} />
                </View>
              ) : null}
            </>
          ) : null}
          <SectionHeader eyebrow="Bring to your visit" title="Questions for my doctor" />
          {questionsCard}
          <SectionHeader eyebrow="Explore" title="Focus areas" />
          <View style={styles.grid}>
            <Tile tone="green" icon={Dumbbell} title="Strength training" text="Supports everyday movement" onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'w_bone_strength' } })} />
            <Tile tone="indigo" icon={Moon} title="Sleep" text="Wind-down routine" onPress={() => router.push('/sleep')} />
            <Tile tone="butter" icon={Salad} title="Nutrition education" text="Balanced plates & strength" onPress={() => router.push({ pathname: '/learn/[id]', params: { id: 'a_menopause_nutrition' } })} />
            <Tile tone="lavender" icon={Smile} title="Mood" text="Check in daily" onPress={() => router.push('/check-in')} />
          </View>
          <Disclaimer style={{ marginTop: 14 }} text="Content focuses on healthy lifestyle and conversations with your healthcare provider. HealthX doesn't diagnose menopause status." />
        </>
      )}

      <SectionHeader eyebrow="Watch & follow along" title="Guided sessions" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingHorizontal: 2 }}>
        {meta.videos.map((v) => (
          <VideoCard key={v} video={v} width={220} height={164} />
        ))}
      </ScrollView>
      <BackendNote style={{ marginTop: 16 }} text="Life-stage modes are Phase 3 (SRS §63). Your logs, habits and appointments sync to your account; weight history and your questions stay on this phone until the backend can store them." />

      <DateSheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        eyebrow="Pregnancy"
        title="First day of your last period"
        subtitle="Used to estimate your pregnancy week. Saved to your account."
        value={state.cycleProfile.lastPeriodStart}
        maxDate={state.today}
        onChange={(d) => {
          dispatch({ type: 'UPDATE_CYCLE_PROFILE', patch: { lastPeriodStart: d } });
          setDateOpen(false);
          toast('Date saved');
        }}
      />
      <Sheet
        visible={apptOpen}
        onClose={() => setApptOpen(false)}
        eyebrow="Reminder"
        title="Add an appointment"
        subtitle="The phone reminds you at that time (if notifications are allowed)."
        footer={<Button label="Save appointment" full onPress={saveAppointment} />}>
        <View style={{ gap: 12 }}>
          <TextField label="Appointment" value={appt.title} onChangeText={(t) => setAppt((a) => ({ ...a, title: t }))} maxLength={80} />
          <Button
            label={appt.date ? `Date: ${formatDate(appt.date, 'long')}` : 'Choose a date'}
            icon={CalendarDays}
            variant="secondary"
            onPress={() => setApptDateOpen(true)}
          />
          <TextField label="Time (24-hour, e.g. 09:30)" value={appt.time} onChangeText={(t) => setAppt((a) => ({ ...a, time: t.trim() }))} maxLength={5} />
          {apptError ? (
            <AppText variant="small" color={colors.danger} accessibilityRole="alert">
              {apptError}
            </AppText>
          ) : null}
        </View>
      </Sheet>
      <DateSheet visible={apptDateOpen} onClose={() => setApptDateOpen(false)} eyebrow="Appointment" title="Appointment date" value={appt.date} onChange={(d) => setAppt((a) => ({ ...a, date: d }))} />
    </Screen>
  );
}

function Tile({ icon: Icon, tone, title, text, onPress }: { icon: LucideIcon; tone: TileTone; title: string; text: string; onPress?: () => void }) {
  const t = TILE_TONES[tone];
  const body: ReactNode = (
    <>
      <View style={styles.tileIcon}>
        <Icon size={19} color={t.icon} />
      </View>
      <AppText style={styles.tileTitle}>{title}</AppText>
      <AppText variant="caption" color={t.hint} style={{ opacity: 0.85 }}>
        {text}
      </AppText>
    </>
  );
  const box = [styles.tile, { backgroundColor: t.bg, borderColor: t.border }];
  if (!onPress) return <View style={box}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [box, pressed && { transform: [{ scale: 0.98 }], opacity: 0.94 }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { height: 210, width: '100%', justifyContent: 'flex-end', ...shadow.card },
  heroText: { padding: 18, gap: 4 },
  heroTitle: { fontFamily: font.displayBold, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: '#fff' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: palette.green[100], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4 },
  babyDisc: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  weekBig: { fontFamily: font.displayBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', flexGrow: 1, borderRadius: 22, borderWidth: 1, padding: 14, gap: 4, minHeight: 128 },
  tileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileTitle: { fontFamily: font.display, fontSize: 15.5, lineHeight: 20, color: colors.text },
  question: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  qIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: palette.lavender[50], alignItems: 'center', justifyContent: 'center' },
  pct: { fontFamily: font.display, fontSize: 16, lineHeight: 20, color: colors.text },
  emergency: { flexDirection: 'row', gap: 12, marginTop: 16, backgroundColor: colors.dangerSoft, borderRadius: 22, borderWidth: 1.5, borderColor: palette.rose[200], padding: 16 },
  emergencyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: palette.green[300], alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  symChip: { backgroundColor: palette.peach[50], borderWidth: 1, borderColor: palette.peach[100], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
});
