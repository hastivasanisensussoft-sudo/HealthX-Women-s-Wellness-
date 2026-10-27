import { useMemo } from 'react';
import { Activity, CalendarCheck, Flame, ListChecks, Sparkles, Target, Trophy } from 'lucide-react';
import { addDays, dailySeries, formatDate, goalProgress, habitDone, habitsDueOn, lastNDays, palette, streak, wellnessScore } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { AreaTrend, BarTrend } from '@/components/charts/Charts';
import { Badge, ButtonLink, Card, CardHeader, CardLink, EmptyState, PageHeader, ProgressRing, RouteTabs, Skeleton } from '@/components/ui';
import { useDemoLoading } from '@/lib/utils';
import { INSIGHTS_TABS } from '@/user/layout/sectionTabs';
import { HeroHeading, HeroPanel, HeroStat } from '@/user/components/wellness-ui/Hero';
import { themeColor } from '@/user/components/wellness-ui/theme';

const WEEK_LABELS = ['3 wks ago', '2 wks ago', 'Last week', 'This week'];

/** Progress charts (SRS §36) — targets met and goal progress, week by week. */
export default function Progress() {
  const state = useAppState();
  const loading = useDemoLoading(450);
  const { today } = state;

  const weeks = useMemo(
    () =>
      [3, 2, 1, 0].map((w, i) => {
        const end = addDays(today, -7 * w);
        const pts = dailySeries(state, 7, end);
        const due = lastNDays(end, 7).flatMap((d) => habitsDueOn(state, d).map((h) => habitDone(state, h.id, d)));
        const scores = lastNDays(end, 7)
          .map((d) => wellnessScore(state, d).score)
          .filter((v): v is number => v !== null);
        return {
          label: WEEK_LABELS[i],
          water: pts.filter((p) => p.water >= state.waterTargetMl).length,
          sleep: pts.filter((p) => p.sleep !== null && p.sleep >= state.sleepTargetHours).length,
          steps: pts.filter((p) => p.steps >= state.stepTarget).length,
          checkins: pts.filter((p) => p.mood !== null).length,
          activeMin: pts.reduce((a, p) => a + p.activeMin, 0),
          habits: due.length ? Math.round((due.filter(Boolean).length / due.length) * 100) : null,
          score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        };
      }),
    [state, today],
  );
  const now = weeks[3];
  const prev = weeks[2];
  const checkInStreak = streak(state, (d) => state.checkIns.some((c) => c.date === d));
  const goals = state.goals.filter((g) => g.status !== 'completed');
  const completed = state.goals.filter((g) => g.status === 'completed');
  const targetsNow = now.water + now.sleep + now.steps;
  const targetsPrev = prev.water + prev.sleep + prev.steps;

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Progress charts"
          subtitle="How often you’ve met your targets over the last four weeks — every small step counts."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Insights & Reports', to: '/app/insights/weekly' }, { label: 'Progress charts' }]}
        />
        <RouteTabs tabs={INSIGHTS_TABS} label="Insights & reports pages" className="!mb-0" />
      </div>

      {/* ---------- Hero: this week ---------- */}
      <HeroPanel tone="wash" label="This week’s progress">
        <div className="grid items-center gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ProgressRing value={targetsNow / 21} size={150} stroke={14} color={themeColor('green-600', palette.green[600])} track={themeColor('white', '#FFFFFF')}>
              <p className="num text-[38px] leading-none text-ink-900">{targetsNow}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">of 21 targets</p>
            </ProgressRing>
            <div className="min-w-0 text-center sm:text-left">
              <HeroHeading
                eyebrow={`This week · ${formatDate(addDays(today, -6), 'short')} – ${formatDate(today, 'short')}`}
                title={targetsNow >= targetsPrev ? 'Steady progress' : 'A gentler week'}
                sub={`You met your water, sleep and step targets ${targetsNow} time${targetsNow === 1 ? '' : 's'} this week${targetsPrev ? `, compared with ${targetsPrev} last week` : ''}.`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroStat dense label="Check-in streak" value={checkInStreak} unit={checkInStreak === 1 ? 'day' : 'days'} icon={<Flame className="h-4 w-4 text-peach-500" />} />
            <HeroStat dense label="Habits done" value={now.habits ?? '—'} unit={now.habits !== null ? '%' : undefined} hint="This week" icon={<ListChecks className="h-4 w-4" />} />
            <HeroStat dense label="Check-ins" value={`${now.checkins}/7`} hint="This week" icon={<CalendarCheck className="h-4 w-4 text-lavender-500" />} />
            <HeroStat dense label="Goals completed" value={completed.length} hint={`${goals.length} in progress`} icon={<Trophy className="h-4 w-4 text-butter-500" />} />
          </div>
        </div>
      </HeroPanel>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-8">
          <CardHeader title="Days targets were met" subtitle="Out of 7 days per week" icon={<Activity className="h-5 w-5" />} />
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          ) : (
            <BarTrend
              data={weeks}
              height={300}
              unit=" days"
              series={[
                { key: 'water', name: `Water ≥ ${(state.waterTargetMl / 1000).toFixed(1)} L`, color: palette.sky[400] },
                { key: 'sleep', name: `Sleep ≥ ${state.sleepTargetHours} h`, color: palette.indigo[400] },
                { key: 'steps', name: `Steps ≥ ${state.stepTarget.toLocaleString()}`, color: palette.green[500] },
              ]}
            />
          )}
        </Card>
        <Card className="card-pad xl:col-span-4">
          <CardHeader title="Goal progress" subtitle="Active & paused goals" icon={<Target className="h-5 w-5" />} action={<CardLink to="/app/goals">Manage</CardLink>} />
          {goals.length === 0 ? (
            <EmptyState compact icon={<Target className="h-5 w-5" />} title="No goals in progress" action={<ButtonLink to="/app/goals" size="sm">Create a goal</ButtonLink>} />
          ) : (
            <ul className="space-y-3">
              {goals.map((g) => {
                const p = goalProgress(state, g);
                return (
                  <li key={g.id} className="flex items-center gap-3 rounded-2xl p-2.5 ring-1 ring-inset ring-ink-100">
                    <ProgressRing value={p.pct} size={52} stroke={6} color={g.status === 'paused' ? themeColor('ink-300', palette.ink[300]) : themeColor('green-500', palette.green[500])} track={themeColor('green-50', palette.green[50])}>
                      <span className="font-display text-[12px] font-semibold text-ink-900">{Math.round(p.pct * 100)}%</span>
                    </ProgressRing>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800" title={g.title}>
                        {g.title}
                      </p>
                      <p className="truncate text-xs text-ink-400">{p.label}</p>
                    </div>
                    {g.status === 'paused' && <Badge tone="gray">paused</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="card-pad">
          <CardHeader title="Habit completion" subtitle="% of due habits ticked off" />
          {loading ? <Skeleton className="h-[200px] w-full rounded-2xl" /> : <AreaTrend data={weeks} series={[{ key: 'habits', name: 'Completed', color: palette.green[500] }]} height={200} yDomain={[0, 100]} unit="%" />}
        </Card>
        <Card className="card-pad">
          <CardHeader title="Active minutes" subtitle="Total per week" />
          {loading ? <Skeleton className="h-[200px] w-full rounded-2xl" /> : <BarTrend data={weeks} series={[{ key: 'activeMin', name: 'Active minutes', color: palette.peach[400] }]} height={200} unit=" min" />}
        </Card>
        <Card className="card-pad md:col-span-2 xl:col-span-1">
          <CardHeader title="Wellness score" subtitle="Weekly average · engagement metric" action={<Sparkles className="h-4 w-4 text-lavender-500" />} />
          {loading ? <Skeleton className="h-[200px] w-full rounded-2xl" /> : <AreaTrend data={weeks} series={[{ key: 'score', name: 'Avg score', color: palette.lavender[500] }]} height={200} yDomain={[0, 100]} />}
        </Card>
      </div>
      <p className="text-xs text-ink-400">
        Weeks end on {formatDate(today, 'weekday')} · this week covers {formatDate(addDays(today, -6), 'short')} – {formatDate(today, 'short')}. The wellness score is an engagement metric, not a medical score.
      </p>
    </div>
  );
}
