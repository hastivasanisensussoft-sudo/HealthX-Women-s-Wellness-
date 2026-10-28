/**
 * Insights (SRS §17, §36, §37, §61): forest summary hero, rule-based observed patterns, trend charts, report scopes and the score breakdown.
 * Phase-1 insights, trends and the weekly report are free; Phase-2 insight rules are Premium (advanced insights).
 */
import { COPY, addDays, computeInsights, dailySeries, formatDate, wellnessScore, weeklySummary, type Insight } from '@healthx/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Droplets, Footprints, Lightbulb, Moon, Smile, Zap, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { BarChart, LineChart } from '@/components/Charts';
import { EmptyState, SkeletonList } from '@/components/Feedback';
import { InsightCard } from '@/components/InsightCard';
import { Chip, Segmented } from '@/components/Inputs';
import { PremiumGate, usePremium } from '@/components/PremiumGate';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { ScoreHero, WeekChip } from '@/components/ScoreHero';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { WeeklyReport, type ReportPeriod } from '@/components/WeeklyReport';
import { PageIntro, TintIcon, type Tone } from '@/components/b-kit';
import { useDemoLoading } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Tab = 'insights' | 'trends' | 'weekly' | 'score';

const avgOf = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export default function InsightsTab() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  // A tab chosen in-screen wins until the route's ?tab= param changes.
  const [picked, setPicked] = useState<{ param?: Tab; tab: Tab } | null>(null);
  const tab: Tab = picked && picked.param === params.tab ? picked.tab : params.tab ?? 'insights';
  const setTab = (t: Tab) => setPicked({ param: params.tab, tab: t });
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const loading = useDemoLoading(450);
  const premium = usePremium();
  const insights = useMemo(() => computeInsights(state), [state]);
  // Phase-2 rules (patterns across cycles) are advanced insights — Premium.
  const basic = useMemo(() => insights.filter((i) => i.phase !== 2), [insights]);
  const locked = premium ? 0 : insights.length - basic.length;
  const shown = premium ? insights.length : basic.length;
  const insightCard = (i: Insight) => (
    <InsightCard
      key={i.id}
      insight={i}
      onDismiss={() => {
        dispatch({ type: 'DISMISS_INSIGHT', id: i.id });
        toast('Insight dismissed', 'info');
      }}
    />
  );
  const series = useMemo(() => dailySeries(state, range), [state, range]);
  const week = useMemo(() => weeklySummary(state), [state]);
  const score = useMemo(() => wellnessScore(state), [state]);
  // Hero card: its own week (default: the 7 days ending today), chosen from the header chip.
  const [heroEnd, setHeroEnd] = useState(state.today);
  const [weekOpen, setWeekOpen] = useState(false);
  const heroScore = useMemo(() => (heroEnd === state.today ? score : wellnessScore(state, heroEnd)), [state, heroEnd, score]);
  const heroWeek = useMemo(() => (heroEnd === state.today ? week : weeklySummary(state, heroEnd)), [state, heroEnd, week]);
  const heroDays = useMemo(() => dailySeries(state, 7, heroEnd), [state, heroEnd]);
  const weekLabel = (end: string) => `${formatDate(addDays(end, -6), 'short')} – ${formatDate(end, 'short')}`;
  const fmt = (v: number | null, d = 1) => (v === null ? '—' : v.toFixed(d));
  // Bars are narrow: full labels for a week, day numbers for two weeks, none for a month.
  const barLabel = (date: string, label: string) => (range === 7 ? label : range === 14 ? String(Number(date.slice(8))) : '');

  return (
    <Screen tabBarSpace>
      <PageIntro eyebrow="Observed patterns" title="Insights" subtitle="Patterns from what you log — never a diagnosis." right={<WeekChip label={weekLabel(heroEnd)} onPress={() => setWeekOpen(true)} />} />

      <ScoreHero
        score={heroScore.score}
        range={weekLabel(heroEnd)}
        onPress={() => setTab('score')}
        accessibilityLabel={`Wellness score ${heroScore.score ?? 'not available'}. Open score breakdown`}
        stats={[
          { key: 'checkins', label: 'Check-ins', value: `${heroWeek.checkIns}/7`, week: heroDays.map((d) => (d.mood !== null ? 1 : null)), onPress: () => router.push('/check-in') },
          { key: 'sleep', label: 'Avg sleep', value: heroWeek.avgSleep !== null ? `${heroWeek.avgSleep} h` : '—', week: heroDays.map((d) => (d.sleep ? d.sleep / state.sleepTargetHours : null)), onPress: () => router.push('/sleep') },
          { key: 'steps', label: 'Steps', value: heroWeek.steps >= 10000 ? `${Math.round(heroWeek.steps / 1000)}k` : heroWeek.steps.toLocaleString(), week: heroDays.map((d) => (d.steps ? d.steps / state.stepTarget : null)), onPress: () => router.push('/steps') },
        ]}
      />

      {/* week chooser for the hero only (the tabs below keep using the current period) */}
      <Sheet visible={weekOpen} onClose={() => setWeekOpen(false)} title="Choose a week" subtitle="The Wellness Score card shows the week you pick.">
        <View style={{ gap: 8 }}>
          {[0, 1, 2, 3].map((n) => {
            const end = addDays(state.today, -7 * n);
            const on = end === heroEnd;
            return (
              <Pressable
                key={end}
                accessibilityRole="radio"
                aria-selected={on}
                accessibilityLabel={`${weekLabel(end)}${n === 0 ? ', this week' : ''}`}
                onPress={() => {
                  setHeroEnd(end);
                  setWeekOpen(false);
                }}
                style={({ pressed }) => [styles.weekRow, on && styles.weekRowOn, pressed && { opacity: 0.85 }]}>
                <AppText variant="bodyMedium" style={{ flex: 1 }}>
                  {weekLabel(end)}
                </AppText>
                <AppText variant="caption" muted>
                  {n === 0 ? 'This week' : n === 1 ? 'Last week' : `${n} weeks ago`}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <Segmented
        value={tab}
        onChange={setTab}
        style={{ marginTop: 18 }}
        options={[
          { key: 'insights', label: 'Insights' },
          { key: 'trends', label: 'Trends' },
          { key: 'weekly', label: 'Report' },
          { key: 'score', label: 'Score' },
        ]}
      />
      <View style={{ marginTop: 16 }}>
        {loading ? (
          <SkeletonList />
        ) : tab === 'insights' ? (
          <View style={{ gap: 12 }}>
            <AppText variant="overline" color={palette.green[700]}>
              {shown ? `${shown} observed pattern${shown === 1 ? '' : 's'}` : 'Observed patterns'}
              {locked ? ` · ${locked} more with Premium` : ''}
            </AppText>
            {insights.length ? (
              locked ? (
                <PremiumGate feature="advanced_insights" compact preview={basic.map((i) => insightCard(i))}>
                  {insights.map((i) => insightCard(i))}
                </PremiumGate>
              ) : (
                insights.map((i) => insightCard(i))
              )
            ) : (
              <Card tone="mint">
                <EmptyState icon={Lightbulb} title="No insights right now" text="Keep logging check-ins, sleep and activity — patterns appear after a few days." />
              </Card>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel="Open the wellness report" onPress={() => setTab('weekly')} style={({ pressed }) => [styles.reportLink, pressed && { opacity: 0.9 }]}>
              <TintIcon icon={Lightbulb} tone="butter" size={40} solid />
              <View style={{ flex: 1 }}>
                <AppText variant="h3">Your wellness report</AppText>
                <AppText variant="caption" muted>
                  Weekly, monthly or this cycle · {week.focus}
                </AppText>
              </View>
              <ChevronRight size={18} color={palette.green[700]} />
            </Pressable>
            <AppText variant="caption" muted style={{ marginTop: 4 }}>
              Insights come from a rules engine that runs on your own data (SRS §37). {COPY.concern}
            </AppText>
          </View>
        ) : tab === 'trends' ? (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([7, 14, 30] as const).map((r) => (
                <Chip key={r} label={`${r} days`} selected={range === r} onPress={() => setRange(r)} />
              ))}
            </View>
            <TrendCard icon={Zap} tone="peach" eyebrow="Energy (1–10)" title="Mood & energy" stat={`avg ${fmt(avgOf(series.map((d) => d.energy)))}`}>
              <LineChart data={series.map((d) => ({ label: d.label, value: d.energy }))} min={1} max={10} color={palette.peach[500]} yTicks={[3, 6, 9]} />
              <View style={styles.subHead}>
                <Smile size={14} color={palette.lavender[600]} />
                <AppText variant="caption" muted>
                  Mood (1 = very low, 5 = excellent)
                </AppText>
              </View>
              <LineChart data={series.map((d) => ({ label: d.label, value: d.mood }))} min={1} max={5} color={palette.lavender[500]} yTicks={[2, 4]} />
            </TrendCard>
            <TrendCard icon={Moon} tone="indigo" eyebrow={`Target ${state.sleepTargetHours} h`} title="Sleep (hours)" stat={`avg ${fmt(avgOf(series.map((d) => d.sleep)))} h`}>
              <BarChart data={series.map((d) => ({ label: barLabel(d.date, d.label), value: d.sleep }))} target={state.sleepTargetHours} color={palette.indigo[400]} height={150} />
            </TrendCard>
            <TrendCard icon={Droplets} tone="sky" eyebrow={`Target ${(state.waterTargetMl / 1000).toFixed(1)} L`} title="Water (litres)" stat={`avg ${fmt((avgOf(series.map((d) => d.water)) ?? 0) / 1000)} L`}>
              <BarChart data={series.map((d) => ({ label: barLabel(d.date, d.label), value: d.water / 1000 }))} target={state.waterTargetMl / 1000} color={palette.sky[400]} height={150} />
            </TrendCard>
            <TrendCard icon={Footprints} tone="green" eyebrow={`Goal ${state.stepTarget.toLocaleString()}`} title="Steps" stat={`avg ${Math.round(avgOf(series.map((d) => d.steps)) ?? 0).toLocaleString()}`}>
              <LineChart data={series.map((d) => ({ label: d.label, value: d.steps }))} color={palette.green[500]} />
            </TrendCard>
            <AppText variant="caption" muted>
              {COPY.observedPattern} Trends show what you logged; gaps mean no entry that day.
            </AppText>
          </View>
        ) : tab === 'weekly' ? (
          <View>
            <Segmented
              value={period}
              onChange={setPeriod}
              options={[
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'cycle', label: 'Cycle' },
              ]}
              style={{ marginBottom: 16 }}
            />
            <WeeklyReport period={period} />
          </View>
        ) : (
          <ScoreBreakdown />
        )}
      </View>
    </Screen>
  );
}

function TrendCard({ icon, tone, eyebrow, title, stat, children }: { icon: LucideIcon; tone: Tone; eyebrow: string; title: string; stat: string; children: ReactNode }) {
  return (
    <Card>
      <View style={styles.trendHead}>
        <TintIcon icon={icon} tone={tone} size={38} />
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color={colors.textSubtle}>
            {eyebrow}
          </AppText>
          <AppText variant="h3">{title}</AppText>
        </View>
        <View style={styles.statPill}>
          <AppText variant="caption" color={brandText} style={{ fontFamily: font.semibold }}>
            {stat}
          </AppText>
        </View>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: palette.ink[100], backgroundColor: colors.surface },
  weekRowOn: { borderColor: palette.green[600], backgroundColor: palette.green[50] },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: palette.butter[50], borderWidth: 1, borderColor: palette.butter[100] },
  trendHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statPill: { backgroundColor: palette.green[50], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  subHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 4 },
});
