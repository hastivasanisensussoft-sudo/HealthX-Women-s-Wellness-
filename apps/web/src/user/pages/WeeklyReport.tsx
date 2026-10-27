import { useMemo, useState } from 'react';
import { BedDouble, Bot, CalendarHeart, Download, Droplets, Dumbbell, FileText, Footprints, Lightbulb, Printer, Share2, Smile, Sparkles } from 'lucide-react';
import { addDays, COPY, cycleStateOf, formatDate, palette, weeklySummary } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { BarTrend } from '@/components/charts/Charts';
import { BackendBadge, Badge, Button, Card, CardHeader, Notice, PageHeader, PhaseBadge, RouteTabs, Segmented, Skeleton, useToast } from '@/components/ui';
import { cn, formatHours, useDemoLoading } from '@/lib/utils';
import { INSIGHTS_TABS } from '@/user/layout/sectionTabs';
import { HeroPanel } from '@/user/components/wellness-ui/Hero';

type Scope = 'weekly' | 'monthly' | 'cycle';

/** Wellness reports (SRS §36, mockup M30: Weekly · Monthly · Cycle) — figures are rules-computed; AI narrative is Phase 2. */
export default function WeeklyReport() {
  const state = useAppState();
  const toast = useToast();
  const loading = useDemoLoading(450);
  const [scope, setScope] = useState<Scope>('weekly');
  const [offset, setOffset] = useState<'0' | '7' | '14'>('0');
  const cycleDay = useMemo(() => cycleStateOf(state).cycleDay, [state]);
  const days = scope === 'weekly' ? 7 : scope === 'monthly' ? 30 : Math.max(1, cycleDay ?? 1);
  const end = scope === 'weekly' ? addDays(state.today, -Number(offset)) : state.today;
  const r = useMemo(() => weeklySummary(state, end, days), [state, end, days]);
  const noCycle = scope === 'cycle' && !cycleDay;
  const scopeTitle = scope === 'weekly' ? 'Your weekly wellness' : scope === 'monthly' ? 'Your last 30 days' : `This cycle so far${cycleDay ? ` · day ${cycleDay}*` : ''}`;

  const tiles = [
    { icon: CalendarHeart, label: 'Cycle', value: r.cycleDay ? `Day ${r.cycleDay}*` : '—', cls: 'bg-rose-100 text-rose-600' },
    { icon: Footprints, label: 'Activity', value: `${r.steps.toLocaleString()} steps`, cls: 'bg-green-100 text-green-700' },
    { icon: Dumbbell, label: 'Workouts', value: `${r.workouts} session${r.workouts === 1 ? '' : 's'}`, cls: 'bg-peach-100 text-peach-600' },
    { icon: BedDouble, label: 'Sleep', value: r.avgSleep ? `${formatHours(r.avgSleep)} avg` : '—', cls: 'bg-indigo-100 text-indigo-600' },
    { icon: Droplets, label: 'Hydration', value: `${r.hydrationPct}% of goal`, cls: 'bg-sky-100 text-sky-600' },
    { icon: Smile, label: 'Mood', value: r.moodSummary, cls: 'bg-lavender-100 text-lavender-600' },
  ];

  return (
    <div className="space-y-8 print:space-y-4 print:p-0">
      <div>
        <PageHeader
          title={scope === 'weekly' ? 'Weekly reports' : scope === 'monthly' ? 'Monthly report' : 'Cycle report'}
          subtitle={`${scopeTitle} · ${formatDate(r.start, 'medium')} – ${formatDate(r.end, 'medium')} · ${r.checkIns} check-ins`}
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Insights & Reports', to: '/app/insights/weekly' }, { label: 'Weekly reports' }]}
          actions={
            <>
              <Button variant="outline" size="icon" aria-label="Print report" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Share report" onClick={() => toast.info('Sharing simulated', 'Reports are private by default. Sharing requires the backend.')}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          }
        />
        <RouteTabs tabs={INSIGHTS_TABS} label="Insights & reports pages" className="!mb-0 print:hidden" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between print:hidden">
        <Segmented
          className="w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'cycle', label: 'Cycle' },
          ]}
        />
        {scope === 'weekly' && (
          <Segmented
            size="sm"
            value={offset}
            onChange={setOffset}
            className="self-start"
            options={[
              { value: '0', label: 'This week' },
              { value: '7', label: 'Last week' },
              { value: '14', label: '2 weeks ago' },
            ]}
          />
        )}
      </div>

      {noCycle && (
        <Notice tone="info" title="No current cycle yet">
          Log a period to see a report for your current cycle. Showing today only.
        </Notice>
      )}

      {/* ---------- Summary hero ---------- */}
      <HeroPanel tone="forest" label="Report summary" className="print:shadow-none">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.16em] text-green-200">
              <FileText className="h-4 w-4" /> {scope === 'weekly' ? 'Weekly' : scope === 'monthly' ? 'Monthly' : 'Cycle'} report
            </p>
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-[34px]">{scopeTitle}</h2>
            <p className="mt-2 text-[15px] text-white/75">
              {formatDate(r.start, 'medium')} – {formatDate(r.end, 'medium')} · {r.checkIns} check-in{r.checkIns === 1 ? '' : 's'}
            </p>
            <div className="mt-6 rounded-3xl bg-butter-300 p-5 text-green-950 shadow-lift">
              <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-green-900/80">
                <Lightbulb className="h-4 w-4" /> Suggested focus
              </p>
              <p className="mt-1.5 font-display text-[20px] font-semibold leading-snug">{r.focus}</p>
              <p className="mt-1 text-sm text-green-950/75">A small, realistic focus for the days ahead.</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((t) => (
              <div key={t.label} className="glass-dark flex min-w-0 flex-col gap-3 rounded-3xl p-4">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', t.cls)}>
                  <t.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70">{t.label}</dt>
                  <dd className="mt-0.5 font-display text-[17px] font-semibold leading-snug text-white">{t.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </HeroPanel>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-7">
          <CardHeader title="Day by day" subtitle={`Steps · ${days} day${days === 1 ? '' : 's'}`} icon={<Footprints className="h-5 w-5" />} />
          {loading ? <Skeleton className="h-[250px] w-full rounded-2xl" /> : <BarTrend data={r.days} series={[{ key: 'steps', name: 'Steps', color: palette.green[400] }]} height={250} />}
          <div className="scrollbar-thin mt-5 max-h-[420px] overflow-auto rounded-2xl ring-1 ring-inset ring-ink-100">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-ink-50 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Day</th>
                  <th className="px-4 py-2.5 text-right font-medium">Steps</th>
                  <th className="px-4 py-2.5 text-right font-medium">Water</th>
                  <th className="px-4 py-2.5 text-right font-medium">Sleep</th>
                  <th className="px-4 py-2.5 text-right font-medium">Energy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {r.days.map((d) => (
                  <tr key={d.date} className="hover:bg-green-50/40">
                    <td className="px-4 py-2.5 font-semibold text-ink-800">
                      {d.label} <span className="font-normal text-ink-400">{formatDate(d.date, 'short')}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">{d.steps.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">{(d.water / 1000).toFixed(1)} L</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">{formatHours(d.sleep)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">{d.energy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-6 xl:col-span-5">
          <Card className="card-pad relative overflow-hidden bg-lavender-50/60">
            <span aria-hidden className="leaf absolute -right-6 -top-6 h-20 w-20 bg-lavender-100" />
            <CardHeader className="relative" title="Your pattern" icon={<Sparkles className="h-5 w-5" />} />
            <p className="relative text-[15.5px] leading-relaxed text-ink-800">{r.pattern ?? 'Not enough data in this period to describe a pattern.'}</p>
            <p className="relative mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-lavender-700">{COPY.observedPattern}</p>
          </Card>
          <Card className="card-pad">
            <CardHeader title={<span className="flex items-center gap-2">AI summary <PhaseBadge phase={2} /></span>} icon={<Bot className="h-5 w-5" />} />
            <blockquote className="relative rounded-3xl bg-green-50/70 p-5 text-[15px] leading-relaxed text-ink-700">
              <span aria-hidden className="absolute -top-3 left-4 font-display text-5xl leading-none text-green-300">“</span>
              {scope === 'weekly' ? 'This week' : scope === 'monthly' ? 'Over the last 30 days' : 'This cycle so far'} you averaged {r.avgSleep ? formatHours(r.avgSleep) : 'some'} of sleep and logged {r.workouts} workout{r.workouts === 1 ? '' : 's'}. {r.pattern ?? ''} A consistent bedtime could be a gentle place to start.
            </blockquote>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="gray">Sample narrative — simulated</Badge>
              <BackendBadge label="Real AI requires backend" />
            </div>
            <p className="mt-2 text-xs text-ink-400">Numbers always come from the rules engine; AI only phrases them and avoids causal claims.</p>
          </Card>
          <Button variant="outline" className="w-full print:hidden" leftIcon={<Download className="h-4 w-4" />} onClick={() => toast.info('Export simulated', 'PDF export requires the backend.')}>
            Download PDF
          </Button>
        </div>
      </div>
      <Notice tone="info">{COPY.notDiagnostic}</Notice>
    </div>
  );
}
