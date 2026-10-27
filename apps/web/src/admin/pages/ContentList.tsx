import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, BookOpen, CalendarClock, CircleHelp, Eye, FileText, Headphones, Image as ImageIcon, ListChecks, Pencil, PlayCircle, Plus, RotateCcw, Send, ShieldCheck, type LucideIcon } from 'lucide-react';
import { CONTENT_CATEGORIES, formatDate, LIFE_STAGES, LANGUAGES, type ContentType } from '@healthx/shared';
import { Badge, ButtonLink, Card, CardSkeleton, ConfirmDialog, EmptyState, ErrorState, Modal, Notice, Pagination, SearchInput, toneClass, useToast, type Tone } from '@/components/ui';
import { cn, paginate, useDemoLoading } from '@/lib/utils';
import { useAccess, useAdmin } from '../adminState';
import { CONTENT_TYPES, STATUS_META, type ContentItem, type WorkflowStatus } from '../adminData';
import { AdminHeader, AdminHero, FilterSelect, HeroStat, RowActions, SortHeader, StatusBadge, TableShell, Th, Toolbar } from '../components';
import { useSort } from '../helpers';
import { MarkdownPreview } from '../markdown';

const PAGE_SIZE = 10;
const stageLabel = (k: string) => LIFE_STAGES.find((s) => s.key === k)?.label ?? k;

const TYPE_ICON: Record<ContentType, { icon: LucideIcon; tone: Tone }> = {
  article: { icon: FileText, tone: 'green' },
  video: { icon: PlayCircle, tone: 'peach' },
  infographic: { icon: ImageIcon, tone: 'sky' },
  faq: { icon: CircleHelp, tone: 'lavender' },
  podcast: { icon: Headphones, tone: 'indigo' },
  program: { icon: ListChecks, tone: 'rose' },
};

