/**
 * Rules-based wellness report (SRS §36, §61; mockup M30) for the last week, the last 30 days
 * or the current cycle. Every number is deterministic (§37) — no causal claims. Each view uses its
 * own `weeklySummary(state, today, n)` window. The weekly view is free; the monthly and cycle views
 * are Premium (advanced reports).
 */
import { COPY, PHASES, cycleStateOf, diffDays, formatDate, weeklySummary, type AppState } from '@healthx/shared';
import { CalendarDays, CalendarHeart, Droplets, Dumbbell, Footprints, Moon, Smile, Sparkles, Target, TrendingUp, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';

import { EstimateNote, PhaseBadge } from './Badges';
import { Card } from './Card';
import { BarChart } from './Charts';
import { PremiumGate } from './PremiumGate';
import { AppText } from './Text';
import { GroupHeader, HeroPanel, StatCardB, TintIcon, ON_DARK } from './b-kit';
import { useStore } from '@/lib/store';
import { font, palette } from '@/lib/theme';

export type ReportPeriod = 'weekly' | 'monthly' | 'cycle';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Days in the view, always ending today: 7, 30, or the current cycle so far (max 60). */
function daysIn(s: AppState, period: ReportPeriod): number {
  if (period === 'weekly') return 7;
  if (period === 'monthly') return 30;
  const start = cycleStateOf(s).currentCycleStart;
  if (!start) return 28;
  return Math.max(1, Math.min(60, diffDays(start, s.today) + 1));
}

function summarize(s: AppState, period: ReportPeriod) {
  const n = daysIn(s, period);
  const w = weeklySummary(s, s.today, n);
  const start = cycleStateOf(s).currentCycleStart;
  const firstCycleDay = period === 'cycle' && start ? diffDays(start, w.start) + 1 : null;
  // Energy chart: daily for a week, weekly averages for longer periods.
  const bars =
    period === 'weekly'
      ? w.days.map((d) => ({ label: d.label, value: d.energy }))
      : Array.from({ length: Math.ceil(w.days.length / 7) }, (_, i) => {
          const e = avg(
            w.days
              .slice(i * 7, i * 7 + 7)
              .map((d) => d.energy)
              .filter((x): x is number => typeof x === 'number'),
          );
          return { label: firstCycleDay !== null ? `D${firstCycleDay + i * 7}` : `W${i + 1}`, value: e === null ? null : Math.round(e * 10) / 10 };
        });
  return { ...w, count: n, bars, stepBars: w.days.map((d) => ({ label: d.label, value: d.steps })) };
}

const TITLE: Record<ReportPeriod, string> = { weekly: 'Your weekly wellness', monthly: 'Your last 30 days', cycle: 'This cycle so far' };

export function WeeklyReport({ period = 'weekly', illustrated }: { period?: ReportPeriod; /** Larger illustrated hero (Weekly report screen). */ illustrated?: boolean }) {
  const { state } = useStore();
  const gid = 'wr' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const r = useMemo(() => summarize(state, period), [state, period]);
  const sleepText = r.avgSleep !== null ? `${Math.floor(r.avgSleep)}h ${Math.round((r.avgSleep % 1) * 60)}m` : '—';
  const stepsText = r.steps >= 100000 ? `${Math.round(r.steps / 1000)}k` : r.steps.toLocaleString();
  // Phases are estimates (the menstrual phase comes from logged period days), same marker as cycleText.
  const phaseLabel = r.phase ? `${PHASES[r.phase].short}${r.phase === 'menstrual' ? '' : '*'}` : null;
  const cycleLine = r.cycleDay ? `Cycle · Day ${r.cycleDay}${phaseLabel ? ` · ${phaseLabel}` : ''}` : null;

  const pct = Math.min(100, (r.checkIns / Math.max(1, r.count)) * 100);
  const hero = illustrated ? (
    <View style={styles.ilHero} testID="report-hero">
      <LinearGradient colors={[palette.green[800], palette.green[900], palette.green[950]]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* decorative chart (an illustration, not data) */}
      <View style={styles.ilChart} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 140 110">
          <Defs>
            <SvgGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#8FD9AE" stopOpacity={0.85} />
              <Stop offset="1" stopColor="#3E9C6E" stopOpacity={0.35} />
            </SvgGradient>
          </Defs>
          {[[8, 72], [36, 58], [64, 56], [92, 42], [120, 26]].map(([x, y]) => (
            <Rect key={x} x={x} y={y} width={18} height={104 - y} rx={7} fill={`url(#${gid})`} />
          ))}
          <Path d="M2 46 C26 46 44 22 70 18 C92 15 104 22 118 6" stroke="#CFF3DD" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.9} />
          <Circle cx={118} cy={6} r={4} fill="#E6FBEF" />
        </Svg>
      </View>
      <View style={styles.ilDate}>
        <CalendarDays size={18} color="rgba(255,255,255,0.85)" />
        <AppText style={styles.ilDateText} numberOfLines={1}>
          {`${formatDate(r.start, 'short')} – ${formatDate(r.end, 'short')} · ${r.count} days`.toUpperCase()}
        </AppText>
      </View>
      <AppText style={styles.ilTitle}>{TITLE[period]}</AppText>
      {cycleLine ? <AppText style={styles.ilCycle}>{cycleLine}</AppText> : null}
      <View style={styles.checkRow}>
        <View style={styles.ilBar}>
          <LinearGradient colors={['#4FD08A', '#8FE0B0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.ilFill, { width: `${pct}%` }]} />
        </View>
        <AppText style={styles.ilCheck}>
          {r.checkIns}/{r.count} check-ins
        </AppText>
      </View>
    </View>
  ) : (
    <HeroPanel>
      <AppText variant="overline" color={ON_DARK.soft}>
        {formatDate(r.start, 'short')} – {formatDate(r.end, 'short')} · {r.count} days
      </AppText>
      <AppText variant="title" color="#fff" style={{ marginTop: 4 }}>
        {TITLE[period]}
      </AppText>
      {cycleLine ? (
        <AppText variant="smallMedium" color={ON_DARK.text} style={{ marginTop: 2 }}>
          {cycleLine}
        </AppText>
      ) : null}
      <View style={styles.checkRow}>
        <View style={styles.checkBar}>
          <View style={[styles.checkFill, { width: `${Math.min(100, (r.checkIns / Math.max(1, r.count)) * 100)}%` }]} />
        </View>
        <AppText variant="smallMedium" color={ON_DARK.text}>
          {r.checkIns}/{r.count} check-ins
        </AppText>
      </View>
    </HeroPanel>
  );

  const body = (
    <>
      <View style={styles.grid}>
        <StatCardB compact icon={CalendarHeart} tone="rose" label="Cycle" value={r.cycleDay ? `Day ${r.cycleDay}` : '—'} sub={phaseLabel ?? undefined} style={styles.cell} />
        <StatCardB compact icon={Footprints} tone="green" label="Steps" value={stepsText} style={styles.cell} />
        <StatCardB compact icon={Dumbbell} tone="peach" label="Workouts" value={String(r.workouts)} style={styles.cell} />
        <StatCardB compact icon={Moon} tone="indigo" label="Sleep avg" value={sleepText} style={styles.cell} />
        <StatCardB compact icon={Droplets} tone="sky" label="Hydration" value={`${r.hydrationPct}%`} style={styles.cell} />
        <StatCardB compact icon={Smile} tone="lavender" label="Mood" value={r.moodSummary} style={styles.cell} />
      </View>
      {phaseLabel?.endsWith('*') ? <EstimateNote compact style={{ marginTop: 10 }} text={`${COPY.estimate} ${COPY.ovulationNotConfirmed}`} /> : null}

      <GroupHeader eyebrow={`Average ${r.avgEnergy ?? '—'}/10`} title={period === 'weekly' ? 'Energy this week' : 'Average energy'} />
      <Card>
        <View style={styles.cardHead}>
          <TintIcon icon={Zap} tone="peach" size={34} />
          <AppText variant="caption" muted style={{ flex: 1 }}>
            Energy from your check-ins (1–10){period === 'weekly' ? '' : ' · each bar is a 7-day average'}
          </AppText>
        </View>
        <BarChart data={r.bars} color={palette.peach[400]} height={140} showValues />
      </Card>

      <View style={styles.pattern}>
        <View style={styles.cardHead}>
          <TintIcon icon={TrendingUp} tone="lavender" size={34} solid />
          <AppText variant="overline" color={palette.lavender[700]}>
            Your pattern
          </AppText>
        </View>
        <AppText variant="body">{r.pattern ?? 'Not enough data for a pattern yet — keep checking in.'}</AppText>
      </View>
      <View style={styles.focus}>
        <View style={styles.focusIcon}>
          <Target size={20} color={palette.green[950]} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color={ON_DARK.soft}>
            Suggested focus
          </AppText>
          <AppText variant="bodyBold" color="#fff" style={{ marginTop: 2 }}>
            {r.focus}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" muted style={{ marginTop: 8, fontStyle: 'italic' }}>
        {COPY.observedPattern} Observed patterns, not medical conclusions.
      </AppText>

      {period === 'weekly' ? (
        <>
          <GroupHeader eyebrow={`Goal ${state.stepTarget.toLocaleString()} a day`} title="Steps this week" />
          <Card>
            <BarChart data={r.stepBars} target={state.stepTarget} color={palette.green[400]} height={150} />
          </Card>
        </>
      ) : null}
      <View style={styles.ai}>
        <Sparkles size={16} color={palette.butter[600]} />
        <View style={{ flex: 1, gap: 6 }}>
          <PhaseBadge phase={2} />
          <AppText variant="caption" muted>
            An AI-written narrative of this report is a Phase 2 Premium feature. Numbers always come from the rules engine.
          </AppText>
        </View>
      </View>
    </>
  );

  if (period === 'weekly') {
    return (
      <View>
        {hero}
        {body}
      </View>
    );
  }
  return (
    <View>
      <PremiumGate
        feature="advanced_reports"
        preview={
          <>
            {hero}
            <View style={{ height: 14 }} />
          </>
        }>
        {hero}
        {body}
      </PremiumGate>
    </View>
  );
}

const styles = StyleSheet.create({
  ilHero: { minHeight: 182, justifyContent: 'space-between', borderRadius: 28, padding: 18, paddingVertical: 20, overflow: 'hidden', shadowColor: '#0D4336', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ilChart: { position: 'absolute', right: 14, top: 46, width: 104, height: 82 },
  ilDate: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ilDateText: { fontFamily: font.monoMedium, fontSize: 11.5, letterSpacing: 1.2, color: 'rgba(255,255,255,0.82)', flexShrink: 1 },
  ilTitle: { fontFamily: font.displayBold, fontSize: 25, lineHeight: 31, letterSpacing: -0.5, color: '#FFFFFF', marginTop: 10, paddingRight: 104 },
  ilCycle: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: '#FFFFFF', marginTop: 2, paddingRight: 104 },
  ilBar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  ilFill: { height: '100%', borderRadius: 5 },
  ilCheck: { fontFamily: font.semibold, fontSize: 14, color: '#FFFFFF' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  checkBar: { flex: 1, height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  checkFill: { height: '100%', borderRadius: 8, backgroundColor: palette.butter[400] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 14 },
  cell: { width: '48.6%', flexGrow: 0, flexShrink: 0, flexBasis: '48.6%' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  pattern: { marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: palette.lavender[50], borderWidth: 1, borderColor: palette.lavender[100] },
  focus: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 24, backgroundColor: palette.green[900] },
  focusIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.butter[400], alignItems: 'center', justifyContent: 'center' },
  ai: { flexDirection: 'row', gap: 10, marginTop: 16, padding: 14, borderRadius: 20, backgroundColor: palette.butter[50], borderWidth: 1, borderColor: palette.butter[100] },
});
