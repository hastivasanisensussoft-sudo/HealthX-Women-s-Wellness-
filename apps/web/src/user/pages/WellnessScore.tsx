import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Droplets, Footprints, Gauge, Info, ListChecks, Moon, Salad, Smile, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';
import { COPY, formatDate, palette, wellnessScore, wellnessScoreSeries, type WellnessWeights } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { HeroPanel, HeroStat } from '@/user/components/cycle-ui/Hero';
import { AreaTrend } from '@/components/charts/Charts';
import { Badge, ButtonLink, Card, CardHeader, CardSkeleton, Notice, PageHeader, ProgressBar, ProgressRing, SectionTitle, Segmented, Skeleton } from '@/components/ui';
import { cn, useDemoLoading } from '@/lib/utils';

const LOG_LINKS: Record<keyof WellnessWeights, { to: string; cta: string }> = {
  activity: { to: '/app/fitness', cta: 'Log activity' },
  sleep: { to: '/app/sleep', cta: 'Log sleep' },
  hydration: { to: '/app/hydration', cta: 'Add water' },
  nutrition: { to: '/app/nutrition', cta: 'Log a meal' },
  habits: { to: '/app/habits', cta: 'Tick habits' },
  mood: { to: '/app/check-in', cta: 'Check in' },
};

