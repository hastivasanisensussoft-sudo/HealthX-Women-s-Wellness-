/**
 * Log / edit a period as a bottom sheet (SRS §13, §46, §70; mockup M14), validated by the shared Cycle Engine.
 * Presented as a transparent modal route (see app/_layout.tsx).
 */
import {
  FLOWS,
  PERIOD_SYMPTOM_IDS,
  SEVERITIES,
  computeCycleState,
  formatDate,
  validatePeriodRange,
  type Flow,
  type ISODate,
  type Severity,
} from '@healthx/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Droplet, Trash2, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Disclaimer } from '@/components/Badges';
import { Button } from '@/components/Button';
import { MonthCalendar } from '@/components/cycle/Calendar';
import { Chip, Segmented, TextField } from '@/components/Inputs';
import { goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Mode = 'start' | 'past' | 'end';

const SEV_TONE: Record<Severity, 'green' | 'peach' | 'rose'> = { mild: 'green', moderate: 'peach', severe: 'rose' };

export default function LogPeriod() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const today = state.today;
  const editing = id ? state.periods.find((p) => p.id === id) : undefined;
  const open = state.periods.find((p) => p.end === null);

  const [mode, setMode] = useState<Mode>(editing ? 'past' : open ? 'end' : 'start');
  const [start, setStart] = useState<ISODate>(editing?.start ?? today);
  const [end, setEnd] = useState<ISODate | null>(editing?.end ?? null);
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [month, setMonth] = useState(editing?.start ?? today);
  const [flow, setFlow] = useState<Flow>((open && open.flowByDay[today]) || (editing && editing.flowByDay[editing.start]) || 'medium');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const calState = useMemo(() => computeCycleState(state.periods, state.cycleProfile, today), [state.periods, state.cycleProfile, today]);
  // Period symptoms in catalogue order, limited to this account's symptom list (the server rejects unknown ids).
  const symptomDefs = PERIOD_SYMPTOM_IDS.flatMap((sid) => state.symptomDefs.filter((s) => s.id === sid));

  const save = () => {
    if (mode === 'end' && open) {
      if (today < open.start) return setError('End date is before the start date.');
      dispatch({ type: 'SET_FLOW', date: today, flow });
      dispatch({ type: 'END_PERIOD', id: open.id, date: today });
      toast('Period marked as ended — estimates updated');
      return goBack();
    }
    const s = mode === 'start' ? today : start;
    const e = mode === 'start' ? null : end;
    const err = validatePeriodRange(s, e, state.periods, today, editing?.id);
    if (err) return setError(err);
    setError(null);
    if (editing) {
      dispatch({ type: 'UPDATE_PERIOD', id: editing.id, start: s, end: e, notes: notes.trim() || undefined });
      dispatch({ type: 'SET_FLOW', date: s, flow });
      toast('Period updated — estimates recalculated');
    } else if (mode === 'start') {
      dispatch({ type: 'START_PERIOD', date: s, flow });
      toast('Period started — estimates updated');
    } else {
      dispatch({ type: 'ADD_PERIOD', start: s, end: e, flow, notes: notes.trim() || undefined });
      toast('Period logged — estimates updated');
    }
    const picked = symptoms.filter((sid) => symptomDefs.some((d) => d.id === sid));
    if (picked.length) {
      dispatch({ type: 'LOG_SYMPTOMS', date: s, entries: picked.map((symptomId) => ({ symptomId, severity })) });
    }
    goBack();
  };

  const remove = () => {
    if (!editing) return;
    const doIt = () => {
      dispatch({ type: 'DELETE_PERIOD', id: editing.id });
      toast('Period deleted — estimates recalculated', 'info');
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Delete this period? Your estimates will be recalculated.') ?? true) doIt();
    } else {
      Alert.alert('Delete this period?', 'Your estimates will be recalculated.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doIt },
      ]);
    }
  };

  const title = editing ? 'Edit period' : mode === 'end' ? 'End period' : 'Log period';

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close" onPress={goBack} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]} accessibilityViewIsModal>
          <View style={styles.grab} />
          <View style={styles.head}>
            <View style={styles.headIcon}>
              <Droplet size={20} color={palette.rose[500]} fill={palette.rose[200]} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="overline" color={palette.rose[700]}>
                {formatDate(today, 'long')}
              </AppText>
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" onPress={goBack} hitSlop={10} style={styles.cancel}>
              <X size={14} color={palette.ink[700]} />
              <AppText variant="smallMedium" color={palette.ink[700]}>
                Cancel
              </AppText>
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 6 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!editing ? (
              <Segmented
                tone="rose"
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setError(null);
                }}
                options={[...(open ? [{ key: 'end' as Mode, label: 'End period' }] : [{ key: 'start' as Mode, label: 'Starts today' }]), { key: 'past', label: 'Past dates' }]}
              />
            ) : null}

            {mode === 'end' && open ? (
              <View style={styles.info}>
                <CalendarDays size={16} color={palette.rose[600]} />
                <AppText variant="small" color={palette.ink[700]} style={{ flex: 1 }}>
                  Started {formatDate(open.start, 'long')}. Ending it today keeps your period-length estimates accurate.
                </AppText>
              </View>
            ) : null}
            {mode === 'start' ? (
              <View style={styles.info}>
                <CalendarDays size={16} color={palette.rose[600]} />
                <AppText variant="small" color={palette.ink[700]} style={{ flex: 1 }}>
                  Starts {formatDate(today, 'long')}. You can mark the end later from the Cycle tab.
                </AppText>
              </View>
            ) : null}

            {mode === 'past' ? (
              <>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <DateBox label="Started" value={formatDate(start, 'short')} active={picking === 'start'} onPress={() => setPicking(picking === 'start' ? null : 'start')} />
                  <DateBox label="Ended" value={end ? formatDate(end, 'short') : 'Ongoing'} active={picking === 'end'} onPress={() => setPicking(picking === 'end' ? null : 'end')} />
                </View>
                {picking ? (
                  <View style={styles.calWrap}>
                    <AppText variant="overline" color={palette.rose[700]} style={{ marginBottom: 8 }}>
                      {picking === 'start' ? 'Pick the first day' : 'Pick the last day'}
                    </AppText>
                    <MonthCalendar
                      month={month}
                      onMonthChange={setMonth}
                      periods={[{ id: 'draft', start, end: end ?? start, flowByDay: {} }]}
                      state={calState}
                      selected={picking === 'start' ? start : end}
                      maxDate={today}
                      showEstimates={false}
                      onSelect={(d) => {
                        setError(null);
                        if (picking === 'start') {
                          setStart(d);
                          if (end && end < d) setEnd(null);
                          setPicking('end');
                        } else {
                          setEnd(d);
                          setPicking(null);
                        }
                      }}
                    />
                    {end ? <Chip label="Still ongoing (clear end date)" onPress={() => setEnd(null)} style={{ marginTop: 8, alignSelf: 'flex-start' }} /> : null}
                  </View>
                ) : null}
              </>
            ) : null}

            {error ? <Disclaimer tone="danger" text={error} style={{ marginTop: 12 }} /> : null}

            <AppText variant="h3" style={styles.label}>
              {mode === 'end' ? 'Flow today' : 'Flow on the first day'}
            </AppText>
            <View style={styles.flows} accessibilityRole="radiogroup">
              {FLOWS.map((f) => {
                const on = flow === f.key;
                return (
                  <Pressable key={f.key} accessibilityRole="radio" aria-selected={on} accessibilityLabel={`${f.label} flow`} onPress={() => setFlow(f.key)} style={({ pressed }) => [styles.flow, on && styles.flowOn, pressed && { transform: [{ scale: 0.97 }] }]}>
                    <View style={styles.drops}>
                      {Array.from({ length: f.drops }, (_, i) => (
                        <Droplet key={i} size={f.drops > 2 ? 11 : 13} color={on ? '#fff' : palette.rose[500]} fill={on ? '#fff' : palette.rose[200]} />
                      ))}
                    </View>
                    <AppText variant="caption" color={on ? '#fff' : palette.rose[700]} style={{ fontFamily: font.semibold, marginTop: 4 }} numberOfLines={1}>
                      {f.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {!editing && mode !== 'end' ? (
              <>
                <AppText variant="h3" style={styles.label}>
                  Any symptoms?
                </AppText>
                <View style={styles.wrap}>
                  {symptomDefs.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.label}
                      tone="rose"
                      selected={symptoms.includes(s.id)}
                      icon={<KeyIcon name={s.icon} size={14} color={palette.rose[600]} />}
                      onPress={() => setSymptoms((xs) => (xs.includes(s.id) ? xs.filter((x) => x !== s.id) : [...xs, s.id]))}
                    />
                  ))}
                </View>
                {symptoms.length ? (
                  <View style={{ gap: 8, marginTop: 14 }}>
                    <AppText variant="label" color={palette.ink[800]}>
                      How strong? Applies to the symptoms you picked
                    </AppText>
                    <Segmented tone={SEV_TONE[severity]} value={severity} onChange={setSeverity} options={SEVERITIES.map((x) => ({ key: x.key, label: x.label }))} />
                  </View>
                ) : null}
              </>
            ) : null}

            {mode !== 'end' ? <TextField label="Note (optional)" value={notes} onChangeText={setNotes} multiline maxLength={300} placeholder="Add a note (optional)" style={{ marginTop: 16 }} hint={`${notes.length}/300`} /> : null}
          </ScrollView>

          <Button label={mode === 'end' ? 'End period today' : 'Save'} variant="rose" size="lg" full onPress={save} style={{ marginTop: 12 }} />
          {editing ? (
            <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}>
              <Trash2 size={15} color={colors.danger} />
              <AppText variant="smallMedium" color={colors.danger}>
                Delete this period
              </AppText>
            </Pressable>
          ) : null}
          <AppText variant="caption" muted center style={{ marginTop: 10 }}>
            Estimates are never a confirmation of ovulation or a form of contraception.
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function DateBox({ label, value, active, onPress }: { label: string; value: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} aria-expanded={active} onPress={onPress} style={{ flex: 1, gap: 6 }}>
      <AppText variant="overline" color={palette.ink[600]}>
        {label}
      </AppText>
      <View style={[styles.dateBox, active && styles.dateBoxOn]}>
        <CalendarDays size={16} color={palette.rose[500]} />
        <AppText variant="bodyMedium">{value}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,45,36,0.48)', justifyContent: 'flex-end' },
  kav: { width: '100%', alignItems: 'center', maxHeight: '94%' },
  sheet: { width: '100%', maxWidth: 640, backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 10, flexShrink: 1, ...shadow.lift },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: palette.ink[200], marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100], alignItems: 'center', justifyContent: 'center' },
  cancel: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.ink[100], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, backgroundColor: palette.rose[50], borderRadius: 16, padding: 12 },
  calWrap: { marginTop: 12, backgroundColor: palette.rose[50], borderRadius: 22, padding: 12, borderWidth: 1, borderColor: palette.rose[100] },
  label: { marginTop: 18, marginBottom: 10, fontFamily: font.display, fontSize: 16.5 },
  flows: { flexDirection: 'row', gap: 8 },
  flow: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 70, borderRadius: 20, backgroundColor: palette.rose[50], borderWidth: 1.5, borderColor: palette.rose[100], paddingHorizontal: 4 },
  flowOn: { backgroundColor: palette.rose[500], borderColor: palette.rose[500] },
  drops: { flexDirection: 'row', gap: 1, height: 16, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: palette.ink[200], paddingHorizontal: 14, backgroundColor: colors.surface },
  dateBoxOn: { borderColor: palette.rose[400], backgroundColor: palette.rose[50] },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, marginTop: 6 },
});
