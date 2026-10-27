import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, BarChart3, Bell, BookOpen, CalendarClock, CalendarHeart, Check, CheckCircle2, Droplets, Dumbbell, EyeOff, Megaphone, Pencil, Plus, Send, ShieldCheck, Users, X, type LucideIcon } from 'lucide-react';
import { COUNTRIES, LANGUAGES } from '@healthx/shared';
import { LogoMark } from '@/components/brand/Brand';
import {
  Badge,
  Button,
  Card,
  ChipToggle,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  Pagination,
  SearchInput,
  Segmented,
  Select,
  Tabs,
  Textarea,
  useToast,
  type BadgeTone,
} from '@/components/ui';
import { cn, paginate, useDemoLoading } from '@/lib/utils';
import { ANY_SEGMENT, DELIVERY_STATS, prohibitedTermsIn, type Campaign, type CampaignSegment, type NotificationTemplate } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, AdminHero, FilterSelect, HeroStat, KpiCard, ReadOnlyBanner, SortHeader, StatusPill, TableShell, Th, Toolbar } from '../components';
import { formatDateTime, useSort } from '../helpers';

type Tab = 'templates' | 'campaigns' | 'delivery';

/** Health-data attributes that can never be used for targeting (SRS §5, §47, §50, §68). */
const BLOCKED_SEGMENTS = [
  'Cycle phase or predicted period',
  'Fertile window / ovulation estimates',
  'Symptoms, mood or energy logs',
  'Pregnancy, perimenopause or menopause mode',
  'Health goals selected in onboarding',
  'Imported health data (steps, sleep, heart rate, weight)',
];

const typeLabel = (k: string) => (k === 'habit' ? 'Daily check-in' : k === 'report' ? 'Weekly report' : k.charAt(0).toUpperCase() + k.slice(1));

/** Icon + tint per notification type (same data colours as the app). */
const TYPE_LOOK: Record<string, { icon: LucideIcon; tone: string }> = {
  cycle: { icon: CalendarHeart, tone: 'bg-rose-50 text-rose-600' },
  habit: { icon: CheckCircle2, tone: 'bg-green-50 text-green-700' },
  hydration: { icon: Droplets, tone: 'bg-sky-50 text-sky-600' },
  workout: { icon: Dumbbell, tone: 'bg-peach-50 text-peach-600' },
  content: { icon: BookOpen, tone: 'bg-lavender-50 text-lavender-600' },
  report: { icon: BarChart3, tone: 'bg-indigo-50 text-indigo-600' },
};
const look = (k: string) => TYPE_LOOK[k] ?? { icon: Bell, tone: 'bg-green-50 text-green-700' };

const CAMPAIGN_TONE: Record<string, BadgeTone> = { sent: 'green', scheduled: 'indigo', draft: 'gray', cancelled: 'gray' };

const COUNTRY_SHARE: Record<string, number> = { India: 0.46, 'United States': 0.14, 'United Kingdom': 0.09, Canada: 0.07, Australia: 0.06, 'United Arab Emirates': 0.07, Singapore: 0.05, Germany: 0.06 };
const BASE_AUDIENCE = 24_000;

function estimateReach(s: CampaignSegment): number {
  let n = BASE_AUDIENCE;
  if (s.plan !== 'any') n *= s.plan === 'free' ? 0.78 : 0.22;
  if (s.countries.length) n *= s.countries.reduce((a, c) => a + (COUNTRY_SHARE[c] ?? 0.03), 0);
  if (s.language !== 'any') n *= s.language === 'English' ? 0.7 : 0.08;
  if (s.lastActive !== 'any') n *= s.lastActive === '7d' ? 0.45 : s.lastActive === '30d' ? 0.7 : 0.3;
  if (s.appVersion !== 'any') n *= s.appVersion === '1.2+' ? 0.8 : 0.5;
  return Math.max(0, Math.round(n / 10) * 10);
}

