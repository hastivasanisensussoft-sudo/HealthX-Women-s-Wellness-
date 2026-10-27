/**
 * One app user (SRS §6.4 "manage users"): profile, everything they did in the mobile app (activity timeline,
 * §53), internal notes and — for Admins holding the break-glass permission, with a reason, for 30 minutes,
 * audited — their health records (A-15). Content Managers and Medical Content Reviewers never reach this page.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Activity, ArrowLeft, CalendarDays, Clock, EyeOff, Lock, LogOut, MessageSquareText, Monitor, ShieldAlert, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_KEYS, formatDate, timeAgo, type AppState } from '@healthx/shared';
import type { UserNoteView } from '@healthx/shared/admin';
import { Avatar } from '@/components/brand/Brand';
import { Badge, Button, Card, CardHeader, CardSkeleton, Checkbox, EmptyState, ErrorState, Field, Input, Notice, Pagination, Tabs, Textarea, useToast } from '@/components/ui';
import { adminApi, ApiError } from '@/lib/api';
import { useAccess, useAdmin } from '../adminState';
import { demoDataFor, useUserActivity, useUserOverview } from '../appActivity';
import { ActivityList, CategoryBars, DataSourceBadge } from '../activityUi';
import { AdminHeader, FilterSelect, KpiCard, StatusPill } from '../components';
import { formatDateTime } from '../helpers';
import { HealthRecords } from './userProfile/HealthRecords';
import { HEALTH_SECTIONS } from './userProfile/sections';

type Tab = 'overview' | 'activity' | 'health' | 'notes';

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-ink-100 py-2">
          <dt className="text-ink-500">{k}</dt>
          <dd className="text-right font-semibold text-ink-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Time left on a health-records grant, refreshed every 15 s. */
function useRemaining(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, Date.parse(expiresAt) - now) : 0;
}

function ActivityTab({ userId, user }: { userId: string; user: Parameters<typeof useUserActivity>[0] }) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const { data, loading, error, reload } = useUserActivity(user, userId, page, category);
  return (
    <Card className="card-pad">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <CardHeader title="Activity timeline" subtitle="Everything they did in the app, newest first — what and when, never the values" icon={<Activity className="h-5 w-5" />} className="mb-0" />
        <div className="w-full sm:w-64">
          <FilterSelect
            label="Module"
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            options={[{ value: '', label: 'All modules (screen views hidden)' }, ...ACTIVITY_CATEGORY_KEYS.map((k) => ({ value: k, label: ACTIVITY_CATEGORIES[k].label }))]}
          />
        </div>
      </div>
      {loading ? <CardSkeleton lines={6} /> : error ? <ErrorState body={error} onRetry={reload} /> : data && <ActivityList events={data.events} empty="Nothing recorded for this module yet." />}
      {data && data.total > data.size && (
        <div className="mt-3 border-t border-ink-100 pt-4">
          <Pagination page={data.page} pages={Math.ceil(data.total / data.size)} onChange={setPage} total={data.total} label="events" />
        </div>
      )}
    </Card>
  );
}

