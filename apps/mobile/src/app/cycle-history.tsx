/**
 * Cycle history + charts (SRS §18; Myflo "Tracker" reference) and variation note (§19 — an observed
 * pattern, never a diagnosis). The stat tiles, the variation notice and the list of cycles are free;
 * the charts, the weekly symptom trend and the patterns by estimated phase are Premium
 * (advanced cycle history). Phases are calendar estimates.
 */
import { COPY, CYCLE_RULES, PHASES, cycleStateOf, dailySeries, formatDate, phasePatterns, symptomFrequency, weeklySymptomTrend, type ISODate } from '@healthx/shared';
import { router } from 'expo-router';
import { Activity, CalendarRange, Droplet, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Disclaimer, EstimateNote, PhaseBadge, Pill } from '@/components/Badges';
import { Card, SectionHeader } from '@/components/Card';
import { BarChart, Legend, LineChart } from '@/components/Charts';
import { EmptyState, SkeletonCard } from '@/components/Feedback';
import { Chip } from '@/components/Inputs';
import { StatTile } from '@/components/Kit';
import { PremiumGate, usePremium } from '@/components/PremiumGate';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useDemoLoading } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { colors, font, palette, phaseColors } from '@/lib/theme';

const VARIES = 4;
const mon = (iso: ISODate) => formatDate(iso, 'short').replace(/[\d\s,]/g, '');
const plausible = (len: number) => len >= CYCLE_RULES.plausibleCycle.min && len <= CYCLE_RULES.plausibleCycle.max;

