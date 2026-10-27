/**
 * App activity (SRS §53/§54): what people are doing in the mobile app right now, across all users —
 * sign-ups, sign-ins, onboarding, logging, content, coach, privacy choices. Admins only (it names people).
 * Values are never shown here; a person's records open from their profile with audited access.
 */
import { useState } from 'react';
import { Activity, BadgeCheck, CalendarCheck, Download, RefreshCw, Smartphone, UserPlus, Users } from 'lucide-react';
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_KEYS } from '@healthx/shared';
import { Button, Card, CardHeader, CardSkeleton, ErrorState, Notice, Segmented } from '@/components/ui';
import { useAccess, useAdmin } from '../adminState';
import { useActivityFeed, useActivitySummary } from '../appActivity';
import { ActivityList, CategoryBars, DataSourceBadge } from '../activityUi';
import { AdminHeader, FilterSelect, KpiCard } from '../components';
import { downloadCsv } from '../helpers';

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

export default function AppActivity() {
  const { state, apiMode, audit } = useAdmin();
  const { can } = useAccess();
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const [category, setCategory] = useState('');
  const summary = useActivitySummary(state.users, Number(days));
  const [limit, setLimit] = useState(25);
  const feed = useActivityFeed(state.users, { limit, category });
  const s = summary.data;

  const exportFeed = () => {
    if (!feed.data) return;
    downloadCsv(
      `healthx-app-activity-${new Date().toISOString().slice(0, 10)}.csv`,
      ['time', 'user_id', 'user', 'event', 'module', 'label', 'source', 'detail'],
      feed.data.map((e) => [e.at, e.userId, e.userName, e.event, ACTIVITY_CATEGORIES[e.category].label, e.label, e.source, e.detail ?? '']),
    );
    audit('report.export', 'App activity feed', `${feed.data.length} events (no health values)`);
  };

  return (
    <>
      <AdminHeader
        title="App activity"
        subtitle="Everything people do in the HealthX mobile app — from sign-up and onboarding to daily logging — as it happens (§53). What and when, never the values."
        badge={<DataSourceBadge apiMode={apiMode} />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => (summary.reload(), feed.reload())}>
              Refresh
            </Button>
            {can('export_reports') && (
              <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={exportFeed} disabled={!feed.data?.length}>
                Export CSV
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={days}
          onChange={setDays}
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
          ]}
        />
        {s && s.seedEvents > 0 && (
          <p className="text-xs text-ink-500">
            Includes {s.seedEvents.toLocaleString('en-US')} synthetic “seeded history” events from the demo accounts.
          </p>
        )}
      </div>

      {summary.loading && !s ? (
        <CardSkeleton lines={4} className="mb-5" />
      ) : summary.error ? (
        <ErrorState body={summary.error} onRetry={summary.reload} />
      ) : (
        s && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <KpiCard label="Active today" value={s.engagement.dau} icon={<Activity className="h-5 w-5" />} hint={`${s.engagement.wau} this week · ${s.engagement.mau} this month`} />
            <KpiCard label="App users" value={s.users.total} icon={<Users className="h-5 w-5" />} tone="sky" hint={`${s.users.new7} new in 7 days · ${s.users.new30} in 30`} />
            <KpiCard label="Finished onboarding" value={pct(s.activation.onboarded, s.activation.registered)} icon={<BadgeCheck className="h-5 w-5" />} tone="lavender" hint={`${s.activation.onboarded} of ${s.activation.registered} accounts`} />
            <KpiCard label="Check-ins per active user" value={s.engagement.checkInsPerUser30} icon={<CalendarCheck className="h-5 w-5" />} tone="peach" hint="Last 30 days" />
          </div>
        )
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="card-pad">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <CardHeader title="Live feed" subtitle="Newest first · select a name to open the profile" icon={<Smartphone className="h-5 w-5" />} className="mb-0" />
            <div className="w-full sm:w-64">
              <FilterSelect
                label="Module"
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  setLimit(25);
                }}
                options={[{ value: '', label: 'All modules (screen views hidden)' }, ...ACTIVITY_CATEGORY_KEYS.map((k) => ({ value: k, label: ACTIVITY_CATEGORIES[k].label }))]} />
            </div>
          </div>
          {feed.loading && !feed.data ? <CardSkeleton lines={8} /> : feed.error ? <ErrorState body={feed.error} onRetry={feed.reload} /> : <ActivityList events={feed.data ?? []} showUser empty="No app activity yet. Sign in to the HealthX mobile app and log something — it appears here." />}
          {feed.data && feed.data.length >= limit && limit < 200 && (
            <div className="mt-3 border-t border-ink-100 pt-4 text-center">
              <Button variant="outline" size="sm" loading={feed.loading} onClick={() => setLimit((n) => Math.min(200, n + 25))}>
                Show more
              </Button>
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card className="card-pad">
            <CardHeader title="Module usage" subtitle={`Activity per module, last ${days} days`} icon={<Activity className="h-5 w-5" />} />
            {s ? <CategoryBars byCategory={s.byCategory} limit={12} /> : <CardSkeleton lines={5} />}
          </Card>
          <Card className="card-pad">
            <CardHeader title="Activation" subtitle="First steps after sign-up (§54)" icon={<UserPlus className="h-5 w-5" />} />
            {s && (
              <ul className="space-y-2 text-sm">
                {(
                  [
                    ['Signed up', s.activation.registered],
                    ['Finished onboarding', s.activation.onboarded],
                    ['Logged a first period', s.activation.firstPeriod],
                    ['First daily check-in', s.activation.firstCheckIn],
                  ] as const
                ).map(([l, n]) => (
                  <li key={l} className="flex items-center justify-between rounded-xl bg-ink-50/70 px-3 py-2">
                    <span className="text-ink-700">{l}</span>
                    <span className="font-semibold tabular-nums text-ink-900">
                      {n} <span className="font-normal text-ink-500">({pct(n, s.activation.registered)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Notice tone="info" title="What is recorded">
            Every account action and every record someone saves (type and time only) is logged for support and security. App-usage events — screens, videos, coach questions — are recorded only for people who allow product analytics. Logs are erased when an account is deleted.
          </Notice>
        </div>
      </div>
    </>
  );
}
