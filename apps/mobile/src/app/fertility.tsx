/**
 * Fertility awareness (SRS §20, §21; P3-01). User-entered observations only; never "confirmed ovulation",
 * never contraception. Basal temperature is stored in °C and shown in °F with imperial units (A-16).
 */
import { COPY, addDays, celsiusToFahrenheit, cycleStateOf, fahrenheitToCelsius, formatDate, lastNDays, weekdayInitial, type FertilityLog, type ISODate } from '@healthx/shared';
import { router } from 'expo-router';
import { CircleAlert, ClipboardList, Eraser, Flower2, LineChart as LineChartIcon, ShieldAlert, Thermometer } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackendNote, EstimateNote, PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { LineChart } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Chip, Segmented, TextField } from '@/components/Inputs';
import { QuickHelpCard } from '@/components/LibraryCards';
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
/** Marker colour per mucus observation in the 21-day trend. */
const MUCUS_COLOR: Record<NonNullable<FertilityLog['mucus']>, string> = {
  dry: palette.ink[400],
  sticky: palette.butter[500],
  creamy: palette.peach[400],
  watery: palette.sky[400],
  egg_white: palette.indigo[500],
};
/** How many past days (including today) can be logged or edited here. */
const LOG_DAYS = 14;
const TREND_DAYS = 21;

const dayChipLabel = (d: ISODate, today: ISODate) => (d === today ? 'Today' : d === addDays(today, -1) ? 'Yesterday' : `${formatDate(d, 'weekday')} ${Number(d.slice(8, 10))}`);
const round2 = (n: number) => Math.round(n * 100) / 100;
/** A day counts as logged only when it holds at least one observation ("Clear day" keeps an empty entry). */
const hasData = (l?: FertilityLog) => !!l && (l.bbtCelsius !== undefined || !!l.mucus || !!l.ovulationTest);

/** BBT chart range that fits the logged values (at least 0.4 °C / 0.8 °F tall), with three guide lines. */
function bbtScale(values: number[], fahrenheit: boolean) {
  const minSpan = fahrenheit ? 0.8 : 0.4;
  if (!values.length) return fahrenheit ? { min: 96.8, max: 98.4, ticks: [97.2, 97.6, 98] } : { min: 36, max: 36.8, ticks: [36.2, 36.4, 36.6] };
  let min = Math.floor((Math.min(...values) - 0.1) * 10) / 10;
  let max = Math.ceil((Math.max(...values) + 0.1) * 10) / 10;
  if (max - min < minSpan) {
    const mid = (min + max) / 2;
    min = Math.floor((mid - minSpan / 2) * 10) / 10;
    max = round2(min + minSpan);
  }
  min = round2(min);
  max = round2(max);
  const span = max - min;
  return { min, max, ticks: [0.25, 0.5, 0.75].map((f) => round2(min + span * f)) };
}

