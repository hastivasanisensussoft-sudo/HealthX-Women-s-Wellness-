import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, BookOpen, Layers, MessageCircleQuestion, Stethoscope } from 'lucide-react';
import { CONTENT_CATEGORIES, COPY, type ContentCategory } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { FaqItem, LibraryFilters } from '@/user/components/Library';
import { applyLibraryFilter, EMPTY_FILTER, type LibraryFilter } from '@/user/components/libraryUtils';
import { ArchPortrait } from '@/user/components/learn-ui/ArchPortrait';
import { CATEGORY_TONE, TONE_SOFT } from '@/user/components/learn-ui/tones';
import { Button, Card, EmptyState, Notice, PageHeader, PhaseBadge, RouteTabs, SearchInput, Skeleton } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, useDemoLoading } from '@/lib/utils';
import { LEARN_TABS } from '@/user/layout/sectionTabs';

/** Most Asked Questions (mockup M27) — general education, never individual medical advice. */
export default function LearnFaq() {
  const { articles, bookmarks } = useAppState();
  const loading = useDemoLoading(450);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>(EMPTY_FILTER);
  const [cat, setCat] = useState<ContentCategory | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const all = useMemo(() => articles.filter((a) => a.type === 'faq' && a.status === 'published'), [articles]);
  const faqs = useMemo(
    () => applyLibraryFilter(all, filter, bookmarks).filter((a) => (cat === 'all' || a.category === cat) && `${a.title} ${a.description}`.toLowerCase().includes(q.toLowerCase())),
    [all, filter, bookmarks, q, cat],
  );
  const cats = CONTENT_CATEGORIES.filter((c) => all.some((a) => a.category === c.key));
  const open = openId ?? faqs[0]?.id ?? null;
  const reset = () => {
    setQ('');
    setFilter(EMPTY_FILTER);
    setCat('all');
  };

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          eyebrow="Learn · FAQ"
          title="Most asked questions"
          subtitle="Short, reviewed answers to the questions people ask most. Bring your own questions to a healthcare professional."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Learn', to: '/app/learn' }, { label: 'Most asked questions' }]}
        />
        <RouteTabs tabs={LEARN_TABS} label="Learn pages" className="!mb-0" />
      </div>

      {/* ---------- Hero (MindWell sage wash) ---------- */}
      <section className="bg-wash relative overflow-hidden rounded-[34px] p-6 ring-1 ring-inset ring-green-100 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow">
              <MessageCircleQuestion className="h-4 w-4" /> {all.length} reviewed answers
            </p>
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[38px]">
              Questions, answered <span className="font-script text-[36px] font-bold text-green-700 sm:text-[46px]">gently</span>
            </h2>
            <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-ink-600">General information to help you prepare for a conversation with your doctor — never a diagnosis or individual advice.</p>
            <div className="mt-5 max-w-xl rounded-full bg-white p-1 shadow-card">
              <SearchInput value={q} onChange={setQ} placeholder="Search yoga, pain, sleep…" className="[&_input]:border-0 [&_input]:shadow-none" />
            </div>
          </div>
          <ArchPortrait photo="portrait-curly" alt="" position="50% 25%" className="mx-auto mt-4 hidden h-64 w-52 lg:block" leafClassName="-left-12 -top-4 h-32 w-32" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <div role="group" aria-label="Question categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <CategoryChip selected={cat === 'all'} onClick={() => setCat('all')} icon={<Layers className="h-4 w-4" />} label="All questions" count={all.length} tone="bg-green-50 text-green-700 ring-green-100" />
            {cats.map((c) => (
              <CategoryChip
                key={c.key}
                selected={cat === c.key}
                onClick={() => setCat(cat === c.key ? 'all' : c.key)}
                icon={<Icon name={c.icon} className="h-4 w-4" />}
                label={c.label}
                count={all.filter((a) => a.category === c.key).length}
                tone={TONE_SOFT[CATEGORY_TONE[c.key]]}
              />
            ))}
          </div>
          <Card className="card-pad">
            <LibraryFilters value={filter} onChange={setFilter} stacked />
          </Card>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[84px] rounded-3xl" />
              ))}
            </div>
          ) : faqs.length === 0 ? (
            <Card>
              <EmptyState
                icon={<MessageCircleQuestion className="h-6 w-6" />}
                title="No questions match"
                body="Try another search or filter."
                action={
                  <Button variant="outline" size="sm" onClick={reset}>
                    Clear filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <ol className="space-y-3">
              {faqs.map((a, i) => (
                <FaqItem key={a.id} article={a} index={i} open={open === a.id} onToggle={() => setOpenId(open === a.id ? '' : a.id)} />
              ))}
            </ol>
          )}
        </div>
        <aside className="space-y-4 xl:col-span-4">
          <Notice tone="safety" title="General information only">
            {COPY.notDiagnostic} {COPY.concern}
          </Notice>
          <Card className="card-pad">
            <p className="eyebrow">Can’t find your question?</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">The HealthX content team adds new reviewed answers regularly. The AI coach (Phase 2) can also share general information.</p>
            <div className="mt-4 space-y-2">
              <Link to="/app/coach" className="group flex items-center gap-3 rounded-2xl bg-lavender-50 p-3 ring-1 ring-inset ring-lavender-100 transition hover:bg-lavender-100/70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lavender-600">
                  <Bot className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">Ask the AI coach</span>
                  <PhaseBadge phase={2} className="mt-0.5" />
                </span>
                <ArrowRight className="h-4 w-4 text-lavender-600 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/app/learn" className="group flex items-center gap-3 rounded-2xl bg-green-50 p-3 ring-1 ring-inset ring-green-100 transition hover:bg-green-100/70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-green-700">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-ink-900">Browse the library</span>
                <ArrowRight className="h-4 w-4 text-green-700 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Card>
          <Notice tone="info" title="Preparing for an appointment" icon={<Stethoscope className="h-4 w-4 text-sky-500" />}>
            Bring notes from your HealthX logs — cycle dates, symptoms and questions — so nothing is forgotten.
          </Notice>
        </aside>
      </div>
    </div>
  );
}

/** Myflo-style tinted category chip with a count. */
function CategoryChip({ selected, onClick, icon, label, count, tone }: { selected: boolean; onClick: () => void; icon: ReactNode; label: string; count: number; tone: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn('inline-flex min-h-[44px] items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold ring-1 ring-inset transition', selected ? 'bg-green-800 text-white ring-green-800 shadow-sm' : 'bg-white text-ink-700 ring-ink-100 hover:ring-green-300')}
    >
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset', selected ? 'bg-white/15 text-white ring-white/20' : tone)}>{icon}</span>
      {label}
      <span className={cn('rounded-full px-1.5 font-mono text-[11px]', selected ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500')}>{count}</span>
    </button>
  );
}
