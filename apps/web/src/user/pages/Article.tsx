import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Calendar, Clock, FileText, Headphones, Heart, MessageCircleQuestion, PenLine, Play, Share2, Video } from 'lucide-react';
import { COPY, formatDate, type Article as ArticleT } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { ArticleCard } from '@/user/components/Cards';
import { MediaPlayer, MediumIcon } from '@/user/components/Library';
import { categoryLabel, durationLabel, isPlayable, isQuickHelp, mediumOf } from '@/user/components/libraryUtils';
import { ArchPortrait } from '@/user/components/learn-ui/ArchPortrait';
import { CATEGORY_TONE, TONE_SOFT, videoFor } from '@/user/components/learn-ui/tones';
import { useMedia } from '@/user/components/learn-ui/useMedia';
import { ArticleRow } from '@/user/components/learn-ui/ArticleRow';
import { Photo } from '@/components/media/Photo';
import { AmbientVideo, VideoCard } from '@/components/media/Video';
import { Button, Card, EmptyState, Notice, SectionTitle, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Player panel for audio and video items: looping preview (video) or a calm forest panel (audio) with the play control. */
function PlayerPanel({ article, onPlay }: { article: ArticleT; onPlay: () => void }) {
  const m = mediumOf(article);
  const clip = videoFor(article);
  const control = (
    <div className="absolute inset-0 flex flex-col justify-between p-5 text-white sm:p-7">
      <div className="flex items-center justify-between gap-2">
        <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-green-900">
          {m === 'audio' ? <Headphones className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />} {m === 'audio' ? 'Audio session' : 'Video session'}
        </span>
        <span className="rounded-full bg-green-950/45 px-2.5 py-1 font-mono text-[11px] backdrop-blur">{durationLabel(article)}</span>
      </div>
      {m === 'audio' && (
        <span aria-hidden className="mx-auto flex h-12 items-end gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="w-1.5 rounded-full bg-white/60" style={{ height: `${25 + ((i * 41) % 75)}%` }} />
          ))}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPlay}
          className="group inline-flex h-14 items-center gap-3 rounded-full bg-white pl-2 pr-6 text-[15px] font-semibold text-green-900 shadow-lift transition hover:-translate-y-px hover:bg-green-50"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-green-700 text-white">
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-green-500/30 [animation-duration:2.2s]" />
            <Play className="relative ml-0.5 h-4 w-4 fill-current" />
          </span>
          Play · {article.readMin} min
        </button>
        <span className="text-xs text-white/75">Simulated player · no media is streamed</span>
      </div>
    </div>
  );
  if (m === 'video' && clip)
    return (
      <AmbientVideo video={clip} className="aspect-[4/3] w-full rounded-[34px] bg-green-950 shadow-lift">
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-green-950/85 via-green-950/20 to-green-950/30" />
        {control}
      </AmbientVideo>
    );
  return (
    <div className="bg-forest relative isolate aspect-[4/3] w-full overflow-hidden rounded-[34px] shadow-lift">
      <Photo photo={article.photo} alt="" shape="none" className={cn('!absolute inset-0 -z-10', m === 'audio' && 'opacity-40 mix-blend-luminosity')} />
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-green-950/85 via-green-950/30 to-transparent" />
      {control}
    </div>
  );
}

