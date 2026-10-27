/** Cycle history + charts (SRS §18; Myflo "Tracker" reference) and variation note (§19 — an observed pattern, never a diagnosis). */
import { COPY, cycleStateOf, dailySeries, formatDate, symptomFrequency, type ISODate } from '@healthx/shared';
import { router } from 'expo-router';
import { Activity, CalendarRange, Droplet, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Disclaimer, PhaseBadge, Pill } from '@/components/Badges';
import { Card, SectionHeader } from '@/components/Card';
import { BarChart, Legend, LineChart } from '@/components/Charts';
import { EmptyState, SkeletonCard } from '@/components/Feedback';
import { StatTile } from '@/components/Kit';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useDemoLoading } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';

const VARIES = 4;
const mon = (iso: ISODate) => formatDate(iso, 'short').replace(/[\d\s,]/g, '');

export default function CycleHistory() {
  const { state } = useStore();
  const loading = useDemoLoading(500);
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const completed = cs.cycles.filter((c) => c.length !== null);
  const avg = cs.avgCycleLength ?? 0;
  const freq = useMemo(() => symptomFrequency(state, 90).slice(0, 6), [state]);
  const mood = useMemo(() => dailySeries(state, 30), [state]);
  const recent = completed.slice(-8);
  const varies = (len: number | null) => len !== null && avg > 0 && Math.abs(len - avg) >= VARIES;
  const lastVaries = recent.map((c) => varies(c.length)).lastIndexOf(true);
  const lens = recent.map((c) => c.length ?? avg);
  const lo = Math.min(...lens, avg) - 3;
  const hi = Math.max(...lens, avg) + 3;
  const scale = Math.max(35, ...cs.cycles.map((c) => c.length ?? 0), avg);
  const all = [...cs.cycles].reverse();

  return (
    <Screen back largeTitle eyebrow="Tracker" title="Cycle history" subtitle="Your logged cycles month by month — lengths, periods and trends.">
      {loading ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <SkeletonCard height={70} />
              </View>
            ))}
          </View>
          <SkeletonCard height={220} />
          <SkeletonCard />
        </View>
      ) : completed.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarRange} tone="rose" title="No completed cycles yet" text="Once you've logged two periods, your cycle lengths and trends appear here." action="Log a period" onAction={() => router.push('/log-period')} />
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile tone="green" label="Avg cycle" value={cs.avgCycleLength ? `${cs.avgCycleLength} d*` : '—'} icon={<CalendarRange size={18} color={palette.green[700]} />} />
            <StatTile tone="rose" label="Avg period" value={cs.avgPeriodLength ? `${cs.avgPeriodLength} d*` : '—'} icon={<Droplet size={18} color={palette.rose[500]} fill={palette.rose[200]} />} />
            <StatTile tone="lavender" label="Variation" value={cs.spread != null ? `± ${Math.round(cs.spread / 2)} d` : '—'} icon={<Activity size={18} color={palette.lavender[600]} />} />
          </View>

          {/* Cycle length trend with the "varies" band (Myflo Tracker) */}
          <Card tone="lavender" style={styles.trend}>
            <View style={styles.trendHead}>
              <View style={{ flex: 1 }}>
                <AppText variant="overline" color={palette.lavender[700]}>
                  Cycle length
                </AppText>
                <AppText variant="title" style={{ marginTop: 2 }}>
                  {avg} days<AppText variant="title" color={palette.lavender[500]}>*</AppText>
                </AppText>
                <AppText variant="small" muted style={{ marginTop: 2 }}>
                  Average (estimated) · spread {cs.spread ?? '—'} days
                </AppText>
              </View>
              {lastVaries >= 0 ? <Pill label="Pattern noted" tone="lavender" /> : <Pill label="Consistent" tone="green" />}
            </View>
            <LineChart
              data={recent.map((c) => ({ label: mon(c.start), value: c.length }))}
              min={lo}
              max={hi}
              color={palette.lavender[500]}
              yTicks={[avg]}
              dots
              highlight={lastVaries >= 0 ? { index: lastVaries, label: 'Irregular' } : undefined}
              height={190}
            />
            <Legend
              items={[
                { color: palette.lavender[500], label: 'Cycle length' },
                { color: palette.lavender[200], label: `Differs ≥${VARIES} days from your average` },
                { color: palette.ink[300], label: 'Average (estimated)', dashed: true },
              ]}
            />
          </Card>

          {cs.isRegular === false ? (
            <Disclaimer tone="rose" title="Observed pattern — not a diagnosis" style={{ marginTop: 12 }} text={`${COPY.irregular} ${COPY.concern}`} />
          ) : (
            <Disclaimer tone="lavender" style={{ marginTop: 12 }} text="Your recent cycle lengths look fairly consistent. This is an observed pattern, not a diagnosis." />
          )}

          {/* Cycle bars (Myflo / Mira) */}
          <SectionHeader eyebrow="Every logged cycle" title="All cycles" />
          <Card style={{ gap: 2 }}>
            {all.map((c, i) => {
              const len = c.length ?? Math.max(c.periodLength ?? 0, cs.cycleDay ?? 0);
              const pl = c.periodLength ?? 0;
              const flag = varies(c.length);
              return (
                <View key={c.start} style={[styles.cycleRow, i < all.length - 1 && styles.border]} accessibilityLabel={`${formatDate(c.start, 'month')}: ${c.length ? `${c.length} day cycle` : 'in progress'}, period ${c.periodLength ?? 'unknown'} days`}>
                  <View style={{ width: 54 }}>
                    <AppText style={styles.cycleMonth}>{mon(c.start)}</AppText>
                    <AppText variant="caption" muted>
                      {c.start.slice(0, 4)}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={[styles.track, flag && styles.trackFlag]}>
                      <View style={[styles.seg, { width: `${(pl / scale) * 100}%`, backgroundColor: palette.rose[400] }]} />
                      <View style={[styles.seg, c.length ? { width: `${((len - pl) / scale) * 100}%`, backgroundColor: flag ? palette.lavender[300] : palette.green[300] } : styles.segOpen, !c.length && { width: `${(Math.max(0, len - pl) / scale) * 100}%` }]} />
                    </View>
                    <AppText variant="caption" color={palette.ink[600]}>
                      {c.periodLength ? `Period ${c.periodLength} d` : 'Period —'}
                      {flag ? ' · varies from your average' : ''}
                    </AppText>
                  </View>
                  <View style={{ width: 92, alignItems: 'flex-end' }}>
                    {c.length ? (
                      <AppText style={[styles.cycleLen, flag && { color: palette.lavender[700] }]}>
                        {c.length}
                        <AppText variant="caption" muted>
                          {' '}days
                        </AppText>
                      </AppText>
                    ) : (
                      <Pill label="In progress" tone="green" />
                    )}
                  </View>
                </View>
              );
            })}
          </Card>

          <SectionHeader eyebrow="Logged days" title="Period duration" />
          <Card>
            <BarChart data={recent.map((c) => ({ label: mon(c.start), value: c.periodLength }))} color={palette.rose[400]} showValues height={150} />
          </Card>

          <SectionHeader eyebrow="Last 90 days" title="Symptom trends" />
          <Card>
            {freq.length ? (
              <BarChart data={freq.map((f) => ({ label: f.label.split(' ')[0].slice(0, 8), value: f.count }))} color={palette.peach[400]} showValues height={160} />
            ) : (
              <EmptyState compact tone="peach" icon={Plus} title="No symptoms logged" action="Log symptoms" onAction={() => router.push('/symptoms')} />
            )}
          </Card>

          <SectionHeader eyebrow="Last 30 days" title="Mood trend" />
          <Card>
            <LineChart data={mood.map((d) => ({ label: d.label, value: d.mood }))} min={1} max={5} color={palette.lavender[500]} yTicks={[1, 3, 5]} />
            <AppText variant="caption" muted style={{ marginTop: 4 }}>
              1 = very low · 5 = excellent
            </AppText>
          </Card>
          <View style={styles.premium}>
            <PhaseBadge phase={2} />
            <AppText variant="caption" color={palette.ink[700]} style={{ flex: 1 }}>
              Advanced cycle analytics (variability over time, longer ranges) arrive with Premium in Phase 2.
            </AppText>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  trend: { marginTop: 14 },
  trendHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  cycleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  cycleMonth: { fontFamily: font.display, fontSize: 16, lineHeight: 20, color: colors.text },
  cycleLen: { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: colors.text },
  track: { flexDirection: 'row', height: 14, borderRadius: 7, backgroundColor: palette.ink[50], overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  trackFlag: { borderColor: palette.lavender[300] },
  seg: { height: '100%' },
  segOpen: { backgroundColor: palette.green[100], borderStyle: 'dashed', borderWidth: 1, borderColor: palette.green[400], borderTopRightRadius: 7, borderBottomRightRadius: 7 },
  premium: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: palette.butter[50], borderRadius: 16, padding: 12 },
});
