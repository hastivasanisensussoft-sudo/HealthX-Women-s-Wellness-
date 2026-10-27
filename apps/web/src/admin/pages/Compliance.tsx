import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Check, CheckCircle2, CircleHelp, ClipboardCheck, ExternalLink, FileText, Headphones, Image as ImageIcon, ListChecks, PlayCircle, RotateCcw, Send, ShieldCheck, TriangleAlert, type LucideIcon } from 'lucide-react';
import { formatDate, todayISO, type ContentType } from '@healthx/shared';
import { Badge, Button, Card, CardHeader, CardSkeleton, Checkbox, EmptyState, Field, Input, Modal, Notice, ProgressBar, Textarea, toneClass, useToast, type Tone } from '@/components/ui';
import { cn, useDemoLoading } from '@/lib/utils';
import { prohibitedTermsIn, type ContentItem } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, KpiCard, StatusBadge } from '../components';

type Manual = { licensed: boolean; market: boolean; flagsReviewed: boolean };

const TYPE_ICON: Record<ContentType, { icon: LucideIcon; tone: Tone }> = {
  article: { icon: FileText, tone: 'green' },
  video: { icon: PlayCircle, tone: 'peach' },
  infographic: { icon: ImageIcon, tone: 'sky' },
  faq: { icon: CircleHelp, tone: 'lavender' },
  podcast: { icon: Headphones, tone: 'indigo' },
  program: { icon: ListChecks, tone: 'rose' },
};

const flaggedIn = (c: ContentItem) => prohibitedTermsIn(`${c.title} ${c.description} ${c.body}`);

