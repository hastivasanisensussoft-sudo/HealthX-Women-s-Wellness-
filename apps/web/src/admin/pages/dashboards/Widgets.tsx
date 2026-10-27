import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ClipboardCheck, FileText, History, LifeBuoy, TrendingUp } from 'lucide-react';
import { BarTrend } from '@/components/charts/Charts';
import { Card, CardHeader, CardLink } from '@/components/ui';
import { cn } from '@/lib/utils';
import { cv } from '@/theme/engine';
import { analyticsSeries, RETENTION_COHORTS, type AuditEntry, type ContentItem, type SupportRequest, type WorkflowStatus } from '../../adminData';
import { formatDateTime } from '../../helpers';
import { contentPipeline, recentWorkflow, supportStats } from '../../metrics';
import { AdminHero, HeroStat, RoleBadge, SlaChip, StatusBadge } from '../../components';

const BAR: Partial<Record<WorkflowStatus, string>> = {
  draft: 'bg-ink-300',
  changes_requested: 'bg-warning',
  medical_review: 'bg-lavender-400',
  compliance_review: 'bg-peach-400',
  approved: 'bg-sky-400',
  scheduled: 'bg-indigo-400',
  published: 'bg-green-500',
  archived: 'bg-green-900',
  rejected: 'bg-danger',
};

const fmt = (n: number) => n.toLocaleString('en-US');

