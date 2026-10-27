import { useMemo, useState } from 'react';
import { CalendarDays, Copy, Download, Eye, Filter, History, KeyRound, Lock, User, Users } from 'lucide-react';
import { Avatar } from '@/components/brand/Brand';
import { Badge, Button, Card, CardSkeleton, EmptyState, Input, Modal, Notice, Pagination, SearchInput, useToast } from '@/components/ui';
import { cn, paginate, useDemoLoading } from '@/lib/utils';
import { useAdmin } from '../adminState';
import type { AuditEntry } from '../adminData';
import { AdminHeader, FilterSelect, KpiCard, RoleBadge, RowActions, TableShell, Th, Toolbar } from '../components';
import { formatDateTime } from '../helpers';

const PAGE = 12;
const SENSITIVE = /break_glass|^permission\.|email_revealed|privileges|role_change|deactivate|mfa_reset|^settings\.|export/;
const AREA_TONE: Record<string, string> = {
  content: 'bg-lavender-50 text-lavender-700 ring-lavender-100',
  user: 'bg-sky-50 text-sky-700 ring-sky-100',
  support: 'bg-peach-50 text-peach-700 ring-peach-100',
  privacy: 'bg-rose-50 text-rose-700 ring-rose-100',
  staff: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  permission: 'bg-butter-50 text-green-900 ring-butter-200',
};
const areaTone = (action: string) => AREA_TONE[action.split('.')[0]] ?? 'bg-green-50 text-green-800 ring-green-100';

