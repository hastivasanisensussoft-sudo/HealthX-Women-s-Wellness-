import { useMemo, useState, type ReactNode } from 'react';
import { BedDouble, Brain, Crown, Database, Droplets, Eye, EyeOff, Footprints, Smile, Sparkles, Workflow, Zap } from 'lucide-react';
import { computeInsights, COPY, dailySeries, palette } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { InsightCard } from '@/user/components/Cards';
import { AreaTrend, BarTrend, LineTrend } from '@/components/charts/Charts';
import { Button, ButtonLink, Card, CardHeader, CardSkeleton, EmptyState, Notice, PageHeader, PhaseBadge, RouteTabs, SectionTitle, Segmented, Skeleton } from '@/components/ui';
import { cn, formatHours, formatMl, useDemoLoading } from '@/lib/utils';
import { INSIGHTS_TABS } from '@/user/layout/sectionTabs';
import { HeroHeading, HeroPanel, HeroStat } from '@/user/components/wellness-ui/Hero';

const avgOf = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

function AvgPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-ink-50 px-2.5 py-1 font-mono text-[11px] text-ink-600 ring-1 ring-inset ring-ink-100">{children}</span>;
}

/** Wellness trends + rules-based insights (SRS §17–§19, §36). The score lives at /app/wellness-score. */
export default function Insights() {
  const state = useAppState();
  const loading = useDemoLoading(600);
  const [range, setRange] = useState<'7' | '14' | '30'>('14');
  const [showDismissed, setShowDismissed] = useState(false);
  const insights = useMemo(() => computeInsights(state, { includeDismissed: showDismissed }), [state, showDismissed]);
  const series = useMemo(() => dailySeries(state, Number(range)), [state, range]);
  const free = state.profile.plan === 'free';
  const basic = insights.filter((i) => i.phase === 1);
  const advanced = insights.filter((i) => i.phase === 2);

  const energy = avgOf(series.map((p) => p.energy));
  const mood = avgOf(series.map((p) => p.mood));
  const stress = avgOf(series.map((p) => p.stress));
  const sleep = avgOf(series.map((p) => p.sleep));
  const water = avgOf(series.map((p) => p.water));
  const steps = avgOf(series.map((p) => p.steps));

  const chart = (h: number, node: ReactNode) =>
    loading ? (
      <div style={{ height: h }}>
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    ) : (
      node
    );

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Wellness trends"
          subtitle="Your logged data over time, plus observed patterns explained in plain language — never as a diagnosis."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Insights & Reports', to: '/app/insights/weekly' }, { label: 'Wellness trends' }]}
          actions={
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: '7', label: '7 days' },
                { value: '14', label: '14 days' },
                { value: '30', label: '30 days' },
              ]}
            />
          }
        />
        <RouteTabs tabs={INSIGHTS_TABS} label="Insights & reports pages" className="!mb-0" />
      </div>

      {/* ---------- Hero: range at a glance ---------- */}
      <HeroPanel tone="wash" label="Trends at a glance">
        <div className="grid items-center gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <HeroHeading
            eyebrow={`Last ${range} days`}
            title={basic.length + advanced.length ? `${basic.length + advanced.length} observed pattern${basic.length + advanced.length === 1 ? '' : 's'}` : 'Your trends at a glance'}
            sub="Averages from what you logged. Patterns are observations to explore, not explanations or diagnoses."
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroStat dense label="Energy" value={energy !== null ? energy.toFixed(1) : '—'} unit="/10" icon={<Zap className="h-4 w-4 text-peach-500" />} />
            <HeroStat dense label="Mood" value={mood !== null ? mood.toFixed(1) : '—'} unit="/5" icon={<Smile className="h-4 w-4 text-lavender-500" />} />
            <HeroStat dense label="Stress" value={stress !== null ? stress.toFixed(1) : '—'} unit="/10" icon={<Brain className="h-4 w-4 text-rose-500" />} />
            <HeroStat dense label="Sleep" value={formatHours(sleep !== null ? +sleep.toFixed(1) : null)} icon={<BedDouble className="h-4 w-4 text-indigo-500" />} />
            <HeroStat dense label="Water" value={water !== null ? formatMl(Math.round(water)) : '—'} icon={<Droplets className="h-4 w-4 text-sky-500" />} />
            <HeroStat dense label="Steps" value={steps !== null ? Math.round(steps).toLocaleString() : '—'} icon={<Footprints className="h-4 w-4" />} />
          </div>
        </div>
      </HeroPanel>

      {/* ---------- Trend charts ---------- */}
      <section>
        <SectionTitle eyebrow="Trends" title="Over time" subtitle={`Daily values · last ${range} days`} />
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="card-pad">
            <CardHeader title="Mood, energy & stress" subtitle="From daily check-ins (1–10; mood 1–5)" />
            {chart(
              260,
              <LineTrend
                data={series}
                height={260}
                yDomain={[0, 10]}
                series={[
                  { key: 'energy', name: 'Energy', color: palette.peach[500] },
                  { key: 'stress', name: 'Stress', color: palette.rose[400] },
                  { key: 'mood', name: 'Mood', color: palette.lavender[500] },
                ]}
              />,
            )}
          </Card>
          <Card className="card-pad">
            <CardHeader title="Sleep" subtitle={`Hours · target ${state.sleepTargetHours} h`} action={<AvgPill>avg {formatHours(sleep !== null ? +sleep.toFixed(1) : null)}</AvgPill>} />
            {chart(260, <AreaTrend data={series} series={[{ key: 'sleep', name: 'Sleep', color: palette.indigo[500] }]} height={260} unit="h" yDomain={[0, 10]} target={{ value: state.sleepTargetHours, label: 'Target' }} />)}
          </Card>
          <Card className="card-pad">
            <CardHeader title="Hydration" subtitle="ml per day" action={<AvgPill>avg {water !== null ? formatMl(Math.round(water)) : '—'}</AvgPill>} />
            {chart(240, <BarTrend data={series} series={[{ key: 'water', name: 'Water (ml)', color: palette.sky[400] }]} height={240} target={{ value: state.waterTargetMl, label: 'Target' }} />)}
          </Card>
          <Card className="card-pad">
            <CardHeader title="Steps & workouts" subtitle="Daily steps" action={<AvgPill>avg {steps !== null ? Math.round(steps).toLocaleString() : '—'}</AvgPill>} />
            {chart(240, <BarTrend data={series} series={[{ key: 'steps', name: 'Steps', color: palette.green[500] }]} height={240} target={{ value: state.stepTarget, label: 'Goal' }} />)}
          </Card>
        </div>
      </section>

      {/* ---------- Observed patterns ---------- */}
      <section>
        <SectionTitle eyebrow="Rules-based insights" title="Observed patterns" subtitle="Updated when you log · plain language, never a diagnosis" />
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <Card className="card-pad">
              <CardHeader
                title="Your insights"
                subtitle="Rules-based · updated when you log"
                icon={<Sparkles className="h-5 w-5" />}
                action={
                  <Button size="sm" variant="ghost" leftIcon={showDismissed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} onClick={() => setShowDismissed((s) => !s)}>
                    {showDismissed ? 'Hide dismissed' : 'Show dismissed'}
                  </Button>
                }
              />
              {loading ? (
                <div className="space-y-3">
                  <CardSkeleton lines={2} />
                  <CardSkeleton lines={2} />
                </div>
              ) : basic.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="h-6 w-6" />}
                  title="Keep logging to unlock insights"
                  body="Insights appear once there’s enough data — usually after a week of check-ins."
                  action={
                    <ButtonLink to="/app/check-in" size="sm">
                      Check in today
                    </ButtonLink>
                  }
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {basic.map((i) => (
                    <InsightCard key={i.id} insight={i} />
                  ))}
                </div>
              )}
            </Card>
            <Card className="card-pad">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    Advanced insights <PhaseBadge phase={2} />
                  </span>
                }
                subtitle="Cycle correlations & variation (SRS §17, §19)"
                icon={<Brain className="h-5 w-5" />}
              />
              {advanced.length === 0 ? (
                <EmptyState compact icon={<Brain className="h-5 w-5" />} title="No advanced patterns yet" body="These need a few complete cycles of check-ins." />
              ) : (
                <div className={cn('relative space-y-3', free && 'min-h-[240px]')}>
                  {advanced.map((i) => (
                    <InsightCard key={i.id} insight={i} locked={free} />
                  ))}
                  {free && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/50 backdrop-blur-[1px]">
                      <div className="mx-4 rounded-3xl bg-white p-5 text-center shadow-lift ring-1 ring-ink-100">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-butter-100 text-butter-600">
                          <Crown className="h-6 w-6" />
                        </span>
                        <p className="mt-2 font-display text-[16px] font-semibold text-ink-900">Advanced insights are Premium</p>
                        <p className="text-sm text-ink-500">Available with HealthX Premium (Phase 2)</p>
                        <ButtonLink to="/app/subscription" size="sm" variant="butter" className="mt-3">
                          See plans
                        </ButtonLink>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
          <div className="space-y-6 xl:col-span-4">
            <Card className="card-pad">
              <CardHeader title="How insights work" icon={<Workflow className="h-5 w-5" />} />
              <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-0.5 before:bg-green-100">
                {[
                  { icon: Database, t: 'Your data', d: 'Check-ins, cycles, sleep, water and activity you log.' },
                  { icon: Workflow, t: 'Rules engine', d: 'Deterministic rules look for repeated patterns, e.g. “sleep below target AND low energy for 3 days”.' },
                  { icon: Sparkles, t: 'Insights', d: 'Plain-language observed patterns with a gentle suggestion.' },
                  { icon: Brain, t: 'AI personalisation (later)', d: 'AI may reword insights — it never does the calculations.' },
                ].map((s, idx) => (
                  <li key={s.t} className="relative flex gap-3">
                    <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 font-mono text-sm text-green-800 ring-4 ring-white">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                        <s.icon className="h-4 w-4 text-green-600" /> {s.t}
                      </p>
                      <p className="text-sm text-ink-500">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
            <Notice tone="safety" title="Patterns, not diagnoses">
              {COPY.observedPattern} {COPY.concern}
            </Notice>
          </div>
        </div>
      </section>
    </div>
  );
}
