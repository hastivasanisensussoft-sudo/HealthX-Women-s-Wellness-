import { Link } from 'react-router-dom';
import { ArrowRight, Baby, BadgeCheck, PlayCircle, Brain, CalendarHeart, Dumbbell, HeartHandshake, Salad, ShieldCheck, Sparkles, Sprout, Stethoscope, type LucideIcon } from 'lucide-react';
import { COPY, type Article, type PhotoKey, type VideoKey } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { ArticleCard } from '@/user/components/Cards';
import { MODE_LABEL, TONE_SOFT } from '@/user/components/learn-ui/tones';
import { useMedia } from '@/user/components/learn-ui/useMedia';
import { ArticleRow } from '@/user/components/learn-ui/ArticleRow';
import { Photo } from '@/components/media/Photo';
import { ArchPortrait } from '@/user/components/learn-ui/ArchPortrait';
import { VideoCard } from '@/components/media/Video';
import { Badge, Card, EmptyState, HScroll, IconTile, Notice, PageHeader, PhaseBadge, RouteTabs, SectionTitle, Skeleton, type TileTone } from '@/components/ui';
import { cn, useDemoLoading } from '@/lib/utils';
import { LEARN_TABS } from '@/user/layout/sectionTabs';

type Topic = 'womens-wellness' | 'fertility-pregnancy';
type Shelf = { id: string; title: string; blurb: string; icon: LucideIcon; tone: TileTone; match: (a: Article) => boolean };

const SHELVES: Record<Topic, Shelf[]> = {
  'womens-wellness': [
    { id: 'cycle', title: 'Cycle health', blurb: 'Periods, phases and common symptoms.', icon: CalendarHeart, tone: 'rose', match: (a) => a.category === 'cycle' },
    { id: 'mind', title: 'Mind & mood', blurb: 'Stress, relaxation and mindfulness.', icon: Brain, tone: 'lavender', match: (a) => a.category === 'mental_wellness' },
    { id: 'food', title: 'Food & hydration', blurb: 'Balanced plates, protein, fibre and water.', icon: Salad, tone: 'peach', match: (a) => a.category === 'nutrition' },
    { id: 'move', title: 'Movement', blurb: 'Strength, cardio and mobility at your pace.', icon: Dumbbell, tone: 'green', match: (a) => a.category === 'fitness' },
    { id: 'skin', title: 'Skin', blurb: 'How your skin can change across your cycle.', icon: Sparkles, tone: 'butter', match: (a) => a.category === 'skin' },
    { id: 'midlife', title: 'Perimenopause & menopause', blurb: 'Changes in midlife and how to look after yourself.', icon: Sprout, tone: 'indigo', match: (a) => a.lifeStage === 'perimenopause' || a.lifeStage === 'menopause' },
  ],
  'fertility-pregnancy': [
    { id: 'fertility', title: 'Fertility awareness', blurb: 'Learning your cycle signs — education, not a prediction.', icon: Sprout, tone: 'green', match: (a) => a.lifeStage === 'fertility' || a.id === 'a_cycle_phases' },
    { id: 'pregnancy', title: 'Pregnancy wellness', blurb: 'Everyday wellbeing alongside your prenatal care.', icon: Baby, tone: 'peach', match: (a) => a.lifeStage === 'pregnancy' },
  ],
};

const META: Record<Topic, { title: string; subtitle: string; hero: PhotoKey; heroPos: string; kicker: string; headline: string; lead: string; videos: VideoKey[]; videoNote: string }> = {
  'womens-wellness': {
    title: 'Women’s wellness',
    subtitle: 'Reviewed reads on cycle health, mind, food, movement and every life stage.',
    hero: 'friends-group',
    heroPos: '50% 30%',
    kicker: 'Hub · every life stage',
    headline: 'Feel at home in your body, at every stage',
    lead: 'Short, reviewed reads and gentle routines — pick a shelf below or follow a video.',
    videos: ['yoga-flow', 'breathing', 'healthy-cooking', 'walk-outdoors', 'strength', 'sleep-winddown', 'hydration'],
    videoNote: 'Short video previews with step-by-step routines',
  },
  'fertility-pregnancy': {
    title: 'Fertility & pregnancy information',
    subtitle: 'Educational information about fertility awareness and pregnancy wellness — always alongside professional care.',
    hero: 'portrait-indian',
    heroPos: '50% 22%',
    kicker: 'Hub · education only',
    headline: 'Learn your cycle signs, at your own pace',
    lead: 'Educational reads on fertility awareness and pregnancy wellness. Estimates are never a confirmation or a method of contraception.',
    videos: ['breathing', 'walk-outdoors', 'hydration', 'sleep-winddown'],
    videoNote: 'Calm, low-impact previews. If you are pregnant, check with your prenatal care provider before starting something new.',
  },
};