/** Compliance step of the §40 workflow (Admin, D-08 option B). */
export default function Compliance() {
  const { state, dispatch, audit } = useAdmin();
  const { can, session } = useAccess();
  const toast = useToast();
  const loading = useDemoLoading(350);
  const queue = state.content.filter((c) => c.status === 'compliance_review');
  const approved = state.content.filter((c) => c.status === 'approved' || c.status === 'scheduled');
  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.id ?? approved[0]?.id ?? null);
  const [manual, setManual] = useState<Record<string, Manual>>({});
  const [mode, setMode] = useState<null | 'schedule' | 'return'>(null);
  const [at, setAt] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  // On narrow screens the check panel sits below the lists — bring it into view after picking an item.
  const select = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 1279px)').matches) requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const item = state.content.find((c) => c.id === selectedId) ?? null;
  const m = (item && manual[item.id]) || { licensed: false, market: false, flagsReviewed: false };
  // Keyword scan is a prompt for human review (e.g. "does not diagnose" is fine in context), not an automatic block.
  const flagged = item ? flaggedIn(item) : [];
  const auto = item
    ? [
        { label: 'Medical review complete (reviewer + date)', ok: !!item.medicalReviewer && !!item.reviewDate, detail: item.medicalReviewer ? `${item.medicalReviewer} · ${item.reviewDate ? formatDate(item.reviewDate) : 'no date'}` : 'Missing' },
        { label: 'No diagnosis or treatment claims', ok: !!item.safetyChecks.non_diagnostic && !!item.safetyChecks.no_medication, detail: 'Checked by medical reviewer' },
        { label: 'Signposts to a professional / “not medical advice”', ok: !!item.safetyChecks.professional_signpost, detail: 'Safety-wording checklist' },
        { label: 'References present', ok: item.references.length > 0, detail: `${item.references.length} reference${item.references.length === 1 ? '' : 's'}` },
      ]
    : [];
  const allOk = auto.every((a) => a.ok) && m.licensed && m.market && (flagged.length === 0 || m.flagsReviewed);
  const checks = [...auto.map((a) => a.ok), m.licensed, m.market, ...(flagged.length ? [m.flagsReviewed] : [])];
  const passed = checks.filter(Boolean).length;

  /** Resolves to null when the server refuses the step (the store shows why). */
  const commit = (c: ContentItem, patch: Partial<ContentItem>, action: string, auditAction: string, n?: string) => {
    const result = dispatch({ type: 'UPSERT_CONTENT', item: { ...c, ...patch, updatedDate: todayISO(), history: [...c.history, { at: new Date().toISOString(), actor: session!.name, role: session!.role, action, note: n, version: c.version }] } });
    audit(auditAction, c.title, n);
    return result;
  };

  const approve = async (then: 'publish' | 'schedule' | 'hold') => {
    if (!item) return;
    if (!allOk) {
      toast.error('Checklist incomplete', 'Every compliance check must pass before approval.');
      return;
    }
    if (then === 'schedule') {
      setAt('');
      setErr(null);
      setMode('schedule');
      return;
    }
    if (item.status === 'compliance_review' && !(await commit(item, { status: 'approved' }, 'Compliance approved', 'content.compliance_approve'))) return;
    if (then === 'publish') {
      const base = { ...item, status: 'approved' as const };
      const withApproval = item.status === 'compliance_review' ? { ...base, history: [...item.history, { at: new Date().toISOString(), actor: session!.name, role: session!.role, action: 'Compliance approved', version: item.version }] } : base;
      if (await commit(withApproval, { status: 'published', publishedDate: todayISO(), scheduledFor: null }, 'Published', 'content.publish')) toast.success('Approved & published', item.title);
    } else {
      toast.success('Compliance approved', 'Ready to publish or schedule.');
    }
  };

  const confirmSchedule = () => {
    if (!item) return;
    if (!at) return setErr('Choose a date and time.');
    if (new Date(at).getTime() <= Date.now() + 5 * 60_000) return setErr('Schedule at least 5 minutes in the future.');
    const approvedHistory = item.status === 'compliance_review' ? [...item.history, { at: new Date().toISOString(), actor: session!.name, role: session!.role, action: 'Compliance approved', version: item.version }] : item.history;
    void commit({ ...item, history: approvedHistory }, { status: 'scheduled', scheduledFor: at }, 'Scheduled publication', 'content.schedule', at.replace('T', ' ')).then((ok) => {
      if (!ok) return;
      if (item.status === 'compliance_review') audit('content.compliance_approve', item.title);
      toast.success('Approved & scheduled', `${item.title} goes live ${at.replace('T', ' ')}.`);
      setMode(null);
    });
  };

  const confirmReturn = () => {
    if (!item) return;
    if (note.trim().length < 10) return setErr('Explain what needs to change (at least 10 characters).');
    void commit(item, { status: 'changes_requested' }, 'Returned by compliance', 'content.compliance_return', note.trim()).then((ok) => {
      if (!ok) return;
      toast.success('Returned to author', item.title);
      setMode(null);
      setNote('');
    });
  };

  const queueCard = (c: ContentItem) => {
    const ti = TYPE_ICON[c.type] ?? TYPE_ICON.article;
    const on = selectedId === c.id;
    const flags = flaggedIn(c).length;
    return (
      <li key={c.id}>
        <button
          type="button"
          onClick={() => select(c.id)}
          aria-pressed={on}
          className={cn(
            'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition duration-200',
            on ? 'border-green-300 bg-green-50/70 shadow-card ring-2 ring-green-200' : 'border-ink-100 bg-white hover:-translate-y-0.5 hover:border-green-200 hover:shadow-card',
          )}
        >
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', toneClass(ti.tone))}>
            <ti.icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-400">
              {c.type === 'faq' ? 'FAQ' : c.type} · v{c.version} · {c.author}
            </span>
            <span className="mt-0.5 block font-display text-[16px] font-semibold leading-snug text-ink-900">{c.title}</span>
            <span className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={c.status} />
              {flags > 0 && c.status === 'compliance_review' && (
                <Badge tone="warning" icon={<TriangleAlert className="h-3 w-3" />}>
                  {flags} flagged
                </Badge>
              )}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> {c.medicalReviewer || '—'}
              </span>
              <span>Reviewed {c.reviewDate ? formatDate(c.reviewDate, 'short') : '—'}</span>
              {c.status === 'scheduled' && c.scheduledFor && <span className="font-mono text-[10.5px]">Goes live {c.scheduledFor.replace('T', ' ')}</span>}
            </span>
          </span>
        </button>
      </li>
    );
  };

  const flaggedQueue = queue.filter((c) => flaggedIn(c).length > 0).length;

  return (
    <>
      <AdminHeader title="Compliance" subtitle="Final check after medical review: wording, claims, licensing and launch-market rules (§40). Held by Admins (D-08 option B), never by the medical reviewer of the same version." badge={<Badge tone="peach">{queue.length} waiting</Badge>} />

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Awaiting your check" value={queue.length} icon={<ClipboardCheck className="h-5 w-5" />} tone="peach" hint="Medically approved" />
        <KpiCard label="Approved · ready" value={state.content.filter((c) => c.status === 'approved').length} icon={<CheckCircle2 className="h-5 w-5" />} tone="sky" hint="Publish or schedule" />
        <KpiCard label="Scheduled" value={state.content.filter((c) => c.status === 'scheduled').length} icon={<CalendarClock className="h-5 w-5" />} tone="indigo" hint="Going live soon" />
        <KpiCard label="Flagged wording" value={flaggedQueue} icon={<TriangleAlert className="h-5 w-5" />} tone="rose" hint="Read in context" />
      </div>

      {loading ? (
        <CardSkeleton lines={6} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="cmp-queue">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow mb-1">Queue</p>
                  <h2 id="cmp-queue" className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink-900">
                    Awaiting compliance
                  </h2>
                  <p className="text-sm text-ink-500">Medically approved — needs your final check.</p>
                </div>
              </div>
              {queue.length === 0 ? (
                <Card>
                  <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Nothing waiting" body="Medically approved content will appear here." compact />
                </Card>
              ) : (
                <ul className="space-y-3">{queue.map(queueCard)}</ul>
              )}
            </section>
            <section aria-labelledby="cmp-approved">
              <div className="mb-3">
                <p className="eyebrow mb-1">Next</p>
                <h2 id="cmp-approved" className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink-900">
                  Approved · ready or scheduled
                </h2>
              </div>
              {approved.length === 0 ? (
                <Card>
                  <p className="px-4 py-8 text-center text-sm text-ink-500">No approved content waiting to go live.</p>
                </Card>
              ) : (
                <ul className="space-y-3">{approved.map(queueCard)}</ul>
              )}
            </section>
          </div>

          <div ref={panel} className="scrollbar-thin min-w-0 scroll-mt-24 xl:sticky xl:top-[96px] xl:-m-1 xl:max-h-[calc(100vh-116px)] xl:self-start xl:overflow-y-auto xl:p-1">
            <Card className="card-pad">
              {!item ? (
                <EmptyState compact icon={<ShieldCheck className="h-5 w-5" />} title="Select an item" body="Pick content from the list to run the compliance check." />
              ) : (
                <>
                  <CardHeader title="Compliance check" subtitle={`${item.type === 'faq' ? 'FAQ' : item.type} · ${item.category.replace('_', ' ')} · v${item.version}`} icon={<ShieldCheck className="h-5 w-5" />} />
                  <p className="-mt-1 font-display text-[17px] font-semibold leading-snug text-ink-900">{item.title}</p>
                  <div className="mb-4 mt-3">
                    <div className="mb-1.5 flex items-center justify-between font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">
                      <span>Checks passed</span>
                      <span className={allOk ? 'text-green-700' : undefined}>
                        {passed}/{checks.length}
                      </span>
                    </div>
                    <ProgressBar value={checks.length ? passed / checks.length : 0} height="h-2" label="Compliance checks passed" />
                  </div>
                  <ul className="space-y-2">
                    {auto.map((a) => (
                      <li key={a.label} className="flex gap-3 rounded-2xl bg-canvas px-3 py-2.5 text-sm">
                        <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', a.ok ? 'bg-green-600 text-white' : 'bg-warning-soft text-warning')}>{a.ok ? <Check className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}</span>
                        <span className="min-w-0">
                          <span className="font-semibold text-ink-800">{a.label}</span>
                          <span className="block text-xs text-ink-500">{a.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {flagged.length > 0 && (
                    <p className="mt-4 flex gap-2 rounded-2xl bg-warning-soft px-3.5 py-2.5 text-xs leading-relaxed text-ink-800">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      <span>
                        Prohibited-term scan flagged <strong>{flagged.join(', ')}</strong>. Read it in context — disclaimers like “does not diagnose” are fine; claims are not.
                      </span>
                    </p>
                  )}
                  <p className="mb-2 mt-5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">Your checks</p>
                  <div className="space-y-2">
                    {flagged.length > 0 && (
                      <div className={cn('rounded-2xl border px-3 py-2.5 transition', m.flagsReviewed ? 'border-green-200 bg-green-50/60' : 'border-ink-100')}>
                        <Checkbox checked={m.flagsReviewed} disabled={!can('compliance_review')} onChange={(v) => setManual((x) => ({ ...x, [item.id]: { ...m, flagsReviewed: v } }))} label="Flagged wording reviewed in context — no claims" />
                      </div>
                    )}
                    <div className={cn('rounded-2xl border px-3 py-2.5 transition', m.licensed ? 'border-green-200 bg-green-50/60' : 'border-ink-100')}>
                      <Checkbox checked={m.licensed} disabled={!can('compliance_review')} onChange={(v) => setManual((x) => ({ ...x, [item.id]: { ...m, licensed: v } }))} label="Images, audio and music are licensed for use" />
                    </div>
                    <div className={cn('rounded-2xl border px-3 py-2.5 transition', m.market ? 'border-green-200 bg-green-50/60' : 'border-ink-100')}>
                      <Checkbox checked={m.market} disabled={!can('compliance_review')} onChange={(v) => setManual((x) => ({ ...x, [item.id]: { ...m, market: v } }))} label="Checked against launch-market rules" />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2">
                    {can('publish_content') && (
                      <Button leftIcon={<Send className="h-4 w-4" />} onClick={() => approve('publish')} disabled={!allOk}>
                        {item.status === 'compliance_review' ? 'Approve & publish now' : 'Publish now'}
                      </Button>
                    )}
                    {can('publish_content') && item.status !== 'scheduled' && (
                      <Button variant="outline" leftIcon={<CalendarClock className="h-4 w-4" />} onClick={() => approve('schedule')} disabled={!allOk}>
                        {item.status === 'compliance_review' ? 'Approve & schedule…' : 'Schedule…'}
                      </Button>
                    )}
                    {item.status === 'compliance_review' && (
                      <Button variant="secondary" leftIcon={<Check className="h-4 w-4" />} onClick={() => approve('hold')} disabled={!allOk}>
                        Approve only
                      </Button>
                    )}
                    {item.status === 'compliance_review' && (
                      <Button variant="ghost" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => (setMode('return'), setErr(null))}>
                        Return to author
                      </Button>
                    )}
                  </div>
                  {!allOk && <p className="mt-2 text-center text-xs text-ink-500">All checks must pass before approval.</p>}
                  <Link to={`/admin/content/${item.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline">
                    Open in editor <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
      <Notice tone="info" className="mt-6">
        Compliance approval stamps the approver, date and version on the content history and the audit log. Medical sign-off itself stays with Medical Reviewers.
      </Notice>

      <Modal
        open={mode === 'schedule'}
        onClose={() => setMode(null)}
        size="sm"
        title="Approve & schedule"
        description={item?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button onClick={confirmSchedule}>Schedule</Button>
          </>
        }
      >
        <Field label="Publish at" required htmlFor="cmp-at" error={err} hint="Your local time.">
          <Input id="cmp-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} invalid={!!err} />
        </Field>
      </Modal>
      <Modal
        open={mode === 'return'}
        onClose={() => setMode(null)}
        title="Return to author"
        description="Your comment is shared with the author and stored in the audit trail."
        footer={
          <>
            <Button variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button onClick={confirmReturn}>Return</Button>
          </>
        }
      >
        <Field label="Comment" required htmlFor="cmp-note" error={err}>
          <Textarea id="cmp-note" value={note} onChange={(e) => setNote(e.target.value)} invalid={!!err} placeholder="e.g. Add a “not medical advice” line before the references." />
        </Field>
      </Modal>
    </>
  );
}
