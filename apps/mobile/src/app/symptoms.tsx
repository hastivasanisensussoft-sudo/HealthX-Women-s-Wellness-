/** Symptom log (SRS §14–§16, mockup M15; Myflo chip grid): category chips, symptoms, per-symptom severity, notes, history. */
import { COPY, MOODS, SEVERITIES, SYMPTOM_CATEGORIES, formatDate, symptomFrequency, type ISODate, type Severity, type SymptomCategory } from '@healthx/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Archive, ClipboardList, Plus, Sparkles, Stethoscope, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MoodFace } from '@/components/Art';
import { Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { BarChart } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Chip, Segmented, TextField } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const SEV_TONE: Record<Severity, 'green' | 'peach' | 'rose'> = { mild: 'green', moderate: 'peach', severe: 'rose' };

export default function Symptoms() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ date?: string }>();
  const date: ISODate = params.date && params.date <= state.today ? params.date : state.today;
  const [tab, setTab] = useState<'log' | 'history'>('log');
  const [cat, setCat] = useState<SymptomCategory>('physical');
  const [selected, setSelected] = useState<Record<string, Severity>>({});
  const [notes, setNotes] = useState('');

  const defs = state.symptomDefs.filter((s) => s.category === cat);
  const customs = state.symptomDefs.filter((s) => s.custom);
  const todays = state.symptomLogs.filter((l) => l.date === date);
  const freq = useMemo(() => symptomFrequency(state, 60).slice(0, 7), [state]);
  const history = useMemo(() => [...state.symptomLogs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30), [state.symptomLogs]);
  const count = Object.keys(selected).length;
  const labelOf = (id: string) => state.symptomDefs.find((s) => s.id === id)?.label ?? 'Archived symptom';
  const catLabel = SYMPTOM_CATEGORIES.find((c) => c.key === cat)?.label ?? '';

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = { ...s };
      if (n[id]) delete n[id];
      else n[id] = state.symptomDefs.find((d) => d.id === id)?.defaultSeverity ?? 'mild';
      return n;
    });

  const save = () => {
    if (!count) return toast('Select at least one symptom', 'info');
    dispatch({ type: 'LOG_SYMPTOMS', date, entries: Object.entries(selected).map(([symptomId, severity]) => ({ symptomId, severity })), notes: notes.trim() || undefined });
    toast(`${count} symptom${count === 1 ? '' : 's'} logged for ${date === state.today ? 'today' : formatDate(date, 'short')}`);
    setSelected({});
    setNotes('');
  };

  return (
    <Screen
      back
      largeTitle
      eyebrow={formatDate(date, 'long')}
      title="Log Symptoms"
      footer={tab === 'log' ? <Button label={count ? `Save symptoms (${count})` : 'Save symptoms'} size="lg" disabled={!count} onPress={save} full /> : undefined}>
      <Segmented value={tab} onChange={setTab} options={[{ key: 'log', label: 'Log' }, { key: 'history', label: 'History & trends' }]} />

      {tab === 'log' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow} accessibilityRole="tablist" style={{ marginHorizontal: -20 }}>
            {SYMPTOM_CATEGORIES.map((c) => (
              <Chip key={c.key} label={c.label} variant="solid" selected={cat === c.key} onPress={() => setCat(c.key)} />
            ))}
          </ScrollView>

          {/* Myflo-style chip panel */}
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <View style={styles.panelIcon}>
                <Stethoscope size={16} color={palette.rose[600]} />
              </View>
              <AppText style={styles.panelTitle}>{catLabel}</AppText>
              <AppText variant="caption" color={palette.rose[700]}>
                {count ? `${count} selected` : 'Tap all that apply'}
              </AppText>
            </View>
            <View style={styles.wrap}>
              {defs.map((s) => (
                <Chip key={s.id} label={s.label} tone="rose" selected={!!selected[s.id]} icon={<KeyIcon name={s.icon} size={15} color={palette.rose[600]} />} onPress={() => toggle(s.id)} />
              ))}
              <Pressable accessibilityRole="button" accessibilityLabel="Create a custom symptom" onPress={() => router.push('/symptom-new')} style={({ pressed }) => [styles.customChip, pressed && { backgroundColor: palette.green[50] }]}>
                <Plus size={14} color={palette.green[700]} />
                <AppText variant="smallMedium" color={palette.green[700]}>
                  Custom symptom
                </AppText>
              </Pressable>
            </View>
            {defs.length === 0 ? (
              <AppText variant="small" color={palette.ink[600]} style={{ marginTop: 10 }}>
                No symptoms in this category yet — add your own with “Custom symptom”.
              </AppText>
            ) : null}
          </View>

          {count ? (
            <Card style={{ marginTop: 14, gap: 14 }}>
              <AppText variant="overline" color={palette.green[700]}>
                How strong?
              </AppText>
              {Object.keys(selected).map((id) => (
                <View key={id} style={{ gap: 8 }}>
                  <AppText variant="h3">{labelOf(id)} — severity</AppText>
                  <Segmented tone={SEV_TONE[selected[id]]} value={selected[id]} onChange={(v) => setSelected({ ...selected, [id]: v })} options={SEVERITIES.map((s) => ({ key: s.key, label: s.label }))} />
                </View>
              ))}
            </Card>
          ) : null}

          <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline maxLength={200} placeholder="Notes…" style={{ marginTop: 16 }} hint={`${notes.length}/200`} />
          <View style={styles.concern}>
            <Stethoscope size={15} color={palette.green[700]} />
            <AppText variant="caption" color={brandText} style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}>
              {COPY.concern}
            </AppText>
          </View>

          <SectionHeader eyebrow={formatDate(date, 'short')} title={date === state.today ? 'Logged today' : 'Logged this day'} />
          <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: todays.length ? 4 : 0 }}>
            {todays.length ? (
              todays.map((l, i) => (
                <View key={l.id} style={[styles.sevRow, i === todays.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.rowIcon}>
                    <KeyIcon name={state.symptomDefs.find((s) => s.id === l.symptomId)?.icon ?? 'sparkles'} size={15} color={palette.rose[600]} />
                  </View>
                  <AppText variant="bodyMedium" style={{ flex: 1 }}>
                    {labelOf(l.symptomId)}
                  </AppText>
                  <Pill label={SEVERITIES.find((s) => s.key === l.severity)?.label ?? ''} tone={SEV_TONE[l.severity]} />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${labelOf(l.symptomId)}`} onPress={() => dispatch({ type: 'REMOVE_SYMPTOM_LOG', id: l.id })} hitSlop={8} style={styles.iconBtn}>
                    <Trash2 size={15} color={palette.ink[600]} />
                  </Pressable>
                </View>
              ))
            ) : (
              <EmptyState compact icon={ClipboardList} tone="rose" title="Nothing logged yet" text="Select symptoms above. Logging regularly helps you notice your own patterns." />
            )}
          </Card>

          {customs.length ? (
            <>
              <SectionHeader eyebrow="Made by you" title="Your custom symptoms" action="New" onAction={() => router.push('/symptom-new')} />
              <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
                {customs.map((c, i) => (
                  <View key={c.id} style={[styles.sevRow, i === customs.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.rowIcon, { backgroundColor: palette.green[50] }]}>
                      {c.icon ? <KeyIcon name={c.icon} size={15} color={palette.green[700]} /> : <Sparkles size={15} color={palette.green[700]} />}
                    </View>
                    <AppText variant="bodyMedium" style={{ flex: 1 }}>
                      {c.label}
                    </AppText>
                    <Pill label={SYMPTOM_CATEGORIES.find((x) => x.key === c.category)?.label ?? ''} tone="green" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Archive ${c.label}`}
                      onPress={() => {
                        dispatch({ type: 'ARCHIVE_CUSTOM_SYMPTOM', id: c.id });
                        toast(`Archived “${c.label}”`, 'info');
                      }}
                      hitSlop={8}
                      style={styles.iconBtn}>
                      <Archive size={15} color={palette.ink[600]} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : (
        <>
          <SectionHeader eyebrow="Last 60 days" title="Most logged" />
          <Card>{freq.length ? <BarChart data={freq.map((f) => ({ label: f.label.split(' ')[0].slice(0, 7), value: f.count }))} color={palette.rose[400]} showValues /> : <EmptyState compact tone="rose" title="No symptoms yet" />}</Card>
          <SectionHeader eyebrow="This month" title="Mood this month" action="Log mood" onAction={() => router.push('/mood')} />
          <Card tone="lavender" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {MOODS.map((m) => {
              const n = state.checkIns.filter((c) => c.mood === m.key && c.date >= state.today.slice(0, 8) + '01').length;
              return (
                <View key={m.key} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                  <MoodFace mood={m.key} size={40} ring={colors.surface} />
                  <AppText style={styles.moodCount}>{n}</AppText>
                  <AppText variant="caption" color={palette.lavender[700]} numberOfLines={1} style={{ fontSize: 10.5 }}>
                    {m.label}
                  </AppText>
                </View>
              );
            })}
          </Card>
          <SectionHeader eyebrow="Most recent first" title="Recent entries" />
          <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {history.length ? (
              history.map((l, i) => (
                <View key={l.id} style={[styles.sevRow, i === history.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.dateTag}>
                    <AppText variant="caption" color={palette.ink[700]} style={{ fontFamily: font.semibold }}>
                      {formatDate(l.date, 'short')}
                    </AppText>
                  </View>
                  <AppText variant="bodyMedium" style={{ flex: 1 }}>
                    {labelOf(l.symptomId)}
                  </AppText>
                  <Pill label={SEVERITIES.find((s) => s.key === l.severity)?.label ?? l.severity} tone={SEV_TONE[l.severity]} />
                </View>
              ))
            ) : (
              <EmptyState compact title="No history yet" />
            )}
          </Card>
          <AppText variant="caption" muted style={{ marginTop: 12 }}>
            Patterns you see here are observations, not a diagnosis. {COPY.concern}
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  catRow: { gap: 8, paddingVertical: 4, marginTop: 14, paddingHorizontal: 20 },
  panel: { marginTop: 12, backgroundColor: palette.rose[50], borderRadius: 26, padding: 14, borderWidth: 1, borderColor: palette.rose[100] },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panelIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { flex: 1, fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: palette.green[500], backgroundColor: colors.surface },
  concern: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, backgroundColor: palette.green[50], borderRadius: 16, padding: 12 },
  sevRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.rose[50], alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.ink[50], alignItems: 'center', justifyContent: 'center' },
  dateTag: { backgroundColor: palette.ink[50], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, minWidth: 58, alignItems: 'center' },
  moodCount: { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: colors.text },
});
