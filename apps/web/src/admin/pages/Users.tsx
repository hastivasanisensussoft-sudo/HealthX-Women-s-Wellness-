import { useMemo, useState, type ReactNode } from 'react';
import { Activity, Apple, Crown, Download, Eye, EyeOff, Fingerprint, KeyRound, Lock, Mail, MailCheck, Monitor, ShieldAlert, ShieldCheck, Smartphone, Trash2, UserCheck, UserRound, UserX, Users as UsersIcon, Wand2, type LucideIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDate, timeAgo } from '@healthx/shared';
import { Avatar } from '@/components/brand/Brand';
import {
  BackendBadge,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardSkeleton,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  Pagination,
  SearchInput,
  Textarea,
  useToast,
  type BadgeTone,
} from '@/components/ui';
import { adminApi, ApiError } from '@/lib/api';
import { cn, paginate, simulate, useDemoLoading } from '@/lib/utils';
import { useAccess, useAdmin } from '../adminState';
import type { AdminUser, AuthMethod, UserStatus } from '../adminData';
import { AdminHeader, FilterSelect, KpiCard, RowActions, SortHeader, StatusPill, TableShell, Th, Toolbar } from '../components';
import { maskEmail, useSort } from '../helpers';

const STATUS: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'green' },
  deactivated: { label: 'Deactivated', tone: 'gray' },
  deletion_pending: { label: 'Deletion pending', tone: 'warning' },
  deleted: { label: 'Deleted', tone: 'danger' },
};
const AUTH: Record<AuthMethod, { label: string; icon: typeof Mail }> = {
  email: { label: 'Email', icon: Mail },
  google: { label: 'Google', icon: KeyRound },
  apple: { label: 'Apple', icon: Apple },
  magic_link: { label: 'Magic link', icon: Wand2 },
};

const PAGE = 10;

type Intent = 'delete' | 'deactivate' | 'reactivate';

function PlanPill({ user }: { user: AdminUser }) {
  return user.plan === 'premium' ? (
    <Badge tone="butter" icon={<Crown className="h-3 w-3" />}>
      Premium
    </Badge>
  ) : (
    <Badge tone="gray">Free</Badge>
  );
}