export default function Fertility() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const fahrenheit = state.profile.units === 'imperial';
  const unit = fahrenheit ? '°F' : '°C';
  const show = (c: number) => (fahrenheit ? celsiusToFahrenheit(c) : c);
  const logOn = (d: ISODate) => state.fertility.find((f) => f.date === d);
  const [date, setDate] = useState<ISODate>(state.today);
  const existing = logOn(date);
  const [bbt, setBbt] = useState(existing?.bbtCelsius ? String(show(existing.bbtCelsius)) : '');
  const [mucus, setMucus] = useState<FertilityLog['mucus']>(existing?.mucus);
  const [test, setTest] = useState<FertilityLog['ovulationTest']>(existing?.ovulationTest);
  const [error, setError] = useState<string | null>(null);
  const [allHistory, setAllHistory] = useState(false);

  const isToday = date === state.today;
  const logDays = Array.from({ length: LOG_DAYS }, (_, i) => addDays(state.today, -i));
  const trendDays = lastNDays(state.today, TREND_DAYS);
  const series = trendDays.map((d) => {
    const c = logOn(d)?.bbtCelsius;
    return { label: formatDate(d, 'short').split(' ')[1] ?? d.slice(8), value: c === undefined ? null : show(c) };
  });
  const bbtValues = series.map((p) => p.value).filter((v): v is number => v !== null);
  const scale = bbtScale(bbtValues, fahrenheit);
  const trend = trendDays.map((d) => ({ d, log: logOn(d) }));
  const mucusDays = trend.filter((t) => t.log?.mucus).length;
  const testDays = trend.filter((t) => t.log?.ovulationTest).length;
  const positiveDays = trend.filter((t) => t.log?.ovulationTest === 'positive').length;
  const logged = [...state.fertility].filter(hasData).sort((a, b) => (a.date < b.date ? 1 : -1));
  const history = logged.slice(0, allHistory ? 30 : 7);
  const reading = state.articles.filter((a) => a.status === 'published' && a.lifeStage === 'fertility').slice(0, 2);

  /** Switch the day being logged and load what was already logged for it. */
  const pickDay = (d: ISODate) => {
    const l = logOn(d);
    setDate(d);
    setBbt(l?.bbtCelsius ? String(show(l.bbtCelsius)) : '');
    setMucus(l?.mucus);
    setTest(l?.ovulationTest);
    setError(null);
  };

  const save = () => {
    let temp: number | undefined;
    if (bbt.trim()) {
      const n = Number(bbt.replace(',', '.'));
      const [lo, hi] = fahrenheit ? [95, 101.3] : [35, 38.5];
      if (Number.isNaN(n) || n < lo || n > hi) return setError(`Enter a basal temperature between ${lo.toFixed(1)} and ${hi.toFixed(1)} ${unit}.`);
      temp = fahrenheit ? fahrenheitToCelsius(n) : n;
    }
    if (!temp && !mucus && !test) return setError('Add at least one observation.');
    setError(null);
    dispatch({ type: 'LOG_FERTILITY', log: { date, bbtCelsius: temp, mucus, ovulationTest: test } });
    toast(`Observations saved for ${isToday ? 'today' : formatDate(date, 'short')}`);
  };
  /** Clearing saves an empty entry for the day (the API has no delete for these logs). */
  const clearDay = () => {
    dispatch({ type: 'LOG_FERTILITY', log: { date } });
    setBbt('');
    setMucus(undefined);
    setTest(undefined);
    setError(null);
    toast(`Cleared ${isToday ? 'today' : formatDate(date, 'short')}`);
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
            <AppText variant="h3">How it works</AppText>
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

      <SectionHeader eyebrow={`Last 21 days · ${unit}`} title="Basal body temperature" />
      <Card>
        {bbtValues.length ? (
          <>
            <LineChart data={series} color={palette.lavender[500]} min={scale.min} max={scale.max} yTicks={scale.ticks} dots />
            <AppText variant="caption" muted style={{ marginTop: 4 }}>
              {unit}, last 21 days · scale {scale.min.toFixed(1)}–{scale.max.toFixed(1)} {unit}, fitted to what you logged · trends are shown as-is and are not interpreted as ovulation.
            </AppText>
          </>
        ) : (
          <EmptyState compact icon={LineChartIcon} tone="lavender" title="No temperatures yet" text="Log your basal temperature each morning to see your chart here." />
        )}
      </Card>

      <SectionHeader eyebrow="Last 21 days" title="Mucus & test results" />
      <Card>
        <View accessible accessibilityLabel={`Last 21 days: cervical mucus logged on ${mucusDays} days, ovulation test logged on ${testDays} days, ${positiveDays} entered as positive. These are your observations, not a confirmation of ovulation.`}>
          <View style={styles.trendRow}>
            <AppText variant="caption" color={palette.ink[700]} style={styles.trendLabel}>
              Mucus
            </AppText>
            <View style={styles.cells}>
              {trend.map(({ d, log }) => (
                <View key={d} style={[styles.cell, d === state.today && styles.cellToday]}>
                  {log?.mucus ? <View style={[styles.mark, { backgroundColor: MUCUS_COLOR[log.mucus] }]} /> : <View style={styles.noMark} />}
                </View>
              ))}
            </View>
          </View>
          <View style={styles.trendRow}>
            <AppText variant="caption" color={palette.ink[700]} style={styles.trendLabel}>
              Test
            </AppText>
            <View style={styles.cells}>
              {trend.map(({ d, log }) => (
                <View key={d} style={[styles.cell, d === state.today && styles.cellToday]}>
                  <TestMark result={log?.ovulationTest} />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.trendRow}>
            <View style={styles.trendLabel} />
            <View style={styles.cells}>
              {trend.map(({ d }, i) => (
                <View key={d} style={styles.cell}>
                  {(TREND_DAYS - 1 - i) % 7 === 0 ? (
                    <AppText variant="caption" color={d === state.today ? palette.lavender[700] : colors.textSubtle} style={{ fontSize: 9.5, lineHeight: 12 }} numberOfLines={1}>
                      {Number(d.slice(8, 10))}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.trendLegend}>
          {MUCUS.map((m) => (
            <View key={m.key} style={styles.legendItem}>
              <View style={[styles.mark, { backgroundColor: MUCUS_COLOR[m.key] }]} />
              <AppText variant="caption" muted>
                {m.label}
              </AppText>
            </View>
          ))}
        </View>
        <View style={[styles.trendLegend, { marginTop: 6 }]}>
          {TESTS.map((t) => (
            <View key={t.key} style={styles.legendItem}>
              <TestMark result={t.key} />
              <AppText variant="caption" muted>
                Test: {t.label.toLowerCase()}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" muted style={{ marginTop: 10 }}>
          Observations you entered, shown day by day. They are not a confirmation of ovulation and not a form of contraception.
        </AppText>
      </Card>

      <SectionHeader eyebrow="Your observations" title={isToday ? 'Log today' : `Log for ${formatDate(date, 'short')}`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow} style={{ marginHorizontal: -20, marginBottom: 10 }}>
        {logDays.map((d) => (
          <Chip key={d} label={dayChipLabel(d, state.today)} tone="lavender" selected={date === d} icon={hasData(logOn(d)) ? <View style={styles.loggedDot} /> : undefined} onPress={() => pickDay(d)} />
        ))}
      </ScrollView>
      <Card style={{ gap: 18 }}>
        <TextField
          label={`Basal temperature (${unit})`}
          value={bbt}
          onChangeText={setBbt}
          keyboardType="decimal-pad"
          placeholder={fahrenheit ? 'e.g. 97.6' : 'e.g. 36.45'}
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
        {hasData(existing) ? (
          <AppText variant="caption" muted>
            You already logged this day — saving replaces that entry.
          </AppText>
        ) : null}
        {error ? (
          <View style={styles.error}>
            <CircleAlert size={14} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} style={{ flex: 1, fontSize: 12.5 }}>
              {error}
            </AppText>
          </View>
        ) : null}
        <Button label="Save observations" size="lg" onPress={save} full />
        {hasData(existing) ? <Button label="Clear this day" icon={Eraser} variant="ghost" size="sm" onPress={clearDay} style={{ alignSelf: 'center' }} /> : null}
      </Card>

      <SectionHeader
        eyebrow={allHistory ? `${Math.min(30, logged.length)} most recent` : 'Last 7 entries'}
        title="Recent observations"
        action={logged.length > 7 ? (allHistory ? 'Show fewer' : 'Show all') : undefined}
        onAction={() => setAllHistory((v) => !v)}
      />
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
                {h.bbtCelsius ? <Pill label={`${show(h.bbtCelsius).toFixed(fahrenheit ? 1 : 2)} ${unit}`} tone="lavender" /> : null}
                {h.mucus ? <Pill label={MUCUS.find((m) => m.key === h.mucus)?.label ?? h.mucus} tone="sky" /> : null}
                {h.ovulationTest ? <Pill label={`Test: ${TESTS.find((t) => t.key === h.ovulationTest)?.label}`} tone="ink" /> : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyState compact icon={ClipboardList} tone="lavender" title="No observations yet" />
        )}
      </Card>
      <SectionHeader eyebrow="Reviewed articles" title="Learn more" action="Library" onAction={() => router.push('/learn')} />
      <View style={{ gap: 10 }}>
        {reading.map((a) => (
          <QuickHelpCard
            key={a.id}
            article={a}
            saved={state.bookmarks.includes(a.id)}
            onToggleSave={() => {
              const saved = state.bookmarks.includes(a.id);
              dispatch({ type: 'TOGGLE_BOOKMARK', articleId: a.id });
              toast(saved ? 'Removed from favorites' : 'Added to favorites');
            }}
          />
        ))}
        {reading.length === 0 ? (
          <AppText variant="small" muted>
            Fertility-awareness articles appear here once they are published.
          </AppText>
        ) : null}
      </View>
      <BackendNote style={{ marginTop: 14 }} text="Before public release, fertility features need the medical and legal review the SRS requires (§20, D-41)." />
    </Screen>
  );
}

/** Small marker for an entered ovulation-test result: filled = positive, ring = negative, "?" = not sure. */
function TestMark({ result }: { result?: FertilityLog['ovulationTest'] }) {
  if (result === 'positive') return <View style={[styles.mark, { backgroundColor: palette.lavender[600] }]} />;
  if (result === 'negative') return <View style={[styles.mark, styles.ring]} />;
  if (result === 'not_sure')
    return (
      <AppText variant="caption" color={palette.lavender[700]} style={styles.unsure}>
        ?
      </AppText>
    );
  return <View style={styles.noMark} />;
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
  dayRow: { gap: 8, paddingVertical: 4, paddingHorizontal: 20 },
  loggedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.lavender[500] },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendLabel: { width: 44 },
  cells: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  cellToday: { backgroundColor: palette.lavender[50] },
  mark: { width: 9, height: 9, borderRadius: 5 },
  ring: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: palette.ink[400] },
  noMark: { width: 3, height: 3, borderRadius: 2, backgroundColor: palette.ink[200] },
  unsure: { fontSize: 10, lineHeight: 12, fontFamily: font.bold },
  trendLegend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 6, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