export default function CycleHistory() {
  const { state } = useStore();
  const premium = usePremium();
  const loading = useDemoLoading(500);
  const [symptomId, setSymptomId] = useState<string | null>(null);
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const completed = cs.cycles.filter((c) => c.length !== null);
  const avg = cs.avgCycleLength ?? 0;
  const freq = useMemo(() => symptomFrequency(state, 90).slice(0, 6), [state]);
  const weekly = useMemo(() => weeklySymptomTrend(state, 8, symptomId ?? undefined), [state, symptomId]);
  const patterns = useMemo(() => phasePatterns(state), [state]);
  const mood = useMemo(() => dailySeries(state, 30), [state]);
  const recent = completed.slice(-8);
  const varies = (len: number | null) => len !== null && avg > 0 && Math.abs(len - avg) >= VARIES;
  // Same rule as the notice below: cycleStateOf flags variation when the spread of the last
  // CYCLE_RULES.averagingWindow plausible cycles is over CYCLE_RULES.irregularSpread days (isRegular === false).
  // Only then does the chart highlight a cycle — the one furthest from the average — so the two can't disagree.
  const irregular = cs.isRegular === false;
  const avgWindow = completed.filter((c) => plausible(c.length as number)).slice(-CYCLE_RULES.averagingWindow);
  const outlier = irregular && avgWindow.length ? avgWindow.reduce((a, b) => (Math.abs((b.length as number) - avg) > Math.abs((a.length as number) - avg) ? b : a)) : null;
  const highlightIndex = outlier ? recent.findIndex((c) => c.start === outlier.start) : -1;
  const lens = recent.map((c) => c.length ?? avg);
  const lo = Math.min(...lens, avg) - 3;
  const hi = Math.max(...lens, avg) + 3;
  const scale = Math.max(35, ...cs.cycles.map((c) => c.length ?? 0), avg);
  const all = [...cs.cycles].reverse();
  const patternCycles = Math.min(4, cs.cycles.filter((c) => c.length !== null && c.end !== null).length);
  const hasPatterns = patterns.some((p) => p.avgEnergy !== null || p.avgMood !== null || p.symptomLogs > 0);
  const hasWeekly = weekly.some((w) => w.count > 0);

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

          {/* Cycle length trend with the "varies" band (Myflo Tracker) — Premium chart */}
          {premium ? (
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
                {irregular ? <Pill label="Pattern noted" tone="lavender" /> : cs.isRegular ? <Pill label="Consistent" tone="green" /> : <Pill label="Too early to tell" tone="ink" />}
              </View>
              <LineChart
                data={recent.map((c) => ({ label: mon(c.start), value: c.length }))}
                min={lo}
                max={hi}
                color={palette.lavender[500]}
                yTicks={[avg]}
                dots
                highlight={highlightIndex >= 0 ? { index: highlightIndex, label: 'Irregular' } : undefined}
                height={190}
              />
              <Legend
                items={[
                  { color: palette.lavender[500], label: 'Cycle length' },
                  { color: palette.lavender[200], label: `Varies: spread over ${CYCLE_RULES.irregularSpread} days` },
                  { color: palette.ink[300], label: 'Average (estimated)', dashed: true },
                ]}
              />
            </Card>
          ) : null}

          {irregular ? (
            <Disclaimer tone="rose" title="Observed pattern — not a diagnosis" style={{ marginTop: 12 }} text={`${COPY.irregular} ${COPY.concern}`} />
          ) : cs.isRegular ? (
            <Disclaimer tone="lavender" style={{ marginTop: 12 }} text="Your recent cycle lengths look fairly consistent. This is an observed pattern, not a diagnosis." />
          ) : (
            <Disclaimer tone="lavender" style={{ marginTop: 12 }} text="Log a few more cycles to see how consistent your cycle lengths are. This is an observed pattern, not a diagnosis." />
          )}

          {/* Cycle bars (Myflo / Mira) — free */}
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

          <PremiumGate feature="advanced_cycle_history" preview={<SectionHeader eyebrow="Advanced cycle history" title="Charts & patterns" />}>
            <SectionHeader eyebrow="Logged days" title="Period duration" />
            <Card>
              <BarChart data={recent.map((c) => ({ label: mon(c.start), value: c.periodLength }))} color={palette.rose[400]} showValues height={150} />
            </Card>

            <SectionHeader eyebrow="Logs per week · last 8 weeks" title="Symptom trend" />
            <Card>
              {freq.length ? (
                <View style={styles.chips}>
                  <Chip label="All symptoms" tone="peach" selected={symptomId === null} onPress={() => setSymptomId(null)} />
                  {freq.slice(0, 3).map((f) => (
                    <Chip key={f.id} label={f.label} tone="peach" selected={symptomId === f.id} onPress={() => setSymptomId(f.id)} />
                  ))}
                </View>
              ) : null}
              {hasWeekly ? (
                <BarChart data={weekly.map((w) => ({ label: formatDate(w.weekStart, 'dayMonth'), value: w.count }))} color={palette.peach[400]} showValues height={160} />
              ) : (
                <EmptyState compact tone="peach" icon={Plus} title="No symptoms logged in the last 8 weeks" action="Log symptoms" onAction={() => router.push('/symptoms')} />
              )}
              <AppText variant="caption" muted style={{ marginTop: 6 }}>
                Each bar is one week, starting Monday. {COPY.observedPattern}
              </AppText>
            </Card>

            <SectionHeader eyebrow="Last 90 days" title="Most-logged symptoms" />
            <Card>
              {freq.length ? (
                <BarChart data={freq.map((f) => ({ label: f.label.split(' ')[0].slice(0, 8), value: f.count }))} color={palette.peach[400]} showValues height={160} />
              ) : (
                <EmptyState compact tone="peach" icon={Plus} title="No symptoms logged" action="Log symptoms" onAction={() => router.push('/symptoms')} />
              )}
            </Card>

            <SectionHeader eyebrow="Observed pattern · estimated phases" title="Patterns by estimated phase" />
            <Card>
              {hasPatterns ? (
                <>
                  {patterns.map((p, i) => (
                    <View
                      key={p.phase}
                      style={[styles.phaseRow, i < patterns.length - 1 && styles.border]}
                      accessible
                      accessibilityLabel={`${PHASES[p.phase].label}: average energy ${p.avgEnergy ?? 'not logged'} of 10, average mood ${p.avgMood ?? 'not logged'} of 5, ${p.symptomLogs} symptom logs over ${p.days} days`}>
                      <View style={styles.phaseHead}>
                        <View style={[styles.phaseDot, { backgroundColor: phaseColors[p.phase].solid }]} />
                        <AppText variant="bodyMedium" style={{ flex: 1 }}>
                          {PHASES[p.phase].short}
                          {p.phase === 'menstrual' ? '' : '*'}
                        </AppText>
                        <AppText variant="caption" muted>
                          {p.days} days
                        </AppText>
                      </View>
                      <View style={styles.phaseStats}>
                        <PhaseStat label="Energy" value={p.avgEnergy === null ? '—' : `${p.avgEnergy}/10`} />
                        <PhaseStat label="Mood" value={p.avgMood === null ? '—' : `${p.avgMood}/5`} />
                        <PhaseStat label="Symptoms" value={String(p.symptomLogs)} />
                      </View>
                    </View>
                  ))}
                  <AppText variant="caption" muted style={{ marginTop: 10 }}>
                    Average check-in energy and mood, and symptom logs, by estimated phase across your last {patternCycles} completed cycle{patternCycles === 1 ? '' : 's'}. {COPY.observedPattern}
                  </AppText>
                </>
              ) : (
                <EmptyState compact tone="lavender" icon={Plus} title="Not enough logs yet" text="Check in and log symptoms through a full cycle to see patterns by phase." action="Check in" onAction={() => router.push('/check-in')} />
              )}
            </Card>
            <EstimateNote compact style={{ marginTop: 10 }} text={`${COPY.estimate} Phases are calendar estimates (ovulation about 14 days before the next period). ${COPY.ovulationNotConfirmed}`} />

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
                Advanced cycle history is part of Premium. Patterns describe what you logged — never a diagnosis.
              </AppText>
            </View>
          </PremiumGate>
        </>
      )}
    </Screen>
  );
}

function PhaseStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.phaseStat}>
      <AppText variant="overline" color={colors.textSubtle} style={{ fontSize: 9.5 }} numberOfLines={1}>
        {label}
      </AppText>
      <AppText style={styles.phaseValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  phaseRow: { paddingVertical: 12, gap: 8 },
  phaseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  phaseStats: { flexDirection: 'row', gap: 8 },
  phaseStat: { flex: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: palette.ink[50], borderWidth: 1, borderColor: palette.ink[100] },
  phaseValue: { fontFamily: font.display, fontSize: 16, lineHeight: 21, color: colors.text, marginTop: 1 },
  premium: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: palette.butter[50], borderRadius: 16, padding: 12 },
});