/** Small empty line for dashboard lists. */
function Quiet({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-ink-50/70 px-4 py-6 text-center text-sm text-ink-500">{children}</p>;
}

export function PipelineCard({ content, title = 'Content pipeline', className }: { content: ContentItem[]; title?: string; className?: string }) {
  const rows = contentPipeline(content);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className={cn('card-pad', className)}>
      <CardHeader title={title} subtitle="§40: Writer → Medical → Compliance → Published" icon={<FileText className="h-5 w-5" />} action={<CardLink to="/admin/content">Library</CardLink>} />
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.status} className="grid grid-cols-[124px_minmax(0,1fr)_32px] items-center gap-3 text-sm">
            <span className="truncate text-ink-600">{r.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-ink-100">
              <span className={cn('block h-full rounded-full transition-[width] duration-700', BAR[r.status])} style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
            <span className="num text-right text-[15px] text-ink-900">{r.count}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Timeline of the latest workflow steps (who moved which item where). */
export function WorkflowFeed({ content, actor, title = 'Recent workflow activity', n = 6, className }: { content: ContentItem[]; actor?: string; title?: string; n?: number; className?: string }) {
  const items = recentWorkflow(content, n, actor);
  return (
    <Card className={cn('card-pad', className)}>
      <CardHeader title={title} icon={<History className="h-5 w-5" />} action={<CardLink to="/admin/versions">History</CardLink>} />
      {items.length === 0 ? (
        <Quiet>No activity yet.</Quiet>
      ) : (
        <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-ink-100">
          {items.map((h, i) => (
            <li key={i} className="relative pl-6">
              <span aria-hidden className={cn('absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-white', i === 0 ? 'bg-green-500' : 'bg-green-200')} />
              <p className="text-sm leading-snug">
                <span className="font-semibold text-ink-900">{h.action}</span> ·{' '}
                <Link to={`/admin/content/${h.id}`} className="font-medium text-green-700 hover:underline">
                  {h.title}
                </Link>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
                {h.actor} <RoleBadge role={h.role} /> · {formatDateTime(h.at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function SupportLoadCard({ support, className }: { support: SupportRequest[]; className?: string }) {
  const s = supportStats(support);
  const max = Math.max(1, ...s.byType.map((t) => t.open));
  return (
    <Card className={cn('card-pad', className)}>
      <CardHeader title="Support load" subtitle="[ADD] — no health data in requests" icon={<LifeBuoy className="h-5 w-5" />} action={<CardLink to="/admin/support">Queue</CardLink>} />
      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        {[
          ['Open', s.open, 'text-ink-900'],
          ['In progress', s.inProgress, 'text-sky-600'],
          ['Due < 12h', s.dueSoon, 'text-warning'],
          ['Breached', s.breached, 'text-danger'],
        ].map(([k, v, c]) => (
          <div key={k as string} className="rounded-2xl bg-ink-50 px-1 py-2.5">
            <p className={cn('num text-lg', c as string)}>{v}</p>
            <p className="text-[11px] font-semibold text-ink-500">{k}</p>
          </div>
        ))}
      </div>
      <ul className="space-y-2">
        {s.byType.map((t) => (
          <li key={t.type} className="grid grid-cols-[130px_minmax(0,1fr)_24px] items-center gap-3 text-sm">
            <span className="truncate text-ink-600">{t.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-ink-100">
              <span className="block h-full rounded-full bg-peach-400" style={{ width: `${(t.open / max) * 100}%` }} />
            </span>
            <span className="num text-right">{t.open}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RequestList({ requests, empty = 'No open requests.' }: { requests: SupportRequest[]; empty?: string }) {
  if (!requests.length) return <Quiet>{empty}</Quiet>;
  return (
    <ul className="-mx-2 space-y-1">
      {requests.map((r) => (
        <li key={r.id}>
          <Link to={`/admin/support?id=${r.id}`} className="group flex flex-col gap-2 rounded-2xl px-2 py-2.5 transition hover:bg-green-50/70 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-50 text-peach-600">
                <LifeBuoy className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-900 group-hover:text-green-800">{r.subject}</span>
                <span className="block truncate text-xs text-ink-500">
                  <span className="font-mono text-[11px] text-ink-400">{r.id}</span> · {r.userName} · {r.assignee ?? 'Unassigned'}
                </span>
              </span>
            </span>
            <span className="shrink-0 pl-[52px] sm:pl-0">
              <SlaChip request={r} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ItemList({ items, empty, cta }: { items: { id: string; title: string; meta: ReactNode; status?: WorkflowStatus; to: string }[]; empty: string; cta?: string }) {
  if (!items.length) return <Quiet>{empty}</Quiet>;
  return (
    <ul className="-mx-2 space-y-1">
      {items.map((it) => (
        <li key={it.id}>
          <Link to={it.to} className="group flex items-center justify-between gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-green-50/70">
            <span className="flex min-w-0 items-center gap-3">
              <span className={cn('h-9 w-1.5 shrink-0 rounded-full', it.status ? BAR[it.status] : 'bg-green-300')} aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-900 group-hover:text-green-800">{it.title}</span>
                <span className="block truncate text-xs text-ink-500">{it.meta}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-green-700">
              {it.status ? <StatusBadge status={it.status} /> : cta}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const FEATURE_ADOPTION = [
  { label: 'Daily check-in', pct: 72, bar: 'bg-green-500' },
  { label: 'Period logging', pct: 64, bar: 'bg-rose-400' },
  { label: 'Water', pct: 58, bar: 'bg-sky-400' },
  { label: 'Library', pct: 41, bar: 'bg-lavender-400' },
  { label: 'Workouts', pct: 33, bar: 'bg-peach-400' },
];

/**
 * Mockup "Dashboard" overview as a forest hero: KPI tiles and the 14-day DAU bars
 * (aggregates only, simulated).
 */
export function PlatformHero({ content }: { content: ContentItem[] }) {
  const series = analyticsSeries(30);
  const last = series[series.length - 1];
  const new30 = series.reduce((a, d) => a + d.newUsers, 0);
  const half = (xs: typeof series) => xs.reduce((a, d) => a + d.newUsers, 0);
  const growth = Math.round(((half(series.slice(15)) - half(series.slice(0, 15))) / half(series.slice(0, 15))) * 100);
  const mau = 18_900;
  const onboarding = Math.round((series.reduce((a, d) => a + d.onboarding, 0) / new30) * 100);
  const retention = Math.round(RETENTION_COHORTS.slice(-3).reduce((a, c) => a + c.d7, 0) / 3);
  const dau14 = series.slice(-14).map((d) => ({ label: d.label, dau: d.dau }));
  const compliance = content.filter((c) => c.status === 'compliance_review').length;
  const kpis = [
    { label: 'New users (30 days)', value: fmt(new30), note: `${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}% vs previous 15 days` },
    { label: 'DAU / MAU', value: fmt(last.dau), note: `of ${fmt(mau)} · stickiness ${Math.round((last.dau / mau) * 100)}%` },
    { label: '7-day retention', value: `${retention}%`, note: 'Avg of last 3 weekly cohorts' },
    { label: 'Daily check-ins', value: fmt(last.checkins), note: `${Math.round((last.checkins / last.dau) * 100)}% of DAU` },
    { label: 'Onboarding completion', value: `${onboarding}%`, note: 'Last 30 days' },
    { label: 'Awaiting compliance', value: compliance, note: 'Admin approval step (§40)' },
  ];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <AdminHero
      eyebrow={`Platform pulse · ${today}`}
      title="Platform at a glance"
      aside={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
          {kpis.map((k) => (
            <HeroStat key={k.label} label={k.label} value={k.value} hint={k.note} />
          ))}
        </div>
      }
    >
      <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/75">Aggregate, simulated product metrics — never an individual’s health data.</p>
      <div className="mt-6 rounded-3xl bg-green-950/30 p-4 ring-1 ring-inset ring-white/10">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity className="h-4 w-4 text-green-300" />
            <span>Daily active users — last 14 days</span>
          </p>
          <Link to="/admin/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-green-200 hover:text-white">
            Analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <BarTrend data={dau14} series={[{ key: 'dau', name: 'DAU', color: cv('green', 300) }]} height={180} tone="dark" highlight={(d) => (d === dau14[dau14.length - 1] ? cv('butter', 300) : undefined)} />
      </div>
    </AdminHero>
  );
}

/** Pending medical reviews with time in queue (mockup "Dashboard" widget). */
export function PendingReviewsCard({ content, className }: { content: ContentItem[]; className?: string }) {
  const pending = content.filter((c) => c.status === 'medical_review');
  return (
    <Card className={cn('card-pad', className)}>
      <CardHeader title="Pending medical reviews" subtitle={`${pending.length} waiting`} icon={<ClipboardCheck className="h-5 w-5" />} action={<CardLink to="/admin/reviews">Open queue</CardLink>} />
      {pending.length === 0 ? (
        <Quiet>Queue is empty.</Quiet>
      ) : (
        <ul className="-mx-2 space-y-1">
          {pending.slice(0, 5).map((c) => {
            const at = [...c.history].reverse().find((h) => h.action.startsWith('Submitted') || h.action.startsWith('Created new version'))?.at;
            const days = at ? Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000)) : 0;
            return (
              <li key={c.id}>
                <Link to={`/admin/content/${c.id}`} className="group flex items-center justify-between gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-lavender-50/70">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="num flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-2xl bg-lavender-50 text-[15px] leading-none text-lavender-700">
                      {days}
                      <span className="mt-0.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.08em]">days</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink-900 group-hover:text-green-800">{c.title}</span>
                      <span className="text-xs text-ink-500">
                        {c.type === 'faq' ? 'FAQ' : c.type[0].toUpperCase() + c.type.slice(1)} · {days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} in queue`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">Review</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function FeatureAdoptionCard({ className }: { className?: string }) {
  return (
    <Card className={cn('card-pad', className)}>
      <CardHeader title="Feature adoption" subtitle="Share of weekly active users (simulated aggregate)" icon={<TrendingUp className="h-5 w-5" />} />
      <ul className="space-y-3.5">
        {FEATURE_ADOPTION.map((f) => (
          <li key={f.label} className="grid grid-cols-[112px_minmax(0,1fr)_44px] items-center gap-3 text-sm">
            <span className="truncate text-ink-700">{f.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-ink-100">
              <span className={cn('block h-full rounded-full', f.bar)} style={{ width: `${f.pct}%` }} />
            </span>
            <span className="num text-right text-[15px] text-ink-900">{f.pct}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RecentActivityCard({ audit, className }: { audit: AuditEntry[]; className?: string }) {
  return (
    <Card className={cn('card-pad', className)}>
      <CardHeader title="Recent activity" icon={<History className="h-5 w-5" />} action={<CardLink to="/admin/audit">Audit log</CardLink>} />
      {audit.length === 0 ? (
        <Quiet>No activity yet.</Quiet>
      ) : (
        <ul className="divide-y divide-ink-100">
          {audit.slice(0, 5).map((a) => (
            <li key={a.id} className="flex gap-3 py-2.5 text-sm">
              <time className="w-12 shrink-0 pt-0.5 font-mono text-xs text-ink-400">{new Date(a.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
              <span className="min-w-0 text-ink-700">
                <span className="font-semibold text-ink-900">{a.actor === 'system' ? 'System' : a.actor}</span> · <span className="rounded-md bg-green-50 px-1.5 py-0.5 font-mono text-[11.5px] text-green-800">{a.action}</span> · {a.target}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
