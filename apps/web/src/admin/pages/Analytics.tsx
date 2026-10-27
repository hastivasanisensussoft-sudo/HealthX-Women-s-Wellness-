import { useMemo, useState, type ReactNode } from 'react';
import { Activity, BellRing, CalendarCheck, ClipboardCheck, Download, IndianRupee, Repeat, ShieldCheck, Smile, UserPlus, Users } from 'lucide-react';
import { cv } from '@/theme/engine';
import { AreaTrend, BarTrend, Donut, Sparkline } from '@/components/charts/Charts';
import { Badge, Button, Card, CardHeader, CardSkeleton, PhaseBadge, ProgressBar, Segmented, Skeleton, useToast } from '@/components/ui';
import { cn, useDemoLoading } from '@/lib/utils';
import { analyticsSeries, DELIVERY_STATS, EVENT_CATALOGUE, MRR_SERIES, RETENTION_COHORTS } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, AdminHero, HeroStat, KpiCard, SimulatedNote, TableShell, Th } from '../components';
import { downloadCsv } from '../helpers';
import { useActivitySummary } from '../appActivity';
import { CategoryBars, DataSourceBadge } from '../activityUi';
import { formatDate } from '@healthx/shared';

const fmt = (n: number) => n.toLocaleString('en-US');

const SECTIONS = [
  { id: 'an-live', label: 'Live app activity' },
  { id: 'an-acquisition', label: 'Acquisition' },
  { id: 'an-activation', label: 'Activation' },
  { id: 'an-engagement', label: 'Engagement' },
  { id: 'an-retention', label: 'Retention' },
  { id: 'an-monetisation', label: 'Monetisation' },
  { id: 'an-delivery', label: 'Delivery' },
  { id: 'an-events', label: 'Event catalogue' },
] as const;

const SOURCES = [
  { name: 'Organic search', value: 38, color: cv('green', 500), dot: 'bg-green-500' },
  { name: 'App store', value: 27, color: cv('sky', 400), dot: 'bg-sky-400' },
  { name: 'Referral', value: 19, color: cv('lavender', 400), dot: 'bg-lavender-400' },
  { name: 'Social', value: 16, color: cv('peach', 400), dot: 'bg-peach-400' },
];

function ReportSection({ id, n, eyebrow, title, badge, children }: { id: string; n: number; eyebrow: string; title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">
            {String(n).padStart(2, '0')} · {eyebrow}
          </p>
          <h2 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink-900">{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

const share = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

/** KPIs computed from what people actually did in the mobile app (API mode), or the labelled simulation offline. */
function LiveReport() {
  const { state, apiMode, audit } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const { data: s, loading } = useActivitySummary(state.users, 30);
  const exportLive = () => {
    if (!s) return;
    downloadCsv(
      'healthx-live-app-activity-30d.csv',
      ['date', 'active_users', 'events'],
      s.series.map((d) => [d.date, d.activeUsers, d.events]),
    );
    audit('report.export', 'Live app activity (30 days)', 'Aggregate only');
    toast.success('Report exported', 'Daily active users and activity counts — no individual data.');
  };
  return (
    <ReportSection id="an-live" n={0} eyebrow="Live app activity" title="What people did in the mobile app" badge={<DataSourceBadge apiMode={apiMode} />}>
      {loading || !s ? (
        <CardSkeleton lines={4} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card className="card-pad">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['Active today', s.engagement.dau],
                  ['This week', s.engagement.wau],
                  ['This month', s.engagement.mau],
                  ['New (30 days)', s.users.new30],
                ] as const
              ).map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-ink-50/70 px-3 py-2.5">
                  <p className="text-xs font-semibold text-ink-500">{l}</p>
                  <p className="num mt-1 text-[22px] text-ink-900">{fmt(v)}</p>
                </div>
              ))}
            </div>
            <AreaTrend data={s.series.map((d) => ({ label: formatDate(d.date, 'dayMonth'), active: d.activeUsers }))} series={[{ key: 'active', name: 'Active users', color: cv('green', 500) }]} height={200} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
              <span>
                Onboarding {share(s.activation.onboarded, s.activation.registered)} · first period {share(s.activation.firstPeriod, s.activation.registered)} · first check-in {share(s.activation.firstCheckIn, s.activation.registered)} · day-7 retention{' '}
                {s.retention.d7 ? share(s.retention.d7.retained, s.retention.d7.cohort) : '—'} · trials {s.monetization.trialsStarted}
                {s.seedEvents > 0 ? ` · includes ${fmt(s.seedEvents)} seeded-history events` : ''}
              </span>
              {can('export_reports') && (
                <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={exportLive}>
                  Export CSV
                </Button>
              )}
            </div>
          </Card>
          <Card className="card-pad">
            <CardHeader title="Module usage" subtitle="Activity per module, last 30 days" icon={<Activity className="h-5 w-5" />} />
            <CategoryBars byCategory={s.byCategory} limit={9} />
          </Card>
        </div>
      )}
    </ReportSection>
  );
}

