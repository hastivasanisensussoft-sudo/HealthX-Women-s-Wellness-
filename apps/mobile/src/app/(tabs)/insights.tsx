/**
 * Insights (SRS §17, §36, §37, §61): forest summary hero, rule-based observed patterns, trend charts, report scopes and the score breakdown.
 * Phase-1 insights, trends and the weekly report are free; Phase-2 insight rules are Premium (advanced insights).
 */
import { COPY, computeInsights, dailySeries, formatDate, wellnessScore, weeklySummary, type Insight } from '@healthx/shared';
import { useLocalSearchParams } from 'expo-router';
import { ChevronRight, Droplets, Footprints, Lightbulb, Moon, Smile, Zap, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { BarChart, LineChart, ProgressRing } from '@/components/Charts';
import { EmptyState, SkeletonList } from '@/components/Feedback';
import { InsightCard } from '@/components/InsightCard';
import { Chip, Segmented } from '@/components/Inputs';
import { PremiumGate, usePremium } from '@/components/PremiumGate';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { WeeklyReport, type ReportPeriod } from '@/components/WeeklyReport';
import { GlassStat, HeroPanel, PageIntro, TintIcon, type Tone, ON_DARK } from '@/components/b-kit';
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
  const fmt = (v: number | null, d = 1) => (v === null ? '—' : v.toFixed(d));
  // Bars are narrow: full labels for a week, day numbers for two weeks, none for a month.
  const barLabel = (date: string, label: string) => (range === 7 ? label : range === 14 ? String(Number(date.slice(8))) : '');

  return (
    <Screen tabBarSpace>
      <PageIntro eyebrow="Observed patterns" title="Insights" subtitle="Patterns from what you log — never a diagnosis." />

      <HeroPanel onPress={() => setTab('score')} accessibilityLabel={`Wellness score ${score.score ?? 'not available'}. Open score breakdown`}>
        <View style={styles.heroTop}>
          <ProgressRing value={(score.score ?? 0) / 100} size={92} stroke={9} color={palette.butter[400]} track="rgba(255,255,255,0.16)">
            <AppText style={styles.score}>{score.score ?? '—'}</AppText>
            <AppText variant="caption" color={ON_DARK.soft}>
              /100
            </AppText>
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" color={ON_DARK.soft}>
              {formatDate(week.start, 'short')} – {formatDate(week.end, 'short')}
            </AppText>
            <AppText variant="h2" color="#fff" style={{ marginTop: 2 }}>
              Wellness Score
            </AppText>
            <AppText variant="caption" color={ON_DARK.text} style={{ marginTop: 4 }}>
              Engagement metric, not a medical score
            </AppText>
          </View>
          <ChevronRight size={18} color={ON_DARK.text} />
        </View>
        <View style={styles.glassRow}>
          <GlassStat label="Check-ins" value={`${week.checkIns}/7`} />
          <GlassStat label="Avg sleep" value={week.avgSleep !== null ? `${week.avgSleep} h` : '—'} />
          <GlassStat label="Steps" value={week.steps >= 10000 ? `${Math.round(week.steps / 1000)}k` : week.steps.toLocaleString()} />
        </View>
      </HeroPanel>

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
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  score: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 34, color: '#fff' },
  glassRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: palette.butter[50], borderWidth: 1, borderColor: palette.butter[100] },
  trendHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statPill: { backgroundColor: palette.green[50], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  subHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 4 },
});