const COMPONENT_STYLE: Record<keyof WellnessWeights, { icon: LucideIcon; disc: string; bar: string; track: string }> = {
  activity: { icon: Footprints, disc: 'bg-green-50 text-green-700', bar: 'bg-green-500', track: 'bg-green-50' },
  sleep: { icon: Moon, disc: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-400', track: 'bg-indigo-50' },
  hydration: { icon: Droplets, disc: 'bg-sky-50 text-sky-600', bar: 'bg-sky-400', track: 'bg-sky-50' },
  nutrition: { icon: Salad, disc: 'bg-peach-50 text-peach-600', bar: 'bg-peach-400', track: 'bg-peach-50' },
  habits: { icon: ListChecks, disc: 'bg-butter-100 text-butter-600', bar: 'bg-butter-400', track: 'bg-butter-50' },
  mood: { icon: Smile, disc: 'bg-lavender-50 text-lavender-600', bar: 'bg-lavender-400', track: 'bg-lavender-50' },
};

const headline = (s: number | null) => (s === null ? 'Nothing logged yet today' : s >= 80 ? 'A strong day of logging' : s >= 60 ? 'A steady day so far' : s >= 30 ? 'A gentle start' : 'Every small step counts');

/** Wellness score (SRS §33) — an engagement metric, not a medical score. */
export default function WellnessScore() {
  const state = useAppState();
  const loading = useDemoLoading(450);
  const [range, setRange] = useState<'14' | '30'>('14');
  const ws = useMemo(() => wellnessScore(state), [state]);
  const series = useMemo(() => wellnessScoreSeries(state, Number(range)), [state, range]);
  const last14 = useMemo(() => wellnessScoreSeries(state, 14), [state]);
  const scored = (xs: { score: number | null }[]) => xs.map((x) => x.score).filter((v): v is number => v !== null);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const thisWeek = avg(scored(last14.slice(7)));
  const lastWeek = avg(scored(last14.slice(0, 7)));
  const best = series.reduce<{ score: number | null; date: string } | null>((b, x) => (x.score !== null && (!b || (b.score ?? -1) < x.score) ? x : b), null);
  const lowest = ws.components.filter((c) => c.value !== null && c.weight > 0).sort((a, b) => (a.value as number) - (b.value as number))[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Wellness score"
        subtitle="A simple 0–100 view of how today’s logging lines up with your goals."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Overview', to: '/app' }, { label: 'Wellness score' }]}
      />

      {loading ? (
        <>
          <Skeleton className="h-[320px] w-full rounded-[34px]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} lines={2} />
            ))}
          </div>
        </>
      ) : (
        <>
          <HeroPanel tone="forest" label="Today’s wellness score">
            <div className="grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
              <div className="relative mx-auto text-green-300">
                <span aria-hidden className="absolute inset-3 animate-breathe rounded-full bg-white/[0.05]" />
                <ProgressRing value={(ws.score ?? 0) / 100} size={220} stroke={18} color="currentColor" track="rgba(255,255,255,0.1)">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-green-200">Today</p>
                  <p className="num text-[64px] leading-none text-white">{ws.score ?? '—'}</p>
                  <p className="font-mono text-xs text-white/60">/ 100</p>
                </ProgressRing>
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-green-100 ring-1 ring-inset ring-white/15">
                  <Gauge className="h-3.5 w-3.5" /> Wellness engagement metric
                </span>
                <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[36px]">{headline(ws.score)}</h2>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/75">{COPY.wellnessScore}</p>
                {ws.missing.length > 0 && <p className="mt-2 text-sm text-white/60">Not logged today: {ws.missing.join(', ')} — weights re-balanced across the rest.</p>}
                {lowest && (lowest.value ?? 100) < 70 ? (
                  <div className="mt-5 flex flex-col gap-3 rounded-3xl bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 sm:flex-row sm:items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-butter-300 text-green-950">
                      <TrendingUp className="h-5 w-5" />
                    </span>
                    <p className="flex-1 text-sm text-white/85">
                      <b className="text-white">Biggest opportunity today:</b> {lowest.label.toLowerCase()} is at {lowest.value}. A small step here lifts your score the most.
                    </p>
                    <ButtonLink to={LOG_LINKS[lowest.key].to} variant="butter" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      {LOG_LINKS[lowest.key].cta}
                    </ButtonLink>
                  </div>
                ) : (
                  ws.score === null && (
                    <ButtonLink to="/app/check-in" variant="butter" className="mt-5" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Start with a check-in
                    </ButtonLink>
                  )
                )}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <HeroStat
                    dark
                    label="This week"
                    value={thisWeek ?? '—'}
                    icon={<CalendarCheck className="h-4 w-4" />}
                    hint={thisWeek !== null && lastWeek !== null ? `${thisWeek >= lastWeek ? '+' : ''}${thisWeek - lastWeek} vs last week` : 'Average score'}
                  />
                  <HeroStat dark label="Last week" value={lastWeek ?? '—'} icon={<Gauge className="h-4 w-4" />} hint="Average score" />
                  <HeroStat dark label={`Best · ${range} days`} value={best?.score ?? '—'} icon={<Trophy className="h-4 w-4" />} hint={best ? formatDate(best.date, 'medium') : 'No scores yet'} className="col-span-2 sm:col-span-1" />
                </div>
              </div>
            </div>
          </HeroPanel>

          <section>
            <SectionTitle eyebrow="Today’s breakdown" title="What makes up your score" subtitle="Component score × weight. Weights are set by the HealthX team." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ws.components.map((c) => {
                const st = COMPONENT_STYLE[c.key];
                const missing = c.value === null;
                return (
                  <Card key={c.key} className={cn('card-pad flex flex-col gap-3', missing && 'bg-ink-50/50')}>
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', st.disc)}>
                        <st.icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-900">{c.label}</p>
                        <p className="text-xs text-ink-500">{missing ? 'Not logged today' : 'Logged today'}</p>
                      </div>
                      <Badge tone="gray">{c.weight}% weight</Badge>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <p className="num text-[32px] leading-none text-ink-900">
                        {c.value ?? '—'}
                        <span className="ml-1 text-sm font-medium text-ink-400">/ 100</span>
                      </p>
                      <Link to={LOG_LINKS[c.key].to} className="group inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-900">
                        {LOG_LINKS[c.key].cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                    <ProgressBar value={(c.value ?? 0) / 100} color={missing ? 'bg-ink-200' : st.bar} track={st.track} label={`${c.label} score`} />
                  </Card>
                );
              })}
            </div>
          </section>

          <Card className="card-pad">
            <CardHeader
              title="Score history"
              subtitle="Daily score"
              action={
                <Segmented
                  size="sm"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: '14', label: '14 days' },
                    { value: '30', label: '30 days' },
                  ]}
                />
              }
            />
            <AreaTrend data={series} series={[{ key: 'score', name: 'Score', color: palette.green[500] }]} height={260} yDomain={[0, 100]} />
          </Card>

          <Notice tone="info" icon={<Info className="h-4 w-4 text-sky-500" />} title="How it’s calculated">
            Each area you log gets a 0–100 score — for example sleep between 7 and 9 hours scores 100, and hydration scores your progress towards your water target. Areas with nothing logged (activity, sleep, nutrition, habits, mood) are left out and the remaining weights are re-balanced; hydration always counts, starting from 0 ml. The score is an engagement metric, not a medical score.
          </Notice>
        </>
      )}
    </div>
  );
}