function toCsv(rows: AuditEntry[]): string {
  const esc = (v: string | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const header = ['timestamp', 'actor', 'role', 'action', 'target', 'detail', 'ip'];
  return [header.join(','), ...rows.map((r) => [r.at, r.actor, r.role, r.action, r.target, r.detail, r.ip].map(esc).join(','))].join('\r\n');
}

export default function Audit() {
  const { state, audit } = useAdmin();
  const toast = useToast();
  const loading = useDemoLoading(400);
  const [q, setQ] = useState('');
  const [area, setArea] = useState('all');
  const [actor, setActor] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditEntry | null>(null);
  const copyId = async (a: AuditEntry) => {
    try {
      await navigator.clipboard.writeText(a.id);
      toast.success('Entry ID copied', a.id);
    } catch {
      toast.info('Copy not available', a.id);
    }
  };

  const areas = useMemo(() => [...new Set(state.audit.map((a) => a.action.split('.')[0]))].sort(), [state.audit]);
  const actors = useMemo(() => [...new Set(state.audit.map((a) => a.actor))].sort(), [state.audit]);
  const rangeError = from && to && from > to ? '“From” must be on or before “To”.' : null;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.audit.filter((a) => {
      const day = a.at.slice(0, 10);
      return (
        (!t || `${a.actor} ${a.action} ${a.target} ${a.detail ?? ''}`.toLowerCase().includes(t)) &&
        (area === 'all' || a.action.startsWith(`${area}.`)) &&
        (actor === 'all' || a.actor === actor) &&
        (rangeError || ((!from || day >= from) && (!to || day <= to)))
      );
    });
  }, [state.audit, q, area, actor, from, to, rangeError]);
  const pg = paginate(filtered, page, PAGE);
  const f = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthx-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    audit('audit.export', 'Audit log', `${filtered.length} rows`);
    toast.success('Audit log exported', `${filtered.length} rows downloaded as CSV.`);
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = state.audit.filter((a) => a.at.slice(0, 10) === today).length;
  const sensitive = state.audit.filter((a) => SENSITIVE.test(a.action)).length;

  return (
    <>
      <AdminHeader
        title="Audit log"
        subtitle="Append-only record of staff and system actions (§47, §68). Entries never contain health values."
        badge={<Badge tone="gray" icon={<Lock className="h-3 w-3" />}>Immutable</Badge>}
        actions={
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={filtered.length === 0}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Entries" value={state.audit.length} icon={<History className="h-5 w-5" />} hint={`${filtered.length} match the filters`} />
        <KpiCard label="Today" value={todayCount} icon={<CalendarDays className="h-5 w-5" />} tone="sky" hint="staff and system actions" />
        <KpiCard label="People & systems" value={actors.length} icon={<Users className="h-5 w-5" />} tone="lavender" hint={`${areas.length} areas`} />
        <KpiCard label="Sensitive actions" value={sensitive} icon={<KeyRound className="h-5 w-5" />} tone="peach" hint="permissions, reveals, exports" />
      </div>

      <Toolbar>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <SearchInput value={q} onChange={f(setQ)} placeholder="Search actor, action, target…" className="xl:max-w-sm xl:flex-1" />
          <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
            <FilterSelect label="Area" value={area} onChange={f(setArea)} options={[{ value: 'all', label: 'All areas' }, ...areas.map((a) => ({ value: a, label: a }))]} />
            <FilterSelect label="Actor" value={actor} onChange={f(setActor)} options={[{ value: 'all', label: 'Everyone' }, ...actors.map((a) => ({ value: a, label: a }))]} />
            <div className="min-w-0">
              <label htmlFor="au-from" className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">
                From
              </label>
              <Input id="au-from" type="date" value={from} onChange={(e) => f(setFrom)(e.target.value)} className="h-11 px-3 text-sm" invalid={!!rangeError} />
            </div>
            <div className="min-w-0">
              <label htmlFor="au-to" className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">
                To
              </label>
              <Input id="au-to" type="date" value={to} onChange={(e) => f(setTo)(e.target.value)} className="h-11 px-3 text-sm" invalid={!!rangeError} />
            </div>
          </div>
        </div>
        {rangeError && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {rangeError}
          </p>
        )}
        {(area !== 'all' || actor !== 'all' || q || from || to) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 text-xs text-ink-500">
            <span className="font-mono uppercase tracking-[0.12em]">Filtered</span>
            {area !== 'all' && <Badge tone="mint">Area: {area}</Badge>}
            {actor !== 'all' && <Badge tone="mint">Actor: {actor}</Badge>}
            {(from || to) && <Badge tone="mint">{`${from || '…'} → ${to || '…'}`}</Badge>}
            <button
              type="button"
              onClick={() => {
                setQ('');
                setArea('all');
                setActor('all');
                setFrom('');
                setTo('');
                setPage(1);
              }}
              className="ml-auto font-semibold text-green-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </Toolbar>

      {loading ? (
        <CardSkeleton lines={8} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<History className="h-6 w-6" />} title="No entries match" body="Adjust the filters or date range." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <TableShell minWidth={960}>
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Detail · IP</Th>
                <Th className="w-12">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] leading-relaxed text-ink-500">
                    <span className="block text-ink-700">{new Date(a.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="block">{new Date(a.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  </td>
                  <td className="min-w-[200px] px-4 py-3">
                    <span className="flex items-start gap-2.5">
                      <Avatar name={a.actor === 'system' ? 'System' : a.actor} size={30} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink-900">{a.actor}</span>
                        <span className="mt-0.5 inline-flex">
                          <RoleBadge role={a.role} />
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[12px] font-medium ring-1 ring-inset', areaTone(a.action))}>{a.action}</span>
                  </td>
                  <td className="min-w-[160px] max-w-[240px] px-4 py-3 text-ink-700">{a.target}</td>
                  <td className="min-w-[180px] max-w-[300px] px-4 py-3 text-ink-500">
                    <span className="block">{a.detail ?? '—'}</span>
                    <span className="mt-1 block font-mono text-[11px] text-ink-400">IP {a.ip}</span>
                  </td>
                  <td className="w-12 px-2 py-2">
                    <RowActions
                      label={a.action}
                      actions={[
                        { label: 'View details', icon: Eye, onSelect: () => setDetail(a) },
                        { label: 'Filter by this actor', icon: User, onSelect: () => { setActor(a.actor); setPage(1); } },
                        { label: 'Show only this area', icon: Filter, onSelect: () => { setArea(a.action.split('.')[0]); setPage(1); } },
                        { label: 'Copy entry ID', icon: Copy, onSelect: () => copyId(a) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <div className="border-t border-ink-100 p-4">
            <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="entries" />
          </div>
        </Card>
      )}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Audit entry" description={detail?.id}>
        {detail && (
          <>
            <span className={cn('mb-4 inline-block rounded-full px-3 py-1 font-mono text-[13px] font-medium ring-1 ring-inset', areaTone(detail.action))}>{detail.action}</span>
            <dl className="divide-y divide-ink-100 rounded-2xl border border-ink-100 text-sm">
              {[
                ['Time', formatDateTime(detail.at)],
                ['Actor', detail.actor],
                ['Role', detail.role],
                ['Action', detail.action],
                ['Target', detail.target],
                ['Detail', detail.detail ?? '—'],
                ['IP', detail.ip],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-500">{k}</dt>
                  <dd className="break-all text-right font-medium text-ink-800">{v}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
          <Lock className="h-3 w-3" /> Entries are append-only and contain no health values.
        </p>
      </Modal>
      <Notice tone="info" className="mt-6">
        Production stores audit entries append-only with tamper evidence and a defined retention period [ADD A-34, D-20]. This viewer is [ADD A-14].
      </Notice>
    </>
  );
}
