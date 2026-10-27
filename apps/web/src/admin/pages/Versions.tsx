import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileText, GitBranch, GitCompareArrows, History, Layers, RotateCcw } from 'lucide-react';
import { formatDate, todayISO } from '@healthx/shared';
import { Badge, Button, Card, CardHeader, CardSkeleton, EmptyState, Field, Modal, Notice, SearchInput, Textarea, useToast } from '@/components/ui';
import { cn, useDemoLoading } from '@/lib/utils';
import { SAFETY_CHECKLIST, type ContentItem, type ContentVersion } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, KpiCard, ReadOnlyBanner, StatusBadge, TableShell, Th, Toolbar } from '../components';
import { hasChanges, wordDiff, type DiffPart } from '../diff';
import { formatDateTime } from '../helpers';

const EDITABLE = ['draft', 'changes_requested', 'rejected'];

function current(c: ContentItem): ContentVersion {
  const last = [...c.history].reverse().find((h) => h.version === c.version);
  return { version: c.version, title: c.title, description: c.description, body: c.body, savedAt: last?.at ?? `${c.updatedDate}T09:00:00.000Z`, savedBy: last?.actor ?? c.author, note: last?.action };
}

function VersionChip({ v, tone = 'gray' }: { v: number; tone?: 'gray' | 'green' }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11.5px] font-medium', tone === 'green' ? 'bg-green-700 text-white' : 'bg-ink-100 text-ink-700')}>v{v}</span>;
}

function Diff({ parts }: { parts: DiffPart[] }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-ink-800">
      {parts.map((p, i) =>
        p.kind === 'same' ? (
          <span key={i}>{p.text}</span>
        ) : p.kind === 'del' ? (
          <del key={i} className="rounded bg-danger-soft px-0.5 text-danger decoration-danger/60" aria-label={`Removed: ${p.text}`}>
            {p.text}
          </del>
        ) : (
          <ins key={i} className="rounded bg-green-200 px-0.5 font-semibold text-green-950 no-underline" aria-label={`Added: ${p.text}`}>
            {p.text}
          </ins>
        ),
      )}
    </p>
  );
}

/** Pick an item (no :id) — every content item, those with earlier versions first. */
function VersionIndex() {
  const { state } = useAdmin();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const items = state.content
    .filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.versions?.length ?? 0) - (a.versions?.length ?? 0) || (a.updatedDate < b.updatedDate ? 1 : -1));
  const revised = state.content.filter((c) => (c.versions?.length ?? 0) > 0);
  const totalVersions = state.content.reduce((a, c) => a + 1 + (c.versions?.length ?? 0), 0);
  const restores = state.content.reduce((a, c) => a + c.history.filter((h) => h.action.startsWith('Restored')).length, 0);
  return (
    <>
      <AdminHeader title="Version history" subtitle="Every published change creates a new version. Compare versions and restore earlier wording (§40)." />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Content items" value={state.content.length} icon={<FileText className="h-5 w-5" />} hint="in the library" />
        <KpiCard label="Revised items" value={revised.length} icon={<GitBranch className="h-5 w-5" />} tone="lavender" hint="with earlier versions" />
        <KpiCard label="Versions kept" value={totalVersions} icon={<Layers className="h-5 w-5" />} tone="sky" hint="current + earlier" />
        <KpiCard label="Restores" value={restores} icon={<RotateCcw className="h-5 w-5" />} tone="peach" hint="earlier wording brought back" />
      </div>
      <Toolbar className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Search content…" className="sm:max-w-sm sm:flex-1" />
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
          {items.length} of {state.content.length} items · revised first
        </p>
      </Toolbar>
      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<FileText className="h-6 w-6" />} title="No content matches" body="Try a different search term." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <TableShell minWidth={720}>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Version</Th>
                <Th>Earlier versions</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
                <Th className="w-12">
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const earlier = c.versions?.length ?? 0;
                return (
                  <tr key={c.id} className="group cursor-pointer" onClick={() => nav(`/admin/content/${c.id}/versions`)}>
                    <td className="max-w-[340px] px-4 py-3">
                      <Link to={`/admin/content/${c.id}/versions`} className="block truncate font-semibold text-ink-900 hover:text-green-700" onClick={(e) => e.stopPropagation()}>
                        {c.title}
                      </Link>
                      <span className="block truncate text-xs text-ink-500">by {c.author}</span>
                    </td>
                    <td className="px-4 py-3">
                      <VersionChip v={c.version} tone={earlier ? 'green' : 'gray'} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-ink-700">
                        <span className="flex gap-0.5" aria-hidden>
                          {Array.from({ length: Math.min(earlier, 5) }, (_, i) => (
                            <span key={i} className="h-2 w-2 rounded-full bg-lavender-400" />
                          ))}
                          {earlier === 0 && <span className="h-2 w-2 rounded-full bg-ink-200" />}
                        </span>
                        <span className="tabular-nums">{earlier}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatDate(c.updatedDate, 'short')}</td>
                    <td className="px-3 py-3 text-ink-400">
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-green-700" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </Card>
      )}
    </>
  );
}

