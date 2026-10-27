/** Phase 3 life-stage previews: Pregnancy (§22–§23), Perimenopause (§24), Menopause (§25). */
import { COPY, activeMinOn, addDays, formatDate, lastNDays, sleepHoursOn, waterOn, type LifeStageMode, type VideoKey } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Baby, CalendarClock, Check, Droplets, Dumbbell, Flame, HeartPulse, MessageSquareText, Moon, Salad, Smile, Thermometer, Zap, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackendNote, Disclaimer, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { BarChart, ProgressBar } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { QuickHelpCard } from '@/components/LibraryCards';
import { Stepper, TextField } from '@/components/Inputs';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { VideoCard } from '@/components/Video';
import { useStore } from '@/lib/store';
import { brandText, colors, font, onDark, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const ROUTINE = [
  { key: 'strength', label: 'Strength training · 20 min' },
  { key: 'calcium', label: 'Calcium-rich foods' },
  { key: 'winddown', label: 'Wind-down routine · 10 PM' },
];

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
  const [week, setWeek] = useState(18);
  const [question, setQuestion] = useState('');
  const [questions, setQuestions] = useState<string[]>(() =>
    mode === 'pregnancy'
      ? ['Which activities are safe for me right now?', 'What should I do if I feel dizzy?']
      : ['Which of my symptoms should I mention at my next appointment?', 'What support options could suit me?'],
  );
  const [routine, setRoutine] = useState<Record<string, boolean>>({ strength: true });
  const [flashes, setFlashes] = useState<number[]>([2, 3, 1, 4, 2, 1, 2]);

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
  const trimester = week <= 13 ? 'First trimester' : week <= 27 ? 'Second trimester' : 'Third trimester';
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
  const sitali = article('q_sitali');
  const bones = article('a_menopause_bones');

  const activate = () => {
    dispatch({ type: 'SET_MODE', mode: mode as LifeStageMode });
    toast(`${meta.title} mode on (preview)`);
  };
  const addQuestion = () => {
    if (question.trim().length > 3) {
      setQuestions([...questions, question.trim()]);
      setQuestion('');
      toast('Question saved');
    }
  };

  const questionsCard = (
    <Card style={{ gap: 10 }}>
      {questions.map((q) => (
        <View key={q} style={styles.question}>
          <View style={styles.qIcon}>
            <MessageSquareText size={14} color={palette.lavender[600]} />
          </View>
          <AppText variant="small" style={{ flex: 1 }}>
            {q}
          </AppText>
        </View>
      ))}
      <TextField label="Add a question" value={question} onChangeText={setQuestion} placeholder="Type your question" maxLength={120} />
      <Button label="Add question" size="sm" variant="soft" onPress={addQuestion} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );

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
              toast('Cycle tracking mode');
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
      <Disclaimer tone="lavender" style={{ marginTop: 14 }} text="Phase 3 preview with sample data. Final features need medical review before launch." />

      {mode === 'pregnancy' ? (
        <>
          <Disclaimer tone="rose" style={{ marginTop: 10 }} text={COPY.pregnancy} />
          <SectionHeader eyebrow={trimester} title="Pregnancy week" />
          <Card tone="mint" style={{ alignItems: 'center', gap: 10 }}>
            <View style={styles.babyDisc}>
              <Baby size={28} color={palette.green[700]} />
            </View>
            <AppText style={styles.weekBig}>Week {week}</AppText>
            <View style={{ alignSelf: 'stretch' }}>
              <Stepper label="Pregnancy week" value={week} onChange={setWeek} min={1} max={42} format={(v) => `Week ${v}`} />
            </View>
            <ProgressBar value={week / 40} color={palette.green[600]} track={colors.surface} height={8} style={{ alignSelf: 'stretch' }} />
            <AppText variant="caption" muted center>
              Week entry method (last period vs due date) is decided with medical reviewers (D-21).
            </AppText>
          </Card>
          {pregArticle ? (
            <>
              <SectionHeader eyebrow="Read" title="This week" />
              <QuickHelpCard article={pregArticle} saved={state.bookmarks.includes(pregArticle.id)} onToggleSave={() => saveToggle(pregArticle.id)} />
            </>
          ) : null}
          <SectionHeader eyebrow="Today" title="Wellness today" />
          <View style={styles.grid}>
            <Tile tone="sky" icon={Droplets} title={`${(waterOn(state, state.today) / 1000).toFixed(1)} L water`} text="Sip regularly through the day" onPress={() => router.push('/hydration')} />
            <Tile tone="green" icon={Dumbbell} title={`${activeMinOn(state, state.today)} min active`} text="Gentle activity, as agreed with your care team" />
            <Tile tone="indigo" icon={Moon} title={sleepLast !== null ? `${Math.floor(sleepLast)}h ${Math.round((sleepLast % 1) * 60)}m sleep` : 'Rest'} text="Notice how you sleep" onPress={() => router.push('/sleep')} />
            <Tile tone="butter" icon={Salad} title="Nutrition education" text="Balanced, regular meals" onPress={() => router.push('/nutrition')} />
          </View>
          <SectionHeader eyebrow="Sample" title="Appointment reminders" />
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.qIcon, { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.green[50] }]}>
              <CalendarClock size={18} color={palette.green[700]} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">Prenatal check-up</AppText>
              <AppText variant="caption" muted>
                {formatDate(addDays(state.today, 9), 'long')} · 10:30 AM (sample)
              </AppText>
            </View>
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
          <SectionHeader eyebrow="Sample dashboard" title={`${meta.title} wellness`} />
          <Card style={{ gap: 14 }}>
            {[
              { label: 'Sleep', v: 0.72, c: palette.indigo[400], icon: <Moon size={16} color={palette.indigo[500]} />, bg: palette.indigo[50] },
              { label: 'Energy', v: 0.64, c: palette.peach[400], icon: <Zap size={16} color={palette.peach[500]} />, bg: palette.peach[50] },
              { label: 'Mood', v: 0.78, c: palette.lavender[400], icon: <Smile size={16} color={palette.lavender[500]} />, bg: palette.lavender[50] },
              { label: 'Activity', v: 0.81, c: palette.green[500], icon: <Dumbbell size={16} color={palette.green[600]} />, bg: palette.green[50] },
            ].map((r) => (
              <View key={r.label}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.qIcon, { backgroundColor: r.bg }]}>{r.icon}</View>
                  <AppText variant="bodyMedium" style={{ flex: 1 }}>
                    {r.label}
                  </AppText>
                  <AppText style={styles.pct}>{Math.round(r.v * 100)}%</AppText>
                </View>
                <ProgressBar value={r.v} color={r.c} track={palette.ink[100]} height={8} style={{ marginTop: 8 }} />
              </View>
            ))}
            <AppText variant="caption" muted>
              Sample dashboard from SRS §24 — how each percentage is calculated is still to be defined (D-36).
            </AppText>
          </Card>
          <SectionHeader eyebrow="Last 7 days" title={mode === 'perimenopause' ? 'Hot flashes & night sweats' : 'Symptoms this week'} />
          <Card>
            <BarChart data={lastNDays(state.today, 7).map((d, i) => ({ label: formatDate(d, 'weekday'), value: flashes[i] }))} color={palette.peach[400]} showValues height={140} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button
                label="Log hot flash"
                icon={Thermometer}
                size="sm"
                variant="soft"
                style={{ flex: 1 }}
                onPress={() => {
                  const f = [...flashes];
                  f[6] += 1;
                  setFlashes(f);
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
          {mode === 'menopause' ? (
            <>
              <SectionHeader eyebrow="Daily habits" title="Today’s routine" />
              <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
                {ROUTINE.map((r, i) => {
                  const done = !!routine[r.key];
                  return (
                    <Pressable
                      key={r.key}
                      accessibilityRole="checkbox"
                      aria-checked={done}
                      onPress={() => setRoutine((x) => ({ ...x, [r.key]: !x[r.key] }))}
                      style={[styles.check, i < ROUTINE.length - 1 && styles.border]}>
                      <View style={[styles.dot, done && styles.dotOn]}>{done ? <Check size={13} color="#fff" strokeWidth={3} /> : null}</View>
                      <AppText variant="body" style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }} muted={done}>
                        {r.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </Card>
              <AppText variant="caption" muted style={{ marginTop: 6 }}>
                {ROUTINE.filter((r) => routine[r.key]).length} / {ROUTINE.length} done today
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
            </>
          ) : null}
          <SectionHeader eyebrow="Bring to your visit" title="Questions for my doctor" />
          {questionsCard}
          <SectionHeader eyebrow="Explore" title="Focus areas" />
          <View style={styles.grid}>
            <Tile tone="green" icon={Dumbbell} title="Strength training" text="Supports everyday movement" onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'w_bone_strength' } })} />
            <Tile tone="indigo" icon={Moon} title="Sleep" text="Wind-down routine" onPress={() => router.push('/sleep')} />
            <Tile tone="butter" icon={Salad} title="Nutrition education" text={mode === 'menopause' ? 'Bone-health education' : 'Balanced meals'} onPress={() => router.push({ pathname: '/learn/[id]', params: { id: mode === 'menopause' ? 'a_menopause_bones' : 'a_perimenopause' } })} />
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
      <BackendNote style={{ marginTop: 16 }} text="Life-stage modes are Phase 3 (SRS §63). Previews use local sample data." />
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
