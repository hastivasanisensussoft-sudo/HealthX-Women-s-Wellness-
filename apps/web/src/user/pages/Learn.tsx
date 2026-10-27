import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, BookOpen, Clock, Heart, Image, Layers, MessageCircleQuestion, ShieldCheck, Sparkles } from 'lucide-react';
import { CONTENT_CATEGORIES, LIFE_STAGES, VIDEO_LIST, type Article, type ContentCategory, type LifeStage } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { ArticleCard } from '@/user/components/Cards';
import { FavButton, LibraryFilters, MediumIcon, QuickHelpCard } from '@/user/components/Library';
import { applyLibraryFilter, durationLabel, EMPTY_FILTER, isQuickHelp, mediumOf, type LibraryFilter } from '@/user/components/libraryUtils';
import { ArchPortrait } from '@/user/components/learn-ui/ArchPortrait';
import { useMedia } from '@/user/components/learn-ui/useMedia';
import { ArticleRow } from '@/user/components/learn-ui/ArticleRow';
import { CATEGORY_TONE, CHIP_TONE } from '@/user/components/learn-ui/tones';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import { Badge, Button, ButtonLink, Card, ChipToggle, EmptyState, HScroll, PageHeader, Pagination, PhaseBadge, RouteTabs, SearchInput, SectionTitle, Select, Skeleton } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, paginate, useDemoLoading } from '@/lib/utils';
import { LEARN_TABS } from '@/user/layout/sectionTabs';

type Sort = 'newest' | 'oldest' | 'short' | 'az';

/** Magazine hero: the featured item over its photo with a deep-green gradient. */
function FeaturedHero({ article }: { article: Article }) {
  return (
    <article className="group relative isolate flex min-h-[380px] overflow-hidden rounded-[34px] bg-green-950 text-white shadow-lift sm:min-h-[420px]">
      <Photo photo={article.photo} alt="" shape="none" priority kenBurns position="60% 35%" className="!absolute inset-0 -z-10" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-green-950 via-green-950/70 to-green-950/10 sm:bg-gradient-to-r sm:from-green-950/95 sm:via-green-950/65 sm:to-green-950/0" />
      <div className="flex max-w-xl flex-col justify-end p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="butter" icon={<Sparkles className="h-3 w-3" />}>
            Featured
          </Badge>
          <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-semibold">
            <MediumIcon medium={mediumOf(article)} className="h-3.5 w-3.5" /> {article.topic}
          </span>
        </div>
        <h2 className="mt-4 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
          <Link to={`/app/learn/${article.id}`} className="hover:text-green-100">
            {article.title}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-2 max-w-md text-[15.5px] leading-relaxed text-white/75">{article.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/75">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-butter-300" /> {durationLabel(article)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="h-4 w-4 text-green-300" /> Reviewed by {article.reviewer}
          </span>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <ButtonLink to={`/app/learn/${article.id}`} variant="butter" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Start reading
          </ButtonLink>
          <FavButton article={article} className="h-11 w-11" />
        </div>
      </div>
    </article>
  );
}