/** Aggregate-only product analytics (SRS §53–§54). Never individual health values. */
export function AnalyticsReport() {
  const { can } = useAccess();
  const { audit } = useAdmin();
  const toast = useToast();
  const loading = useDemoLoading(500);
  const [range, setRange] = useState<'7' | '30'>('30');
  const all = useMemo(() => analyticsSeries(30), []);
  const series = range === '7' ? all.slice(-7) : all;

  const newUsers = series.reduce((a, d) => a + d.newUsers, 0);
  const onboard = series.reduce((a, d) => a + d.onboarding, 0);
  const dau = all[all.length - 1].dau;
  const wau = Math.round(dau * 2.35);
  const mau = Math.round(dau * 4.1);
  const checkinsPerUser = series.reduce((a, d) => a + d.checkins / d.dau, 0) / series.length;
  const avg = (k: 'd7' | 'd30' | 'd90') => {
    const xs = RETENTION_COHORTS.map((c) => c[k]).filter((v) => v > 0);
    return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  };
  const perUser = series.map((d) => ({ label: d.label, value: Math.round((d.checkins / d.dau) * 100) / 100 }));
  const subs = MRR_SERIES[MRR_SERIES.length - 1].subs;

  const exportKpis = () => {
    downloadCsv(
      `healthx-kpis-${range}d.csv`,
      ['date', 'new_users', 'dau', 'checkins', 'onboarding_completed'],
      series.map((d) => [d.date, d.newUsers, d.dau, d.checkins, d.onboarding]),
    );
    audit('report.export', `KPI report (${range} days)`, 'Aggregate only');
    toast.success('Report exported', 'Aggregate KPI CSV downloaded — contains no individual data.');
  };
  const exportEvents = () => {
    downloadCsv('healthx-event-catalogue.csv', ['event', 'module', 'allowed_properties', 'count_7d'], EVENT_CATALOGUE.map((e) => [e.event, e.module, e.props, e.count7d]));
    audit('report.export', 'Event catalogue', 'Aggregate only');
    toast.success('Event report exported');
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (loading)
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading">
        <div className="rounded-[34px] bg-ink-100 p-8">
          <Skeleton className="h-4 w-40 bg-white/70" />
          <Skeleton className="mt-4 h-8 w-2/3 bg-white/70" />
          <Skeleton className="mt-8 h-40 w-full bg-white/70" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} lines={2} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-10">
      <AdminHero
        className="mb-0"
        eyebrow={`Aggregate KPIs · last ${range} days`}
        title="How people use HealthX"
        aside={
          <div className="rounded-3xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-green-100/80">Daily active users</p>
              <span className="num text-[18px] text-white">{fmt(dau)}</span>
            </div>
            <AreaTrend data={series} series={[{ key: 'dau', name: 'DAU', color: cv('green', 300) }]} height={190} tone="dark" />
          </div>
        }
      >
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-green-50/85">
          Simulated, aggregated product metrics (SRS §53–§54). Analytics never include individual health values — events carry no flow, symptoms, moods or dates.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <HeroStat label="New users" value={fmt(newUsers)} hint={`${range} days`} />
          <HeroStat label="MAU" value={fmt(mau)} hint={`DAU/MAU ${Math.round((dau / mau) * 100)}%`} />
          <HeroStat label="Day-7" value={`${avg('d7')}%`} hint="retention" className="col-span-2 sm:col-span-1" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
            ]}
          />
          {can('export_reports') && (
            <Button variant="butter" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={exportKpis}>
              Export CSV
            </Button>
          )}
        </div>
      </AdminHero>

      <nav aria-label="Report sections" className="no-scrollbar -mt-4 flex gap-2 overflow-x-auto p-0.5">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => jump(s.id)} className="pill-tab pill-tab-off">
            {s.label}
          </button>
        ))}
      </nav>

      <LiveReport />

      <ReportSection id="an-acquisition" n={1} eyebrow="Acquisition" title="Where new users come from">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard label="New users" value={fmt(newUsers)} icon={<UserPlus className="h-5 w-5" />} trend={{ dir: 'up', text: '+12.4%' }} hint="vs previous period">
            <div className="mt-3">
              <Sparkline values={series.map((d) => d.newUsers)} />
            </div>
          </KpiCard>
          <KpiCard label="Install → sign-up conversion" value="68" unit="%" icon={<Repeat className="h-5 w-5" />} tone="sky" hint="Needs install attribution [ADD A-19]">
            <ProgressBar value={0.68} className="mt-4" color="bg-sky-400" track="bg-sky-100" label="Install to sign-up conversion" />
          </KpiCard>
          <Card className="card-pad sm:col-span-2 xl:col-span-1">
            <p className="text-sm font-semibold text-ink-600">Acquisition source</p>
            <div className="mt-2 grid grid-cols-[132px_minmax(0,1fr)] items-center gap-4">
              <Donut height={150} inner={42} outer={62} data={SOURCES.map(({ name, value, color }) => ({ name, value, color }))} />
              <ul className="space-y-2 text-sm">
                {SOURCES.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-ink-700">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', s.dot)} />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="num text-ink-900">{s.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <SimulatedNote>Attribution data requires [ADD A-19].</SimulatedNote>
          </Card>
        </div>
      </ReportSection>

      <ReportSection id="an-activation" n={2} eyebrow="Activation" title="First steps after sign-up">
        <div className="grid gap-6 sm:grid-cols-3">
          <KpiCard label="Onboarding completion" value={Math.round((onboard / newUsers) * 100)} unit="%" icon={<ClipboardCheck className="h-5 w-5" />} hint="onboarding_completed ÷ user_registered">
            <ProgressBar value={onboard / newUsers} className="mt-4" label="Onboarding completion" />
          </KpiCard>
          <KpiCard label="First cycle logged" value="71" unit="%" icon={<CalendarCheck className="h-5 w-5" />} tone="rose" hint="first period_logged within 7 days">
            <ProgressBar value={0.71} className="mt-4" color="bg-rose-400" track="bg-rose-100" label="First cycle logged" />
          </KpiCard>
          <KpiCard label="First wellness check-in" value="64" unit="%" icon={<Smile className="h-5 w-5" />} tone="lavender" hint="needs checkin_completed [ADD A-19]">
            <ProgressBar value={0.64} className="mt-4" color="bg-lavender-400" track="bg-lavender-100" label="First wellness check-in" />
          </KpiCard>
        </div>
      </ReportSection>

      <ReportSection id="an-engagement" n={3} eyebrow="Engagement" title="How often people come back">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="DAU" value={fmt(dau)} icon={<Activity className="h-5 w-5" />} trend={{ dir: 'up', text: '+6.1%' }}>
            <div className="mt-3">
              <Sparkline values={series.map((d) => d.dau)} />
            </div>
          </KpiCard>
          <KpiCard label="WAU" value={fmt(wau)} icon={<Users className="h-5 w-5" />} tone="sky" />
          <KpiCard label="MAU" value={fmt(mau)} icon={<Users className="h-5 w-5" />} tone="indigo" hint={`DAU/MAU ${Math.round((dau / mau) * 100)}%`} />
          <KpiCard label="Check-ins per active user" value={checkinsPerUser.toFixed(2)} icon={<Smile className="h-5 w-5" />} tone="peach" hint="per day" />
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card className="card-pad">
            <CardHeader title="New users" subtitle="user_registered per day" icon={<UserPlus className="h-5 w-5" />} />
            <AreaTrend data={series} series={[{ key: 'newUsers', name: 'New users', color: cv('sky', 500) }]} />
          </Card>
          <Card className="card-pad">
            <CardHeader title="Check-ins per active user" subtitle="Tracking frequency" icon={<Smile className="h-5 w-5" />} />
            <AreaTrend data={perUser} series={[{ key: 'value', name: 'Check-ins / user', color: cv('lavender', 500) }]} yDomain={[0, 1]} />
          </Card>
        </div>
      </ReportSection>

      <ReportSection id="an-retention" n={4} eyebrow="Retention" title="Weekly cohorts over time">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="card-pad">
            <CardHeader title="Retention by weekly cohort" subtitle="% of cohort active on day 7 / 30 / 90" icon={<Repeat className="h-5 w-5" />} />
            <BarTrend
              data={RETENTION_COHORTS}
              xKey="cohort"
              unit="%"
              series={[
                { key: 'd7', name: 'Day 7', color: cv('green', 500) },
                { key: 'd30', name: 'Day 30', color: cv('sky', 400) },
                { key: 'd90', name: 'Day 90', color: cv('lavender', 400) },
              ]}
            />
          </Card>
          <div className="grid gap-6 sm:grid-cols-3 xl:grid-cols-1">
            <KpiCard label="7-day retention" value={avg('d7')} unit="%" icon={<Repeat className="h-5 w-5" />} />
            <KpiCard label="30-day retention" value={avg('d30')} unit="%" icon={<Repeat className="h-5 w-5" />} tone="sky" />
            <KpiCard label="90-day retention" value={avg('d90')} unit="%" icon={<Repeat className="h-5 w-5" />} tone="lavender" hint="Mature cohorts only" />
          </div>
        </div>
        <Card className="mt-6 overflow-hidden">
          <TableShell minWidth={560}>
            <thead>
              <tr>
                <Th>Cohort</Th>
                <Th className="text-right">Day 7</Th>
                <Th className="text-right">Day 30</Th>
                <Th className="text-right">Day 90</Th>
              </tr>
            </thead>
            <tbody>
              {RETENTION_COHORTS.map((c) => (
                <tr key={c.cohort}>
                  <td className="px-4 py-2.5 font-mono text-[13px] text-ink-700">{c.cohort}</td>
                  {(['d7', 'd30', 'd90'] as const).map((k) => (
                    <td key={k} className="px-4 py-2.5 text-right tabular-nums">
                      {c[k] ? <span className="font-semibold text-ink-900">{c[k]}%</span> : <span className="text-ink-400">Not yet</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      </ReportSection>

      <ReportSection id="an-monetisation" n={5} eyebrow="Monetisation" title="Premium preview" badge={<PhaseBadge phase={2} />}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="card-pad">
            <CardHeader title="MRR preview" subtitle="Simulated — pricing TBD (D-13)" icon={<IndianRupee className="h-5 w-5" />} />
            <AreaTrend data={MRR_SERIES} series={[{ key: 'mrr', name: 'MRR (₹)', color: cv('green', 600) }]} height={200} />
          </Card>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
            <KpiCard label="Premium subscribers" value={subs} icon={<Users className="h-5 w-5" />} tone="butter" />
            <KpiCard label="Monthly churn" value="3.1" unit="%" icon={<Repeat className="h-5 w-5" />} tone="peach" />
          </div>
        </div>
      </ReportSection>

      <ReportSection id="an-delivery" n={6} eyebrow="Delivery" title="Notification delivery (aggregate)">
        <Card className="overflow-hidden">
          <TableShell minWidth={680}>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th className="text-right">Sent (7d)</Th>
                <Th className="text-right">Delivered</Th>
                <Th>Opened</Th>
                <Th className="text-right">Opt-out</Th>
              </tr>
            </thead>
            <tbody>
              {DELIVERY_STATS.map((d) => (
                <tr key={d.key}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5 font-semibold capitalize text-ink-800">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                        <BellRing className="h-4 w-4" />
                      </span>
                      {d.key === 'habit' ? 'Check-in' : d.key === 'report' ? 'Weekly report' : d.key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(d.sent)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.delivered}%</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <ProgressBar value={d.opened / 100} className="w-24" height="h-2" label={`${d.key} opened rate`} />
                      <span className="tabular-nums">{d.opened}%</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.optOut}%</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      </ReportSection>

      <ReportSection id="an-events" n={7} eyebrow="Event catalogue (§53)" title="What the apps may send">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
            <Badge tone="mint" icon={<ShieldCheck className="h-3 w-3" />}>
              Payload policy: no health values
            </Badge>
            {can('export_reports') && (
              <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={exportEvents}>
                Export
              </Button>
            )}
          </div>
          <TableShell minWidth={760}>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Owner module</Th>
                <Th>Allowed properties</Th>
                <Th className="text-right">Last 7 days</Th>
              </tr>
            </thead>
            <tbody>
              {EVENT_CATALOGUE.map((e) => (
                <tr key={e.event}>
                  <td className="px-4 py-3 font-mono text-[13px] font-medium text-green-800">{e.event}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-600">{e.module}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{e.props}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">{e.count7d ? fmt(e.count7d) : <span className="text-ink-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <p className="border-t border-ink-100 px-5 py-3.5 text-xs leading-relaxed text-ink-500">
            Events carry only name, timestamp, pseudonymous ID, platform and app version — never flow, symptom names, mood/energy values, period dates, free text or AI question text. Account activity (sign-ins and which kind of record was saved) is kept for support and security; app-usage events (screens, videos, coach questions) are sent only with analytics consent.
          </p>
        </Card>
      </ReportSection>
    </div>
  );
}

export default function Analytics() {
  return (
    <>
      <AdminHeader title="Analytics & reports" subtitle="Acquisition, activation, engagement, retention and delivery KPIs — aggregates only (SRS §53–§54)." badge={<Badge tone="butter">Simulated data</Badge>} />
      <AnalyticsReport />
    </>
  );
}