function segmentSummary(s: CampaignSegment): string {
  const parts = [
    s.plan !== 'any' ? `${s.plan} plan` : null,
    s.countries.length ? s.countries.join(', ') : null,
    s.language !== 'any' ? s.language : null,
    s.lastActive === '7d' ? 'active 7d' : s.lastActive === '30d' ? 'active 30d' : s.lastActive === 'inactive_30d' ? 'inactive 30d+' : null,
    s.appVersion !== 'any' ? `app ${s.appVersion}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'All users with notifications on';
}

/** Phone-notification style preview of a title + message. */
function PushPreview({ title, body, when = 'now', className }: { title: string; body: string; when?: string; className?: string }) {
  return (
    <div className={cn('flex gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-ink-100', className)}>
      <LogoMark className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">
          HealthX <span>{when}</span>
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-ink-900">{title || 'Notification title'}</p>
        <p className="line-clamp-2 text-sm text-ink-600">{body || 'Your message appears here.'}</p>
      </div>
    </div>
  );
}

// ---------------- Templates ----------------
function Templates() {
  const { state, dispatch, audit } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const me = state.session!.name;
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [form, setForm] = useState({ title: '', body: '' });
  const [errors, setErrors] = useState<{ title?: string; body?: string; comment?: string }>({});
  const [rejecting, setRejecting] = useState<NotificationTemplate | null>(null);
  const [comment, setComment] = useState('');

  const open = (t: NotificationTemplate) => {
    setEditing(t);
    setForm({ title: t.proposed?.title ?? t.title, body: t.proposed?.body ?? t.body });
    setErrors({});
  };

  const save = () => {
    if (!editing) return;
    const e: typeof errors = {};
    if (form.title.trim().length < 3 || form.title.length > 40) e.title = 'Title must be 3–40 characters.';
    if (form.body.trim().length < 10 || form.body.length > 140) e.body = 'Message must be 10–140 characters.';
    const banned = prohibitedTermsIn(`${form.title} ${form.body}`);
    if (banned.length) e.body = `Remove prohibited health claims (G2): ${banned.join(', ')}.`;
    setErrors(e);
    if (Object.keys(e).length) return;
    if (editing.healthRelated) {
      void dispatch({ type: 'UPSERT_TEMPLATE', template: { ...editing, status: 'pending_review', proposed: { title: form.title.trim(), body: form.body.trim(), by: me, at: new Date().toISOString() } } }).then((ok) => {
        if (!ok) return;
        toast.info('Sent to medical review', 'Health-related copy goes live only after a Medical Reviewer approves it.');
        setEditing(null);
      });
      audit('notification.template_proposed', `${editing.label} template`, 'Routed to medical review (D-40)');
    } else {
      void dispatch({ type: 'UPSERT_TEMPLATE', template: { ...editing, title: form.title.trim(), body: form.body.trim(), version: editing.version + 1, status: 'live', proposed: undefined } }).then((ok) => {
        if (!ok) return;
        toast.success('Template updated');
        setEditing(null);
      });
      audit('notification.template_update', `${editing.label} template`, `v${editing.version + 1}`);
    }
  };

  const approve = (t: NotificationTemplate) => {
    if (!t.proposed) return;
    void dispatch({
      type: 'UPSERT_TEMPLATE',
      template: { ...t, title: t.proposed.title, body: t.proposed.body, version: t.version + 1, status: 'live', proposed: undefined, lastReviewedBy: me, lastReviewedAt: new Date().toISOString() },
    }).then((ok) => ok && toast.success('Copy approved', 'The new wording is live.'));
    audit('notification.template_approve', `${t.label} template`, `v${t.version + 1}`);
  };

  const reject = () => {
    if (!rejecting) return;
    if (comment.trim().length < 10) {
      setErrors({ comment: 'Explain what needs to change (at least 10 characters).' });
      return;
    }
    void dispatch({ type: 'UPSERT_TEMPLATE', template: { ...rejecting, status: 'live', proposed: undefined } }).then((ok) => {
      if (!ok) return;
      toast.info('Proposed copy rejected', 'The current live wording stays.');
      setRejecting(null);
      setComment('');
    });
    audit('notification.template_reject', `${rejecting.label} template`, comment.trim());
  };

  return (
    <>
      {!can('edit_templates') && !can('review_templates') && <ReadOnlyBanner />}
      <Notice tone="info" className="mb-6" icon={<EyeOff className="h-4 w-4 text-sky-500" />}>
        Discreet mode [ADD A-08]: users who turn it on see “You have a new HealthX reminder.” on the lock screen instead of the copy below. Push payloads never carry health data (§47).
      </Notice>
      <div className="grid gap-5 lg:grid-cols-2">
        {state.templates.map((t) => {
          const L = look(t.key);
          return (
            <Card key={t.key} className="card-pad flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', L.tone)}>
                    <L.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink-900">{typeLabel(t.key)}</p>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {t.healthRelated ? <Badge tone="lavender">Health-related</Badge> : <Badge tone="gray">General</Badge>}
                      {t.status === 'pending_review' ? <StatusPill tone="warning">Pending medical review</StatusPill> : <StatusPill tone="green">Live · v{t.version}</StatusPill>}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-ink-50/80 p-3">
                <p className="mb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-400">Live copy</p>
                <PushPreview title={t.title} body={t.body} />
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                  <EyeOff className="h-3.5 w-3.5 shrink-0" /> Discreet: {t.discreetBody}
                </p>
              </div>
              {t.proposed && (
                <div className="rounded-2xl border border-warning/30 bg-warning-soft p-3">
                  <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-warning">Proposed by {t.proposed.by}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{t.proposed.title}</p>
                  <p className="text-sm text-ink-700">{t.proposed.body}</p>
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                <p className="text-xs text-ink-400">
                  Last medical review: {t.lastReviewedBy} · {formatDateTime(t.lastReviewedAt)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {can('edit_templates') && (
                    <Button size="sm" variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => open(t)}>
                      {t.proposed ? 'Revise proposal' : 'Edit copy'}
                    </Button>
                  )}
                  {can('review_templates') && t.status === 'pending_review' && (
                    <>
                      <Button size="sm" leftIcon={<Check className="h-4 w-4" />} onClick={() => approve(t)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" leftIcon={<X className="h-4 w-4" />} onClick={() => setRejecting(t)}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing ? typeLabel(editing.key) : ''} template`}
        description={editing?.healthRelated ? 'Health-related copy is routed to a Medical Reviewer before it goes live (D-40).' : 'General copy goes live immediately.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>{editing?.healthRelated ? 'Send for medical review' : 'Save & publish'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" required htmlFor="tpl-title" error={errors.title}>
            <Input id="tpl-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} invalid={!!errors.title} maxLength={60} />
          </Field>
          <Field label="Message" required htmlFor="tpl-body" error={errors.body} hint={`${form.body.length}/140 · label estimates as estimates; no diagnosis or medication claims`}>
            <Textarea id="tpl-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} invalid={!!errors.body} />
          </Field>
          <div className="rounded-2xl bg-ink-50/80 p-3">
            <p className="mb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-400">Preview</p>
            <PushPreview title={form.title} body={form.body} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject proposed copy"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reject}>
              Reject
            </Button>
          </>
        }
      >
        <Field label="Reason" required htmlFor="tpl-reject" error={errors.comment}>
          <Textarea id="tpl-reject" value={comment} onChange={(e) => setComment(e.target.value)} invalid={!!errors.comment} placeholder="e.g. Please avoid implying a guaranteed outcome." />
        </Field>
      </Modal>
    </>
  );
}

