import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FilePen,
  FileText,
  Flag,
  FolderTree,
  Image,
  IndianRupee,
  KeyRound,
  LifeBuoy,
  Plus,
  RotateCcw,
  ScrollText,
  Search,
  ShieldCheck,
  Stethoscope,
  Timer,
  UserCog,
  Users,
} from 'lucide-react';
import type { PhotoKey } from '@healthx/shared';
import { LeafPair } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { Badge, Button, ButtonLink, Card, CardHeader, CardLink, IconTile, Input, Notice, ProgressRing, SectionTitle, type TileTone } from '@/components/ui';
import { cv } from '@/theme/engine';
import { contentViews7d, MRR_SERIES, SUPPORT_TYPES, type ContentItem } from '../../adminData';
import { useAccess, useAdmin } from '../../adminState';
import { KpiCard, RoleBadge, SecurityNote, SlaChip, StatusPill } from '../../components';
import { formatDateTime, slaRemaining } from '../../helpers';
import { reviewTurnaroundHours, securityPosture, supportStats } from '../../metrics';
import type { Capability } from '../../rbac';
import { FeatureAdoptionCard, ItemList, PendingReviewsCard, PipelineCard, PlatformHero, RecentActivityCard, RequestList, WorkflowFeed } from './Widgets';
import { ContentEngagementCard, LiveAppActivitySection, PlansCard } from './LiveWidgets';

const fmt = (n: number) => n.toLocaleString('en-US');
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const daysSince = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : 0);
const submittedAt = (c: ContentItem) => [...c.history].reverse().find((h) => h.action.startsWith('Submitted') || h.action.startsWith('Created new version'))?.at;

type QuickAction = { label: string; hint: string; to: string; icon: ReactNode; tone: TileTone; cap?: Capability; any?: Capability[] };

/** Row of tinted quick-action tiles, filtered to what the signed-in role can open. */
function QuickActions({ items, label }: { items: QuickAction[]; label: string }) {
  const { can } = useAccess();
  const visible = items.filter((i) => (i.any ? i.any.some(can) : !i.cap || can(i.cap)));
  if (!visible.length) return null;
  return (
    <section aria-label={label} className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {visible.map((i) => (
        <IconTile key={i.to} to={i.to} icon={i.icon} label={i.label} hint={i.hint} tone={i.tone} />
      ))}
    </section>
  );
}

/** Arch portrait with leaves for the dashboard heroes (decorative). */
function HeroPortrait({ photo, position, children }: { photo: PhotoKey; position?: string; children?: ReactNode }) {
  return (
    <div className="relative mx-auto hidden h-[260px] w-full max-w-[420px] sm:block">
      <LeafPair className="right-6 top-0 h-36 w-36" />
      <Photo photo={photo} alt="" shape="arch" position={position} className="!absolute bottom-0 right-10 h-[240px] w-[190px] ring-4 ring-white/10" />
      {children && <div className="absolute bottom-6 left-0 w-[250px] max-w-[70%]">{children}</div>}
    </div>
  );
}

function CampaignsCard() {
  const { state } = useAdmin();
  const scheduled = state.campaigns.filter((c) => c.status === 'scheduled');
  const sent = state.campaigns.filter((c) => c.status === 'sent');
  return (
    <Card className="card-pad">
      <CardHeader title="Notification campaigns" subtitle="Non-sensitive segments only" icon={<Bell className="h-5 w-5" />} action={<CardLink to="/admin/notifications/campaigns">Manage</CardLink>} />
      <div className="space-y-2.5">
        {scheduled.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-indigo-50 px-3.5 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink-900">{c.name}</span>
              <span className="text-xs text-ink-500">
                Scheduled {c.schedule?.replace('T', ' ')} · ~{fmt(c.reach)} people
              </span>
            </span>
            <StatusPill tone="indigo">Scheduled</StatusPill>
          </div>
        ))}
        {sent.map((c) => {
          const rate = c.delivered && c.opened ? Math.round((c.opened / c.delivered) * 100) : null;
          return (
            <div key={c.id} className="px-1 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-ink-700">{c.name}</span>
                <span className="shrink-0 text-xs font-semibold text-ink-500">{rate !== null ? `${rate}% opened` : 'sent'}</span>
              </div>
              {rate !== null && (
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <span className="block h-full rounded-full bg-indigo-400" style={{ width: `${rate}%` }} />
                </span>
              )}
            </div>
          );
        })}
        {!scheduled.length && !sent.length && <p className="text-sm text-ink-500">No campaigns yet.</p>}
      </div>
    </Card>
  );
}

