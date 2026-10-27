/** Day detail (SRS §18, mockup M18): everything logged on one day, with edit shortcuts. */
import {
  FLOWS,
  SEVERITIES,
  checkInOn,
  classifyDay,
  cycleStateOf,
  diffDays,
  formatDate,
  moodLabel,
  sleepHoursOn,
  sortPeriods,
  symptomsOn,
  waterOn,
  type DayKind,
  type ISODate,
} from '@healthx/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarSearch, ChevronRight, Droplet, Droplets, Moon, NotebookPen, Plus, Smile, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MoodFace } from '@/components/Art';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/Feedback';
import { TextField } from '@/components/Inputs';
import { StatTile } from '@/components/Kit';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { QuickTile } from '@/components/Tiles';
import { useStore } from '@/lib/store';
import { brandText, colors, fertile, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const KIND_TEXT: Record<DayKind, string> = {
  period: 'Period day (logged)',
  predicted_period: 'Est. period day*',
  fertile_estimate: 'Est. fertile window*',
  ovulation_estimate: 'Est. ovulatory window*',
  none: '',
};

export default function DayDetail() {
  const { date: raw } = useLocalSearchParams<{ date: string }>();
  const { state, dispatch } = useStore();
  const toast = useToast();
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const date: ISODate | null = /^\d{4}-\d{2}-\d{2}$/.test(raw ?? '') ? (raw as ISODate) : null;
  const ci = date ? checkInOn(state, date) : undefined;
  const [note, setNote] = useState(ci?.note ?? '');

  if (!date) {
    return (
      <Screen back title="Day">
        <EmptyState icon={CalendarSearch} title="Day not found" text="Open a day from the calendar." action="Open calendar" onAction={() => router.replace('/calendar')} />
      </Screen>
    );
  }

  const future = date > state.today;
  const kind = classifyDay(date, state.periods, cs);
  const period = state.periods.find((p) => date >= p.start && date <= (p.end ?? state.today));
  const lastStart = sortPeriods(state.periods)
    .filter((p) => p.start <= date)
    .slice(-1)[0]?.start;
  const cycleDay = lastStart ? diffDays(lastStart, date) + 1 : null;
  const logs = symptomsOn(state, date);
  const water = waterOn(state, date);
  const sleep = sleepHoursOn(state, date);
  const notes = [ci?.note, period?.notes, ...logs.map((l) => l.notes)].filter((x): x is string => !!x);
  const title = `${formatDate(date, 'weekday')}, ${formatDate(date, 'short')}`;
  const kindTone = kind === 'period' || kind === 'predicted_period' ? { bg: palette.rose[50], border: palette.rose[200], fg: palette.rose[700] } : kind === 'none' ? null : { bg: fertile[50], border: fertile[200], fg: fertile[700] };
  const isToday = date === state.today;

  const saveNote = () => {
    if (!ci) return;
    dispatch({ type: 'SAVE_CHECKIN', checkIn: { ...ci, note: note.trim() || undefined } });
    setNoteOpen(false);
    toast('Note saved');
  };
  const go = (path: Parameters<typeof router.push>[0]) => {
    setAddOpen(false);
    router.push(path);
  };

  return (
    <Screen back largeTitle eyebrow={isToday ? 'Today' : future ? 'Upcoming day' : formatDate(date, 'month')} title={title}>
      <View style={styles.chips}>
        {cycleDay && cycleDay <= 60 ? (
          <View style={[styles.chip, { backgroundColor: palette.ink[50], borderColor: palette.ink[200] }]}>
            <AppText variant="caption" color={palette.ink[800]} style={{ fontFamily: font.semibold }}>
              Cycle day {cycleDay}
            </AppText>
          </View>
        ) : null}
        {kindTone ? (
          <View style={[styles.chip, { backgroundColor: kindTone.bg, borderColor: kindTone.border }, kind !== 'period' && { borderStyle: 'dashed' }]}>
            <View style={[styles.chipDot, { backgroundColor: kindTone.fg }]} />
            <AppText variant="caption" color={kindTone.fg} style={{ fontFamily: font.semibold }}>
              {KIND_TEXT[kind]}
            </AppText>
          </View>
        ) : null}
      </View>
      {future ? (
        <View style={styles.future}>
          <CalendarSearch size={16} color={palette.lavender[600]} />
          <AppText variant="small" color={palette.lavender[700]} style={{ flex: 1 }}>
            Future days show estimates only — you can log once the day arrives.
          </AppText>
        </View>
      ) : null}

      <Section icon={Droplet} tint={palette.rose} title="Period" right={period ? undefined : 'None logged'} onEdit={period ? () => router.push({ pathname: '/log-period', params: { id: period.id } }) : undefined}>
        {period ? (
          <View style={styles.flows} accessibilityRole="radiogroup">
            {FLOWS.map((f) => {
              const on = period.flowByDay[date] === f.key;
              return (
                <Pressable
                  key={f.key}
                  accessibilityRole="radio"
                  aria-selected={on}
                  accessibilityLabel={`${f.label} flow`}
                  onPress={() => {
                    dispatch({ type: 'SET_FLOW', date, flow: f.key });
                    toast(`Flow set to ${f.label.toLowerCase()}`);
                  }}
                  style={[styles.flow, on && styles.flowOn]}>
                  <View style={{ flexDirection: 'row' }}>
                    {Array.from({ length: f.drops }, (_, i) => (
                      <Droplet key={i} size={10} color={on ? '#fff' : palette.rose[500]} fill={on ? '#fff' : palette.rose[200]} />
                    ))}
                  </View>
                  <AppText variant="caption" color={on ? '#fff' : palette.rose[700]} style={{ fontFamily: font.semibold }} numberOfLines={1}>
                    {f.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Section>

      <Section icon={Stethoscope} tint={palette.peach} title="Symptoms" onEdit={!future ? () => router.push({ pathname: '/symptoms', params: { date } }) : undefined}>
        {logs.length ? (
          <View style={styles.wrap}>
            {logs.map((l) => (
              <View key={l.id} style={styles.tag}>
                <AppText variant="caption" color={palette.peach[700]} style={{ fontFamily: font.semibold }}>
                  {state.symptomDefs.find((s) => s.id === l.symptomId)?.label ?? 'Archived symptom'} · {SEVERITIES.find((s) => s.key === l.severity)?.label}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="small" muted style={{ marginTop: 8 }}>
            Nothing logged.
          </AppText>
        )}
      </Section>

      <Section icon={Smile} tint={palette.lavender} title="Mood" iconNode={ci ? <MoodFace mood={ci.mood} size={30} /> : undefined} onEdit={!future ? () => router.push({ pathname: '/mood', params: { date } }) : undefined}>
        {ci ? (
          <View style={styles.wrap}>
            {[moodLabel(ci.mood), `Energy ${ci.energy}/10`, ci.stress != null ? `Stress ${ci.stress}/10` : null, ci.anxiety != null ? `Anxiety ${ci.anxiety}/10` : null].filter(Boolean).map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: palette.lavender[50] }]}>
                <AppText variant="caption" color={palette.lavender[700]} style={{ fontFamily: font.semibold }}>
                  {t}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="small" muted style={{ marginTop: 8 }}>
            No mood logged.
          </AppText>
        )}
      </Section>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <StatTile tone="sky" label="Water" value={`${(water / 1000).toFixed(1)} L`} icon={<Droplets size={18} color={palette.sky[500]} />} onPress={isToday ? () => router.push('/hydration') : undefined} />
        <StatTile tone="indigo" label="Sleep" value={sleep != null ? `${Math.floor(sleep)}h ${String(Math.round((sleep % 1) * 60)).padStart(2, '0')}m` : '—'} icon={<Moon size={18} color={palette.indigo[500]} />} />
      </View>

      <Section icon={NotebookPen} tint={palette.green} title="Note" onEdit={ci && !future ? () => setNoteOpen(true) : undefined}>
        <AppText variant="small" style={{ marginTop: 8 }} color={notes.length ? colors.text : colors.textMuted}>
          {notes.length ? notes.join(' · ') : ci ? 'No note yet.' : 'Log your mood for this day to add a note.'}
        </AppText>
      </Section>

      {!future ? <Button label="Add log for this day" icon={Plus} size="lg" full style={{ marginTop: 18 }} onPress={() => setAddOpen(true)} /> : null}

      <Sheet visible={noteOpen} onClose={() => setNoteOpen(false)} eyebrow="Note" title="Note" subtitle={title} footer={<Button label="Save note" full onPress={saveNote} />}>
        <TextField label="Note" value={note} onChangeText={setNote} multiline maxLength={300} placeholder="e.g. Felt tired after lunch, better after a walk." hint={`${note.length}/300`} />
      </Sheet>

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} eyebrow={title} title="Add a log" subtitle="What would you like to add for this day?">
        <View style={styles.grid}>
          <QuickTile tone="peach" icon={Stethoscope} label="Symptoms" hint="Cramps, headache…" onPress={() => go({ pathname: '/symptoms', params: { date } })} style={styles.cell} />
          <QuickTile tone="lavender" icon={Smile} label="Mood" hint="Stress & energy" onPress={() => go({ pathname: '/mood', params: { date } })} style={styles.cell} />
          {!period ? <QuickTile tone="rose" icon={Droplet} label="Period" hint="Log or update" onPress={() => go('/log-period')} style={styles.cell} /> : null}
          {isToday ? <QuickTile tone="sky" icon={Droplets} label="Water" hint="Hydration" onPress={() => go('/hydration')} style={styles.cell} /> : null}
        </View>
      </Sheet>
    </Screen>
  );
}

function Section({
  icon: Icon,
  iconNode,
  tint,
  title,
  right,
  onEdit,
  children,
}: {
  icon: LucideIcon;
  iconNode?: ReactNode;
  tint: { 50: string; 600: string };
  title: string;
  right?: string;
  onEdit?: () => void;
  children?: ReactNode;
}) {
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={styles.sectionHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {iconNode ?? (
            <View style={[styles.sectionIcon, { backgroundColor: tint[50] }]}>
              <Icon size={17} color={tint[600]} />
            </View>
          )}
          <AppText style={styles.sectionTitle}>{title}</AppText>
        </View>
        {onEdit ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title.toLowerCase()}`} onPress={onEdit} hitSlop={8} style={styles.edit}>
            <AppText variant="smallMedium" color={brandText}>
              Edit
            </AppText>
            <ChevronRight size={14} color={brandText} />
          </Pressable>
        ) : right ? (
          <AppText variant="caption" color={palette.ink[500]}>
            {right}
          </AppText>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  future: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: palette.lavender[50], borderRadius: 16, padding: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: palette.green[50], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { backgroundColor: palette.peach[50], borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  flows: { flexDirection: 'row', gap: 6, marginTop: 12 },
  flow: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 9, borderRadius: 16, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100] },
  flowOn: { backgroundColor: palette.rose[500], borderColor: palette.rose[500] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%', flexGrow: 1 },
});
