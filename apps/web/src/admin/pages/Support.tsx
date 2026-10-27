import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Download, EyeOff, FolderOpen, Inbox, LifeBuoy, MailCheck, MessageSquarePlus, PlayCircle, Trash2, UserCheck, UserMinus, Users } from 'lucide-react';
import { Avatar } from '@/components/brand/Brand';
import {
  BackendBadge,
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
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
import { cn, paginate, simulate, useDemoLoading } from '@/lib/utils';
import { SUPPORT_TYPES, type SupportRequest, type SupportStatus, type SupportType } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, AdminHero, FilterSelect, HeroStat, RowActions, SlaChip, SortHeader, StatusPill, TableShell, Th, Toolbar } from '../components';
import { formatDateTime, maskEmail, slaRemaining, useSort } from '../helpers';
import { supportStats } from '../metrics';

const PAGE = 10;
const STATUS_LABEL: Record<SupportStatus, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
const STATUS_TONE: Record<SupportStatus, BadgeTone> = { open: 'warning', in_progress: 'sky', resolved: 'gray' };
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;
const PRIORITY_TONE: Record<SupportRequest['priority'], BadgeTone> = { high: 'danger', normal: 'mint', low: 'gray' };
const shortDateTime = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function RequestDetail({ request, onClose }: { request: SupportRequest; onClose: () => void }) {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const me = state.session!.name;
  const user = state.users.find((u) => u.id === request.userId);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState('');
  const resolved = request.status === 'resolved';

  /** Resolves to null when the server refuses (the store shows why). */
  const update = (patch: Partial<SupportRequest>, action: string, detail?: string, noteText?: string) => {
    const notes = noteText ? [...request.notes, { at: new Date().toISOString(), by: me, text: noteText }] : request.notes;
    const result = dispatch({ type: 'UPSERT_SUPPORT', request: { ...request, ...patch, notes } });
    audit(action, request.id, detail);
    return result;
  };

  const process = async () => {
    setBusy(true);
    await simulate(true, 900);
    setBusy(false);
    if (request.type === 'data_export') {
      if (await update({ status: 'in_progress', assignee: request.assignee ?? me }, 'support.export_processed', 'Export link sent (simulated)', 'Export prepared; secure expiring link sent to the user (simulated).'))
        toast.success('Export prepared', 'A secure, expiring link was sent to the user (simulated).');
    } else if (await update({ status: 'in_progress', assignee: request.assignee ?? me }, 'support.resend_verification', undefined, 'Verification / sign-in link re-sent (simulated).')) {
      toast.success('Link re-sent', `Sent to ${request.userEmail} (simulated).`);
    }
  };

  const runDeletion = async () => {
    setDelOpen(false);
    setDelText('');
    // Queuing a deletion needs the data-request permission; stop here if the server refuses. With the API
    // this opens a tracked deletion request, and the data is erased when that request is completed.
    if (user && !(await dispatch({ type: 'UPDATE_USER', id: user.id, patch: { status: 'deletion_pending' } }))) return;
    if (apiMode) {
      if (await update({ status: 'in_progress', assignee: request.assignee ?? me }, 'support.deletion_queued', `User ${request.userId}`, 'Deletion request opened in Privacy requests; the account is locked until it is completed.'))
        toast.success('Deletion request opened', 'Complete it in Privacy requests to erase the data. The user has been signed out.');
      return;
    }
    if (await update({ status: 'in_progress', assignee: request.assignee ?? me }, 'support.deletion_queued', `User ${request.userId}`, 'Deletion job queued; user will be notified when complete (simulated).'))
      toast.success('Deletion queued', 'All user data will be removed (simulated, see D-20).');
  };

  const addNote = (resolve: boolean) => {
    if (note.trim().length < (resolve ? 10 : 3)) {
      setNoteErr(resolve ? 'Add a resolution note (at least 10 characters).' : 'Write a note first.');
      return;
    }
    setNoteErr(null);
    void update(resolve ? { status: 'resolved' } : {}, resolve ? 'support.resolve' : 'support.note', undefined, note.trim()).then((ok) => {
      if (!ok) return;
      toast.success(resolve ? 'Request resolved' : 'Note added');
      setNote('');
    });
  };

  const heading = 'mb-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500';

  return (
    <>
      <Modal open onClose={onClose} size="lg" title={`${request.id} · ${request.subject}`} description={`${SUPPORT_TYPES[request.type].label} · via ${request.channel === 'in_app' ? 'in-app form' : 'email'} · ${formatDateTime(request.createdAt)}`}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wash p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</StatusPill>
              <Badge tone={PRIORITY_TONE[request.priority]}>
                {request.priority[0].toUpperCase() + request.priority.slice(1)} priority
              </Badge>
              <SlaChip request={request} />
            </div>
            <span className="flex items-center gap-2 text-sm text-ink-600">
              {request.assignee ? <Avatar name={request.assignee} size={28} /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-400 shadow-xs"><Users className="h-3.5 w-3.5" /></span>}
              Assignee: {request.assignee ?? 'Unassigned'}
            </span>
          </div>

          <section className="rounded-2xl border border-ink-100 p-4">
            <h3 className={heading}>Account (no health data)</h3>
            {user ? (
              <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
                {[
                  ['User', `${user.name} · ${user.id}`],
                  ['Email', user.email],
                  ['Status', user.status.replace('_', ' ')],
                  ['Plan', user.plan === 'premium' ? `Premium${user.comp ? ' (comp)' : ''}` : 'Free'],
                  ['Sign-in method', user.authMethod.replace('_', ' ')],
                  ['Consents', `${Object.values(user.consents).filter(Boolean).length + 1} of 5 granted`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-ink-100 py-2">
                    <dt className="shrink-0 text-ink-500">{k}</dt>
                    <dd className={cn('min-w-0 truncate text-right font-semibold text-ink-800', (k === 'Status' || k === 'Sign-in method') && 'capitalize')} title={v}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-ink-500">User record not found.</p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
              <EyeOff className="h-3.5 w-3.5" /> Cycle, symptom and other health logs are never shown to support (§68).
            </p>
          </section>

          {!resolved && (
            <section className="rounded-2xl bg-ink-50/70 p-4">
              <h3 className={heading}>Next steps</h3>
              <div className="flex flex-wrap gap-2">
                {request.assignee !== me ? (
                  <Button size="sm" variant="outline" leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => update({ assignee: me }, 'support.assign', me)}>
                    Assign to me
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" leftIcon={<UserMinus className="h-4 w-4" />} onClick={() => update({ assignee: null }, 'support.unassign')}>
                    Unassign
                  </Button>
                )}
                {request.status === 'open' && (
                  <Button size="sm" variant="outline" leftIcon={<PlayCircle className="h-4 w-4" />} onClick={() => update({ status: 'in_progress', assignee: request.assignee ?? me }, 'support.start')}>
                    Start
                  </Button>
                )}
                {request.type === 'data_export' && can('process_data_requests') && (
                  <Button size="sm" loading={busy} leftIcon={<Download className="h-4 w-4" />} onClick={process}>
                    Prepare export
                  </Button>
                )}
                {request.type === 'account_deletion' && can('process_data_requests') && (
                  <Button size="sm" variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setDelOpen(true)} disabled={user?.status === 'deletion_pending' || user?.status === 'deleted'}>
                    {user?.status === 'deletion_pending' ? 'Deletion queued' : 'Process deletion'}
                  </Button>
                )}
                {(request.type === 'login_help' || request.type === 'verification') && can('resend_verification') && (
                  <Button size="sm" loading={busy} leftIcon={<MailCheck className="h-4 w-4" />} onClick={process}>
                    Resend sign-in / verification link
                  </Button>
                )}
                {request.type === 'subscription_issue' &&
                  (can('manage_subscriptions') ? (
                    <Link to="/admin/subscriptions" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 hover:border-green-400 hover:text-green-800">
                      Open subscriptions <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" leftIcon={<ArrowUpRight className="h-4 w-4" />} onClick={() => update({}, 'support.escalate', 'To Admin (subscriptions)', 'Escalated to Admin for refund/subscription review.')}>
                      Escalate to Admin
                    </Button>
                  ))}
                <BackendBadge className="self-center" />
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-ink-100 p-4">
            <h3 className={heading}>Notes</h3>
            {request.notes.length === 0 ? (
              <p className="text-sm text-ink-500">No notes yet.</p>
            ) : (
              <ol className="relative space-y-3 border-l-2 border-ink-100 pl-5">
                {request.notes.map((n, i) => (
                  <li key={i} className="relative">
                    <span aria-hidden className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 ring-2 ring-green-100" />
                    <p className="text-sm text-ink-800">{n.text}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {n.by} · {formatDateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {!resolved && (
              <div className="mt-4 space-y-2 border-t border-ink-100 pt-4">
                <Field label="Add a note" htmlFor="sup-note" error={noteErr} hint="Never paste health information into support notes.">
                  <Textarea id="sup-note" value={note} onChange={(e) => setNote(e.target.value)} invalid={!!noteErr} className="min-h-[72px]" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" leftIcon={<MessageSquarePlus className="h-4 w-4" />} onClick={() => addNote(false)}>
                    Add note
                  </Button>
                  <Button size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => addNote(true)}>
                    Resolve with note
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </Modal>

      <Modal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        size="sm"
        title="Process account deletion"
        description={apiMode ? 'Opens a tracked deletion request (§42). The data is erased when it’s completed in Privacy requests.' : 'Queues permanent removal of the account and all user data (§42).'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDelOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={delText !== 'DELETE'} onClick={runDeletion}>
              Queue deletion
            </Button>
          </>
        }
      >
        <Notice tone="warning" className="mb-3">
          Irreversible. Store subscriptions must be cancelled by the user [ADD A-21]; backups purge per D-20.
        </Notice>
        <Field label='Type "DELETE" to confirm' htmlFor="sup-del">
          <Input id="sup-del" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" />
        </Field>
      </Modal>
    </>
  );
}

export default function Support() {
  const { state, dispatch, audit } = useAdmin();
  const toast = useToast();
  const quick = (r: SupportRequest, patch: Partial<SupportRequest>, action: string, msg: string) => {
    void dispatch({ type: 'UPSERT_SUPPORT', request: { ...r, ...patch } }).then((ok) => ok && toast.success(msg, r.id));
    audit(action, r.id, patch.assignee ?? undefined);
  };
  const me = state.session!.name;
  const [params, setParams] = useSearchParams();
  const loading = useDemoLoading(450);
  const [failed, setFailed] = useState(params.get('simulateError') === '1');
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('active');
  const [assignee, setAssignee] = useState('all');
  const [page, setPage] = useState(1);
  const openId = params.get('id');
  const open = state.support.find((r) => r.id === openId) ?? null;
  const s = supportStats(state.support);
  const mine = s.active.filter((r) => r.assignee === me).length;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.support.filter(
      (r) =>
        (!t || `${r.id} ${r.subject} ${r.userName} ${r.userEmail}`.toLowerCase().includes(t)) &&
        (type === 'all' || r.type === type) &&
        (status === 'all' || (status === 'active' ? r.status !== 'resolved' : r.status === status)) &&
        (assignee === 'all' || (assignee === 'me' ? r.assignee === me : assignee === 'unassigned' ? !r.assignee : r.assignee === assignee)),
    );
  }, [state.support, q, type, status, assignee, me]);
  const { sorted, key, dir, toggle } = useSort(filtered, 'sla', {
    created: (r) => r.createdAt,
    sla: (r) => (r.status === 'resolved' ? 1e9 : slaRemaining(r.createdAt, SUPPORT_TYPES[r.type].slaHours)),
    priority: (r) => PRIORITY_RANK[r.priority],
  });
  const pg = paginate(sorted, page, PAGE);
  const f = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };
  const quickFilter = (a: string) => {
    setAssignee((cur) => (cur === a ? 'all' : a));
    setStatus('active');
    setPage(1);
  };
  const filtersOn = !!q || type !== 'all' || status !== 'active' || assignee !== 'all';
  const clear = () => {
    setQ('');
    setType('all');
    setStatus('active');
    setAssignee('all');
    setPage(1);
  };

  return (
    <>
      <AdminHeader
        title="Support requests"
        subtitle="Data export, account deletion, login and subscription requests. No health data is ever part of a ticket."
        badge={<Badge tone="peach">[ADD] not in SRS</Badge>}
      />

      <AdminHero
        eyebrow="Support desk · sorted by SLA"
        title={s.active.length ? `${s.active.length} request${s.active.length === 1 ? '' : 's'} need${s.active.length === 1 ? 's' : ''} a reply` : 'The queue is clear'}
        aside={
          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Open" value={s.open} icon={<Inbox className="h-3.5 w-3.5" />} />
            <HeroStat label="In progress" value={s.inProgress} icon={<PlayCircle className="h-3.5 w-3.5" />} />
            <HeroStat label="Unassigned" value={s.unassigned} icon={<Users className="h-3.5 w-3.5" />} />
            <HeroStat label="SLA breached" value={s.breached} icon={<AlertTriangle className="h-3.5 w-3.5" />} hint={`${s.dueSoon} due in < 12h`} />
          </div>
        }
      >
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-green-50/80">Tickets carry account details only. Pick up a request, add notes as you go and resolve it with a note — every step is audited.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {s.byType.map((t) => (
            <button
              key={t.type}
              type="button"
              aria-pressed={type === t.type}
              onClick={() => f(setType)(type === t.type ? 'all' : t.type)}
              className={cn('inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition', type === t.type ? 'bg-green-100 text-green-950' : 'glass-dark hover:bg-green-900/60')}
            >
              {t.label}
              <span className={cn('num rounded-full px-1.5 text-xs', type === t.type ? 'bg-green-900/10' : 'bg-green-950/40')}>{t.open}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="butter" leftIcon={<UserCheck className="h-4 w-4" />} aria-pressed={assignee === 'me'} onClick={() => quickFilter('me')}>
            My queue · {mine}
          </Button>
          <Button size="sm" variant="white" leftIcon={<Clock className="h-4 w-4" />} aria-pressed={assignee === 'unassigned'} onClick={() => quickFilter('unassigned')}>
            Needs an owner · {s.unassigned}
          </Button>
        </div>
      </AdminHero>

      <Toolbar>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <SearchInput value={q} onChange={f(setQ)} placeholder="Search ID, subject, user or email…" className="xl:max-w-sm xl:flex-1" />
          <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-3">
            <FilterSelect label="Type" value={type} onChange={f(setType)} options={[{ value: 'all', label: 'All types' }, ...(Object.keys(SUPPORT_TYPES) as SupportType[]).map((t) => ({ value: t, label: SUPPORT_TYPES[t].label }))]} />
            <FilterSelect
              label="Status"
              value={status}
              onChange={f(setStatus)}
              options={[
                { value: 'active', label: 'Open & in progress' },
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'all', label: 'All' },
              ]}
            />
            <FilterSelect
              label="Assignee"
              value={assignee}
              onChange={f(setAssignee)}
              options={[
                { value: 'all', label: 'Anyone' },
                { value: 'me', label: 'Assigned to me' },
                { value: 'unassigned', label: 'Unassigned' },
                ...[...new Set(state.support.map((r) => r.assignee).filter(Boolean) as string[])].map((a) => ({ value: a, label: a })),
              ]}
            />
          </div>
        </div>
        {filtersOn && (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={clear} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-green-700 hover:bg-green-50">
              Reset filters
            </button>
          </div>
        )}
      </Toolbar>

      {loading ? (
        <CardSkeleton lines={8} />
      ) : failed ? (
        <Card>
          <ErrorState body="The support service didn’t respond (simulated)." onRetry={() => setFailed(false)} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<LifeBuoy className="h-6 w-6" />}
            title="No requests match"
            body="Try another filter — or enjoy the quiet queue."
            action={
              filtersOn ? (
                <Button size="sm" variant="secondary" onClick={clear}>
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <TableShell minWidth={900}>
            <thead>
              <tr>
                <Th>Request</Th>
                <SortHeader label="Priority" k="priority" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Created" k="created" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="SLA" k="sla" active={key} dir={dir} onSort={toggle} />
                <Th>Assignee</Th>
                <Th>Status</Th>
                <Th className="w-12">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map((r) => (
                <tr key={r.id} className="cursor-pointer" onClick={() => setParams({ id: r.id })}>
                  <td className="max-w-[340px] px-4 py-3">
                    <button className="block w-full text-left" onClick={() => setParams({ id: r.id })}>
                      <span className="block truncate font-semibold text-ink-900">
                        <span className="font-mono text-[12px] font-medium text-green-700">{r.id}</span> · {r.subject}
                      </span>
                      <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-500">
                        <span className="shrink-0 rounded-full bg-ink-100/80 px-2 py-0.5 font-semibold text-ink-600">{SUPPORT_TYPES[r.type].label}</span>
                        <span className="truncate">
                          {r.userName} · {maskEmail(r.userEmail)}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={PRIORITY_TONE[r.priority]} className="capitalize">
                      {r.priority}
                    </StatusPill>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600" title={formatDateTime(r.createdAt)}>
                    {shortDateTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <SlaChip request={r} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                    {r.assignee ? (
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={r.assignee} size={26} />
                        {r.assignee}
                      </span>
                    ) : (
                      <span className="text-ink-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
                  </td>
                  <td className="px-2 py-3">
                    <RowActions
                      label={r.id}
                      actions={[
                        { label: r.status === 'resolved' ? 'View request' : 'Open & process', icon: FolderOpen, onSelect: () => setParams({ id: r.id }) },
                        r.status !== 'resolved' && r.assignee !== me && { label: 'Assign to me', icon: UserCheck, onSelect: () => quick(r, { assignee: me }, 'support.assign', 'Assigned to you') },
                        r.status !== 'resolved' && r.assignee === me && { label: 'Unassign', icon: UserMinus, onSelect: () => quick(r, { assignee: null }, 'support.unassign', 'Unassigned') },
                        r.status === 'open' && { label: 'Mark in progress', icon: PlayCircle, onSelect: () => quick(r, { status: 'in_progress', assignee: r.assignee ?? me }, 'support.start', 'Marked in progress') },
                        r.status !== 'resolved' && { label: 'Resolve with note…', icon: CheckCircle2, onSelect: () => setParams({ id: r.id }) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <div className="border-t border-ink-100 p-4">
            <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="requests" />
          </div>
        </Card>
      )}
      <Notice tone="info" className="mt-5">
        SLA targets are placeholders until operations and legal set them (export/deletion timing: D-20). Every action here is written to the audit log.
      </Notice>
      {open && (
        <RequestDetail
          request={open}
          onClose={() =>
            setParams((p) => {
              const next = new URLSearchParams(p);
              next.delete('id');
              return next;
            })
          }
        />
      )}
    </>
  );
}
