import { useState, type FormEvent } from 'react';
import { Brain, CalendarHeart, Check, Dumbbell, FolderTree, Languages, Layers, Pencil, Plus, Salad, Shapes, Sparkles, Sprout, Tag, Trash2, Users, X, type LucideIcon } from 'lucide-react';
import { LIFE_STAGES, LANGUAGES, type PhotoKey } from '@healthx/shared';
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Input, Modal, Notice, useToast } from '@/components/ui';
import { Photo } from '@/components/media/Photo';
import { cn } from '@/lib/utils';
import { CONTENT_TYPES, type Taxonomy, type TaxonomyCategory } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, ReadOnlyBanner } from '../components';

const LABEL_RE = /^[\p{L}\p{N} &'’,()-]{2,40}$/u;

/** Card look per built-in category (presentation only); custom categories share the last entry. */
const CAT_LOOK: Record<string, { icon: LucideIcon; disc: string; photo: PhotoKey }> = {
  cycle: { icon: CalendarHeart, disc: 'bg-rose-100 text-rose-700', photo: 'period-comfort' },
  fitness: { icon: Dumbbell, disc: 'bg-green-100 text-green-700', photo: 'strength-training' },
  nutrition: { icon: Salad, disc: 'bg-peach-100 text-peach-700', photo: 'nutrition-bowl' },
  mental_wellness: { icon: Brain, disc: 'bg-lavender-100 text-lavender-700', photo: 'meditation' },
  life_stages: { icon: Sprout, disc: 'bg-sky-100 text-sky-700', photo: 'mature-woman' },
  skin: { icon: Sparkles, disc: 'bg-butter-100 text-green-900', photo: 'woman-tea' },
  custom: { icon: Shapes, disc: 'bg-indigo-100 text-indigo-700', photo: 'nature-leaves' },
};

/** Categories, subcategories, life stages, tags and content types used to organise the Learn library (§38). */
export default function Categories() {
  const { state, dispatch, audit, apiMode } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const canEdit = can('edit_content');
  const tax = state.taxonomy;
  const [editing, setEditing] = useState<{ cat: string; sub: string | null; value: string } | null>(null);
  const [adding, setAdding] = useState<{ cat: string; value: string } | null>(null);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [errState, setErrState] = useState<{ scope: 'tree' | 'tag' | 'modal'; text: string } | null>(null);
  const setErr = (text: string | null, scope: 'tree' | 'tag' | 'modal' = 'tree') => setErrState(text ? { scope, text } : null);
  const err = errState?.text ?? null;
  const [remove, setRemove] = useState<{ kind: 'sub' | 'cat' | 'tag'; cat?: string; value: string } | null>(null);

  const catCount = (key: string) => state.content.filter((c) => c.category === key).length;
  const subCount = (key: string, sub: string) => state.content.filter((c) => c.category === key && c.topic === sub).length;
  const tagCount = (t: string) => state.content.filter((c) => c.tags?.includes(t)).length;
  const save = (next: Taxonomy, action: string, target: string, detail?: string) => {
    const result = dispatch({ type: 'SET_TAXONOMY', taxonomy: next });
    audit(action, target, detail);
    return result;
  };
  /**
   * Content to re-point after a rename/removal. The API only lets editors change items that are being
   * drafted — live or in-review items keep the old name until their next version.
   */
  const cascade = (items: typeof state.content) => (apiMode ? items.filter((c) => ['draft', 'changes_requested', 'rejected'].includes(c.status)) : items);
  const keptNote = (all: number, moved: number) => (all > moved ? `${all - moved} live or in-review item${all - moved === 1 ? '' : 's'} keep the old name until their next version.` : undefined);
  const mapCat = (key: string, fn: (c: TaxonomyCategory) => TaxonomyCategory): Taxonomy => ({ ...tax, categories: tax.categories.map((c) => (c.key === key ? fn(c) : c)) });

  const validLabel = (v: string, existing: string[]) => {
    const t = v.trim();
    if (!LABEL_RE.test(t)) return 'Use 2–40 letters, numbers or spaces.';
    if (existing.some((x) => x.toLowerCase() === t.toLowerCase())) return 'That name is already used here.';
    return null;
  };

  const commitEdit = () => {
    if (!editing) return;
    const cat = tax.categories.find((c) => c.key === editing.cat)!;
    const done = (detail?: string) => {
      setEditing(null);
      setErr(null);
      toast.success('Renamed', detail);
    };
    if (editing.sub === null) {
      const e = validLabel(editing.value, tax.categories.filter((c) => c.key !== cat.key).map((c) => c.label));
      if (e) return setErr(e);
      void save(mapCat(cat.key, (c) => ({ ...c, label: editing.value.trim() })), 'taxonomy.rename_category', cat.label, `→ ${editing.value.trim()}`).then((ok) => ok && done());
    } else {
      const e = validLabel(editing.value, cat.subs.filter((s) => s !== editing.sub));
      if (e) return setErr(e);
      const from = editing.sub;
      const to = editing.value.trim();
      const affected = state.content.filter((c) => c.category === cat.key && c.topic === from);
      const moving = cascade(affected);
      void save(mapCat(cat.key, (c) => ({ ...c, subs: c.subs.map((s) => (s === from ? to : s)) })), 'taxonomy.rename_subcategory', `${cat.label} / ${from}`, `→ ${to}`).then((ok) => {
        if (!ok) return;
        // Keep content pointing at the renamed subcategory.
        moving.forEach((c) => void dispatch({ type: 'UPSERT_CONTENT', item: { ...c, topic: to } }));
        done(keptNote(affected.length, moving.length));
      });
    }
  };

  const commitAddSub = (e: FormEvent) => {
    e.preventDefault();
    if (!adding) return;
    const cat = tax.categories.find((c) => c.key === adding.cat)!;
    const er = validLabel(adding.value, cat.subs);
    if (er) return setErr(er);
    const value = adding.value.trim();
    void save(mapCat(cat.key, (c) => ({ ...c, subs: [...c.subs, value] })), 'taxonomy.add_subcategory', `${cat.label} / ${value}`).then((ok) => {
      if (!ok) return;
      setAdding(null);
      setErr(null);
      toast.success('Subcategory added', value);
    });
  };

  const commitAddCat = () => {
    if (newCat === null) return;
    const er = validLabel(newCat, tax.categories.map((c) => c.label));
    if (er) return setErr(er, 'modal');
    const label = newCat.trim();
    const key = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
    void save({ ...tax, categories: [...tax.categories, { key, label, subs: [], builtIn: false }] }, 'taxonomy.add_category', label).then((ok) => {
      if (!ok) return;
      setNewCat(null);
      setErr(null);
      toast.success('Category added', `${label} is now available in the content editor.`);
    });
  };

  const addTag = (e: FormEvent) => {
    e.preventDefault();
    const er = validLabel(newTag, tax.tags);
    if (er) return setErr(er, 'tag');
    void save({ ...tax, tags: [...tax.tags, newTag.trim()] }, 'taxonomy.add_tag', newTag.trim()).then((ok) => {
      if (!ok) return;
      setNewTag('');
      setErr(null);
    });
  };

  const confirmRemove = () => {
    if (!remove) return;
    const { value } = remove;
    let result: ReturnType<typeof save>;
    let kept: string | undefined;
    if (remove.kind === 'tag') {
      const affected = state.content.filter((c) => c.tags?.includes(value));
      const moving = cascade(affected);
      kept = keptNote(affected.length, moving.length);
      result = save({ ...tax, tags: tax.tags.filter((t) => t !== value) }, 'taxonomy.remove_tag', value).then((ok) => {
        if (ok) moving.forEach((c) => void dispatch({ type: 'UPSERT_CONTENT', item: { ...c, tags: c.tags!.filter((t) => t !== value) } }));
        return ok;
      });
    } else if (remove.kind === 'sub') {
      result = save(mapCat(remove.cat!, (c) => ({ ...c, subs: c.subs.filter((s) => s !== value) })), 'taxonomy.remove_subcategory', value);
    } else {
      result = save({ ...tax, categories: tax.categories.filter((c) => c.key !== remove.cat) }, 'taxonomy.remove_category', value);
    }
    void result.then((ok) => ok && toast.success('Removed', kept ? `${value} · ${kept}` : value));
  };

  const subTotal = tax.categories.reduce((a, c) => a + c.subs.length, 0);
  const errCat = adding?.cat ?? editing?.cat ?? null;
  const treeErr = (key: string) =>
    errState?.scope === 'tree' && errCat === key ? (
      <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
        {err}
      </p>
    ) : null;

  return (
    <>
      <AdminHeader
        title="Categories & tags"
        subtitle="How the Learn library is organised — categories, subcategories, life stages, tags and content types (§38)."
        actions={
          canEdit && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => (setNewCat(''), setErr(null))}>
              Add category
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyBanner>Read-only: changing categories and tags needs the Content Manager or Admin role.</ReadOnlyBanner>}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { k: 'Categories', v: tax.categories.length, icon: FolderTree, tone: 'from-green-50 to-green-100/80 text-green-700' },
          { k: 'Subcategories', v: subTotal, icon: Layers, tone: 'from-lavender-50 to-lavender-100/80 text-lavender-700' },
          { k: 'Tags', v: tax.tags.length, icon: Tag, tone: 'from-peach-50 to-peach-100/80 text-peach-700' },
          { k: 'Life stages', v: LIFE_STAGES.length, icon: Users, tone: 'from-sky-50 to-sky-100/80 text-sky-700' },
        ].map((s) => (
          <div key={s.k} className={cn('flex min-w-0 items-center gap-2.5 rounded-3xl bg-gradient-to-br p-3.5 sm:gap-3 sm:p-4', s.tone)}>
            <span className="flex h-10 w-10 shrink-0 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white shadow-soft">
              <s.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="num text-[24px] leading-none text-ink-900">{s.v}</p>
              <p className="mt-1 truncate font-mono text-[10px] font-medium uppercase tracking-[0.1em] sm:text-[10.5px] sm:tracking-[0.12em] text-ink-500">{s.k}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow mb-1">Library structure</p>
              <h2 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink-900">Categories</h2>
              <p className="mt-0.5 text-sm text-ink-500">{tax.categories.length} categories · counts include drafts</p>
            </div>
          </div>
          <ul className="grid gap-4 md:grid-cols-2" aria-label="Category tree">
            {tax.categories.map((c) => {
              const n = catCount(c.key);
              const look = CAT_LOOK[c.builtIn ? c.key : 'custom'] ?? CAT_LOOK.custom;
              const isEditingCat = editing?.cat === c.key && editing.sub === null;
              return (
                <li key={c.key} className="card relative flex flex-col overflow-hidden">
                  <Photo photo={look.photo} alt="" shape="none" className="h-20 w-full" imgClassName="opacity-90">
                    <span className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                  </Photo>
                  {canEdit && !isEditingCat && (
                    <span className="absolute right-3 top-3 flex items-center gap-0.5 rounded-full bg-white/90 p-0.5 shadow-soft backdrop-blur">
                      <IconBtn label={`Rename ${c.label}`} onClick={() => (setEditing({ cat: c.key, sub: null, value: c.label }), setErr(null))} icon={Pencil} />
                      <IconBtn label={`Add subcategory to ${c.label}`} onClick={() => (setAdding({ cat: c.key, value: '' }), setErr(null))} icon={Plus} />
                      {!c.builtIn && <IconBtn label={`Delete ${c.label}`} danger disabled={n > 0} onClick={() => setRemove({ kind: 'cat', cat: c.key, value: c.label })} icon={Trash2} />}
                    </span>
                  )}
                  <div className="-mt-7 flex flex-1 flex-col px-4 pb-4">
                    <span className={cn('relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-soft ring-4 ring-white', look.disc)}>
                      <look.icon className="h-5 w-5" />
                    </span>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {isEditingCat ? (
                        <InlineEdit value={editing.value} onChange={(v) => setEditing({ ...editing, value: v })} onSave={commitEdit} onCancel={() => (setEditing(null), setErr(null))} label={`Rename ${c.label}`} />
                      ) : (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-display text-[17px] font-semibold text-ink-900">{c.label}</span>
                          {!c.builtIn && <Badge tone="lavender">Custom</Badge>}
                        </span>
                      )}
                      <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-600">
                        {n} item{n === 1 ? '' : 's'}
                      </span>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {c.subs.map((s) => {
                        const sn = subCount(c.key, s);
                        const isEditingSub = editing?.cat === c.key && editing.sub === s;
                        return isEditingSub ? (
                          <li key={s} className="w-full">
                            <InlineEdit value={editing.value} onChange={(v) => setEditing({ ...editing, value: v })} onSave={commitEdit} onCancel={() => (setEditing(null), setErr(null))} label={`Rename ${s}`} />
                          </li>
                        ) : (
                          <li key={s} className="group/chip inline-flex max-w-full items-center gap-1 rounded-full bg-ink-50 py-1 pl-3 pr-1 text-[13px] text-ink-700 ring-1 ring-inset ring-ink-100">
                            <span className="truncate font-medium">{s}</span>
                            <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-ink-500">{sn}</span>
                            {canEdit && (
                              <>
                                <IconBtn label={`Rename ${s}`} onClick={() => (setEditing({ cat: c.key, sub: s, value: s }), setErr(null))} icon={Pencil} small />
                                <IconBtn label={`Delete ${s}`} danger disabled={sn > 0} onClick={() => setRemove({ kind: 'sub', cat: c.key, value: s })} icon={Trash2} small />
                              </>
                            )}
                            {!canEdit && <span className="w-1" />}
                          </li>
                        );
                      })}
                      {c.subs.length === 0 && <li className="rounded-full border border-dashed border-ink-200 px-3 py-1 text-xs text-ink-400">No subcategories yet.</li>}
                    </ul>
                    {adding?.cat === c.key && (
                      <form onSubmit={commitAddSub} className="mt-3 flex items-center gap-2">
                        <Input value={adding.value} onChange={(e) => setAdding({ ...adding, value: e.target.value })} placeholder="New subcategory" aria-label={`New subcategory in ${c.label}`} autoFocus className="h-10" />
                        <Button type="submit" size="sm">
                          Add
                        </Button>
                        <IconBtn label="Cancel" onClick={() => (setAdding(null), setErr(null))} icon={X} />
                      </form>
                    )}
                    {treeErr(c.key)}
                  </div>
                </li>
              );
            })}
          </ul>
          {errState?.scope === 'tree' && !tax.categories.some((c) => c.key === errCat) && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {err}
            </p>
          )}
          <p className="mt-4 text-xs text-ink-500">Subcategories and custom categories can only be deleted when no content uses them.</p>
        </section>

        <div className="min-w-0 space-y-6">
          <Card className="card-pad">
            <CardHeader title="Tags" subtitle="Library labels such as “Quick Help” shown on app cards" icon={<Tag className="h-5 w-5" />} />
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {tax.tags.map((t) => (
                <li
                  key={t}
                  className={cn('inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 text-sm font-semibold', canEdit ? 'pr-1.5' : 'pr-3', t === 'Quick Help' ? 'bg-green-700 text-white' : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200')}
                >
                  <span className={cn('text-xs', t === 'Quick Help' ? 'text-green-200' : 'text-green-600')}>#</span>
                  {t}
                  <span className={cn('rounded-full px-1.5 text-[11px] font-semibold', t === 'Quick Help' ? 'bg-white/15 text-green-50' : 'bg-ink-100 text-ink-500')}>{tagCount(t)}</span>
                  {canEdit && (
                    <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setRemove({ kind: 'tag', value: t })} className={cn('flex h-6 w-6 items-center justify-center rounded-full transition', t === 'Quick Help' ? 'text-green-100 hover:bg-white/15' : 'text-ink-400 hover:bg-danger-soft hover:text-danger')}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <form onSubmit={addTag} className="mt-5 flex gap-2">
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag" aria-label="New tag" className="h-11" />
                <Button type="submit" variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
                  Add tag
                </Button>
              </form>
            )}
            {errState?.scope === 'tag' && (
              <p role="alert" className="mt-2 text-sm font-medium text-danger">
                {err}
              </p>
            )}
          </Card>

          <Card className="card-pad">
            <CardHeader title="Life stages" subtitle="Defined by the SRS (§22–§25) — used to target content" icon={<Sprout className="h-5 w-5" />} />
            <ul className="space-y-2">
              {LIFE_STAGES.map((s) => {
                const n = state.content.filter((c) => c.lifeStage === s.key).length;
                const max = Math.max(1, ...LIFE_STAGES.map((x) => state.content.filter((c) => c.lifeStage === x.key).length));
                return (
                  <li key={s.key} className="grid grid-cols-[minmax(0,1fr)_90px_28px] items-center gap-3 text-sm">
                    <span className="truncate font-medium text-ink-700">{s.label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-green-50">
                      <span className="block h-full rounded-full bg-green-400" style={{ width: `${(n / max) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums text-ink-900">{n}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="card-pad">
            <CardHeader title="Content types" icon={<Layers className="h-5 w-5" />} />
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((t) => (
                <span key={t.value} className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-900 ring-1 ring-inset ring-green-100">
                  {t.label} <span className="font-medium text-green-600">· {state.content.filter((c) => c.type === t.value).length}</span>
                </span>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-ink-50/80 px-3 py-2.5 text-xs text-ink-500">
              <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700" />
              <span>Languages: {LANGUAGES.join(' · ')} — localisation-ready (§59).</span>
            </p>
          </Card>
        </div>
      </div>

      <Notice tone="info" className="mt-6">
        New categories become available in the content editor straight away. The mobile app reads the same taxonomy from the content API in production.
      </Notice>

      <Modal
        open={newCat !== null}
        onClose={() => (setNewCat(null), setErr(null))}
        title="Add category"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewCat(null)}>
              Cancel
            </Button>
            <Button onClick={commitAddCat}>Add category</Button>
          </>
        }
      >
        <Field label="Category name" required htmlFor="cat-new" error={errState?.scope === 'modal' ? err : null}>
          <Input id="cat-new" value={newCat ?? ''} onChange={(e) => setNewCat(e.target.value)} invalid={errState?.scope === 'modal'} placeholder="e.g. Sexual wellness" autoFocus />
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!remove}
        onClose={() => setRemove(null)}
        onConfirm={confirmRemove}
        title={remove?.kind === 'tag' ? `Remove tag “${remove.value}”?` : `Delete “${remove?.value}”?`}
        body={remove?.kind === 'tag' && tagCount(remove.value) > 0 ? `It will be removed from ${tagCount(remove.value)} content items.` : 'This can’t be undone.'}
        confirmLabel="Remove"
        danger
      />
    </>
  );
}

function IconBtn({ label, onClick, icon: I, danger, disabled, small }: { label: string; onClick: () => void; icon: typeof Pencil; danger?: boolean; disabled?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={disabled ? 'In use — move content first' : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-ink-400 transition disabled:cursor-not-allowed disabled:opacity-30',
        small ? 'h-7 w-7' : 'h-9 w-9',
        danger ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-green-50 hover:text-green-700',
      )}
    >
      <I className={small ? 'h-3 w-3' : 'h-4 w-4'} />
    </button>
  );
}

function InlineEdit({ value, onChange, onSave, onCancel, label }: { value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void; label: string }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="flex min-w-0 flex-1 items-center gap-1"
    >
      <Input value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} autoFocus className="h-9 text-sm" onKeyDown={(e) => e.key === 'Escape' && onCancel()} />
      <button type="submit" aria-label="Save" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-green-700 hover:bg-green-50">
        <Check className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Cancel" onClick={onCancel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100">
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}
