/**
 * Dashboard widgets fed by real mobile-app activity (API mode) or the labelled offline simulation:
 * live activity for Admins, aggregate content engagement for content staff, and the daily-plan workflow.
 */
import { Link } from 'react-router-dom';
import { Activity, BadgeCheck, BookOpen, CalendarCheck, ListChecks, Smartphone, Users } from 'lucide-react';
import { Card, CardHeader, CardLink, CardSkeleton, ErrorState, SectionTitle } from '@/components/ui';
import { useAdmin } from '../../adminState';
import { useActivitySummary, useContentEngagement } from '../../appActivity';
import { ActivityList, CategoryBars, DataSourceBadge } from '../../activityUi';
import { KpiCard } from '../../components';
import { ItemList } from './Widgets';

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

/** Admin dashboard: what people are doing in the mobile app (names link to their profile). */
export function LiveAppActivitySection() {
  const { state, apiMode } = useAdmin();
  const { data: s, loading, error, reload } = useActivitySummary(state.users, 30);
  return (
    <>
      <SectionTitle eyebrow="Mobile app" title="Live app activity" subtitle="Sign-ups, onboarding and everyday logging from the HealthX app — what and when, never the values (§53, §54)." action={<DataSourceBadge apiMode={apiMode} />} />
      {loading && !s ? (
        <CardSkeleton lines={5} className="mb-10" />
      ) : error ? (
        <div className="mb-10">
          <ErrorState body={error} onRetry={reload} />
        </div>
      ) : (
        s && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <KpiCard label="Active today" value={s.engagement.dau} icon={<Activity className="h-5 w-5" />} hint={`${s.engagement.wau} this week · ${s.engagement.mau} this month`} />
              <KpiCard label="App users" value={s.users.total} icon={<Users className="h-5 w-5" />} tone="sky" hint={`${s.users.new7} new this week`} />
              <KpiCard label="Finished onboarding" value={pct(s.activation.onboarded, s.activation.registered)} icon={<BadgeCheck className="h-5 w-5" />} tone="lavender" hint={`${s.activation.onboarded} of ${s.activation.registered}`} />
              <KpiCard label="Check-ins per active user" value={s.engagement.checkInsPerUser30} icon={<CalendarCheck className="h-5 w-5" />} tone="peach" hint="Last 30 days" />
            </div>
            <div className="mb-10 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Card className="card-pad">
                <CardHeader title="Latest in the app" subtitle="Newest first" icon={<Smartphone className="h-5 w-5" />} action={<CardLink to="/admin/activity">All activity</CardLink>} />
                <ActivityList events={(s.recent ?? []).slice(0, 7)} showUser empty="No app activity yet." />
              </Card>
              <Card className="card-pad">
                <CardHeader title="Module usage" subtitle="Activity per module, last 30 days" icon={<Activity className="h-5 w-5" />} />
                <CategoryBars byCategory={s.byCategory} limit={8} />
              </Card>
            </div>
          </>
        )
      )}
    </>
  );
}

/** Content staff: what people read in the app (counts only, no identities). */
export function ContentEngagementCard() {
  const { state, apiMode } = useAdmin();
  const { data, loading, error, reload } = useContentEngagement(state.users, 30);
  const rows = (data ?? []).slice(0, 6);
  const max = Math.max(1, ...rows.map((r) => r.views + r.opens));
  return (
    <Card className="card-pad">
      <CardHeader title="Reading in the app" subtitle={apiMode ? 'Last 30 days · live, aggregate' : 'Last 30 days · simulated, aggregate'} icon={<BookOpen className="h-5 w-5" />} />
      {loading && !data ? (
        <CardSkeleton lines={4} className="shadow-none ring-0" />
      ) : error ? (
        <ErrorState body={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-ink-50/70 px-4 py-6 text-center text-sm text-ink-500">Nobody has opened an article in the app yet.</p>
      ) : (
        <ol className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="num flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-xs text-sky-700">{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink-800">{r.title}</span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sky-100">
                  <span className="block h-full rounded-full bg-sky-500" style={{ width: `${((r.views + r.opens) / max) * 100}%` }} />
                </span>
              </span>
              <span className="text-right text-xs text-ink-500">
                <b className="num text-[15px] text-ink-900">{r.readers}</b> reader{r.readers === 1 ? '' : 's'}
                <span className="block">{r.bookmarkedNow} saved</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** Daily-plan templates that need this person: reviewers see the review queue, authors their drafts. */
export function PlansCard({ as }: { as: 'author' | 'reviewer' }) {
  const { state } = useAdmin();
  const live = state.planTemplates.filter((t) => t.status === 'approved').length;
  const items =
    as === 'reviewer'
      ? state.planTemplates.filter((t) => t.status === 'in_review').map((t) => ({ id: t.id, title: t.title, meta: `Submitted by ${t.updatedBy}`, to: '/admin/plans' }))
      : state.planTemplates
          .filter((t) => t.status === 'draft' || t.status === 'changes_requested')
          .map((t) => ({ id: t.id, title: t.title, meta: t.status === 'changes_requested' ? `Changes requested${t.reviewNote ? ` — “${t.reviewNote}”` : ''}` : 'Draft · not yet submitted', to: '/admin/plans' }));
  return (
    <Card className="card-pad">
      <CardHeader
        title={as === 'reviewer' ? 'Daily-plan items to review' : 'Daily-plan items'}
        subtitle={`${live} live in the app (§33)`}
        icon={<ListChecks className="h-5 w-5" />}
        action={<CardLink to="/admin/plans">Daily plans</CardLink>}
      />
      <ItemList items={items} empty={as === 'reviewer' ? 'No plan items waiting for review.' : 'Nothing waiting — every item is submitted or live.'} cta={as === 'reviewer' ? 'Review' : 'Open'} />
      <p className="mt-3 text-xs text-ink-500">
        <Link to="/admin/plans" className="font-semibold text-green-700 hover:underline">
          Preview a plan
        </Link>{' '}
        exactly as the app builds it.
      </p>
    </Card>
  );
}