function HealthTab({ userId, name, initialGrant, onGrantChange }: { userId: string; name: string; initialGrant: { expiresAt: string | null; reason: string | null }; onGrantChange: () => void }) {
  const { apiMode, audit, state } = useAdmin();
  const { can, whoCan } = useAccess();
  const toast = useToast();
  const [grant, setGrant] = useState(initialGrant);
  const [record, setRecord] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ticket, setTicket] = useState('');
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);
  const [errs, setErrs] = useState<{ ticket?: string; reason?: string; ack?: string }>({});
  const [busy, setBusy] = useState(false);
  const remaining = useRemaining(grant.expiresAt);
  const active = !!grant.expiresAt && remaining > 0;
  const user = state.users.find((u) => u.id === userId);

  useEffect(() => {
    if (!active) {
      setRecord(null);
      return;
    }
    let live = true;
    setLoadError(null);
    if (!apiMode) {
      if (user) setRecord(demoDataFor(user).record);
      return;
    }
    adminApi
      .healthRecord(userId)
      .then((r) => live && setRecord(r.record))
      .catch((e) => live && setLoadError(e instanceof ApiError ? e.message : 'Couldn’t load the records.'));
    return () => {
      live = false;
    };
  }, [active, apiMode, userId, user]);

  if (!can('break_glass')) {
    return (
      <Card>
        <EmptyState
          icon={<Lock className="h-6 w-6" />}
          title="Health records are restricted"
          body={`Only Admins who hold the health-records (break-glass) permission can open a person’s health records — with a stated reason, for 30 minutes, and every view is audited. Who can: ${whoCan('break_glass')}.`}
        />
      </Card>
    );
  }

  const request = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errs = {};
    if (!/^SUP-\d{3,6}$/i.test(ticket.trim())) next.ticket = 'Enter a support ticket ID like SUP-1042.';
    if (reason.trim().length < 20) next.reason = 'Describe why access is needed (at least 20 characters).';
    if (!ack) next.ack = 'Confirm you understand this access is logged.';
    setErrs(next);
    if (Object.keys(next).length) return;
    const why = `${ticket.trim().toUpperCase()} · ${reason.trim()}`;
    setBusy(true);
    try {
      if (apiMode) {
        const r = await adminApi.breakGlass(userId, why);
        setGrant({ expiresAt: r.expiresAt, reason: why });
      } else {
        audit('user.break_glass', userId, why);
        setGrant({ expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), reason: why });
      }
      toast.info('Health-records access granted', 'Logged to the audit trail. Ends in 30 minutes.');
      onGrantChange();
    } catch (err) {
      toast.error('Access refused', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (apiMode) await adminApi.endHealthAccess(userId).catch(() => undefined);
    else audit('user.health_access_ended', userId);
    setGrant({ expiresAt: null, reason: null });
    toast.success('Access ended', 'The health records are hidden again.');
    onGrantChange();
  };

  if (!active) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="card-pad">
          <CardHeader title="Open health records" subtitle={`Temporary, audited access to ${name}’s logs — only for a documented support or safety reason`} icon={<ShieldAlert className="h-5 w-5" />} />
          <form onSubmit={request} noValidate className="space-y-4">
            <Field label="Support ticket" required htmlFor="hr-ticket" error={errs.ticket}>
              <Input id="hr-ticket" value={ticket} onChange={(e) => setTicket(e.target.value)} invalid={!!errs.ticket} placeholder="SUP-1042" />
            </Field>
            <Field label="Reason" required htmlFor="hr-reason" error={errs.reason}>
              <Textarea id="hr-reason" value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!errs.reason} placeholder="e.g. User reported a sync issue and asked us to check their period history." />
            </Field>
            <div className="rounded-2xl border border-ink-100 p-3">
              <Checkbox checked={ack} onChange={setAck} label="I understand this access lasts 30 minutes, every view is written to the audit log, and compliance reviews it." />
              {errs.ack && <p className="mt-1.5 text-sm font-medium text-danger">{errs.ack}</p>}
            </div>
            <Button type="submit" variant="danger" loading={busy} leftIcon={<Lock className="h-4 w-4" />}>
              Request access
            </Button>
          </form>
        </Card>
        <Notice tone="info" title="What staff can see without this" className="h-fit">
          The profile and activity timeline show what someone did and when — never cycle dates, flow, symptoms, moods, fertility observations or other values. Content Managers and Medical Content Reviewers can’t open user records at all.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div role="status" className="sticky top-[84px] z-10 flex flex-col gap-3 rounded-3xl bg-warning-soft p-4 ring-1 ring-warning/20 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm font-semibold text-ink-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            Break-glass access active · ends in {Math.ceil(remaining / 60_000)} min · every view is audited.
            {grant.reason && <span className="mt-0.5 block font-normal text-ink-600">Reason: {grant.reason}</span>}
          </span>
        </p>
        <Button size="sm" variant="outline" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => void end()}>
          End access now
        </Button>
      </div>
      <nav aria-label="Health record sections" className="no-scrollbar flex gap-2 overflow-x-auto">
        {HEALTH_SECTIONS.map(([id, l]) => (
          <a key={id} href={`#${id}`} className="pill-tab pill-tab-off shrink-0">
            {l}
          </a>
        ))}
      </nav>
      {loadError ? <ErrorState body={loadError} /> : record ? <HealthRecords record={record} /> : <CardSkeleton lines={8} />}
    </div>
  );
}