// ---------------- Campaigns ----------------
function SegmentBuilder({ value, onChange }: { value: CampaignSegment; onChange: (s: CampaignSegment) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plan" htmlFor="seg-plan">
          <Select id="seg-plan" value={value.plan} onChange={(e) => onChange({ ...value, plan: e.target.value as CampaignSegment['plan'] })}>
            <option value="any">Any plan</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </Select>
        </Field>
        <Field label="App language" htmlFor="seg-lang">
          <Select id="seg-lang" value={value.language} onChange={(e) => onChange({ ...value, language: e.target.value })}>
            <option value="any">Any language</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Last active" htmlFor="seg-active">
          <Select id="seg-active" value={value.lastActive} onChange={(e) => onChange({ ...value, lastActive: e.target.value as CampaignSegment['lastActive'] })}>
            <option value="any">Any time</option>
            <option value="7d">Active in last 7 days</option>
            <option value="30d">Active in last 30 days</option>
            <option value="inactive_30d">Inactive 30+ days</option>
          </Select>
        </Field>
        <Field label="App version" htmlFor="seg-ver">
          <Select id="seg-ver" value={value.appVersion} onChange={(e) => onChange({ ...value, appVersion: e.target.value as CampaignSegment['appVersion'] })}>
            <option value="any">Any version</option>
            <option value="1.2+">1.2 or later</option>
            <option value="1.3+">1.3 or later</option>
          </Select>
        </Field>
      </div>
      <div>
        <p className="label">Countries</p>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <ChipToggle
              key={c}
              selected={value.countries.includes(c)}
              onClick={() => onChange({ ...value, countries: value.countries.includes(c) ? value.countries.filter((x) => x !== c) : [...value.countries, c] })}
            >
              {c}
            </ChipToggle>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-danger/20 bg-danger-soft/60 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Ban className="h-4 w-4 text-danger" /> Not available for targeting
        </p>
        <ul className="mt-2 grid gap-1 text-sm text-ink-600 sm:grid-cols-2">
          {BLOCKED_SEGMENTS.map((b) => (
            <li key={b} className="flex items-start gap-1.5">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" /> {b}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-500">
          Targeting by health data would reveal sensitive reproductive information through who receives a message, and staff/marketing use of health data isn’t authorised (SRS §5 privacy-first, §47, §50, §68). These attributes are deliberately absent from the builder and the API.
        </p>
      </div>
    </div>
  );
}

function Campaigns() {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const loading = useDemoLoading(350);
  const me = state.session!.name;
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  // Without a push provider the API delivers "now" campaigns to the app's in-app inbox; push can only be scheduled.
  const blankForm = { name: '', title: '', body: '', when: (apiMode ? 'later' : 'now') as 'now' | 'later', at: '' };
  const [form, setForm] = useState(blankForm);
  const [segment, setSegment] = useState<CampaignSegment>(ANY_SEGMENT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelling, setCancelling] = useState<Campaign | null>(null);
  const reach = estimateReach(segment);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.campaigns.filter((c) => (!t || `${c.name} ${c.title}`.toLowerCase().includes(t)) && (status === 'all' || c.status === status));
  }, [state.campaigns, q, status]);
  const { sorted, key, dir, toggle } = useSort(filtered, 'schedule', { name: (c) => c.name.toLowerCase(), schedule: (c) => c.schedule ?? '', reach: (c) => c.reach }, 'desc');
  const pg = paginate(sorted, page, 6);

  const create = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = 'Name the campaign (3+ characters).';
    if (form.title.trim().length < 3 || form.title.length > 40) e.title = 'Title must be 3–40 characters.';
    if (form.body.trim().length < 10 || form.body.length > 140) e.body = 'Message must be 10–140 characters.';
    const banned = prohibitedTermsIn(`${form.title} ${form.body}`);
    if (banned.length) e.body = `Remove prohibited health claims (G2): ${banned.join(', ')}.`;
    if (form.when === 'later') {
      if (!form.at) e.at = 'Choose a date and time.';
      else if (new Date(form.at).getTime() <= Date.now() + 10 * 60_000) e.at = 'Schedule at least 10 minutes ahead.';
    }
    if (reach === 0) e.segment = 'This segment matches nobody.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const now = form.when === 'now';
    // API mode: saved as a draft, then delivered to matching people's in-app inbox by the server.
    const inApp = apiMode && now;
    const c: Campaign = {
      id: `cmp_${Date.now().toString(36)}`,
      name: form.name.trim(),
      title: form.title.trim(),
      body: form.body.trim(),
      segment,
      schedule: inApp ? null : now ? new Date().toISOString().slice(0, 16) : form.at,
      status: inApp ? 'draft' : now ? 'sent' : 'scheduled',
      createdBy: me,
      createdAt: new Date().toISOString(),
      reach,
      delivered: now ? Math.round(reach * 0.97) : undefined,
      opened: now ? 0 : undefined,
    };
    void dispatch({ type: 'UPSERT_CAMPAIGN', campaign: c }).then(async (next) => {
      if (!next) return;
      if (inApp) {
        const sent = await dispatch({ type: 'DELIVER_CAMPAIGN', id: c.id });
        const done = sent?.campaigns.find((x) => x.id === c.id);
        if (done) toast.success('Sent to in-app inboxes', `${(done.delivered ?? 0).toLocaleString()} people will see it in the HealthX app · ${segmentSummary(segment)}`);
        setCreating(false);
        setForm(blankForm);
        return;
      }
      // The server counts the reach itself.
      const counted = next.campaigns.find((x) => x.id === c.id)?.reach ?? reach;
      toast.success(now ? 'Campaign sent (simulated)' : 'Campaign scheduled', `~${counted.toLocaleString()} people · ${segmentSummary(segment)}`);
      setCreating(false);
      setForm(blankForm);
    });
    audit(now ? 'notification.campaign_sent' : 'notification.campaign_scheduled', c.name, `${segmentSummary(segment)} · ~${reach}`);
    setSegment(ANY_SEGMENT);
  };

  const section = 'mb-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500';

  return (
    <>
      {!can('manage_notifications') && <ReadOnlyBanner>Read-only: creating or cancelling campaigns needs the Admin role.</ReadOnlyBanner>}
      <Toolbar>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search campaigns…"
            className="md:max-w-xs md:flex-1"
          />
          <div className="w-full md:w-48">
            <FilterSelect
              label="Status"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'sent', label: 'Sent' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
          {can('manage_notifications') && (
            <Button className="md:ml-auto" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              New campaign
            </Button>
          )}
        </div>
      </Toolbar>

      {loading ? (
        <Card className="card-pad space-y-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Megaphone className="h-6 w-6" />} title="No campaigns match" body="Try another search or status." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <TableShell minWidth={960}>
            <thead>
              <tr>
                <SortHeader label="Campaign" k="name" active={key} dir={dir} onSort={toggle} />
                <Th>Segment</Th>
                <SortHeader label="When" k="schedule" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Reach" k="reach" active={key} dir={dir} onSort={toggle} className="text-right" />
                <Th>Results</Th>
                <Th>Status</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map((c) => {
                const delivered = c.delivered ? Math.round((c.delivered / c.reach) * 100) : 0;
                const opened = c.delivered && c.opened ? Math.round((c.opened / c.delivered) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                          <Megaphone className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink-900">{c.name}</span>
                          <span className="block max-w-[260px] truncate text-xs text-ink-500">
                            “{c.title}” · by {c.createdBy}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-ink-600">
                      <span className="flex flex-wrap gap-1">
                        {segmentSummary(c.segment)
                          .split(' · ')
                          .map((p) => (
                            <span key={p} className="rounded-full bg-ink-100/70 px-2 py-0.5 text-xs font-medium text-ink-600">
                              {p}
                            </span>
                          ))}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[12.5px] text-ink-600">{c.schedule?.replace('T', ' ') ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">~{c.reach.toLocaleString()}</td>
                    <td className="min-w-[180px] px-4 py-3 text-xs text-ink-500">
                      {c.channel === 'in_app' ? (
                        <span className="block whitespace-nowrap">{`In-app · ${c.delivered ?? 0} inbox${c.delivered === 1 ? '' : 'es'} · ${c.opened ?? 0} opened`}</span>
                      ) : c.delivered ? (
                        <span className="block space-y-1">
                          <span className="block whitespace-nowrap">{`${delivered}% delivered · ${opened}% opened`}</span>
                          <span className="block h-1.5 overflow-hidden rounded-full bg-green-100">
                            <span className="block h-full rounded-full bg-green-500" style={{ width: `${opened}%` }} />
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={CAMPAIGN_TONE[c.status] ?? 'warning'} className="capitalize">
                        {c.status}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(c.status === 'scheduled' || c.status === 'draft') && can('manage_notifications') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          onClick={() =>
                            void dispatch({ type: 'DELIVER_CAMPAIGN', id: c.id }).then((next) => {
                              const done = next?.campaigns.find((x) => x.id === c.id);
                              if (!done) return;
                              audit('campaign.deliver', c.name, 'in-app inbox');
                              toast.success('Sent to in-app inboxes', `${(done.delivered ?? 0).toLocaleString()} people will see it in the HealthX app.`);
                            })
                          }
                        >
                          Send in-app now
                        </Button>
                      )}
                      {c.status === 'scheduled' && can('manage_notifications') && (
                        <Button size="sm" variant="ghost" onClick={() => setCancelling(c)}>
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <div className="border-t border-ink-100 p-4">
            <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="campaigns" />
          </div>
        </Card>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title="New broadcast campaign"
        description="Targets only non-sensitive account attributes. Message copy follows the safety-wording rules."
        footer={
          <>
            <span className="mr-auto inline-flex items-center gap-1.5 self-center rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-800 ring-1 ring-inset ring-green-100">
              <Users className="h-4 w-4" /> Estimated reach: ~{reach.toLocaleString()}
            </span>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button leftIcon={form.when === 'now' ? <Send className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />} onClick={create}>
              {form.when === 'now' ? 'Send now' : 'Schedule'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <section>
            <p className={section}>1 · Message</p>
            <div className="space-y-4">
              <Field label="Campaign name" required htmlFor="cmp-name" error={errors.name}>
                <Input id="cmp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Notification title" required htmlFor="cmp-title" error={errors.title}>
                  <Input id="cmp-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} invalid={!!errors.title} maxLength={60} />
                </Field>
                {apiMode ? (
                  <Field label="When" htmlFor="cmp-when" hint={form.when === 'now' ? 'Delivered to the in-app inbox of matching people now (no push provider needed).' : 'Push sending needs a provider; scheduled campaigns can also be sent in-app from the list.'}>
                    <Segmented
                      value={form.when}
                      onChange={(v) => setForm({ ...form, when: v })}
                      options={[
                        { value: 'now', label: 'Now · in-app' },
                        { value: 'later', label: 'Schedule' },
                      ]}
                    />
                  </Field>
                ) : (
                  <Field label="When" htmlFor="cmp-when">
                    <Segmented
                      value={form.when}
                      onChange={(v) => setForm({ ...form, when: v })}
                      options={[
                        { value: 'now', label: 'Immediately' },
                        { value: 'later', label: 'Later' },
                      ]}
                    />
                  </Field>
                )}
              </div>
              <Field label="Message" required htmlFor="cmp-body" error={errors.body} hint={`${form.body.length}/140`}>
                <Textarea id="cmp-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} invalid={!!errors.body} />
              </Field>
              {apiMode && <Notice tone="info">Sending immediately needs a push-notification provider, which isn’t configured on this server yet — schedule the campaign instead.</Notice>}
              {form.when === 'later' && (
                <Field label="Send at" required htmlFor="cmp-at" error={errors.at}>
                  <Input id="cmp-at" type="datetime-local" value={form.at} onChange={(e) => setForm({ ...form, at: e.target.value })} invalid={!!errors.at} />
                </Field>
              )}
              <div className="rounded-2xl bg-ink-50/80 p-3">
                <p className="mb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-400">Preview</p>
                <PushPreview title={form.title} body={form.body} when={form.when === 'now' ? 'now' : 'scheduled'} />
              </div>
            </div>
          </section>
          <section className="border-t border-ink-100 pt-5">
            <p className={section}>2 · Audience</p>
            <SegmentBuilder value={segment} onChange={setSegment} />
            {errors.segment && <p className="mt-2 text-sm font-medium text-danger">{errors.segment}</p>}
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={() => {
          if (!cancelling) return;
          void dispatch({ type: 'UPSERT_CAMPAIGN', campaign: { ...cancelling, status: 'cancelled' } }).then((ok) => ok && toast.success('Campaign cancelled'));
          audit('notification.campaign_cancelled', cancelling.name);
        }}
        title="Cancel this campaign?"
        body={<>“{cancelling?.name}” won’t be sent.</>}
        confirmLabel="Cancel campaign"
        danger
      />
    </>
  );
}

// ---------------- Delivery ----------------
function Delivery() {
  const total = DELIVERY_STATS.reduce((a, d) => a + d.sent, 0);
  const optOut = (DELIVERY_STATS.reduce((a, d) => a + d.optOut, 0) / DELIVERY_STATS.length).toFixed(1);
  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Notifications sent (7d)" value={total.toLocaleString()} icon={<Send className="h-5 w-5" />} hint="All types · aggregate" />
        <KpiCard label="Users with discreet mode on" value="18" unit="%" icon={<EyeOff className="h-5 w-5" />} tone="lavender" hint="Lock-screen-safe wording" />
        <KpiCard label="Avg opt-out rate" value={optOut} unit="%" icon={<Bell className="h-5 w-5" />} tone="peach" hint="Per type, last 7 days" />
      </div>
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
            {DELIVERY_STATS.map((d) => {
              const L = look(d.key);
              return (
                <tr key={d.key}>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2.5 font-semibold text-ink-800">
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', L.tone)}>
                        <L.icon className="h-4 w-4" />
                      </span>
                      {typeLabel(d.key)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">{d.sent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.delivered}%</td>
                  <td className="min-w-[180px] px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-green-100">
                        <span className="block h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, d.opened * 2)}%` }} />
                      </span>
                      <span className="w-12 text-right tabular-nums">{d.opened}%</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.optOut}%</td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        <p className="border-t border-ink-100 px-4 py-3 text-xs text-ink-500">Aggregates only — no per-user delivery or health data is shown to staff. Open-rate bars are scaled to 50%.</p>
      </Card>
    </>
  );
}

export default function Notifications() {
  const { state } = useAdmin();
  const params = useParams();
  const navigate = useNavigate();
  const tab: Tab = params.tab === 'campaigns' || params.tab === 'delivery' ? params.tab : 'templates';
  const setTab = (t: Tab) => navigate(`/admin/notifications/${t}`);
  const pending = state.templates.filter((t) => t.status === 'pending_review').length;
  const scheduled = state.campaigns.filter((c) => c.status === 'scheduled').length;
  const live = state.templates.filter((t) => t.status === 'live').length;
  const sample = state.templates.find((t) => t.key === 'hydration') ?? state.templates[0];
  return (
    <>
      <AdminHeader
        title="Notifications"
        subtitle="Templates, broadcast campaigns and delivery stats (§41). Every type stays user-configurable in the app."
        badge={<Badge tone="mint" icon={<ShieldCheck className="h-3 w-3" />}>No health-data targeting</Badge>}
      />

      <AdminHero
        eyebrow="Reminders · §41"
        title="Gentle nudges, never health data"
        aside={
          sample && (
            <div className="mx-auto hidden w-full max-w-sm rounded-[30px] bg-green-950/40 p-4 ring-1 ring-inset ring-white/15 backdrop-blur sm:block">
              <p className="text-center font-display text-[34px] font-semibold leading-none text-white">9:41</p>
              <p className="mb-4 mt-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-green-100/70">Lock screen preview</p>
              <div className="space-y-2.5">
                <PushPreview title={sample.title} body={sample.body} when="now" />
                <PushPreview title="HealthX" body={sample.discreetBody} when="discreet" className="opacity-95" />
              </div>
            </div>
          )
        }
      >
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-green-50/80">Health-related copy is checked by a Medical Content Reviewer before it goes live, and people can switch to discreet wording on the lock screen.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          <HeroStat label="Live templates" value={live} />
          <HeroStat label="Copy in review" value={pending} />
          <HeroStat label="Scheduled" value={scheduled} />
          <HeroStat label="Campaigns" value={state.campaigns.length} />
        </div>
      </AdminHero>

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'templates', label: 'Templates', count: pending || undefined },
          { value: 'campaigns', label: 'Campaigns', count: scheduled },
          { value: 'delivery', label: 'Delivery stats' },
        ]}
      />
      {tab === 'templates' && <Templates />}
      {tab === 'campaigns' && <Campaigns />}
      {tab === 'delivery' && <Delivery />}
      <p className="mt-6 flex items-center gap-2 text-xs text-ink-400">
        <Bell className="h-3.5 w-3.5" /> Delivery and sending are simulated — push requires the backend notification service.
      </p>
    </>
  );
}