// ---------------- Admin (§6.4) ----------------
/**
 * One dashboard for every Admin. It brings together what used to be four role dashboards:
 * operations (Admin), platform and security posture (Super Admin), the support desk with user
 * lookup (Support Agent) and the way into reports (Analyst).
 */
export function AdminDashboard() {
  const { state } = useAdmin();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const last = MRR_SERIES[MRR_SERIES.length - 1];
  const awaitingCompliance = state.content.filter((c) => c.status === 'compliance_review');
  const sec = securityPosture(state.staff, state.flags, state.audit);
  const s = supportStats(state.support);
  const urgent = [...s.active].sort((a, b) => slaRemaining(a.createdAt, SUPPORT_TYPES[a.type].slaHours) - slaRemaining(b.createdAt, SUPPORT_TYPES[b.type].slaHours)).slice(0, 5);
  const actions = state.audit.filter((a) => /^(user|support)\./.test(a.action)).slice(0, 6);
  const search = (e: FormEvent) => {
    e.preventDefault();
    nav(`/admin/users?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <>
      <PlatformHero content={state.content} />

      <QuickActions
        label="Quick actions"
        items={[
          { label: 'Users', hint: 'Accounts & status', to: '/admin/users', icon: <Users className="h-5 w-5" />, tone: 'green', cap: 'view_users' },
          { label: 'Support', hint: `${s.open} open`, to: '/admin/support', icon: <LifeBuoy className="h-5 w-5" />, tone: 'peach', cap: 'manage_support' },
          { label: 'Compliance', hint: `${awaitingCompliance.length} to approve`, to: '/admin/compliance', icon: <ClipboardCheck className="h-5 w-5" />, tone: 'lavender', cap: 'compliance_review' },
          { label: 'Campaigns', hint: 'Notifications', to: '/admin/notifications/campaigns', icon: <Bell className="h-5 w-5" />, tone: 'indigo', cap: 'view_notifications' },
          { label: 'Reports', hint: 'Aggregates & CSV', to: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" />, tone: 'sky', cap: 'view_analytics' },
          { label: 'Audit log', hint: 'Every action', to: '/admin/audit', icon: <ScrollText className="h-5 w-5" />, tone: 'butter', cap: 'view_audit' },
        ]}
      />

      <LiveAppActivitySection />

      <SectionTitle eyebrow="Users & support" title="Support desk" subtitle="The former Support Agent desk — account status, consents and requests, never health data." />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Open support requests" value={s.open} icon={<LifeBuoy className="h-5 w-5" />} tone="peach" />
        <KpiCard label="In progress" value={s.inProgress} icon={<Activity className="h-5 w-5" />} tone="sky" />
        <KpiCard label="Unassigned" value={s.unassigned} icon={<Users className="h-5 w-5" />} tone="lavender" />
        <KpiCard label="SLA breached" value={s.breached} icon={<AlertTriangle className="h-5 w-5" />} tone="rose" hint={`${s.dueSoon} due in < 12h`} />
      </div>
      <div className="mb-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="card relative overflow-hidden bg-wash p-6">
          <span aria-hidden className="leaf absolute -right-8 -top-8 h-28 w-28 bg-green-100/70" />
          <div className="relative">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-green-700 shadow-soft">
              <Search className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-[19px] font-semibold text-ink-900">Find a user account</h3>
            <p className="mt-1 text-sm text-ink-500">Jump straight to an account by name, email or user ID.</p>
            <form onSubmit={search} className="mt-4 space-y-3">
              <div>
                <label htmlFor="quick-user" className="label">
                  Quick user lookup
                </label>
                <Input id="quick-user" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or user ID" leftIcon={<Search className="h-4 w-4" />} />
              </div>
              <Button type="submit" className="w-full sm:w-auto" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Find user
              </Button>
            </form>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700" />
              Account status, consents and subscription only — health data is never shown to staff (§68).
            </p>
          </div>
        </div>
        <Card className="card-pad">
          <CardHeader title="Most urgent requests" subtitle="Sorted by SLA" icon={<Timer className="h-5 w-5" />} action={<CardLink to="/admin/support">Queue</CardLink>} />
          <RequestList requests={urgent} />
          {urgent[0] && (
            <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 text-xs text-ink-500">
              Next due: <SlaChip request={urgent[0]} />
            </p>
          )}
        </Card>
      </div>

      <SectionTitle eyebrow="Content Management" title="Content & compliance" subtitle="Medical review, the Admin compliance step (D-08 B) and the publishing pipeline." />
      <div className="mb-10 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-6">
          <PendingReviewsCard content={state.content} />
          <Card className="card-pad">
            <CardHeader title="Awaiting compliance approval" subtitle="Admins hold the §40 compliance step (D-08 B)" icon={<ClipboardCheck className="h-5 w-5" />} action={<CardLink to="/admin/reviews">Review queue</CardLink>} />
            <ItemList
              items={awaitingCompliance.map((c) => ({ id: c.id, title: c.title, meta: `${c.type} · v${c.version} · by ${c.author}`, status: c.status, to: `/admin/content/${c.id}` }))}
              empty="Nothing waiting for compliance."
            />
          </Card>
        </div>
        <PipelineCard content={state.content} />
      </div>

      <SectionTitle eyebrow="Platform" title="Business & security" subtitle="Subscriptions (Phase 2 preview), campaigns and the §47 security controls." />
      <div className="mb-10 grid gap-6 xl:grid-cols-3">
        <Card className="card-pad">
          <CardHeader title="Subscriptions" subtitle="Phase 2 preview" icon={<IndianRupee className="h-5 w-5" />} action={<CardLink to="/admin/subscriptions">Manage</CardLink>} />
          <div className="rounded-3xl bg-gradient-to-br from-green-50 to-mint p-4">
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-green-800/70">Monthly recurring revenue</p>
            <p className="num mt-1 text-[30px] leading-none text-green-950">{rupees(last.mrr)}</p>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            {[
              ['Subscribers', fmt(last.subs)],
              ['Churn', '3.1%'],
              ['Refunds (30d)', String(state.refunds.length)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-ink-50 px-3 py-2.5">
                <dt className="text-[11px] font-semibold leading-tight text-ink-500">{k}</dt>
                <dd className="num text-lg text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <CampaignsCard />
        <Card className="card-pad">
          <CardHeader title="Security posture" subtitle="§47 controls" icon={<ShieldCheck className="h-5 w-5" />} action={<CardLink to="/admin/settings">Settings</CardLink>} />
          <div className="flex items-center gap-4">
            <ProgressRing value={sec.mfaCoverage / 100} size={88} stroke={9} color={sec.mfaCoverage === 100 ? cv('green', 500) : cv('peach', 500)} track={cv('ink', 100)}>
              <span className="num text-lg text-ink-900">{sec.mfaCoverage}%</span>
            </ProgressRing>
            <div className="min-w-0 text-sm">
              <p className="font-bold text-ink-900">Staff MFA coverage</p>
              <p className="text-ink-500">MFA is required for every staff role (D-33).</p>
              {sec.withoutMfa.length > 0 && <p className="mt-1 text-xs font-semibold text-warning">Pending: {sec.withoutMfa.map((m) => m.name).join(', ')}</p>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['Flags changed', sec.flagsChanged7d, Flag],
              ['Break-glass', sec.breakGlass7d, KeyRound],
              ['Role/permission', sec.roleChanges7d, UserCog],
            ].map(([k, v, I]) => {
              const Icon = I as typeof Flag;
              return (
                <div key={k as string} className="rounded-2xl bg-ink-50 px-1 py-2.5">
                  <Icon className="mx-auto h-4 w-4 text-ink-400" />
                  <p className="num mt-1 text-lg text-ink-900">{v as number}</p>
                  <p className="text-[11px] font-semibold leading-tight text-ink-500">{k as string} · 7d</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <SectionTitle eyebrow="Settings & Audit Logs" title="Activity" subtitle="Feature adoption, sensitive actions and the latest workflow steps." />
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <FeatureAdoptionCard />
        <RecentActivityCard audit={state.audit} />
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="card-pad">
          <CardHeader title="Audit highlights" subtitle="Sensitive actions" icon={<AlertTriangle className="h-5 w-5" />} action={<CardLink to="/admin/audit">Audit log</CardLink>} />
          <ul className="divide-y divide-ink-100">
            {sec.sensitive.map((a) => (
              <li key={a.id} className="py-2.5">
                <p className="inline-block rounded-md bg-peach-50 px-1.5 py-0.5 font-mono text-[11.5px] text-peach-700">{a.action}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {a.actor} · {a.target} · {formatDateTime(a.at)}
                </p>
              </li>
            ))}
            {!sec.sensitive.length && <li className="py-6 text-center text-sm text-ink-500">Nothing sensitive recently.</li>}
          </ul>
        </Card>
        <Card className="card-pad">
          <CardHeader title="Recent account actions" icon={<Users className="h-5 w-5" />} />
          <ul className="divide-y divide-ink-100">
            {actions.map((a) => (
              <li key={a.id} className="py-2.5">
                <p className="inline-block rounded-md bg-green-50 px-1.5 py-0.5 font-mono text-[11.5px] text-green-800">{a.action}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                  {a.actor} <RoleBadge role={a.role} /> · {a.target} · {formatDateTime(a.at)}
                </p>
              </li>
            ))}
            {!actions.length && <li className="py-6 text-center text-sm text-ink-500">No recent account actions.</li>}
          </ul>
        </Card>
        <WorkflowFeed content={state.content} title="Content activity" />
      </div>
      <div className="card relative grid overflow-hidden sm:grid-cols-[minmax(0,1fr)_240px]">
        <div className="p-6 sm:p-7">
          <p className="eyebrow">Analytics & Reports</p>
          <h3 className="mt-1.5 font-display text-[20px] font-semibold text-ink-900">Analytics & reports</h3>
          <p className="mt-1 text-sm text-ink-500">Aggregate metrics only (§53–§54)</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600">Engagement, retention, feature adoption and content performance, with CSV export. No individual health values are ever included.</p>
          <ButtonLink to="/admin/analytics" size="sm" className="mt-5" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Open analytics
          </ButtonLink>
        </div>
        <Photo photo="friends-group" alt="" shape="none" className="hidden h-full min-h-[200px] sm:block" position="50% 35%" />
      </div>
      <SecurityNote className="mt-6" />
    </>
  );
}

// ---------------- Medical Content Reviewer (§6.3) ----------------
export function MedicalDashboard() {
  const { state } = useAdmin();
  const me = state.session!.name;
  const queue = state.content.filter((c) => c.status === 'medical_review');
  const templates = state.templates.filter((t) => t.status === 'pending_review');
  const turnaround = reviewTurnaroundHours(state.content);
  const decisions = state.content
    .flatMap((c) => c.history.filter((h) => /Medical review approved|Requested changes|Rejected/.test(h.action)).map((h) => ({ ...h, title: c.title, id: c.id })))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  const mine = decisions.filter((d) => d.actor === me);
  const next = [...queue].sort((a, b) => daysSince(submittedAt(b)) - daysSince(submittedAt(a)))[0];
  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-[34px] bg-forest p-6 text-white shadow-lift sm:p-8">
        <span aria-hidden className="leaf pointer-events-none absolute -right-12 -top-14 h-48 w-48 bg-white/[0.05]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-green-200/85">Medical review desk</p>
            <h2 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
              {queue.length === 0 ? 'Your queue is clear' : `${queue.length} item${queue.length === 1 ? '' : 's'} waiting for your review`}
            </h2>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/75">Check accuracy, references and safety wording. Approval needs at least one reference and the full safety checklist.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink to="/admin/reviews" variant="butter" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Start reviewing
              </ButtonLink>
              <ButtonLink to="/admin/notifications/templates" variant="white" leftIcon={<Bell className="h-4 w-4" />}>
                Notification copy ({templates.length})
              </ButtonLink>
            </div>
          </div>
          <HeroPortrait photo="doctor-consult" position="72% 30%">
            {next && (
              <Link to={`/admin/content/${next.id}`} className="glass-dark block rounded-2xl p-3.5 transition hover:bg-green-950/50">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-green-200/80">Next up · {daysSince(submittedAt(next))} days in queue</span>
                <span className="mt-1 block truncate text-sm font-semibold text-white">{next.title}</span>
                <span className="mt-0.5 block truncate text-xs text-white/70">
                  {next.type} · by {next.author} · v{next.version}
                </span>
              </Link>
            )}
          </HeroPortrait>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Awaiting medical review" value={queue.length} icon={<ClipboardCheck className="h-5 w-5" />} tone="lavender" />
        <KpiCard label="Notification copy to review" value={templates.length} icon={<Bell className="h-5 w-5" />} tone="peach" hint="D-40" />
        <KpiCard label="Avg turnaround" value={turnaround ?? '—'} unit={turnaround !== null ? 'h' : undefined} icon={<Timer className="h-5 w-5" />} tone="sky" hint="submit → decision" />
        <KpiCard label="My decisions" value={mine.length} icon={<CheckCircle2 className="h-5 w-5" />} hint="all time (demo)" />
      </div>
      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <Card className="card-pad">
          <CardHeader title="Review queue" subtitle="Accuracy, references, safety wording (§6.3)" icon={<Stethoscope className="h-5 w-5" />} action={<CardLink to="/admin/reviews">Open queue</CardLink>} />
          <ItemList items={queue.map((c) => ({ id: c.id, title: c.title, meta: `${c.type} · by ${c.author} · v${c.version}`, to: `/admin/content/${c.id}` }))} empty="Queue is empty 🎉" cta="Review" />
        </Card>
        <Card className="card-pad">
          <CardHeader title="Notification copy awaiting approval" subtitle="Health-related templates route to you" icon={<Bell className="h-5 w-5" />} action={<CardLink to="/admin/notifications/templates">Templates</CardLink>} />
          <ItemList items={templates.map((t) => ({ id: t.key, title: `${t.label} template`, meta: `Proposed by ${t.proposed?.by ?? '—'}`, to: '/admin/notifications/templates' }))} empty="No template changes waiting." cta="Review" />
        </Card>
      </div>
      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <PlansCard as="reviewer" />
        <ContentEngagementCard />
      </div>
      <Card className="card-pad">
        <CardHeader title="Recent decisions" subtitle="Approvals, change requests and rejections" icon={<RotateCcw className="h-5 w-5" />} />
        {decisions.length === 0 ? (
          <p className="rounded-2xl bg-ink-50/70 px-4 py-6 text-center text-sm text-ink-500">No decisions yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {decisions.slice(0, 8).map((d, i) => (
              <li key={i} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <Badge tone={d.action.includes('approved') ? 'green' : d.action.includes('Rejected') ? 'danger' : 'warning'}>{d.action}</Badge>
                  <Link to={`/admin/content/${d.id}`} className="min-w-0 truncate font-semibold text-ink-900 hover:text-green-700">
                    {d.title}
                  </Link>
                </span>
                <span className="shrink-0 text-xs text-ink-400">
                  {d.actor === me ? 'You' : d.actor} · {formatDateTime(d.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Notice tone="safety" className="mt-6">
        Clinical sign-off belongs to Medical Content Reviewers only — no Admin can approve content medically, and nobody can approve a version they wrote or edited (§40 separation of duties).
      </Notice>
    </>
  );
}

// ---------------- Content Manager (§6.2) ----------------
export function ContentDashboard() {
  const { state } = useAdmin();
  const me = state.session!.name;
  const mine = state.content.filter((c) => c.author === me);
  const drafts = mine.filter((c) => ['draft', 'changes_requested', 'rejected'].includes(c.status));
  const ready = state.content.filter((c) => c.status === 'approved');
  const scheduled = state.content.filter((c) => c.status === 'scheduled').sort((a, b) => ((a.scheduledFor ?? '') < (b.scheduledFor ?? '') ? -1 : 1));
  const myTemplates = state.templates.filter((t) => t.status === 'pending_review' && t.proposed?.by === me);
  const inReview = state.content.filter((c) => c.status === 'medical_review');
  const turnaround = reviewTurnaroundHours(state.content);
  const month = new Date().toISOString().slice(0, 7);
  const publishedThisMonth = state.content.filter((c) => c.status === 'published' && c.publishedDate?.startsWith(month));
  const published = state.content.filter((c) => c.status === 'published');
  const views = published.reduce((a, c) => a + contentViews7d(c.id), 0);
  const top = [...published].sort((a, b) => contentViews7d(b.id) - contentViews7d(a.id)).slice(0, 5);
  const topMax = Math.max(1, ...top.map((c) => contentViews7d(c.id)));
  const attention = [
    ...mine.filter((c) => c.status === 'changes_requested' || c.status === 'rejected').map((c) => ({ c, why: c.status === 'rejected' ? 'Rejected — see reviewer comment' : 'Returned with comments' })),
    ...drafts.filter((c) => c.status === 'draft').map((c) => ({ c, why: 'Draft · not yet submitted' })),
    ...ready.map((c) => ({ c, why: 'Approved · schedule it' })),
    ...mine.filter((c) => c.status === 'medical_review').map((c) => ({ c, why: 'Waiting for a medical reviewer' })),
  ].slice(0, 6);
  const nextLive = scheduled[0];
  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-[34px] bg-forest p-6 text-white shadow-lift sm:p-8">
        <span aria-hidden className="leaf pointer-events-none absolute -right-12 -top-14 h-48 w-48 bg-white/[0.05]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-green-200/85">Content workspace · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h2 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
              {attention.length === 0 ? 'You’re all caught up' : `${attention.length} item${attention.length === 1 ? '' : 's'} need${attention.length === 1 ? 's' : ''} your attention`}
            </h2>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/75">Write, categorise and submit evidence-based content. It goes live only after medical and compliance review.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ['Drafts', drafts.length],
                ['In review', inReview.length],
                ['Ready', ready.length],
                ['Scheduled', scheduled.length],
              ].map(([k, v]) => (
                <span key={k as string} className="glass-dark inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm">
                  <b className="num text-[15px]">{v}</b>
                  <span className="text-white/75">{k}</span>
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink to="/admin/content/new" variant="butter" leftIcon={<Plus className="h-4 w-4" />}>
                New article
              </ButtonLink>
              <ButtonLink to="/admin/schedule" variant="white" leftIcon={<CalendarDays className="h-4 w-4" />}>
                Publishing calendar
              </ButtonLink>
            </div>
          </div>
          <HeroPortrait photo="journaling" position="50% 40%">
            {nextLive && (
              <Link to={`/admin/content/${nextLive.id}`} className="glass-dark block rounded-2xl p-3.5 transition hover:bg-green-950/50">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-green-200/80">Next go-live · {nextLive.scheduledFor?.replace('T', ' ')}</span>
                <span className="mt-1 block truncate text-sm font-semibold text-white">{nextLive.title}</span>
              </Link>
            )}
          </HeroPortrait>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="My drafts" value={drafts.length} icon={<FilePen className="h-5 w-5" />} hint={`${mine.filter((c) => c.status === 'changes_requested').length} returned with comments`} />
        <KpiCard label="In medical review" value={inReview.length} icon={<ClipboardCheck className="h-5 w-5" />} tone="lavender" hint={turnaround !== null ? `Avg ${(turnaround / 24).toFixed(1)} days to review` : undefined} />
        <KpiCard label="Published this month" value={publishedThisMonth.length} icon={<CheckCircle2 className="h-5 w-5" />} tone="sky" hint={`${scheduled.length} scheduled`} />
        <KpiCard label="Content views (7 days)" value={fmt(views)} icon={<Activity className="h-5 w-5" />} tone="peach" hint="Aggregate · simulated" />
      </div>

      <QuickActions
        label="Content shortcuts"
        items={[
          { label: 'Content library', hint: `${state.content.length} items`, to: '/admin/content', icon: <FileText className="h-5 w-5" />, tone: 'green', cap: 'view_content' },
          { label: 'Review queue', hint: 'Track your submissions', to: '/admin/reviews', icon: <ClipboardCheck className="h-5 w-5" />, tone: 'lavender', any: ['medical_review', 'compliance_review', 'edit_content'] },
          { label: 'Media library', hint: 'Images, video, audio', to: '/admin/media', icon: <Image className="h-5 w-5" />, tone: 'sky', any: ['edit_content', 'publish_content'] },
          { label: 'Categories & tags', hint: 'Taxonomy', to: '/admin/categories', icon: <FolderTree className="h-5 w-5" />, tone: 'peach', any: ['edit_content', 'publish_content'] },
          { label: 'Calendar', hint: `${scheduled.length} scheduled`, to: '/admin/schedule', icon: <CalendarClock className="h-5 w-5" />, tone: 'indigo', any: ['publish_content', 'compliance_review'] },
          { label: 'Notification copy', hint: 'Templates', to: '/admin/notifications/templates', icon: <Bell className="h-5 w-5" />, tone: 'butter', cap: 'view_notifications' },
        ]}
      />

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <Card className="card-pad">
          <CardHeader title="Needs my attention" icon={<RotateCcw className="h-5 w-5" />} action={<CardLink to="/admin/content">Library</CardLink>} />
          <ItemList items={attention.map(({ c, why }) => ({ id: c.id, title: c.title, meta: why, status: c.status, to: `/admin/content/${c.id}` }))} empty="All caught up." />
        </Card>
        <Card className="card-pad">
          <CardHeader title="Top content this week" subtitle="Views · aggregate, simulated" icon={<BarChart3 className="h-5 w-5" />} />
          {top.length === 0 ? (
            <p className="rounded-2xl bg-ink-50/70 px-4 py-6 text-center text-sm text-ink-500">Nothing published yet.</p>
          ) : (
            <ol className="space-y-3">
              {top.map((c, i) => (
                <li key={c.id} className="grid grid-cols-[28px_minmax(0,1fr)_56px] items-center gap-3 text-sm">
                  <span className="num flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-xs text-green-800">{i + 1}</span>
                  <span className="min-w-0">
                    <Link to={`/admin/content/${c.id}`} className="block truncate font-medium text-ink-800 hover:text-green-700">
                      {c.title}
                    </Link>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-green-100">
                      <span className="block h-full rounded-full bg-green-600" style={{ width: `${(contentViews7d(c.id) / topMax) * 100}%` }} />
                    </span>
                  </span>
                  <span className="num text-right text-[15px] text-ink-900">{(contentViews7d(c.id) / 1000).toFixed(1)}k</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <PlansCard as="author" />
        <ContentEngagementCard />
      </div>
      <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="card-pad">
          <CardHeader
            title="My drafts"
            subtitle={`Content authored by ${me}`}
            icon={<FilePen className="h-5 w-5" />}
            action={
              <ButtonLink to="/admin/content/new" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                New
              </ButtonLink>
            }
          />
          <ItemList items={drafts.map((c) => ({ id: c.id, title: c.title, meta: `${c.type} · updated ${c.updatedDate}`, status: c.status, to: `/admin/content/${c.id}` }))} empty="No drafts — start something new." />
        </Card>
        <PipelineCard content={state.content} title="Pipeline" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="card-pad">
          <CardHeader title="Scheduled posts" icon={<CalendarClock className="h-5 w-5" />} action={<CardLink to="/admin/schedule">Calendar</CardLink>} />
          <ItemList items={scheduled.map((c) => ({ id: c.id, title: c.title, meta: `Goes live ${c.scheduledFor?.replace('T', ' ')}`, status: c.status, to: `/admin/content/${c.id}` }))} empty="Nothing scheduled." />
        </Card>
        <Card className="card-pad">
          <CardHeader title="Ready to publish" subtitle="Medically and compliance approved" icon={<CheckCircle2 className="h-5 w-5" />} />
          <ItemList items={ready.map((c) => ({ id: c.id, title: c.title, meta: `${c.type} · v${c.version}`, status: c.status, to: `/admin/content/${c.id}` }))} empty="Nothing approved yet." />
          {myTemplates.length > 0 && <p className="mt-3 text-xs text-ink-500">{myTemplates.length} of your notification-copy drafts are waiting for medical review.</p>}
        </Card>
      </div>
    </>
  );
}