const jump = (id: string) => document.getElementById(`shelf-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** Curated Learn hubs over the reviewed article library. Fertility (§20–§21) and life-stage modes (§22–§25) are Phase 3 previews. */
export default function LearnHub({ topic }: { topic: Topic }) {
  const { articles, profile } = useAppState();
  const phone = useMedia('(max-width: 639px)');
  const loading = useDemoLoading(450);
  const published = articles.filter((a) => a.status === 'published');
  const shelves = SHELVES[topic].map((s) => ({ ...s, items: published.filter(s.match) }));
  const meta = META[topic];
  const total = new Set(shelves.flatMap((s) => s.items.map((a) => a.id))).size;

  const videoRow = (
    <section>
      <SectionTitle eyebrow="Watch & follow along" title="Guided routines" subtitle={meta.videoNote} />
      <HScroll label="Guided routines">
        {meta.videos.map((v) => (
          <div key={v} className="w-[264px] shrink-0 sm:w-[300px]">
            <VideoCard video={v} />
          </div>
        ))}
      </HScroll>
    </section>
  );

  return (
    <div className="space-y-8">
      <div>
        <PageHeader eyebrow="Learn" title={meta.title} subtitle={meta.subtitle} breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Learn', to: '/app/learn' }, { label: meta.title }]} />
        <RouteTabs tabs={LEARN_TABS} label="Learn pages" className="!mb-0" />
      </div>

      {/* ---------- Hero: forest panel with arch portrait ---------- */}
      <section className="bg-forest relative overflow-hidden rounded-[34px] p-6 text-white shadow-lift sm:p-10">
        <span aria-hidden className="leaf absolute -bottom-16 -left-10 h-48 w-48 bg-white/[0.04]" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-12">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-green-200">{meta.kicker}</p>
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{meta.headline}</h2>
            <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-white/75">{meta.lead}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="glass-dark inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold">
                <BadgeCheck className="h-4 w-4 text-green-300" /> {total} reviewed {total === 1 ? 'read' : 'reads'}
              </span>
              <span className="glass-dark inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold">
                <PlayCircle className="h-4 w-4 text-butter-300" /> {meta.videos.length} guided routines
              </span>
              {topic === 'fertility-pregnancy' &&
                shelves.map((s) => (
                  <button key={s.id} type="button" onClick={() => jump(s.id)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold ring-1 ring-inset ring-white/20 transition hover:bg-white/20">
                    <s.icon className="h-3.5 w-3.5" /> {s.title}
                  </button>
                ))}
            </div>
          </div>
          <ArchPortrait photo={meta.hero} alt="" priority position={meta.heroPos} ring="ring-[6px] ring-white/15" className="mx-auto hidden h-64 w-52 sm:block lg:h-72 lg:w-56" leafClassName="-left-12 -top-5 h-36 w-36" />
        </div>
      </section>

      {topic === 'fertility-pregnancy' && (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ToolCard
              to="/app/fertility"
              photo="herbal-tea"
              icon={Sprout}
              tone="green"
              title="Fertility awareness tracker"
              body="Log optional signs — basal body temperature, cervical mucus or ovulation-test results — alongside your cycle estimates."
            />
            <ToolCard
              to="/app/life-stages"
              photo="mature-woman"
              icon={Baby}
              tone="peach"
              title="Pregnancy & life-stage modes"
              body="Switch HealthX to pregnancy, perimenopause or menopause mode to adapt what you see."
              badge={`Current mode: ${profile.mode}`}
              badgeHint={MODE_LABEL[profile.mode]}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Notice tone="safety" title="Estimates only">
              {COPY.fertilityAwareness} {COPY.ovulationNotConfirmed}
            </Notice>
            <Notice tone="warning" title="Not contraception">
              {COPY.notContraception}
            </Notice>
            <Notice tone="info" title="Pregnancy care" icon={<Stethoscope className="h-4 w-4 text-sky-500" />}>
              {COPY.pregnancy}
            </Notice>
          </div>
        </>
      )}

      {topic === 'womens-wellness' && (
        <>
          <section aria-label="Shelves">
            <SectionTitle eyebrow="Browse by shelf" title="What would you like to explore?" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {shelves.map((s) => (
                <IconTile key={s.id} tone={s.tone} icon={<s.icon className="h-5 w-5" />} label={s.title} hint={`${s.items.length} ${s.items.length === 1 ? 'read' : 'reads'}`} onClick={() => jump(s.id)} />
              ))}
            </div>
          </section>
          <div className="flex items-start gap-3 rounded-2xl bg-green-50 px-4 py-3.5 text-sm text-green-900 ring-1 ring-inset ring-green-100">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            Every HealthX article goes through medical review before publishing. Articles in this demo are sample content.
          </div>
        </>
      )}

      <div className="space-y-12">
        {shelves.map((s, i) => (
          <div key={s.id} className="space-y-12">
            <section id={`shelf-${s.id}`} aria-labelledby={`shelf-${s.id}-title`} className="scroll-mt-24">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset', TONE_SOFT[s.tone])}>
                    <s.icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="eyebrow">
                      Shelf {String(i + 1).padStart(2, '0')} · {s.items.length} {s.items.length === 1 ? 'read' : 'reads'}
                    </p>
                    <h2 id={`shelf-${s.id}-title`} className="mt-0.5 font-display text-[22px] font-semibold tracking-[-0.015em] text-ink-900">
                      {s.title}
                    </h2>
                    <p className="text-sm text-ink-500">{s.blurb}</p>
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3" aria-busy="true">
                  {Array.from({ length: Math.min(3, Math.max(1, s.items.length)) }).map((_, k) => (
                    <Skeleton key={k} className={cn('w-full rounded-3xl', phone ? 'h-[112px]' : 'h-[300px]')} />
                  ))}
                </div>
              ) : s.items.length === 0 ? (
                <Card>
                  <EmptyState compact icon={<s.icon className="h-5 w-5" />} title="New articles coming soon" body="The HealthX content team publishes new reviewed reads regularly." />
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  {s.items.map((a) => (
                    phone ? <ArticleRow key={a.id} article={a} /> : <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              )}
            </section>
            {i === Math.min(1, shelves.length - 1) && videoRow}
          </div>
        ))}
      </div>

      <Notice tone="safety" icon={<HeartHandshake className="h-4 w-4 text-lavender-600" />} title="Talk to a professional">
        {COPY.concern} {COPY.emergency}
      </Notice>
    </div>
  );
}

function ToolCard({ to, photo, icon: I, tone, title, body, badge, badgeHint }: { to: string; photo: PhotoKey; icon: LucideIcon; tone: TileTone; title: string; body: string; badge?: string; badgeHint?: string }) {
  return (
    <Link to={to} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift sm:flex-row">
      <Photo photo={photo} alt="" shape="none" className="h-40 w-full shrink-0 sm:h-auto sm:w-[38%]" imgClassName="transition duration-700 group-hover:scale-105" />
      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ring-inset', TONE_SOFT[tone])}>
            <I className="h-5 w-5" />
          </span>
          <PhaseBadge phase={3} />
        </div>
        <p className="mt-3 font-display text-[18px] font-semibold leading-snug text-ink-900">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{body}</p>
        {badge && (
          <Badge tone="gray" className="mt-3 w-fit">
            <span title={badgeHint}>{badge}</span>
          </Badge>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-green-700">
          Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