export default function ContentList() {
  const { state, dispatch, audit } = useAdmin();
  const { can } = useAccess();
  const role = state.session!.role;
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const loading = useDemoLoading(450);
  const [failed, setFailed] = useState(params.get('simulateError') === '1');

  const [q, setQ] = useState(() => params.get('q') ?? '');
  const catLabel = (k: string) => state.taxonomy.categories.find((c) => c.key === k)?.label ?? CONTENT_CATEGORIES.find((c) => c.key === k)?.label ?? k;
  const [status, setStatus] = useState<'all' | WorkflowStatus>('all');
  const [category, setCategory] = useState('all');
  const [stage, setStage] = useState('all');
  const [type, setType] = useState('all');
  const [language, setLanguage] = useState('all');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<ContentItem | null>(null);
  const [archiving, setArchiving] = useState<ContentItem | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.content.filter(
      (c) =>
        (!t || `${c.title} ${c.description} ${c.author}`.toLowerCase().includes(t)) &&
        (status === 'all' || c.status === status) &&
        (category === 'all' || c.category === category) &&
        (stage === 'all' || c.lifeStage === stage) &&
        (type === 'all' || c.type === type) &&
        (language === 'all' || c.language === language),
    );
  }, [state.content, q, status, category, stage, type, language]);

  const { sorted, key, dir, toggle } = useSort(
    filtered,
    'updated',
    {
      title: (c) => c.title.toLowerCase(),
      type: (c) => c.type,
      category: (c) => c.category,
      status: (c) => STATUS_META[c.status].label,
      updated: (c) => c.updatedDate,
      version: (c) => c.version,
    },
    'desc',
  );
  const pg = paginate(sorted, page, PAGE_SIZE);
  const reset = () => {
    setQ('');
    setStatus('all');
    setCategory('all');
    setStage('all');
    setType('all');
    setLanguage('all');
    setPage(1);
  };
  const setF = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };
  const filtersOn = !!q.trim() || status !== 'all' || category !== 'all' || stage !== 'all' || type !== 'all' || language !== 'all';

  const count = (s: WorkflowStatus) => state.content.filter((c) => c.status === s).length;
  const statuses = Object.keys(STATUS_META) as WorkflowStatus[];
  const inReview = count('medical_review') + count('compliance_review');
  const toFix = count('draft') + count('changes_requested') + count('rejected');
  const ready = count('approved') + count('scheduled');

  const submit = (c: ContentItem) => {
    if (c.title.trim().length < 5 || c.description.trim().length < 10 || c.body.trim().length < 40) {
      toast.error('Not ready for review', 'Open the item and complete the required fields first.');
      return;
    }
    void dispatch({
      type: 'UPSERT_CONTENT',
      item: { ...c, status: 'medical_review', history: [...c.history, { at: new Date().toISOString(), actor: state.session!.name, role, action: 'Submitted for medical review', version: c.version }] },
    }).then((ok) => ok && toast.success('Submitted for medical review', c.title));
    audit('content.submit_review', c.title);
  };

  const archive = (c: ContentItem) => {
    void dispatch({
      type: 'UPSERT_CONTENT',
      item: { ...c, status: 'archived', history: [...c.history, { at: new Date().toISOString(), actor: state.session!.name, role, action: 'Archived', version: c.version }] },
    }).then((ok) => ok && toast.success('Content archived', 'It is no longer visible in the app.'));
    audit('content.archive', c.title);
  };

  return (
    <>
      <AdminHeader
        title="Content library"
        subtitle="Educational content across all formats (SRS §39). Statuses follow §39 with the §40 medical + compliance review steps."
        actions={
          can('edit_content') ? (
            <ButtonLink to="/admin/content/new" leftIcon={<Plus className="h-4 w-4" />}>
              New content
            </ButtonLink>
          ) : (
            <Badge tone="gray">Read-only for your role</Badge>
          )
        }
      />

      <AdminHero
        eyebrow="Library at a glance"
        title={
          <>
            {state.content.length} pieces of content, <span className="text-green-300">{count('published')} live</span>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            <HeroStat label="Published" value={count('published')} hint="Live in Learn" icon={<BookOpen className="h-3.5 w-3.5" />} />
            <HeroStat label="In review" value={inReview} hint="Two review steps" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
            <HeroStat label="Ready" value={ready} hint="To go live" icon={<CalendarClock className="h-3.5 w-3.5" />} />
            <HeroStat label="With authors" value={toFix} hint="Drafts & returned" icon={<Pencil className="h-3.5 w-3.5" />} />
          </div>
        }
      >
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-green-50/80">Every item moves Writer → Medical → Compliance → Published. Pick a status below to filter the library.</p>
        {state.content.length > 0 && (
          <div className="mt-5 max-w-md">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${count('published')} published, ${inReview} in review, ${ready} ready, ${toFix} with authors`}>
              {[
                [count('published'), 'bg-green-300'],
                [inReview, 'bg-lavender-200'],
                [ready, 'bg-sky-200'],
                [toFix, 'bg-peach-200'],
              ].map(([n, c]) => (
                <span key={c as string} className={cn('h-full', c as string)} style={{ width: `${((n as number) / state.content.length) * 100}%` }} />
              ))}
            </div>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-green-100/70">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-green-300" /> Live</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-lavender-200" /> Review</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-sky-200" /> Ready</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-peach-200" /> Authors</span>
            </p>
          </div>
        )}
      </AdminHero>

      <Toolbar>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput value={q} onChange={setF(setQ)} placeholder="Search title, description or author…" className="min-w-0 md:flex-1" />
          {filtersOn && (
            <button type="button" onClick={reset} className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold text-green-700 ring-1 ring-inset ring-green-200 hover:bg-green-50">
              <RotateCcw className="h-4 w-4" /> Clear filters
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filter by status">
          <button type="button" aria-pressed={status === 'all'} onClick={() => setF(setStatus)('all')} className={cn('pill-tab h-9 px-3.5', status === 'all' ? 'pill-tab-on' : 'pill-tab-off')}>
            All statuses
            <span className={cn('rounded-full px-1.5 text-xs font-bold', status === 'all' ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500')}>{state.content.length}</span>
          </button>
          {statuses.map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setF(setStatus)(status === s ? 'all' : s)} className={cn('pill-tab h-9 px-3.5', status === s ? 'pill-tab-on' : 'pill-tab-off')}>
              {STATUS_META[s].label}
              <span className={cn('rounded-full px-1.5 text-xs font-bold', status === s ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500')}>{count(s)}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 lg:grid-cols-4">
          <FilterSelect label="Category" value={category} onChange={setF(setCategory)} options={[{ value: 'all', label: 'All categories' }, ...state.taxonomy.categories.map((c) => ({ value: c.key, label: c.label }))]} />
          <FilterSelect label="Life stage" value={stage} onChange={setF(setStage)} options={LIFE_STAGES.map((s) => ({ value: s.key, label: s.key === 'all' ? 'Any stage' : s.label }))} />
          <FilterSelect label="Type" value={type} onChange={setF(setType)} options={[{ value: 'all', label: 'All types' }, ...CONTENT_TYPES]} />
          <FilterSelect label="Language" value={language} onChange={setF(setLanguage)} options={[{ value: 'all', label: 'All languages' }, ...LANGUAGES.map((l) => ({ value: l, label: l }))]} />
        </div>
      </Toolbar>

      {loading ? (
        <CardSkeleton lines={8} />
      ) : failed ? (
        <Card>
          <ErrorState body="The content service didn’t respond (simulated)." onRetry={() => setFailed(false)} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No content matches these filters"
            body="Try a different search term or clear the filters."
            action={
              <button onClick={reset} className="text-sm font-semibold text-green-700 hover:underline">
                Clear filters
              </button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
            <p className="font-display text-[16px] font-semibold text-ink-900">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
              {filtersOn && <span className="ml-1.5 text-sm font-normal text-ink-500">match your filters</span>}
            </p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">Sorted by {key} · {dir === 'asc' ? 'ascending' : 'descending'}</p>
          </div>
          <TableShell minWidth={940}>
            <thead>
              <tr>
                <SortHeader label="Title" k="title" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Type" k="type" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Category" k="category" active={key} dir={dir} onSort={toggle} />
                <Th>Audience</Th>
                <SortHeader label="Status" k="status" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Ver." k="version" active={key} dir={dir} onSort={toggle} />
                <SortHeader label="Updated" k="updated" active={key} dir={dir} onSort={toggle} />
                <Th className="w-12">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map((c) => {
                const ti = TYPE_ICON[c.type] ?? TYPE_ICON.article;
                return (
                  <tr key={c.id}>
                    <td className="max-w-[340px] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', toneClass(ti.tone))}>
                          <ti.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <Link to={`/admin/content/${c.id}`} className="block truncate font-semibold text-ink-900 hover:text-green-700">
                            {c.title}
                          </Link>
                          <span className="block truncate text-xs text-ink-500">
                            {c.author}
                            {c.medicalReviewer && (
                              <>
                                {' '}
                                · <ShieldCheck className="inline h-3 w-3 text-green-600" /> {c.medicalReviewer}
                              </>
                            )}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-ink-600">{c.type === 'faq' ? 'FAQ' : c.type}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{catLabel(c.category)}</td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className="block whitespace-nowrap">{stageLabel(c.lifeStage)}</span>
                      <span className="block whitespace-nowrap text-xs text-ink-400">{c.language}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                      {c.status === 'scheduled' && c.scheduledFor && <span className="mt-1 block font-mono text-[10.5px] text-ink-400">{c.scheduledFor.replace('T', ' ')}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="num rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600">v{c.version}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatDate(c.updatedDate)}</td>
                    <td className="px-2 py-3">
                      <RowActions
                        label={c.title}
                        actions={[
                          { label: can('edit_content') ? 'Open & edit' : 'Open & review', icon: Pencil, onSelect: () => nav(`/admin/content/${c.id}`) },
                          { label: 'Preview', icon: Eye, onSelect: () => setPreview(c) },
                          can('edit_content') && ['draft', 'changes_requested'].includes(c.status) && { label: 'Submit for medical review', icon: Send, onSelect: () => submit(c) },
                          can('publish_content') && c.status === 'approved' && { label: 'Schedule or publish…', icon: CalendarClock, onSelect: () => nav('/admin/schedule') },
                          c.status === 'published' && can('publish_content') && { label: 'Archive', icon: Archive, danger: true, onSelect: () => setArchiving(c) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <div className="border-t border-ink-100 p-4">
            <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="items" />
          </div>
        </Card>
      )}

      <Notice tone="safety" className="mt-6">
        Sample articles in this demo have <strong>not</strong> been medically reviewed. Real content must pass medical and compliance review before publishing (§40).
      </Notice>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? ''} description={preview ? `${preview.type} · v${preview.version} · ${STATUS_META[preview.status].label}` : ''} size="lg">
        {preview && (
          <>
            <p className="mb-4 text-ink-500">{preview.description}</p>
            <MarkdownPreview source={preview.body} />
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        onConfirm={() => archiving && archive(archiving)}
        title="Archive this content?"
        body={<>“{archiving?.title}” will be removed from the app. You can restore it to draft later.</>}
        confirmLabel="Archive"
        danger
      />
    </>
  );
}
