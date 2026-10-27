/**
 * Rules-based wellness report (SRS §36, §61; mockup M30) for the last week, the last 30 days
 * or the current cycle. Every number is deterministic (§37) — no causal claims.
 */
import {
  COPY,
  addDays,
  checkInOn,
  cycleStateOf,
  diffDays,
  formatDate,
  lastNDays,
  sleepHoursOn,
  stepsOn,
  waterOn,
  weeklySummary,
  workoutsOn,
  type AppState,
  type ISODate,
} from '@healthx/shared';
import { CalendarHeart, Droplets, Dumbbell, Footprints, Moon, Smile, Sparkles, Target, TrendingUp, Zap } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PhaseBadge } from './Badges';
import { Card } from './Card';
import { BarChart } from './Charts';
import { AppText } from './Text';
import { GroupHeader, HeroPanel, StatCardB, TintIcon, ON_DARK } from './b-kit';
import { useStore } from '@/lib/store';
import { palette } from '@/lib/theme';

export type ReportPeriod = 'weekly' | 'monthly' | 'cycle';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function daysFor(s: AppState, period: ReportPeriod): ISODate[] {
  if (period === 'weekly') return lastNDays(s.today, 7);
  if (period === 'monthly') return lastNDays(s.today, 30);
  const start = cycleStateOf(s).currentCycleStart;
  if (!start) return lastNDays(s.today, 28);
  const n = Math.min(60, diffDays(start, s.today) + 1);
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}

function summarize(s: AppState, period: ReportPeriod) {
  const w = weeklySummary(s);
  const days = daysFor(s, period);
  const checks = days.map((d) => checkInOn(s, d)).filter((c): c is NonNullable<typeof c> => !!c);
  const positive = checks.filter((c) => c.mood === 'good' || c.mood === 'excellent').length;
  const sleeps = days.map((d) => sleepHoursOn(s, d)).filter((x): x is number => x !== null);
  const avgSleep = avg(sleeps);
  const hydration = avg(days.map((d) => Math.min(1, waterOn(s, d) / s.waterTargetMl))) ?? 0;
  const energy = avg(checks.map((c) => c.energy));
  // Energy chart: daily for a week, weekly averages for longer periods.
  const bars =
    period === 'weekly'
      ? days.map((d) => ({ label: formatDate(d, 'weekday'), value: checkInOn(s, d)?.energy ?? null }))
      : Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => {
          const chunk = days.slice(i * 7, i * 7 + 7);
          const e = avg(chunk.map((d) => checkInOn(s, d)?.energy).filter((x): x is number => typeof x === 'number'));
          return { label: period === 'cycle' ? `D${i * 7 + 1}` : `W${i + 1}`, value: e === null ? null : Math.round(e * 10) / 10 };
        });
  return {
    start: days[0],
    end: days[days.length - 1],
    count: days.length,
    cycleDay: w.cycleDay,
    steps: days.reduce((a, d) => a + stepsOn(s, d), 0),
    workouts: days.reduce((a, d) => a + workoutsOn(s, d).length, 0),
    avgSleep,
    hydrationPct: Math.round(hydration * 100),
    moodSummary: !checks.length ? 'Not enough check-ins' : positive / checks.length >= 0.6 ? 'Mostly positive' : positive / checks.length >= 0.35 ? 'Mixed' : 'Mostly low',
    avgEnergy: energy === null ? null : Math.round(energy * 10) / 10,
    checkIns: checks.length,
    pattern: w.pattern,
    focus: w.focus,
    bars,
    stepBars: w.days.map((d) => ({ label: d.label, value: d.steps })),
  };
}

const TITLE: Record<ReportPeriod, string> = { weekly: 'Your weekly wellness', monthly: 'Your last 30 days', cycle: 'This cycle so far' };

export function WeeklyReport({ period = 'weekly' }: { period?: ReportPeriod }) {
  const { state } = useStore();
  const r = useMemo(() => summarize(state, period), [state, period]);
  const sleepText = r.avgSleep !== null ? `${Math.floor(r.avgSleep)}h ${Math.round((r.avgSleep % 1) * 60)}m` : '—';
  const stepsText = r.steps >= 100000 ? `${Math.round(r.steps / 1000)}k` : r.steps.toLocaleString();
  return (
    <View>
      <HeroPanel>
        <AppText variant="overline" color={ON_DARK.soft}>
          {formatDate(r.start, 'short')} – {formatDate(r.end, 'short')} · {r.count} days
        </AppText>
        <AppText variant="title" color="#fff" style={{ marginTop: 4 }}>
          {TITLE[period]}
        </AppText>
        <View style={styles.checkRow}>
          <View style={styles.checkBar}>
            <View style={[styles.checkFill, { width: `${Math.min(100, (r.checkIns / Math.max(1, r.count)) * 100)}%` }]} />
          </View>
          <AppText variant="smallMedium" color={ON_DARK.text}>
            {r.checkIns}/{r.count} check-ins
          </AppText>
        </View>
      </HeroPanel>

      <View style={styles.grid}>
        <StatCardB compact icon={CalendarHeart} tone="rose" label="Cycle" value={r.cycleDay ? `Day ${r.cycleDay}` : '—'} style={styles.cell} />
        <StatCardB compact icon={Footprints} tone="green" label="Steps" value={stepsText} style={styles.cell} />
        <StatCardB compact icon={Dumbbell} tone="peach" label="Workouts" value={String(r.workouts)} style={styles.cell} />
        <StatCardB compact icon={Moon} tone="indigo" label="Sleep avg" value={sleepText} style={styles.cell} />
        <StatCardB compact icon={Droplets} tone="sky" label="Hydration" value={`${r.hydrationPct}%`} style={styles.cell} />
        <StatCardB compact icon={Smile} tone="lavender" label="Mood" value={r.moodSummary} style={styles.cell} />
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
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