/** One titled block inside the account dialog. */
function Block({ title, icon: Icon, children, className, aside }: { title: string; icon: LucideIcon; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-ink-100 bg-white p-4', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50 text-green-700">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function UserDetail({ user, onClose, intent }: { user: AdminUser; onClose: () => void; intent?: Intent }) {
  const { dispatch, audit, apiMode } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [bgCounts, setBgCounts] = useState<{ label: string; count: number }[] | null>(null);
  const [bgNote, setBgNote] = useState<string | undefined>();
  const [bgBusy, setBgBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | 'deactivate' | 'reactivate'>(intent === 'deactivate' || intent === 'reactivate' ? intent : null);
  const [deleteOpen, setDeleteOpen] = useState(intent === 'delete');
  const [deleteText, setDeleteText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resending, setResending] = useState(false);
  const [bg, setBg] = useState(false);
  const [bgReason, setBgReason] = useState('');
  const [bgTicket, setBgTicket] = useState('');
  const [bgAck, setBgAck] = useState(false);
  const [bgErr, setBgErr] = useState<{ reason?: string; ticket?: string; ack?: string }>({});
  const [granted, setGranted] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const deleted = user.status === 'deleted';
  const AuthIcon = AUTH[user.authMethod].icon;

  const runExport = async () => {
    setExporting(true);
    await simulate(true, 1200);
    setExporting(false);
    audit('user.export_processed', user.id, 'Export link sent to user (simulated)');
    toast.success('Data export prepared', 'A secure, expiring link was sent to the user (simulated).');
  };

  const resendVerification = async () => {
    setResending(true);
    await simulate(true, 800);
    setResending(false);
    audit('user.resend_verification', user.id, 'Verification / sign-in link re-sent (simulated)');
    toast.success('Verification email re-sent', `Sent to ${maskEmail(user.email)} (simulated) [ADD A-02].`);
  };

  const runDelete = async () => {
    setDeleteOpen(false);
    setDeleteText('');
    setDeleting(true);
    if (apiMode) {
      // The API never erases directly: it opens (or reuses) a tracked deletion request and locks the
      // account; the data is erased when that request is completed in Privacy requests (§42).
      const next = await dispatch({ type: 'UPDATE_USER', id: user.id, patch: { status: 'deletion_pending' } });
      setDeleting(false);
      if (!next) return;
      const req = next.privacy.find((p) => p.userId === user.id && p.type === 'deletion' && p.status !== 'completed');
      toast.success('Deletion request opened', `${req ? `${req.id} — ` : ''}complete it in Privacy requests to erase the data. The user has been signed out.`);
      return;
    }
    dispatch({ type: 'UPDATE_USER', id: user.id, patch: { status: 'deletion_pending' } });
    audit('user.deletion_requested', user.id, 'Deletion job queued');
    await simulate(true, 1600);
    setDeleting(false);
    dispatch({ type: 'UPDATE_USER', id: user.id, patch: { status: 'deleted', name: 'Deleted user', email: `deleted-${user.id}@redacted`, devices: [] } });
    audit('user.deletion_completed', user.id, 'All user data removed (simulated, see D-20)');
    toast.success('Account deleted', 'User data was removed across stores (simulated).');
  };

  const toggleEmail = async () => {
    if (revealed || showEmail) {
      setRevealed(null);
      setShowEmail(false);
      return;
    }
    if (!apiMode) {
      audit('user.email_revealed', user.id, 'Shown for account support');
      setShowEmail(true);
      return;
    }
    setRevealing(true);
    try {
      // Audited by the server.
      setRevealed((await adminApi.revealEmail(user.id)).email);
    } catch (e) {
      toast.error('Couldn’t show the email', e instanceof ApiError ? e.message : undefined);
    } finally {
      setRevealing(false);
    }
  };

  const submitBreakGlass = () => {
    const e: typeof bgErr = {};
    if (bgReason.trim().length < 20) e.reason = 'Describe why access is needed (at least 20 characters).';
    if (!/^SUP-\d{3,6}$/i.test(bgTicket.trim())) e.ticket = 'Enter a support ticket ID like SUP-1042.';
    if (!bgAck) e.ack = 'Confirm you understand this access is logged.';
    setBgErr(e);
    if (Object.keys(e).length) return;
    if (apiMode) {
      void (async () => {
        setBgBusy(true);
        try {
          const r = await adminApi.breakGlass(user.id, `${bgTicket.trim().toUpperCase()} · ${bgReason.trim()}`);
          setBgCounts(r.categories);
          setBgNote(r.note);
          setBg(false);
          setGranted(true);
          toast.info('Break-glass access granted', 'Logged to the audit trail. Ends in 30 minutes.');
        } catch (err) {
          toast.error('Break-glass refused', err instanceof ApiError ? err.message : undefined);
        } finally {
          setBgBusy(false);
        }
      })();
      return;
    }
    audit('user.break_glass', user.id, `${bgTicket.trim().toUpperCase()} · ${bgReason.trim()}`);
    setBg(false);
    setGranted(true);
    toast.info('Break-glass access granted', 'Logged to the audit trail. Ends in 30 minutes.');
  };

  return (
    <>
      <Modal open onClose={onClose} title={user.name} description={`${user.id} · ${maskEmail(user.email)}`} size="lg">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-wash p-4">
            <Avatar name={user.name} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill tone={STATUS[user.status].tone}>{STATUS[user.status].label}</StatusPill>
                <PlanPill user={user} />
                {user.comp && <Badge tone="lavender">Comp until {formatDate(user.comp.until)}</Badge>}
                <Badge tone={user.mfa ? 'green' : 'gray'} icon={<Fingerprint className="h-3 w-3" />}>
                  {user.mfa ? 'MFA on' : 'MFA off'}
                </Badge>
              </div>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-500">
                Member since {formatDate(user.signupDate)} · {user.country}
              </p>
            </div>
            <ButtonLink to={`/admin/users/${encodeURIComponent(user.id)}`} size="sm" variant="secondary" leftIcon={<Activity className="h-4 w-4" />}>
              Profile & activity
            </ButtonLink>
          </div>

          <Block title="Account" icon={UserRound}>
            <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 py-2 sm:col-span-2">
                <dt className="text-ink-500">Email</dt>
                <dd className="flex min-w-0 items-center gap-2 font-semibold text-ink-800">
                  <span className="truncate">{revealed ?? (showEmail ? user.email : maskEmail(user.email))}</span>
                  {!deleted && (
                    <button
                      type="button"
                      disabled={revealing}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-green-50 px-3 text-xs font-semibold text-green-800 ring-1 ring-inset ring-green-200/70 hover:bg-green-100 disabled:opacity-50"
                      onClick={() => void toggleEmail()}
                    >
                      {revealed || showEmail ? 'Hide' : revealing ? 'Showing…' : 'Show'}
                    </button>
                  )}
                </dd>
              </div>
              {[
                ['Signed up', formatDate(user.signupDate)],
                ['Last active', timeAgo(user.lastActive)],
                ['Sign-in method', AUTH[user.authMethod].label],
                ['Country', user.country],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-ink-100 py-2 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="flex items-center gap-1.5 font-semibold text-ink-800">
                    {k === 'Sign-in method' && <AuthIcon className="h-3.5 w-3.5 text-ink-400" />}
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
              <ShieldCheck className="h-3.5 w-3.5 text-green-700" /> Emails stay masked unless you choose Show — every reveal is written to the audit log.
            </p>
          </Block>

          <Block title="Consents (§42)" icon={ShieldCheck}>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['Health data processing', true, true],
                ['Product analytics', user.consents.analytics, false],
                ['AI personalisation', user.consents.ai, false],
                ['Health integrations', user.consents.integrations, false],
                ['Notifications', user.consents.notifications, false],
              ].map(([label, on, req]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2 rounded-xl bg-ink-50/70 px-3 py-2.5 text-sm">
                  <span className="text-ink-700">
                    {label}
                    {req ? <span className="ml-1 text-xs text-ink-400">(required)</span> : null}
                  </span>
                  <StatusPill tone={on ? 'green' : 'gray'}>{on ? 'Granted' : 'Not granted'}</StatusPill>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Devices" icon={Smartphone} aside={<span className="text-xs text-ink-400">{user.devices.length === 1 ? '1 device' : `${user.devices.length} devices`}</span>}>
            {user.devices.length === 0 ? (
              <p className="text-sm text-ink-500">No devices.</p>
            ) : (
              <ul className="space-y-2">
                {user.devices.map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-ink-50/70 px-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink-500 shadow-xs">
                        {d.platform === 'Web' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink-800">{d.model}</span>
                        <span className="block text-xs text-ink-500">
                          {d.platform} · app {d.appVersion}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-400">{timeAgo(d.lastSeen)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <section className={cn('rounded-2xl border border-dashed p-4', granted ? 'border-warning/40 bg-warning-soft/40' : 'border-ink-200 bg-ink-50/40')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 gap-3">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', granted ? 'bg-white text-warning' : 'bg-white text-ink-500 shadow-xs')}>
                  {granted ? <ShieldAlert className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[16px] font-semibold text-ink-900">Health data</p>
                  <p className="text-sm leading-relaxed text-ink-500">
                    {granted
                      ? 'Break-glass access active (30 min). Open the health records to see this person’s cycle, symptom, mood, fertility, life-stage, fitness, nutrition, hydration and sleep logs. Every view is written to the audit log.'
                      : 'Hidden by default (SRS §68). Admins holding the health-records (break-glass) permission can open them for 30 minutes after giving a reason — every grant and view is audited [ADD A-15].'}
                  </p>
                </div>
              </div>
              {!granted && can('break_glass') && !deleted && (
                <Button size="sm" variant="outline" leftIcon={<Lock className="h-4 w-4" />} onClick={() => setBg(true)}>
                  Break-glass access
                </Button>
              )}
              {!can('break_glass') && <Badge tone="gray" icon={<Lock className="h-3 w-3" />}>Break-glass permission only</Badge>}
            </div>
            {granted && (
              <ButtonLink to={`/admin/users/${encodeURIComponent(user.id)}?tab=health`} size="sm" variant="primary" className="mt-3" leftIcon={<ShieldAlert className="h-4 w-4" />}>
                Open health records
              </ButtonLink>
            )}
            {granted && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(bgCounts ?? ['Cycle & period logs', 'Symptom logs', 'Check-ins', 'Hydration', 'Workouts', 'Sleep'].map((label, i) => ({ label, count: [42, 118, 76, 210, 31, 64][i] }))).map((c) => (
                  <div key={c.label} className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-warning/20">
                    <p className="font-semibold text-ink-800">{c.label}</p>
                    <p className="text-xs text-ink-500">{c.count} records</p>
                  </div>
                ))}
                {bgCounts && bgCounts.length === 0 && <p className="text-sm text-ink-500 sm:col-span-3">{bgNote ?? 'No wellness data is stored for this account.'}</p>}
              </div>
            )}
          </section>

          {!deleted && (
            <section className="rounded-2xl bg-ink-50/70 p-4">
              <p className="mb-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500">Account actions</p>
              <div className="flex flex-wrap items-center gap-2">
                {can('manage_user_status') && user.status === 'active' && (
                  <Button variant="outline" size="sm" leftIcon={<UserX className="h-4 w-4" />} onClick={() => setConfirm('deactivate')}>
                    Deactivate
                  </Button>
                )}
                {can('manage_user_status') && user.status === 'deactivated' && (
                  <Button variant="outline" size="sm" leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => setConfirm('reactivate')}>
                    Reactivate
                  </Button>
                )}
                {can('resend_verification') && (
                  <Button variant="outline" size="sm" loading={resending} leftIcon={<MailCheck className="h-4 w-4" />} onClick={resendVerification}>
                    Resend verification
                  </Button>
                )}
                {can('process_data_requests') && (
                  <>
                    <Button variant="outline" size="sm" loading={exporting} leftIcon={<Download className="h-4 w-4" />} onClick={runExport}>
                      Process data export
                    </Button>
                    <Button variant="danger" size="sm" loading={deleting} leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteOpen(true)} disabled={user.status === 'deletion_pending' && !deleting}>
                      {user.status === 'deletion_pending' ? 'Deletion in progress' : apiMode ? 'Open deletion request' : 'Process deletion request'}
                    </Button>
                  </>
                )}
                <BackendBadge className="self-center" />
              </div>
            </section>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          const deactivate = confirm === 'deactivate';
          const ok = await dispatch({ type: 'UPDATE_USER', id: user.id, patch: { status: deactivate ? 'deactivated' : 'active' } });
          audit(deactivate ? 'user.deactivate' : 'user.reactivate', user.id);
          if (ok) toast.success(deactivate ? 'User deactivated' : 'User reactivated', deactivate && apiMode ? 'They were signed out on all devices.' : undefined);
        }}
        title={confirm === 'deactivate' ? 'Deactivate this account?' : 'Reactivate this account?'}
        body={confirm === 'deactivate' ? 'The user will be signed out on all devices and can’t sign in until reactivated.' : 'The user will be able to sign in again.'}
        confirmLabel={confirm === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        danger={confirm === 'deactivate'}
      />

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteText('');
        }}
        title={apiMode ? 'Open a deletion request' : 'Process deletion request'}
        description={
          apiMode
            ? 'Creates a tracked deletion request (§42). The account is locked and the user signed out now; their data is erased when the request is completed in Privacy requests.'
            : 'Permanently removes the account and all user data across the database, storage, caches and analytics identifiers (§42).'
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            {apiMode ? (
              <Button variant="danger" onClick={runDelete}>
                Open deletion request
              </Button>
            ) : (
              <Button variant="danger" disabled={deleteText !== 'DELETE'} onClick={runDelete}>
                Delete permanently
              </Button>
            )}
          </>
        }
      >
        {apiMode ? (
          <Notice tone="warning">
            Completing the request in Privacy requests can’t be undone. If the user has a store subscription, they must cancel it in the App Store / Google Play [ADD A-21].
          </Notice>
        ) : (
          <>
            <Notice tone="warning" className="mb-4">
              This can’t be undone. Backups are purged per the retention policy (D-20). If the user has a store subscription, they must cancel it in the App Store / Google Play [ADD A-21].
            </Notice>
            <Field label='Type "DELETE" to confirm' htmlFor="del-confirm">
              <Input id="del-confirm" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
            </Field>
          </>
        )}
      </Modal>

      <Modal
        open={bg}
        onClose={() => setBg(false)}
        title="Break-glass access"
        description="Temporary, audited access to a person’s health records — only for a documented support or safety reason."
        footer={
          <>
            <Button variant="ghost" onClick={() => setBg(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={bgBusy} onClick={submitBreakGlass}>
              Request access
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-ink-700">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>Access lasts 30 minutes and lets you open this person’s health records. Your ticket and reason, and every view, are written to the audit log.</span>
          </div>
          <Field label="Support ticket" required htmlFor="bg-ticket" error={bgErr.ticket}>
            <Input id="bg-ticket" value={bgTicket} onChange={(e) => setBgTicket(e.target.value)} invalid={!!bgErr.ticket} placeholder="SUP-1042" />
          </Field>
          <Field label="Reason" required htmlFor="bg-reason" error={bgErr.reason}>
            <Textarea id="bg-reason" value={bgReason} onChange={(e) => setBgReason(e.target.value)} invalid={!!bgErr.reason} placeholder="e.g. User reported a sync issue and consented to us checking their period history." />
          </Field>
          <div className="rounded-2xl border border-ink-100 p-3">
            <Checkbox checked={bgAck} onChange={setBgAck} label="I understand this access is time-limited, logged in the audit trail and reviewed by compliance." />
            {bgErr.ack && <p className="mt-1.5 text-sm font-medium text-danger">{bgErr.ack}</p>}
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function UsersPage() {
  const { state, audit } = useAdmin();
  const nav = useNavigate();
  const { can } = useAccess();
  const toast = useToast();
  const loading = useDemoLoading(450);
  const [params] = useSearchParams();
  const [q, setQ] = useState(() => params.get('q') ?? '');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [auth, setAuth] = useState('all');
  const [country, setCountry] = useState('all');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | undefined>(undefined);
  const open = (id: string, i?: Intent) => {
    setIntent(i);
    setOpenId(id);
  };
  const quick = async (u: AdminUser, action: string, detail: string) => {
    await simulate(true, 600);
    audit(action, u.id, detail);
    toast.success(detail.replace(' (simulated)', ''), `${u.name} · simulated`);
  };

  const countries = useMemo(() => [...new Set(state.users.map((u) => u.country))].sort(), [state.users]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.users.filter(
      (u) =>
        (!t || `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(t)) &&
        (plan === 'all' || u.plan === plan) &&
        (status === 'all' || u.status === status) &&
        (auth === 'all' || u.authMethod === auth) &&
        (country === 'all' || u.country === country),
    );
  }, [state.users, q, plan, status, auth, country]);
  const { sorted, key, dir, toggle } = useSort(filtered, 'signup', {
    name: (u) => u.name.toLowerCase(),
    signup: (u) => u.signupDate,
    active: (u) => u.lastActive,
    plan: (u) => u.plan,
    status: (u) => u.status,
  }, 'desc');
  const pg = paginate(sorted, page, PAGE);
  const openUser = state.users.find((u) => u.id === openId) ?? null;
  const f = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };
  const filtersOn = !!q || plan !== 'all' || status !== 'all' || auth !== 'all' || country !== 'all';
  const clear = () => {
    setQ('');
    setPlan('all');
    setStatus('all');
    setAuth('all');
    setCountry('all');
    setPage(1);
  };

  const total = state.users.length;
  const active = state.users.filter((u) => u.status === 'active').length;
  const premium = state.users.filter((u) => u.plan === 'premium').length;
  const pending = state.users.filter((u) => u.status === 'deletion_pending').length;
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : '0%');

  return (
    <>
      <AdminHeader title="Users" subtitle="Account administration (§6.4). Open a profile for the person’s app activity; health records need audited access (§68)." badge={<Badge tone="butter">{state.users.length} demo users</Badge>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Total" value={total} icon={<UsersIcon className="h-5 w-5" />} hint="Accounts in this demo" />
        <KpiCard label="Active" value={active} icon={<UserCheck className="h-5 w-5" />} tone="sky" hint={`${pct(active)} of accounts`} />
        <KpiCard label="Premium" value={premium} icon={<Crown className="h-5 w-5" />} tone="butter" hint={`${pct(premium)} on Premium`} />
        <KpiCard label="Pending deletion" value={pending} icon={<Trash2 className="h-5 w-5" />} tone="rose" hint={pending ? 'Finish in Privacy requests' : 'Nothing waiting'} />
      </div>

      <Toolbar>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <SearchInput value={q} onChange={f(setQ)} placeholder="Search name, email or ID…" className="xl:max-w-sm xl:flex-1" />
          <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
            <FilterSelect label="Plan" value={plan} onChange={f(setPlan)} options={[{ value: 'all', label: 'All plans' }, { value: 'free', label: 'Free' }, { value: 'premium', label: 'Premium' }]} />
            <FilterSelect label="Status" value={status} onChange={f(setStatus)} options={[{ value: 'all', label: 'All statuses' }, ...(Object.keys(STATUS) as UserStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))]} />
            <FilterSelect label="Sign-in method" value={auth} onChange={f(setAuth)} options={[{ value: 'all', label: 'All methods' }, ...(Object.keys(AUTH) as AuthMethod[]).map((a) => ({ value: a, label: AUTH[a].label }))]} />
            <FilterSelect label="Country" value={country} onChange={f(setCountry)} options={[{ value: 'all', label: 'All countries' }, ...countries.map((c) => ({ value: c, label: c }))]} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4 text-xs">
          {[
            [Mail, 'Emails masked by default'],
            [EyeOff, 'Health records: audited access only (§68)'],
            [ShieldCheck, 'Every reveal is audited'],
          ].map(([I, t]) => {
            const Icon = I as LucideIcon;
            return (
              <span key={t as string} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 font-semibold text-green-800 ring-1 ring-inset ring-green-100">
                <Icon className="h-3.5 w-3.5" /> {t as string}
              </span>
            );
          })}
          {filtersOn && (
            <button type="button" onClick={clear} className="ml-auto inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-green-700 hover:bg-green-50">
              Clear filters
            </button>
          )}
        </div>
      </Toolbar>

      {loading ? (
        <CardSkeleton lines={8} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UsersIcon className="h-6 w-6" />}
            title="No users found"
            body="Try another search or clear the filters."
            action={
              filtersOn ? (
                <Button size="sm" variant="secondary" onClick={clear}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <TableShell minWidth={1040}>
            <thead>
              <tr>
                <SortHeader label="User" k="name" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Signed up" k="signup" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Plan" k="plan" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Status" k="status" active={key} dir={dir} onSort={toggle} />
                <Th>Sign-in</Th>
                <SortHeader label="Last active" k="active" active={key} dir={dir} onSort={toggle} />
                <Th>Country</Th>
                <Th className="w-12">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map((u) => {
                const A = AUTH[u.authMethod];
                const AuthIcon = A.icon;
                return (
                  <tr key={u.id} className="cursor-pointer" onClick={() => open(u.id)}>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-3 rounded-xl text-left" onClick={() => open(u.id)}>
                        <Avatar name={u.name} size={38} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink-900">{u.name}</span>
                          <span className="block text-xs text-ink-500">{maskEmail(u.email)}</span>
                        </span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatDate(u.signupDate)}</td>
                    <td className="px-4 py-3">
                      <PlanPill user={u} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={STATUS[u.status].tone}>{STATUS[u.status].label}</StatusPill>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100/70 text-ink-500">
                          <AuthIcon className="h-3.5 w-3.5" />
                        </span>
                        {A.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{timeAgo(u.lastActive)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{u.country}</td>
                    <td className="px-2 py-3">
                      <RowActions
                        label={u.name}
                        actions={[
                          { label: 'View account', icon: Eye, onSelect: () => open(u.id) },
                          { label: 'Profile & activity', icon: Activity, onSelect: () => nav(`/admin/users/${encodeURIComponent(u.id)}`) },
                          u.status !== 'deleted' && can('resend_verification') && { label: 'Resend verification', icon: MailCheck, onSelect: () => quick(u, 'user.resend_verification', 'Verification email re-sent (simulated)') },
                          u.status !== 'deleted' && can('process_data_requests') && { label: 'Process data export', icon: Download, onSelect: () => quick(u, 'user.export_processed', 'Export link sent to the user (simulated)') },
                          can('manage_user_status') && u.status === 'active' && { label: 'Deactivate…', icon: UserX, onSelect: () => open(u.id, 'deactivate') },
                          can('manage_user_status') && u.status === 'deactivated' && { label: 'Reactivate…', icon: UserCheck, onSelect: () => open(u.id, 'reactivate') },
                          can('process_data_requests') && (u.status === 'active' || u.status === 'deactivated') && { label: 'Process deletion…', icon: Trash2, danger: true, onSelect: () => open(u.id, 'delete') },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <div className="border-t border-ink-100 p-4">
            <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="users" />
          </div>
        </Card>
      )}
      {openUser && <UserDetail key={`${openUser.id}-${intent ?? ''}`} user={openUser} intent={intent} onClose={() => setOpenId(null)} />}
    </>
  );
}