export default function Article() {
  const { id } = useParams();
  const nav = useNavigate();
  const { articles, bookmarks } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const [playerOpen, setPlayerOpen] = useState(false);
  const phone = useMedia('(max-width: 639px)');
  const a = articles.find((x) => x.id === id);

  useEffect(() => {
    // Analytics: content_viewed { contentId, category } — never personal data (G7).
    if (a) dispatch({ type: 'MARK_ARTICLE_READ', articleId: a.id });
  }, [a, dispatch]);

  if (!a || a.status !== 'published') {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="sr-only">Article not available</h1>
        <Card>
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="This article is no longer available" body="It may have been archived or updated." action={<Button onClick={() => nav('/app/learn')}>Browse articles</Button>} />
        </Card>
      </div>
    );
  }
  const saved = bookmarks.includes(a.id);
  const m = mediumOf(a);
  const tone = CATEGORY_TONE[a.category];
  const clip = videoFor(a);
  const related = articles.filter((x) => x.id !== a.id && x.status === 'published' && (x.category === a.category || x.lifeStage === a.lifeStage)).slice(0, 3);
  const facts: [string, string][] = [
    ['Format', m === 'audio' ? 'Audio' : m === 'video' ? 'Video' : a.type === 'faq' ? 'Question & answer' : 'Article'],
    ['Length', durationLabel(a)],
    ['Reviewed by', a.reviewer],
    ['Review date', formatDate(a.reviewDate, 'medium')],
    ['Written by', a.author],
    ['Version', `v${a.version} · updated ${formatDate(a.updatedAt, 'medium')}`],
  ];

  return (
    <article className="mx-auto max-w-6xl">
      <Link to={a.type === 'faq' ? '/app/learn/faq' : '/app/learn'} className="mb-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink-600 ring-1 ring-inset ring-ink-100 transition hover:text-green-700 hover:ring-green-200">
        <ArrowLeft className="h-4 w-4" /> {a.type === 'faq' ? 'Most asked questions' : 'Library'}
      </Link>

      {/* ---------- Editorial header ---------- */}
      <header className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset', TONE_SOFT[tone])}>
              <MediumIcon medium={m} className="h-3.5 w-3.5" /> {isQuickHelp(a) ? `Quick Help · ${categoryLabel(a)}` : a.topic}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">{categoryLabel(a)}</span>
          </div>
          <h1 className="mt-4 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-900 sm:text-[46px]">{a.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">{a.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-green-600" /> {durationLabel(a)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-green-600" /> Updated {formatDate(a.updatedAt)}
            </span>
          </div>
          <div className="mt-6 rounded-3xl bg-green-50/70 p-4 ring-1 ring-inset ring-green-100">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-green-700 shadow-soft">
                <BadgeCheck className="h-5 w-5" />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-ink-900">Medically reviewed by {a.reviewer}</p>
                <p className="text-ink-500">
                  {formatDate(a.reviewDate)} · Written by {a.author} · v{a.version}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-green-100 pt-4">
              <Button
                variant={saved ? 'secondary' : 'outline'}
                size="sm"
                className="h-10"
                leftIcon={<Heart className={saved ? 'h-4 w-4 fill-rose-500 text-rose-500' : 'h-4 w-4'} />}
                aria-pressed={saved}
                onClick={() => {
                  dispatch({ type: 'TOGGLE_BOOKMARK', articleId: a.id });
                  toast.success(saved ? 'Removed from favorites' : 'Added to favorites');
                }}
              >
                {saved ? 'In favorites' : 'Favorite'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10"
                leftIcon={<Share2 className="h-4 w-4" />}
                onClick={() => {
                  try {
                    void navigator.clipboard?.writeText(window.location.href);
                  } catch {
                    /* clipboard unavailable */
                  }
                  toast.success('Link copied');
                }}
              >
                Share
              </Button>
            </div>
          </div>
        </div>
        <div className="order-first lg:order-none">
          {isPlayable(a) ? (
            <PlayerPanel article={a} onPlay={() => setPlayerOpen(true)} />
          ) : (
            <ArchPortrait photo={a.photo} alt="" priority className="mx-auto aspect-[4/5] w-full max-w-[280px] sm:max-w-[380px] lg:max-w-[420px]" leafClassName="-left-10 -top-6 h-32 w-32 sm:h-40 sm:w-40" />
          )}
        </div>
      </header>

      <Notice tone="warning" className="mt-8" title="Sample content">
        This article is placeholder text for the demo and has not been medically reviewed. Reviewer details above are placeholders.
      </Notice>

      {/* ---------- Body + aside ---------- */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <div className="card card-pad sm:p-8">
            <p className="eyebrow mb-4">
              <PenLine className="h-4 w-4" /> {m === 'article' ? 'The article' : 'What this session covers'}
            </p>
            <div className="space-y-5 text-[17px] leading-[1.8] text-ink-700">
              {a.body.map((p, i) => (
                <p key={i} className={i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-[56px] first-letter:font-semibold first-letter:leading-[0.9] first-letter:text-green-700' : ''}>
                  {p}
                </p>
              ))}
            </div>
            <div className="mt-8 rounded-2xl bg-ink-50 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-ink-800">
                <FileText className="h-4 w-4" /> References
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-600">
                {a.references.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </div>
          </div>
          <Notice tone="safety" className="mt-6">
            {COPY.notDiagnostic} {COPY.concern}
          </Notice>
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <Card className="card-pad">
            <p className="eyebrow">At a glance</p>
            <dl className="mt-3 divide-y divide-ink-100 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-ink-500">{k}</dt>
                  <dd className="text-right font-semibold text-ink-800">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {clip && m !== 'video' && (
            <div>
              <p className="eyebrow mb-2.5">Watch & follow along</p>
              <VideoCard video={clip} compact aspect="aspect-[16/11]" />
              <p className="mt-2 text-xs text-ink-400">A related guided routine — go at your own pace.</p>
            </div>
          )}
          <Card className="card-pad space-y-2">
            <p className="eyebrow mb-1">Keep exploring</p>
            {[
              { to: '/app/learn/womens-wellness', icon: BookOpen, label: 'Women’s wellness hub', cls: 'bg-green-50 text-green-700' },
              { to: '/app/learn/faq', icon: MessageCircleQuestion, label: 'Most asked questions', cls: 'bg-lavender-50 text-lavender-600' },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="group flex min-h-[48px] items-center gap-3 rounded-2xl p-2 transition hover:bg-green-50/60">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', l.cls)}>
                  <l.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 text-sm font-semibold text-ink-800">{l.label}</span>
                <ArrowRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-green-700" />
              </Link>
            ))}
          </Card>
        </aside>
      </div>

      {isPlayable(a) && <MediaPlayer article={a} open={playerOpen} onClose={() => setPlayerOpen(false)} />}

      {related.length > 0 && (
        <section className="mt-12">
          <SectionTitle eyebrow="Keep reading" title="Related reading" subtitle={`More on ${categoryLabel(a).toLowerCase()} and your life stage`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {related.map((r) => (
              phone ? <ArticleRow key={r.id} article={r} /> : <ArticleCard key={r.id} article={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
