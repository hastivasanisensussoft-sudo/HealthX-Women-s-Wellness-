/**
 * Daily wellness plans (SRS §33): the template library the mobile app builds each person's plan from.
 * Content Managers write and submit templates; a Medical Content Reviewer approves them (§40) and only
 * approved templates reach the app. Retiring a template removes it from new plans.
 */
import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Eye, ListChecks, Pencil, Plus, RotateCcw, Send, ShieldCheck, Stethoscope, Archive } from 'lucide-react';
import {
  buildDailyPlan,
  createInitialState,
  GOALS,
  PLAN_CONDITIONS,
  PLAN_ICONS,
  PLAN_SLOTS,
  type GoalKey,
  type LifeStageMode,
  type PlanCondition,
  type PlanSlot,
  type PlanTemplate,
  type PlanTemplateStatus,
} from '@healthx/shared';
import { prohibitedTermsIn } from '@healthx/shared/admin';
import { Badge, Button, Card, CardHeader, ChipToggle, EmptyState, Field, Input, Modal, Notice, Select, Tabs, Textarea, useToast, type BadgeTone } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, KpiCard, RowActions, StatusPill, TableShell, Th } from '../components';
import { formatDateTime } from '../helpers';

const STATUS: Record<PlanTemplateStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'gray' },
  in_review: { label: 'In medical review', tone: 'lavender' },
  changes_requested: { label: 'Changes requested', tone: 'warning' },
  approved: { label: 'Live in the app', tone: 'green' },
  retired: { label: 'Retired', tone: 'gray' },
};
const MODES: { value: LifeStageMode; label: string }[] = [
  { value: 'cycle', label: 'Cycle' },
  { value: 'pregnancy', label: 'Pregnancy' },
  { value: 'perimenopause', label: 'Perimenopause' },
  { value: 'menopause', label: 'Menopause' },
];
const whenLabel = (w: PlanCondition) => PLAN_CONDITIONS.find((c) => c.value === w)?.label ?? w;
const slotLabel = (s: PlanSlot) => PLAN_SLOTS.find((x) => x.key === s)?.label ?? s;
type Filter = 'all' | 'approved' | 'in_review' | 'needs_work' | 'retired';

type Draft = Pick<PlanTemplate, 'slot' | 'title' | 'detail' | 'icon' | 'when' | 'lifeStages' | 'order'> & { id?: string; itemId: string };

const blank = (order: number): Draft => ({ slot: 'mindfulness', itemId: '', title: '', detail: '', icon: 'sparkles', when: 'always', lifeStages: [], order });
/** Placeholders as staff read them in lists (the app fills in each person's own target). */
const readable = (text: string) => text.replace(/\{waterL\}/g, '‹water goal›').replace(/\{sleepH\}/g, '‹sleep goal›');
const BUILT_IN = 'Built-in Phase 1 copy';
const itemIdFrom = (title: string) => `plan_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 36) || 'item'}`;

function PlanIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700', className)}>
      <Icon name={name} className="h-4 w-4" />
    </span>
  );
}