/** Editor's picks: one of each format where available. */
function PickRow({ article }: { article: Article }) {
  const m = mediumOf(article);
  return (
    <li>
      <Link to={`/app/learn/${article.id}`} className="group flex items-center gap-3.5 rounded-2xl p-2 transition hover:bg-green-50/70">
        <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl">
          <Photo photo={article.photo} alt="" shape="none" className="h-full w-full" imgClassName="transition duration-700 group-hover:scale-105" />
          {m !== 'article' && (
            <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-green-950/25 text-white">
              <MediumIcon medium={m} className="h-5 w-5" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-green-700">
            {m === 'article' ? 'Read' : m === 'audio' ? 'Listen' : 'Watch'} · {article.readMin} min
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[15px] font-semibold leading-snug text-ink-900 group-hover:text-green-800">{article.title}</span>
        </span>
      </Link>
    </li>
  );
}

/** Library (mockup M26): magazine hub — featured hero, search & filters, Quick Help, video previews, the reviewed library and FAQs. */
export default function Learn() {
  const { articles, bookmarks, readArticles, profile } = useAppState();
  const loading = useDemoLoading(500);
  const phone = useMedia('(max-width: 639px)');
  const resultsRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>(EMPTY_FILTER);
  const [cat, setCat] = useState<ContentCategory | 'all'>('all');
  const [stage, setStage] = useState<LifeStage | 'any'>('any');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);

  const published = useMemo(() => articles.filter((a) => a.status === 'published' && a.type !== 'faq'), [articles]);
  const filtered = useMemo(() => {
    let xs = applyLibraryFilter(published, filter, bookmarks).filter(
      (a) =>
        (cat === 'all' || a.category === cat) &&
        (stage === 'any' || a.lifeStage === stage || a.lifeStage === 'all') &&
        `${a.title} ${a.description} ${a.topic} ${(a.tags ?? []).join(' ')}`.toLowerCase().includes(q.toLowerCase()),
    );
    xs = [...xs].sort((a, b) =>
      sort === 'newest' ? (a.publishedAt < b.publishedAt ? 1 : -1) : sort === 'oldest' ? (a.publishedAt > b.publishedAt ? 1 : -1) : sort === 'short' ? a.readMin - b.readMin : a.title.localeCompare(b.title),
    );
    return xs;
  }, [published, filter, bookmarks, cat, stage, q, sort]);
  const quickHelp = filtered.filter(isQuickHelp);
  const rest = filtered.filter((a) => !isQuickHelp(a));
  const pg = paginate(rest, page, 9);
  // The published library comes from the server; the featured item may have been archived.
  const featured = published.find((a) => a.id === 'a_cycle_phases') ?? published.find((a) => !isQuickHelp(a)) ?? published[0];
  const picks = useMemo(() => {
    const pool = [...published].filter((a) => a.id !== featured?.id).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
    const out: Article[] = [];
    for (const m of ['video', 'audio', 'article'] as const) {
      const hit = pool.find((a) => mediumOf(a) === m && !out.includes(a));
      if (hit) out.push(hit);
    }
    for (const a of pool) if (out.length < 3 && !out.includes(a)) out.push(a);
    return out;
  }, [published, featured]);
  const faqs = articles.filter((a) => a.type === 'faq' && a.status === 'published');
  const faqCount = faqs.length;
  const savedCount = published.filter((a) => bookmarks.includes(a.id)).length;
  const filtersActive = !!(q || filter.favorites || filter.medium || filter.duration || cat !== 'all' || stage !== 'any');
  const reset = () => {
    setQ('');
    setFilter(EMPTY_FILTER);
    setCat('all');
    setStage('any');
    setPage(1);
  };
  const upd = (f: LibraryFilter) => {
    setFilter(f);
    setPage(1);
  };
  const showSaved = () => {
    upd({ ...filter, favorites: true });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          eyebrow="Learn · reviewed library"
          title="Library"
          subtitle="Articles, videos & audio on cycles, movement, food, mind and every life stage."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Learn', to: '/app/learn' }, { label: 'Educational articles' }]}
        />
        <RouteTabs tabs={LEARN_TABS} label="Learn pages" className="!mb-0" />
      </div>

      {!filtersActive && featured && (
        <section aria-label="Featured" className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">{loading ? <Skeleton className="h-[420px] w-full rounded-[34px]" /> : <FeaturedHero article={featured} />}</div>
          <Card className="card-pad flex flex-col xl:col-span-4">
            <p className="eyebrow">Editor’s picks</p>
            <h2 className="mt-1 font-display text-[20px] font-semibold text-ink-900">Read, watch or listen</h2>
            {loading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
                ))}
              </div>
            ) : (
              <ul className="-mx-2 mt-3 space-y-1">
                {picks.map((a) => (
                  <PickRow key={a.id} article={a} />
                ))}
              </ul>
            )}
            <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
              <div className="rounded-2xl bg-green-50 p-3 ring-1 ring-inset ring-green-100">
                <p className="num text-2xl leading-none text-ink-900">{readArticles.length}</p>
                <p className="mt-1 text-xs font-semibold text-green-800">read so far</p>
              </div>
              <button type="button" onClick={showSaved} className="rounded-2xl bg-rose-50 p-3 text-left ring-1 ring-inset ring-rose-100 transition hover:bg-rose-100/70">
                <span className="flex items-center gap-1.5">
                  <span className="num text-2xl leading-none text-ink-900">{savedCount}</span>
                  <Heart className="h-4 w-4 fill-rose-400 text-rose-400" aria-hidden />
                </span>
                <span className="mt-1 block text-xs font-semibold text-rose-700">Show saved items</span>
              </button>
            </div>
          </Card>
        </section>
      )}

      <section aria-label="Search and filters" className="card card-pad space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search yoga, pain, sleep…"
            className="lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <Select aria-label="Life stage" value={stage} onChange={(e) => (setStage(e.target.value as LifeStage | 'any'), setPage(1))} className="lg:w-56">
              <option value="any">Any life stage</option>
              {LIFE_STAGES.filter((l) => l.key !== 'all').map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="lg:w-48">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="short">Shortest first</option>
              <option value="az">A–Z</option>
            </Select>
          </div>
        </div>
        <div role="group" aria-label="Filter by topic">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">Topics</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <ChipToggle selected={cat === 'all'} onClick={() => (setCat('all'), setPage(1))} icon={<Layers className="h-3.5 w-3.5" />}>
              All topics
            </ChipToggle>
            {CONTENT_CATEGORIES.map((c) => (
              <ChipToggle key={c.key} tone={CHIP_TONE[CATEGORY_TONE[c.key]]} selected={cat === c.key} onClick={() => (setCat(c.key), setPage(1))} icon={<Icon name={c.icon} className="h-3.5 w-3.5" />}>
                {c.label}
              </ChipToggle>
            ))}
          </div>
        </div>
        <div className="border-t border-ink-100 pt-5">
          <LibraryFilters value={filter} onChange={upd} />
        </div>
        {filtersActive && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-green-50 px-4 py-2.5 text-sm" aria-live="polite">
            <span className="font-semibold text-green-900">
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </span>
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear filters
            </Button>
          </div>
        )}
      </section>

      <div ref={resultsRef} className="scroll-mt-24 space-y-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl ring-1 ring-inset ring-ink-100">
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={filter.favorites ? <Heart className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
              title={filter.favorites ? 'No favorites match' : 'Nothing matches these filters'}
              body={filter.favorites ? 'Tap the heart on any item to save it to your favorites.' : 'Try another medium, time, topic or search term.'}
              action={
                <Button variant="outline" size="sm" onClick={reset}>
                  Clear filters
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {quickHelp.length > 0 && (
              <section aria-labelledby="qh-heading">
                <SectionTitle
                  eyebrow="Short, practical sessions"
                  title={
                    <span id="qh-heading" className="inline-flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-green-600" /> Quick Help
                    </span>
                  }
                  subtitle="Five to fifteen minutes when you need it most"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {quickHelp.map((a) => (
                    <QuickHelpCard key={a.id} article={a} />
                  ))}
                </div>
              </section>
            )}

            {!filtersActive && (
              <section>
                <SectionTitle eyebrow="Watch & follow along" title="Guided routines" subtitle="Short video previews with step-by-step routines — move, breathe, cook and wind down" />
                <HScroll label="Guided routines">
                  {VIDEO_LIST.map((v) => (
                    <div key={v.key} className="w-[264px] shrink-0 sm:w-[300px]">
                      <VideoCard video={v.key} />
                    </div>
                  ))}
                </HScroll>
              </section>
            )}

            {rest.length > 0 && (
              <section aria-labelledby="lib-heading">
                <SectionTitle
                  eyebrow={filtersActive ? 'Results' : 'All formats'}
                  title={
                    <span id="lib-heading" className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-green-600" /> Reviewed library
                    </span>
                  }
                  subtitle={`${rest.length} item${rest.length === 1 ? '' : 's'} · ${sort === 'newest' ? 'newest first' : sort === 'oldest' ? 'oldest first' : sort === 'short' ? 'shortest first' : 'A–Z'}`}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {pg.items.map((a) => (
                    phone ? <ArticleRow key={a.id} article={a} /> : <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
                <div className="mt-6">
                  <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="items" />
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {!filtersActive && faqCount > 0 && (
        <section className="bg-wash relative overflow-hidden rounded-[34px] p-6 ring-1 ring-inset ring-green-100 sm:p-8">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto] md:gap-10">
            <div className="grid min-w-0 grid-cols-1 items-center gap-6 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="eyebrow">Most asked questions</p>
                <h2 className="mt-1.5 font-display text-[26px] font-semibold leading-tight tracking-[-0.015em] text-ink-900 sm:text-[30px]">
                  Questions, answered <span className="font-script text-[34px] font-bold text-green-700 sm:text-[40px]">gently</span>
                </h2>
                <p className="mt-2 max-w-lg text-[15px] text-ink-600">{faqCount} short, reviewed answers — doctors, hormones, mood and more. Bring your own questions to a healthcare professional.</p>
                <ButtonLink to="/app/learn/faq" className="mt-5" leftIcon={<MessageCircleQuestion className="h-4 w-4" />}>
                  Browse questions
                </ButtonLink>
              </div>
              <ol className="space-y-2">
                {faqs.slice(0, 3).map((f, i) => (
                  <li key={f.id}>
                    <Link to={`/app/learn/${f.id}`} className="group flex min-h-[56px] items-center gap-3 rounded-2xl bg-white/80 p-2.5 pr-4 ring-1 ring-inset ring-white transition hover:bg-white hover:shadow-card">
                      <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-sm text-green-800">{String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-ink-900 group-hover:text-green-800">{f.title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-green-700" />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <ArchPortrait photo="woman-reading" alt="" className="mx-auto mt-3 hidden h-52 w-40 md:block" leafClassName="-left-10 -top-3 h-28 w-28" />
          </div>
        </section>
      )}

      <div className="flex items-start gap-3 rounded-2xl bg-green-50 px-4 py-3.5 text-sm text-green-900 ring-1 ring-inset ring-green-100">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        Every HealthX item goes through medical review before publishing. Library items in this demo are sample content.
      </div>

      <section>
        <SectionTitle eyebrow="Roadmap" title="More formats coming" subtitle="Articles, videos, audio and FAQs are live in the demo. These formats follow later (SRS §39)." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { icon: Image, t: 'Infographics', d: 'Visual cycle and nutrition guides', tone: 'bg-peach-50 text-peach-600' },
            { icon: BookOpen, t: 'Programs', d: 'Multi-week guided programs', tone: 'bg-lavender-50 text-lavender-600' },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-4 rounded-3xl border border-dashed border-ink-200 bg-white/70 p-5">
              <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', x.tone)}>
                <x.icon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-[17px] font-semibold text-ink-900">{x.t}</p>
                <p className="text-sm text-ink-500">{x.d}</p>
                <PhaseBadge phase={2} className="mt-2.5" />
              </div>
            </div>
          ))}
        </div>
      </section>
      {profile.goals.length > 0 && <p className="text-xs text-ink-400">Recommendations use your goals: {profile.goals.join(', ').replace(/_/g, ' ')}.</p>}
    </div>
  );
}