/** Version list + inline diff + restore for one content item (mockup "Version History"). */
export default function Versions() {
  const { id } = useParams();
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can, session } = useAccess();
  const toast = useToast();
  const loading = useDemoLoading(300);
  const item = id ? state.content.find((c) => c.id === id) : undefined;
  const all = useMemo(() => (item ? [current(item), ...[...(item.versions ?? [])].reverse()] : []), [item]);
  const [selected, setSelected] = useState<number | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [note, setNote] = useState('');

  if (!id) return <VersionIndex />;
  if (!item) {
    return (
      <Card className="mx-auto mt-6 max-w-lg">
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Content not found"
          body="It may have been removed, or the link is out of date."
          action={
            <Link to="/admin/versions" className="text-sm font-semibold text-green-700 hover:underline">
              Back to version history
            </Link>
          }
        />
      </Card>
    );
  }

  const latest = all[0];
  const chosen = all.find((v) => v.version === selected) ?? all[1] ?? latest;
  const isCurrent = chosen.version === latest.version;
  const fields = isCurrent
    ? []
    : ([
        ['Title', wordDiff(chosen.title, latest.title)],
        ['Description', wordDiff(chosen.description, latest.description)],
        ['Body', wordDiff(chosen.body, latest.body)],
      ] as [string, DiffPart[]][]);
  const changed = fields.filter(([, p]) => hasChanges(p));
  // The API bumps the version only when reviewed/live content goes back to medical review; a draft is
  // edited in place, and nothing can be restored while the item is in medical review.
  const inReview = apiMode && item.status === 'medical_review';
  const canRestore = can('edit_content') && !isCurrent && !inReview;
  const inPlace = apiMode && EDITABLE.includes(item.status);
  const targetVersion = inPlace ? item.version : item.version + 1;

  const restore = () => {
    const editable = EDITABLE.includes(item.status);
    const nextVersion = targetVersion;
    const n = note.trim();
    const next: ContentItem = {
      ...item,
      title: chosen.title,
      description: chosen.description,
      body: chosen.body,
      version: nextVersion,
      versions: [...(item.versions ?? []), { ...current(item), note: current(item).note ?? 'Saved before restore' }],
      // The API keeps an editable item in its current status (it only moves to draft from archived).
      status: editable ? (apiMode ? item.status : 'draft') : 'medical_review',
      reviewDate: editable ? item.reviewDate : null,
      safetyChecks: editable ? item.safetyChecks : Object.fromEntries(SAFETY_CHECKLIST.map((s) => [s.key, false])),
      updatedDate: todayISO(),
      history: [...item.history, { at: new Date().toISOString(), actor: session!.name, role: session!.role, action: `Restored v${chosen.version} as v${nextVersion}`, note: n || undefined, version: nextVersion }],
    };
    void dispatch({ type: 'UPSERT_CONTENT', item: next }).then((ok) => {
      if (!ok) return;
      if (inPlace) toast.success(`Restored v${chosen.version} into the draft`, `Still v${nextVersion} — submit it for medical review when ready.`);
      else toast.success(`Restored as v${nextVersion}`, editable ? 'Saved as a draft.' : 'Sent to medical review — restored text must be re-approved (§40).');
      setRestoreOpen(false);
      setNote('');
      setSelected(null);
    });
    audit('content.restore_version', item.title, `v${chosen.version} → v${nextVersion}${n ? ` · ${n}` : ''}`);
  };

  return (
    <>
      <AdminHeader
        breadcrumbs={[{ label: 'Version history', to: '/admin/versions' }, { label: item.title }]}
        title="Version history"
        subtitle={item.title}
        badge={
          <span className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <Badge tone="gray">v{item.version}</Badge>
          </span>
        }
        actions={
          <Link to={`/admin/content/${item.id}`} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-5 text-sm font-semibold text-ink-800 transition hover:border-green-400 hover:text-green-800">
            Open in editor
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {!can('edit_content') && <ReadOnlyBanner>Read-only: restoring versions needs the Content Manager or Admin role.</ReadOnlyBanner>}

      {loading ? (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={8} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="eyebrow mb-3">
              <History className="h-3.5 w-3.5" /> Timeline · {all.length} version{all.length === 1 ? '' : 's'}
            </p>
            <div className="relative space-y-3 pl-7" role="listbox" aria-label="Versions">
              <span aria-hidden className="absolute bottom-4 left-[11px] top-4 w-0.5 rounded-full bg-gradient-to-b from-green-300 via-green-200 to-ink-100" />
              {all.map((v, i) => {
                const on = v.version === chosen.version;
                return (
                  <button
                    key={v.version}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => setSelected(v.version)}
                    className={cn('relative w-full rounded-2xl border p-4 text-left transition hover:shadow-card', on ? 'border-green-300 bg-green-50 shadow-card' : 'border-ink-100 bg-white')}
                  >
                    <span aria-hidden className={cn('absolute -left-[23px] top-5 h-3.5 w-3.5 rounded-full ring-4 ring-canvas', i === 0 ? 'bg-green-700' : on ? 'bg-green-500' : 'bg-ink-300')} />
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <VersionChip v={v.version} tone={i === 0 ? 'green' : 'gray'} />
                        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-400">{formatDateTime(v.savedAt)}</span>
                      </span>
                      {i === 0 ? <Badge tone="green">Current</Badge> : <Badge tone="gray">Earlier</Badge>}
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-ink-800">{v.savedBy}</span>
                    {v.note && <span className="mt-0.5 block truncate text-xs italic text-ink-500">“{v.note}”</span>}
                  </button>
                );
              })}
            </div>
            {all.length === 1 && <p className="mt-3 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">Only one version so far — earlier versions appear here after the content is revised.</p>}
            {canRestore && (
              <Button className="mt-4 w-full" variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setRestoreOpen(true)}>
                Restore v{chosen.version}
              </Button>
            )}
            {inReview && can('edit_content') && !isCurrent && <p className="mt-3 px-1 text-xs text-ink-500">Restoring is available once the medical review is finished.</p>}
          </div>

          <Card className="card-pad min-w-0">
            {isCurrent ? (
              <>
                <CardHeader title={`v${latest.version} · current`} subtitle="Select an earlier version to compare" icon={<History className="h-5 w-5" />} />
                <div className="rounded-2xl bg-ink-50/70 p-5">
                  <p className="mb-2 font-display text-[18px] font-semibold text-ink-900">{latest.title}</p>
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-ink-700">{latest.body}</p>
                </div>
              </>
            ) : (
              <>
                <CardHeader
                  title={`Compare v${chosen.version} → v${latest.version}`}
                  subtitle={changed.length ? `${changed.length} field${changed.length === 1 ? '' : 's'} changed: ${changed.map(([k]) => k).join(', ')}` : 'No text changes'}
                  icon={<GitCompareArrows className="h-5 w-5" />}
                  action={
                    <span className="flex items-center gap-1.5">
                      <VersionChip v={chosen.version} />
                      <ArrowRight className="h-4 w-4 text-ink-400" />
                      <VersionChip v={latest.version} tone="green" />
                    </span>
                  }
                />
                <div className="mb-5 flex flex-wrap gap-2 text-xs text-ink-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-ink-100">
                    <del className="rounded bg-danger-soft px-1 text-danger">removed</del> in v{latest.version}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-ink-100">
                    <ins className="rounded bg-green-200 px-1 font-semibold text-green-950 no-underline">added</ins> in v{latest.version}
                  </span>
                </div>
                <div className="space-y-5">
                  {(changed.length ? changed : fields.slice(2)).map(([k, parts]) => (
                    <section key={k}>
                      <p className="eyebrow mb-2">{k}</p>
                      <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 sm:p-5">
                        <Diff parts={parts} />
                      </div>
                    </section>
                  ))}
                </div>
                <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    ['v' + chosen.version + ' saved by', chosen.savedBy],
                    ['v' + latest.version + ' saved by', latest.savedBy],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-ink-50/70 px-4 py-3">
                      <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-400">{k}</dt>
                      <dd className="mt-0.5 font-semibold text-ink-800">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Card>
        </div>
      )}

      <Notice tone="info" className="mt-6">
        Restoring never overwrites history — it creates a new version. Restored text on reviewed content goes back through medical review (§40).
      </Notice>

      <Modal
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        title={`Restore v${chosen.version}?`}
        description={inPlace ? `Replaces the draft’s text with the text from v${chosen.version}. The draft stays v${item.version}.` : `Creates v${item.version + 1} with the text from v${chosen.version}.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestoreOpen(false)}>
              Cancel
            </Button>
            <Button onClick={restore}>{inPlace ? 'Restore into draft' : `Restore as v${item.version + 1}`}</Button>
          </>
        }
      >
        {!EDITABLE.includes(item.status) && <Notice tone="warning" className="mb-4">This item is {item.status.replace('_', ' ')}. The restored version will go to medical review before it can be published again.</Notice>}
        <Field label="Reason (optional)" htmlFor="restore-note">
          <Textarea id="restore-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Reverting an accidental edit" />
        </Field>
      </Modal>
    </>
  );
}