function NotesTab({ userId, initial }: { userId: string; initial: UserNoteView[] }) {
  const { apiMode, audit, state } = useAdmin();
  const toast = useToast();
  const [notes, setNotes] = useState(initial);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      const note = apiMode ? (await adminApi.addUserNote(userId, t)).note : { id: `n_${Date.now()}`, at: new Date().toISOString(), by: state.session?.name ?? 'You', text: t };
      if (!apiMode) audit('user.note_added', userId);
      setNotes((n) => [note, ...n]);
      setText('');
      toast.success('Note added', 'Visible to Admins only.');
    } catch (err) {
      toast.error('Couldn’t add the note', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="card-pad">
        <CardHeader title="Internal notes" subtitle="Support context for other Admins. Never shown in the person’s app." icon={<MessageSquareText className="h-5 w-5" />} />
        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">No notes yet.</p>
        ) : (
          <ol className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-2xl bg-ink-50/70 p-4">
                <p className="whitespace-pre-wrap text-sm text-ink-800">{n.text}</p>
                <p className="mt-2 text-xs text-ink-500">
                  {n.by} · {formatDateTime(n.at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card className="card-pad h-fit">
        <form onSubmit={add} className="space-y-3">
          <Field label="Add a note" htmlFor="note-text" hint={`${text.length}/1000 · Don’t copy health details into notes.`}>
            <Textarea id="note-text" rows={5} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} disabled={!text.trim()}>
            Add note
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function UserProfile() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { state, apiMode } = useAdmin();
  const { can } = useAccess();
  const user = state.users.find((u) => u.id === id);
  const { data, loading, error, reload } = useUserOverview(user, id);
  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'activity', label: 'Activity' },
    { value: 'health', label: 'Health records' },
    ...(can('manage_support') ? [{ value: 'notes' as const, label: 'Notes' }] : []),
  ];
  const tab = (tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'overview') as Tab;
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  const name = data?.user.name ?? user?.name ?? 'User';

  return (
    <>
      <Link to="/admin/users" className="mb-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full text-sm font-semibold text-green-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All users
      </Link>
      <AdminHeader title={name} subtitle="Profile, app activity and audited health records (§6.4, §53, §68)." badge={<DataSourceBadge apiMode={apiMode} />} />

      {loading && !data ? (
        <CardSkeleton lines={8} />
      ) : error ? (
        <ErrorState title="Couldn’t load this user" body={error} onRetry={reload} />
      ) : !data ? null : (
        <div className="space-y-5">
          <Card className="card-pad flex flex-wrap items-center gap-4">
            <Avatar name={data.user.name} size={56} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill tone={data.user.status === 'active' ? 'green' : data.user.status === 'deleted' ? 'danger' : 'warning'}>{data.user.status.replace('_', ' ')}</StatusPill>
                <Badge tone={data.user.plan === 'premium' ? 'butter' : 'gray'}>{data.user.plan === 'premium' ? 'Premium' : 'Free'}</Badge>
                {data.account.synthetic && <Badge tone="gray">Seeded list entry</Badge>}
                {data.healthAccess.active && <Badge tone="warning" icon={<ShieldAlert className="h-3 w-3" />}>Health-records access active</Badge>}
              </div>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-500">
                {data.user.id} · {data.user.email} · {data.user.country}
              </p>
            </div>
          </Card>

          <Tabs tabs={tabs} value={tab} onChange={setTab} />

          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <KpiCard label="Activity (30 days)" value={data.stats.last30} icon={<Activity className="h-5 w-5" />} hint={`${data.stats.last7} in the last 7 days`} />
                <KpiCard label="Active days (30)" value={data.stats.activeDays30} icon={<CalendarDays className="h-5 w-5" />} tone="sky" hint="Days with any activity" />
                <KpiCard label="Last active" value={data.account.lastActiveAt ? timeAgo(data.account.lastActiveAt) : '—'} icon={<Clock className="h-5 w-5" />} tone="lavender" hint={data.account.lastLoginAt ? `Signed in ${timeAgo(data.account.lastLoginAt)}` : 'No sign-in yet'} />
                <KpiCard label="Member since" value={formatDate(data.user.signupDate, 'short')} icon={<UserRound className="h-5 w-5" />} tone="peach" hint={data.account.onboarded ? 'Onboarding complete' : 'Onboarding not finished'} />
              </div>
              {data.stats.seedEvents > 0 && (
                <Notice tone="info">
                  {data.stats.seedEvents} of {data.stats.total} events are the demo account’s synthetic history (marked “Seeded history”), created when the server started — not things a person did.
                </Notice>
              )}
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <Card className="card-pad">
                  <CardHeader title="Recent activity" subtitle="From the mobile app and their account" icon={<Activity className="h-5 w-5" />} action={<Button size="sm" variant="ghost" onClick={() => setTab('activity')}>Full timeline</Button>} />
                  <ActivityList events={data.recent.slice(0, 10)} empty={data.hasAppData ? 'No activity recorded yet.' : 'This seeded list entry has no app account, so there is no activity.'} />
                </Card>
                <div className="space-y-5">
                  <Card className="card-pad">
                    <CardHeader title="Modules used (30 days)" subtitle="Counts of activity per module — never values" icon={<Activity className="h-5 w-5" />} />
                    <CategoryBars byCategory={data.stats.byCategory} limit={8} />
                  </Card>
                  <Card className="card-pad">
                    <CardHeader title="Account" icon={<UserRound className="h-5 w-5" />} />
                    <Facts
                      items={[
                        ['Email verified', data.account.emailVerified ? 'Yes' : 'Not yet'],
                        ['Sign-in method', data.user.authMethod.replace('_', ' ')],
                        ['Timezone', data.profile?.timezone ?? '—'],
                        ['Language', data.profile?.language ?? '—'],
                        ['First activity', data.stats.firstAt ? formatDate(data.stats.firstAt.slice(0, 10)) : '—'],
                        ['Trial ends', data.account.trialEndsAt ? formatDateTime(data.account.trialEndsAt) : '—'],
                      ]}
                    />
                  </Card>
                </div>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="card-pad">
                  <CardHeader title="Consents (§42)" icon={<ShieldCheck className="h-5 w-5" />} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ['Product analytics', data.user.consents.analytics],
                        ['AI personalisation', data.user.consents.ai],
                        ['Health integrations', data.user.consents.integrations],
                        ['Notifications', data.user.consents.notifications],
                      ] as const
                    ).map(([l, on]) => (
                      <div key={l} className="flex items-center justify-between gap-2 rounded-xl bg-ink-50/70 px-3 py-2.5 text-sm">
                        <span className="text-ink-700">{l}</span>
                        <StatusPill tone={on ? 'green' : 'gray'}>{on ? 'Granted' : 'Not granted'}</StatusPill>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-ink-500">App-usage events (screens, videos, coach questions) are recorded only while Product analytics is granted.</p>
                </Card>
                <Card className="card-pad">
                  <CardHeader title="Signed-in devices" icon={<Smartphone className="h-5 w-5" />} />
                  {(data.account.sessions.length ? data.account.sessions.map((x) => ({ key: x.id, name: x.device, sub: x.client, seen: x.lastSeenAt })) : data.user.devices.map((d, i) => ({ key: String(i), name: d.model, sub: `${d.platform} · app ${d.appVersion}`, seen: d.lastSeen }))).map((d) => (
                    <div key={d.key} className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-ink-50/70 px-3 py-2.5 text-sm last:mb-0">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink-500 shadow-xs">{d.sub.startsWith('Web') ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink-800">{d.name}</span>
                          <span className="block text-xs text-ink-500">{d.sub}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-400">{timeAgo(d.seen)}</span>
                    </div>
                  ))}
                  {!data.account.sessions.length && !data.user.devices.length && <p className="text-sm text-ink-500">No signed-in devices.</p>}
                </Card>
              </div>
              <Card className="card-pad flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm text-ink-600">
                  <EyeOff className="h-4 w-4 text-ink-400" /> Health values are hidden here. {can('break_glass') ? 'Open them from Health records (reason required, 30 minutes, audited).' : 'Only Admins with the health-records permission can open them.'}
                </p>
                <Button size="sm" variant="outline" leftIcon={<Lock className="h-4 w-4" />} onClick={() => setTab('health')}>
                  Health records
                </Button>
              </Card>
            </>
          )}

          {tab === 'activity' && <ActivityTab userId={id} user={user} />}
          {tab === 'health' &&
            (data.hasAppData ? (
              <HealthTab key={id} userId={id} name={data.user.name} initialGrant={{ expiresAt: data.healthAccess.expiresAt, reason: data.healthAccess.reason }} onGrantChange={reload} />
            ) : (
              <Card>
                <EmptyState icon={<EyeOff className="h-6 w-6" />} title="No health records" body="This account has no wellness data stored (seeded list entry or deleted account)." />
              </Card>
            ))}
          {tab === 'notes' && can('manage_support') && <NotesTab key={id} userId={id} initial={data.notes} />}
        </div>
      )}
    </>
  );
}