function Editor({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const toast = useToast();
  const [d, setD] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const isNew = !initial.id;
  const unsafe = prohibitedTermsIn(`${d.title} ${d.detail}`);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = async (status: 'draft' | 'in_review') => {
    const e: typeof errors = {};
    if (d.title.trim().length < 2) e.title = 'Give the item a short title.';
    if (d.detail.trim().length < 2) e.detail = 'Add one line of supporting text.';
    const itemId = isNew ? d.itemId || itemIdFrom(d.title) : d.itemId;
    if (isNew && !/^plan_[a-z0-9_]{2,40}$/.test(itemId)) e.itemId = 'Use plan_ followed by lower-case letters, digits or _.';
    if (status === 'in_review' && unsafe.length) e.detail = `Remove: ${unsafe.join(', ')} (SRS §67 safety wording).`;
    setErrors(e);
    if (Object.keys(e).length) return;
    const now = new Date().toISOString();
    const existing = state.planTemplates.find((t) => t.id === d.id);
    const template: PlanTemplate = {
      ...(existing ?? { reviewedBy: null, reviewedAt: null }),
      id: d.id ?? `pt_${Date.now().toString(36)}`,
      itemId,
      slot: d.slot,
      title: d.title.trim(),
      detail: d.detail.trim(),
      icon: d.icon,
      when: d.when,
      lifeStages: d.lifeStages,
      order: d.order,
      status,
      updatedBy: state.session?.name ?? 'You',
      updatedAt: now,
      reviewNote: undefined,
    };
    const ok = await dispatch({ type: 'UPSERT_PLAN_TEMPLATE', template });
    if (!ok) return;
    if (!apiMode) audit(isNew ? 'plan.template_create' : 'plan.template_update', template.title, status);
    toast.success(status === 'in_review' ? 'Sent for medical review' : 'Draft saved', status === 'in_review' ? 'A Medical Content Reviewer approves it before it reaches the app.' : 'It isn’t in anyone’s plan until it’s approved.');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New plan item' : 'Edit plan item'}
      description="Short, encouraging wellness actions. No diagnoses, treatment claims or promises (§33, §67)."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => void save('draft')}>
            Save draft
          </Button>
          <Button leftIcon={<Send className="h-4 w-4" />} onClick={() => void save('in_review')}>
            Submit for review
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" required htmlFor="pt-title" error={errors.title} hint="Up to 80 characters">
          <Input id="pt-title" maxLength={80} value={d.title} onChange={(e) => set('title', e.target.value)} invalid={!!errors.title} placeholder="e.g. 10-minute stretch" />
        </Field>
        <Field label="Plan slot" htmlFor="pt-slot">
          <Select id="pt-slot" value={d.slot} onChange={(e) => set('slot', e.target.value as PlanSlot)}>
            {PLAN_SLOTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Supporting text" required htmlFor="pt-detail" error={errors.detail} hint="Use {waterL} or {sleepH} for the person’s own targets. Up to 140 characters." className="md:col-span-2">
          <Textarea id="pt-detail" rows={2} maxLength={140} value={d.detail} onChange={(e) => set('detail', e.target.value)} invalid={!!errors.detail} />
        </Field>
        <Field label="Shown when" htmlFor="pt-when">
          <Select id="pt-when" value={d.when} onChange={(e) => set('when', e.target.value as PlanCondition)}>
            {PLAN_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Order" htmlFor="pt-order" hint="Lower numbers come first; for items sharing an id, the first match wins.">
          <Input id="pt-order" type="number" min={0} max={999} value={d.order} onChange={(e) => set('order', Math.max(0, Math.min(999, Number(e.target.value) || 0)))} />
        </Field>
        {isNew && (
          <Field label="Item id" htmlFor="pt-item" error={errors.itemId} hint="Templates with the same id are variants of one plan item. Leave empty to create one from the title.">
            <Input id="pt-item" value={d.itemId} onChange={(e) => set('itemId', e.target.value.trim())} invalid={!!errors.itemId} placeholder={itemIdFrom(d.title || 'item')} />
          </Field>
        )}
        <div className={cn(isNew ? '' : 'md:col-span-2')}>
          <p className="mb-2 text-sm font-semibold text-ink-800">Life stages</p>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <ChipToggle key={m.value} selected={d.lifeStages.includes(m.value)} onClick={() => set('lifeStages', d.lifeStages.includes(m.value) ? d.lifeStages.filter((x) => x !== m.value) : [...d.lifeStages, m.value])}>
                {m.label}
              </ChipToggle>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-500">None selected = every life stage.</p>
        </div>
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink-800">Icon</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">
            {PLAN_ICONS.map((i) => {
              return (
                <button key={i} type="button" role="radio" aria-checked={d.icon === i} aria-label={i} title={i} onClick={() => set('icon', i)} className={cn('flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset transition', d.icon === i ? 'bg-green-700 text-white ring-green-700' : 'bg-white text-ink-600 ring-ink-200 hover:ring-green-400')}>
                  <Icon name={i} className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {unsafe.length > 0 && (
        <Notice tone="warning" className="mt-4">
          This wording can’t go to review: {unsafe.join(', ')}. Plans offer gentle wellness actions, never diagnoses or treatment claims.
        </Notice>
      )}
      {!isNew && initial.id && state.planTemplates.find((t) => t.id === initial.id)?.status === 'approved' && (
        <Notice tone="info" className="mt-4">
          Saving changes takes this item out of people’s new plans until a Medical Content Reviewer approves it again.
        </Notice>
      )}
    </Modal>
  );
}

function Review({ t, onClose }: { t: PlanTemplate; onClose: () => void }) {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const decide = async (decision: 'approve' | 'changes') => {
    if (decision === 'changes' && note.trim().length < 5) return setErr('Tell the author what to change (at least 5 characters).');
    const ok = await dispatch({ type: 'REVIEW_PLAN_TEMPLATE', id: t.id, decision, note: note.trim() || undefined, by: state.session?.name ?? 'Reviewer' });
    if (!ok) return;
    if (!apiMode) audit(decision === 'approve' ? 'plan.template_approve' : 'plan.template_changes', t.title, note.trim() || undefined);
    toast.success(decision === 'approve' ? 'Approved — live in the app' : 'Sent back to the author', decision === 'approve' ? 'New plans include it from the next refresh.' : undefined);
    onClose();
  };
  const unsafe = prohibitedTermsIn(`${t.title} ${t.detail}`);
  return (
    <Modal
      open
      onClose={onClose}
      title="Medical review"
      description="Check accuracy and safety wording before this reaches people’s plans (§6.3, §40)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => void decide('changes')}>
            Request changes
          </Button>
          <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void decide('approve')}>
            Approve
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-2xl bg-wash p-4">
        <PlanIcon name={t.icon} />
        <div>
          <p className="font-semibold text-ink-900">{t.title}</p>
          <p className="text-sm text-ink-600">{readable(t.detail)}</p>
          <p className="mt-1.5 text-xs text-ink-500">
            {slotLabel(t.slot)} · {whenLabel(t.when)} · {t.lifeStages.length ? t.lifeStages.join(', ') : 'all life stages'} · by {t.updatedBy}
          </p>
        </div>
      </div>
      {unsafe.length > 0 && (
        <Notice tone="warning" className="mt-4">
          Flagged wording: {unsafe.join(', ')}.
        </Notice>
      )}
      <Field label="Note to the author" htmlFor="pt-note" error={err ?? undefined} hint="Required when requesting changes." className="mt-4">
        <Textarea id="pt-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

/** The plan a sample person would see today, built by the same code the app uses. */
function Preview({ library }: { library: PlanTemplate[] }) {
  const [mode, setMode] = useState<LifeStageMode>('cycle');
  const [goals, setGoals] = useState<GoalKey[]>(['improve_wellness']);
  const [energy, setEnergy] = useState<'none' | 'low' | 'ok'>('none');
  const [stress, setStress] = useState(false);
  const items = useMemo(() => {
    const s = createInitialState();
    const checkIns = s.checkIns.filter((c) => c.date !== s.today);
    if (energy !== 'none') checkIns.push({ date: s.today, mood: 'neutral', energy: energy === 'low' ? 3 : 7, stress: stress ? 7 : 3, symptomIds: [] });
    return buildDailyPlan({ ...s, checkIns, profile: { ...s.profile, mode, goals } }, s.today, library.filter((t) => t.status === 'approved'));
  }, [library, mode, goals, energy, stress]);
  return (
    <Card className="card-pad">
      <CardHeader title="Preview a plan" subtitle="Approved templates only — what the app would show today" icon={<Eye className="h-5 w-5" />} />
      <div className="space-y-3 text-sm">
        <Field label="Life stage" htmlFor="pv-mode">
          <Select id="pv-mode" value={mode} onChange={(e) => setMode(e.target.value as LifeStageMode)}>
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Today’s check-in" htmlFor="pv-energy">
          <Select id="pv-energy" value={energy} onChange={(e) => setEnergy(e.target.value as typeof energy)}>
            <option value="none">Not done yet</option>
            <option value="low">Low energy (3/10)</option>
            <option value="ok">Good energy (7/10)</option>
          </Select>
        </Field>
        {energy !== 'none' && <ChipToggle selected={stress} onClick={() => setStress((x) => !x)}>Higher stress (7/10)</ChipToggle>}
        <div>
          <p className="mb-2 font-semibold text-ink-800">Goals</p>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map((g) => (
              <ChipToggle key={g.key} selected={goals.includes(g.key)} onClick={() => setGoals((x) => (x.includes(g.key) ? x.filter((k) => k !== g.key) : [...x, g.key]))}>
                {g.label}
              </ChipToggle>
            ))}
          </div>
        </div>
      </div>
      <ol className="mt-5 space-y-2" aria-label="Preview plan">
        {items.length ? (
          items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-ink-50/70 p-3">
              <PlanIcon name={i.icon} className="bg-white" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900">{i.title}</span>
                <span className="block text-xs text-ink-500">{i.detail}</span>
              </span>
            </li>
          ))
        ) : (
          <li className="text-sm text-ink-500">No approved templates match — this person’s plan would be empty.</li>
        )}
      </ol>
    </Card>
  );
}

export default function DailyPlans() {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [reviewing, setReviewing] = useState<PlanTemplate | null>(null);
  const list = [...state.planTemplates].sort((a, b) => a.order - b.order);
  const counts = {
    approved: list.filter((t) => t.status === 'approved').length,
    in_review: list.filter((t) => t.status === 'in_review').length,
    needs_work: list.filter((t) => t.status === 'draft' || t.status === 'changes_requested').length,
    retired: list.filter((t) => t.status === 'retired').length,
  };
  const shown = list.filter((t) => filter === 'all' || (filter === 'needs_work' ? t.status === 'draft' || t.status === 'changes_requested' : t.status === filter));
  const canEdit = can('edit_content');
  const canReview = can('medical_review');

  const setStatus = async (t: PlanTemplate, status: 'retired' | 'in_review') => {
    const ok = await dispatch({ type: 'SET_PLAN_TEMPLATE_STATUS', id: t.id, status });
    if (!ok) return;
    if (!apiMode) audit(status === 'retired' ? 'plan.template_retire' : 'plan.template_submit', t.title);
    toast.success(status === 'retired' ? 'Retired' : 'Sent for medical review', status === 'retired' ? 'It no longer appears in new plans.' : undefined);
  };

  return (
    <>
      <AdminHeader
        title="Daily wellness plans"
        subtitle="The template library behind every person’s daily plan in the app (§33). Content Managers write, Medical Content Reviewers approve; only approved templates go live."
        badge={<Badge tone="mint" icon={<ShieldCheck className="h-3 w-3" />}>Medical review required</Badge>}
        actions={
          canEdit && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing(blank((list[list.length - 1]?.order ?? 0) + 10))}>
              New plan item
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Live in the app" value={counts.approved} icon={<ListChecks className="h-5 w-5" />} hint="Approved templates" />
        <KpiCard label="In medical review" value={counts.in_review} icon={<Stethoscope className="h-5 w-5" />} tone="lavender" hint={canReview ? 'Waiting for you' : 'With reviewers'} />
        <KpiCard label="Drafts & changes" value={counts.needs_work} icon={<Pencil className="h-5 w-5" />} tone="peach" hint="Not live yet" />
        <KpiCard label="Retired" value={counts.retired} icon={<Archive className="h-5 w-5" />} tone="sky" hint="Kept for history" />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 p-4">
            <Tabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: 'all', label: 'All', count: list.length },
                { value: 'approved', label: 'Live', count: counts.approved },
                { value: 'in_review', label: 'In review', count: counts.in_review },
                { value: 'needs_work', label: 'Drafts & changes', count: counts.needs_work },
                { value: 'retired', label: 'Retired', count: counts.retired },
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Nothing here" body="No templates match this filter." />
          ) : (
            <TableShell minWidth={980}>
              <thead>
                <tr>
                  <Th>Plan item</Th>
                  <Th>Slot</Th>
                  <Th>Shown when</Th>
                  <Th>Life stages</Th>
                  <Th>Status</Th>
                  <Th>Last change</Th>
                  <Th className="w-12">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <span className="flex items-start gap-3">
                        <PlanIcon name={t.icon} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink-900">{t.title}</span>
                          <span className="block text-xs text-ink-500">{readable(t.detail)}</span>
                          <span className="mt-0.5 block font-mono text-[10.5px] text-ink-400">
                            {t.itemId} · order {t.order}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{slotLabel(t.slot)}</td>
                    <td className="px-4 py-3 text-ink-600">{whenLabel(t.when)}</td>
                    <td className="px-4 py-3 text-ink-600">{t.lifeStages.length ? t.lifeStages.join(', ') : 'All'}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={STATUS[t.status].tone}>{STATUS[t.status].label}</StatusPill>
                      {t.reviewNote && <span className="mt-1 block max-w-[220px] text-xs text-ink-500">“{t.reviewNote}”</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">
                      {t.updatedBy}
                      {t.updatedBy !== BUILT_IN && <span className="block">{formatDateTime(t.updatedAt)}</span>}
                      {t.reviewedBy && <span className="block">Reviewed by {t.reviewedBy}</span>}
                    </td>
                    <td className="px-2 py-3">
                      <RowActions
                        label={t.title}
                        actions={[
                          canEdit && { label: 'Edit', icon: Pencil, onSelect: () => setEditing({ ...t }) },
                          canEdit && (t.status === 'draft' || t.status === 'changes_requested' || t.status === 'retired') && { label: t.status === 'retired' ? 'Restore (needs review)' : 'Submit for review', icon: t.status === 'retired' ? RotateCcw : Send, onSelect: () => void setStatus(t, 'in_review') },
                          canReview && t.status === 'in_review' && { label: 'Review…', icon: Stethoscope, onSelect: () => setReviewing(t) },
                          (canEdit || can('publish_content')) && t.status !== 'retired' && { label: 'Retire', icon: Archive, danger: true, onSelect: () => void setStatus(t, 'retired') },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
        <Preview library={state.planTemplates} />
      </div>

      {editing && <Editor initial={editing} onClose={() => setEditing(null)} />}
      {reviewing && <Review t={reviewing} onClose={() => setReviewing(null)} />}
    </>
  );
}
