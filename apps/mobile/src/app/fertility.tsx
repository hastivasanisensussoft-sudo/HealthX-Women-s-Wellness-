/** Fertility awareness — Phase 3 preview (SRS §20, §21). User-entered observations only; never "confirmed ovulation", never contraception. */
import { COPY, addDays, cycleStateOf, formatDate, lastNDays, weekdayInitial, type FertilityLog } from '@healthx/shared';
import { CircleAlert, ClipboardList, Flower2, ShieldAlert, Thermometer } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackendNote, EstimateNote, PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { LineChart } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Chip, Segmented, TextField } from '@/components/Inputs';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useStore } from '@/lib/store';
import { colors, fertile, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const MUCUS: { key: NonNullable<FertilityLog['mucus']>; label: string }[] = [
  { key: 'dry', label: 'Dry' },
  { key: 'sticky', label: 'Sticky' },
  { key: 'creamy', label: 'Creamy' },
  { key: 'watery', label: 'Watery' },
  { key: 'egg_white', label: 'Egg-white' },
];
const TESTS: { key: NonNullable<FertilityLog['ovulationTest']>; label: string }[] = [
  { key: 'negative', label: 'Negative' },
  { key: 'positive', label: 'Positive' },
  { key: 'not_sure', label: 'Not sure' },
];

export default function Fertility() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const existing = state.fertility.find((f) => f.date === state.today);
  const [bbt, setBbt] = useState(existing?.bbtCelsius ? String(existing.bbtCelsius) : '');
  const [mucus, setMucus] = useState<FertilityLog['mucus']>(existing?.mucus);
  const [test, setTest] = useState<FertilityLog['ovulationTest']>(existing?.ovulationTest);
  const [error, setError] = useState<string | null>(null);

  const series = lastNDays(state.today, 21).map((d) => ({ label: formatDate(d, 'short').split(' ')[1] ?? d.slice(8), value: state.fertility.find((f) => f.date === d)?.bbtCelsius ?? null }));
  const history = [...state.fertility].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7);

  const save = () => {
    let temp: number | undefined;
    if (bbt.trim()) {
      temp = Number(bbt.replace(',', '.'));
      if (Number.isNaN(temp) || temp < 35 || temp > 38.5) return setError('Enter a basal temperature between 35.0 and 38.5 °C.');
    }
    if (!temp && !mucus && !test) return setError('Add at least one observation.');
    setError(null);
    dispatch({ type: 'LOG_FERTILITY', log: { date: state.today, bbtCelsius: temp, mucus, ovulationTest: test } });
    toast('Observations saved');
  };

  return (
    <Screen back largeTitle eyebrow="Learn your cycle signs" title="Fertility awareness" right={<PhaseBadge phase={3} />}>
      {/* Safety first: not contraception, never confirmed ovulation */}
      <View style={styles.safety} accessibilityRole="alert">
        <View style={styles.safetyIcon}>
          <ShieldAlert size={22} color={palette.rose[600]} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color={palette.rose[700]}>
            Please read
          </AppText>
          <AppText style={styles.safetyTitle}>Not a form of contraception</AppText>
          <AppText variant="small" color={palette.rose[700]} style={{ marginTop: 4 }}>
            {`${COPY.notContraception} ${COPY.ovulationNotConfirmed}`}
          </AppText>
        </View>
      </View>

      <Card tone="lavender" style={styles.intro} padded={false}>
        <Photo photo="herbal-tea" style={styles.introPhoto} radius={0} />
        <View style={{ flex: 1, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Flower2 size={16} color={palette.lavender[600]} />
            <AppText variant="h3">Phase 3 preview</AppText>
          </View>
          <AppText variant="small" color={palette.ink[700]} style={{ marginTop: 4 }}>
            {COPY.fertilityAwareness}
          </AppText>
        </View>
      </Card>

      <SectionHeader eyebrow="Calendar estimate only" title="Estimated fertile window" />
      <Card>
        {cs.fertileWindow ? (
          <>
            <View style={styles.windowHead}>
              <View style={{ flex: 1 }}>
                <AppText variant="title">
                  {formatDate(cs.fertileWindow.start, 'short')} – {formatDate(cs.fertileWindow.end, 'short')}*
                </AppText>
                <AppText variant="small" muted style={{ marginTop: 4 }}>
                  A calendar estimate based on your average cycle of {cs.avgCycleLength} days. Your body’s actual timing may differ.
                </AppText>
              </View>
              <Pill label="Estimate" tone="lavender" />
            </View>
            <View style={styles.week} accessibilityLabel="This week, estimated fertile days highlighted">
              {[-3, -2, -1, 0, 1, 2, 3].map((o) => {
                const d = addDays(state.today, o);
                const fw = cs.fertileWindow;
                const fertile = !!fw && d >= fw.start && d <= fw.end;
                const today = o === 0;
                return (
                  <View key={d} style={[styles.day, fertile && styles.dayFertile, today && styles.dayToday]}>
                    <AppText variant="overline" color={today ? '#fff' : palette.ink[500]} style={{ fontSize: 9, letterSpacing: 0.6 }}>
                      {weekdayInitial(d)}
                    </AppText>
                    <AppText style={[styles.dayNum, today && { color: '#fff' }]}>{Number(d.slice(8, 10))}</AppText>
                  </View>
                );
              })}
            </View>
            <View style={styles.legend}>
              <View style={[styles.swatch, { backgroundColor: fertile[100], borderWidth: 1.5, borderStyle: 'dashed', borderColor: fertile[500] }]} />
              <AppText variant="caption" muted>
                Estimated fertile window*
              </AppText>
              <View style={[styles.swatch, { backgroundColor: palette.green[700], marginLeft: 10 }]} />
              <AppText variant="caption" muted>
                Today
              </AppText>
            </View>
            <EstimateNote style={{ marginTop: 12 }} />
          </>
        ) : (
          <EmptyState compact icon={Flower2} tone="lavender" title="Not enough data" text="Log at least one period to see a calendar estimate." />
        )}
      </Card>

      <SectionHeader eyebrow="Last 21 days · °C" title="Basal body temperature" />
      <Card>
        <LineChart data={series} color={palette.lavender[500]} min={36} max={36.8} yTicks={[36.2, 36.4, 36.6]} dots />
        <AppText variant="caption" muted style={{ marginTop: 4 }}>
          °C, last 21 days · trends you log are shown as-is and are not interpreted as ovulation.
        </AppText>
      </Card>

      <SectionHeader eyebrow="Your observations" title="Log today" />
      <Card style={{ gap: 18 }}>
        <TextField
          label="Basal temperature (°C)"
          value={bbt}
          onChangeText={setBbt}
          keyboardType="decimal-pad"
          placeholder="e.g. 36.45"
          hint="Take it at the same time each morning, before getting up."
          icon={<Thermometer size={18} color={palette.ink[400]} />}
        />
        <View style={{ gap: 10 }}>
          <AppText variant="label" color={palette.ink[800]}>
            Cervical mucus
          </AppText>
          <View style={styles.wrap}>
            {MUCUS.map((m) => (
              <Chip key={m.key} label={m.label} tone="lavender" selected={mucus === m.key} onPress={() => setMucus(mucus === m.key ? undefined : m.key)} />
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <AppText variant="label" color={palette.ink[800]}>
            Ovulation test
          </AppText>
          <Segmented<NonNullable<FertilityLog['ovulationTest']> | 'unset'> tone="lavender" value={test ?? 'unset'} onChange={(v) => setTest(v === 'unset' ? undefined : v)} options={TESTS} />
          <AppText variant="caption" muted>
            Test results are what you entered — HealthX doesn’t confirm ovulation.
          </AppText>
        </View>
        {error ? (
          <View style={styles.error}>
            <CircleAlert size={14} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} style={{ flex: 1, fontSize: 12.5 }}>
              {error}
            </AppText>
          </View>
        ) : null}
        <Button label="Save observations" size="lg" onPress={save} full />
      </Card>

      <SectionHeader eyebrow="Last 7 entries" title="Recent observations" />
      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: history.length ? 4 : 0 }}>
        {history.length ? (
          history.map((h, i) => (
            <View key={h.date} style={[styles.hist, i < history.length - 1 && styles.border]}>
              <View style={styles.dateTag}>
                <AppText variant="caption" color={palette.lavender[700]} style={{ fontFamily: font.semibold }}>
                  {formatDate(h.date, 'short')}
                </AppText>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {h.bbtCelsius ? <Pill label={`${h.bbtCelsius.toFixed(2)} °C`} tone="lavender" /> : null}
                {h.mucus ? <Pill label={MUCUS.find((m) => m.key === h.mucus)?.label ?? h.mucus} tone="sky" /> : null}
                {h.ovulationTest ? <Pill label={`Test: ${TESTS.find((t) => t.key === h.ovulationTest)?.label}`} tone="ink" /> : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyState compact icon={ClipboardList} tone="lavender" title="No observations yet" />
        )}
      </Card>
      <BackendNote style={{ marginTop: 14 }} text="Phase 3 module — requires medical/legal review before release (SRS §20). Demo data only." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safety: { flexDirection: 'row', gap: 12, backgroundColor: palette.rose[50], borderWidth: 1.5, borderColor: palette.rose[200], borderRadius: 24, padding: 16 },
  safetyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  safetyTitle: { fontFamily: font.display, fontSize: 18, lineHeight: 23, color: palette.rose[700], marginTop: 2 },
  intro: { flexDirection: 'row', marginTop: 12, overflow: 'hidden' },
  introPhoto: { width: 96, alignSelf: 'stretch', minHeight: 120 },
  windowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hist: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  dateTag: { backgroundColor: palette.lavender[50], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, minWidth: 58, alignItems: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 16 },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  dayFertile: { backgroundColor: fertile[50], borderStyle: 'dashed', borderColor: fertile[400] },
  dayToday: { backgroundColor: palette.green[700], borderColor: palette.green[700], borderStyle: 'solid' },
  dayNum: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
