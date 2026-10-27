import { Link } from 'react-router-dom';
import { ArrowRight, CalendarHeart, Check, Clock, Heart, Lightbulb, Play, Sparkles, TrendingUp, TriangleAlert, X } from 'lucide-react';
import { COPY, formatDate, moodLabel, palette, PHASES, type Article, type Insight, type PlanItem } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { LeafPair, MoodFace } from '@/components/brand/Brand';
import { CycleRing } from '@/components/cycle/CycleRing';
import { Photo } from '@/components/media/Photo';
import { Badge, ButtonLink, Card, CardHeader, EstimateMarker, PhaseBadge, ProgressRing, Tooltip } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, formatHours } from '@/lib/utils';
import { appPath } from '@/user/layout/nav';
import { MediumIcon } from '@/user/components/Library';
import { isPlayable, mediumOf } from '@/user/components/libraryUtils';
import type { CycleState, WellnessScore } from '@healthx/shared';
import { fertileDays, ringHeadline } from './cycleText';

export function CycleSummaryCard({ cs, onLogPeriod, compact }: { cs: CycleState; onLogPeriod: () => void; compact?: boolean }) {
  if (!cs.hasData) {
    return (
      <Card className="card-pad relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-br from-rose-50 via-white to-green-50 text-center">
        <LeafPair className="-right-4 -top-4 h-28 w-28 opacity-80" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-rose-500 shadow-soft">
          <CalendarHeart className="h-7 w-7" />
        </span>
        <p className="relative font-display text-xl font-semibold text-ink-900">Start tracking your cycle</p>
        <p className="relative max-w-xs text-sm text-ink-500">Log your last period to see estimates for your cycle day, phase and next period.</p>
        <button onClick={onLogPeriod} className="relative mt-1 inline-flex h-11 items-center rounded-full bg-rose-500 px-6 text-sm font-semibold text-white shadow-rose hover:bg-rose-600">
          Log a period
        </button>
      </Card>
    );
  }
  const len = cs.avgCycleLength ?? 28;
  const { fs, fe } = fertileDays(cs);
  const phase = cs.phase ? PHASES[cs.phase] : null;
  const head = ringHeadline(cs);
  return (
    <Card className="card-pad relative flex h-full flex-col justify-center overflow-hidden">
      <span aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-50" />
      <span aria-hidden className="absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-green-50" />
      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        <CycleRing cycleLength={len} periodLength={cs.avgPeriodLength ?? 5} currentDay={cs.cycleDay} fertileStart={fs} fertileEnd={fe} size={compact ? 190 : 236} stroke={compact ? 15 : 18} showLabels={false}>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">{head.kicker}</p>
          <p className={cn('num mt-1 leading-none text-ink-900', head.big.length > 6 ? (compact ? 'text-[26px]' : 'text-[32px]') : compact ? 'text-[36px]' : 'text-[44px]')}>{head.big}</p>
          <p className={cn('mt-1.5 text-xs font-semibold', cs.inPeriod ? 'text-rose-600' : 'text-ink-500')}>{head.sub}</p>
        </CycleRing>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">
              Estimated phase <EstimateMarker />
            </p>
            <p className="mt-1 font-display text-[22px] font-semibold leading-tight text-ink-900">{cs.isLate ? 'Period estimate has passed' : phase?.label ?? '—'}</p>
            {phase && !cs.isLate && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{phase.tips[0]}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-rose-50 p-3 ring-1 ring-inset ring-rose-100">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-rose-600">Next period*</p>
              <p className="mt-1 text-sm font-bold text-ink-900">
                {cs.isLate ? `${cs.daysLate} day${cs.daysLate === 1 ? '' : 's'} later than estimated` : cs.daysUntilNextPeriod !== null ? `~${cs.daysUntilNextPeriod} days` : 'Not enough data'}
              </p>
              {cs.nextPeriodStart && !cs.isLate && <p className="text-xs text-ink-500">around {formatDate(cs.nextPeriodStart, 'short')}</p>}
            </div>
            <div className="rounded-2xl bg-green-50 p-3 ring-1 ring-inset ring-green-100">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-green-700">Cycle length</p>
              <p className="mt-1 text-sm font-bold text-ink-900">{cs.avgCycleLength ? `${cs.avgCycleLength} days` : '—'}</p>
              <p className="text-xs text-ink-500">{cs.lengthSource === 'history' ? 'your average' : cs.lengthSource === 'profile' ? 'you entered' : 'log more cycles'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onLogPeriod} className="inline-flex h-10 items-center rounded-full bg-rose-500 px-5 text-sm font-semibold text-white shadow-rose transition hover:-translate-y-px hover:bg-rose-600">
              {cs.inPeriod ? 'Update period' : 'Log period'}
            </button>
            <ButtonLink to="/app/cycle" variant="outline" size="sm" className="h-10">
              Open calendar
            </ButtonLink>
          </div>
        </div>
      </div>
      {cs.isLate && <p className="relative mt-4 rounded-2xl bg-lavender-50 px-3 py-2 text-xs text-ink-600">Cycles naturally vary. {COPY.estimate} {COPY.concern}</p>}
    </Card>
  );
}

const SCORE_TONES = [palette.green[500], palette.sky[500], palette.indigo[500], palette.peach[500], palette.lavender[500], palette.rose[400]];

export function WellnessScoreCard({ ws }: { ws: WellnessScore }) {
  return (
    <Card className="card-pad flex h-full flex-col">
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            Wellness Score
            <Tooltip content={COPY.wellnessScore}>
              <span className="cursor-help rounded-full bg-ink-100 px-1.5 text-[11px] font-bold text-ink-500">?</span>
            </Tooltip>
          </span>
        }
        subtitle="Engagement metric · today"
        className="mb-2"
      />
      <div className="flex flex-1 items-center justify-center py-2">
        <ProgressRing value={(ws.score ?? 0) / 100} size={144} stroke={14} color="rgb(var(--c-green-600))" track="rgb(var(--c-green-50))">
          <p className="num text-[44px] leading-none text-ink-900">{ws.score ?? '—'}</p>
          <p className="font-mono text-[11px] text-ink-400">/ 100</p>
        </ProgressRing>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {ws.components.map((c, i) => (
          <div key={c.key}>
            <div className="flex items-center justify-between text-[11.5px] font-semibold text-ink-500">
              <span>{c.label}</span>
              <span className="tabular-nums text-ink-700">{c.value ?? '—'}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full" style={{ width: `${c.value ?? 0}%`, opacity: c.value === null ? 0 : 1, background: SCORE_TONES[i % SCORE_TONES.length] }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink-400">Engagement metric, not a medical score.</p>
    </Card>
  );
}

export function CheckInCard() {
  const { checkIns, today } = useAppState();
  const c = checkIns.find((x) => x.date === today);
  if (!c) {
    return (
      <Card className="card-pad relative flex h-full flex-col justify-between gap-4 overflow-hidden bg-gradient-to-br from-lavender-50 via-white to-peach-50">
        <span aria-hidden className="leaf absolute -right-6 -top-6 h-24 w-24 bg-lavender-100/80" />
        <div className="relative">
          <CardHeader title="Today’s check-in" subtitle="How are you feeling?" className="mb-2" />
          <div className="mt-3 flex -space-x-2.5">
            {(['excellent', 'good', 'neutral', 'low', 'very_low'] as const).map((m) => (
              <MoodFace key={m} mood={m} size={50} className="rounded-full ring-[3px] ring-white transition hover:-translate-y-1" />
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-500">Mood, energy, stress, sleep and symptoms — under 30 seconds.</p>
        </div>
        <ButtonLink to="/app/check-in" rightIcon={<ArrowRight className="h-4 w-4" />} className="relative">
          Check in now
        </ButtonLink>
      </Card>
    );
  }
  return (
    <Card className="card-pad h-full">
      <CardHeader title="Today’s check-in" subtitle="Completed" action={<Badge tone="green" icon={<Check className="h-3 w-3" />}>Done</Badge>} />
      <div className="flex items-center gap-4">
        <MoodFace mood={c.mood} size={68} />
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">Mood</p>
          <p className="font-display text-2xl font-semibold text-ink-900">{moodLabel(c.mood)}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['Energy', `${c.energy}/10`, 'bg-peach-50 text-peach-700'],
          ['Stress', c.stress != null ? `${c.stress}/10` : '—', 'bg-lavender-50 text-lavender-700'],
          ['Sleep', formatHours(c.sleepHours), 'bg-indigo-50 text-indigo-700'],
        ].map(([k, v, cls]) => (
          <div key={k} className={cn('rounded-2xl p-2.5 text-center', cls)}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.1em]">{k}</dt>
            <dd className="mt-0.5 text-sm font-bold text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
      <Link to="/app/check-in" className="mt-3 inline-flex text-sm font-semibold text-green-700 hover:underline">
        Edit check-in
      </Link>
    </Card>
  );
}

export function PlanList({ items, onToggle }: { items: PlanItem[]; onToggle: (id: string) => void }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id}>
          <button
            onClick={() => onToggle(i.id)}
            aria-pressed={i.done}
            className={cn('flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset transition', i.done ? 'bg-green-50 ring-green-100' : 'bg-white ring-ink-100 hover:ring-green-300')}
          >
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition', i.done ? 'border-green-700 bg-green-700 text-white' : 'border-ink-300 bg-white')}>
              {i.done && <Check className="h-4 w-4" />}
            </span>
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', i.done ? 'bg-white text-green-700' : 'bg-green-50 text-green-700')}>
              <Icon name={i.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className={cn('block text-sm font-semibold', i.done ? 'text-ink-500 line-through decoration-green-600/50' : 'text-ink-900')}>{i.title}</span>
              <span className="block truncate text-xs text-ink-500">{i.detail}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const insightStyle = {
  positive: { icon: TrendingUp, cls: 'bg-green-50 text-green-700', bar: 'bg-green-400' },
  suggestion: { icon: Lightbulb, cls: 'bg-butter-100 text-butter-600', bar: 'bg-butter-400' },
  pattern: { icon: Sparkles, cls: 'bg-lavender-50 text-lavender-600', bar: 'bg-lavender-400' },
  attention: { icon: TriangleAlert, cls: 'bg-peach-50 text-peach-600', bar: 'bg-peach-400' },
};

export function InsightCard({ insight, locked }: { insight: Insight; locked?: boolean }) {
  const dispatch = useDispatch();
  const s = insightStyle[insight.tone];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 pl-5 ring-1 ring-inset ring-ink-100">
      <span aria-hidden className={cn('absolute inset-y-3 left-0 w-1 rounded-r-full', s.bar)} />
      <div className="flex items-start gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', s.cls)}>
          <s.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <p className="font-display text-[16px] font-semibold text-ink-900">{insight.title}</p>
            {insight.phase === 2 && <PhaseBadge phase={2} />}
          </div>
          <p className={cn('mt-1 text-sm leading-relaxed text-ink-600', locked && 'select-none blur-[3px]')}>{insight.body}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">{insight.tone === 'pattern' || insight.tone === 'attention' ? COPY.observedPattern : 'Based on what you logged'}</p>
          {insight.ctaTo && (
            <Link to={appPath(insight.ctaTo)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline">
              {insight.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
      <button aria-label="Dismiss insight" onClick={() => dispatch({ type: 'DISMISS_INSIGHT', id: insight.id })} className="absolute right-2.5 top-2.5 rounded-full p-1 text-ink-300 hover:bg-ink-100 hover:text-ink-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ArticleCard({ article, horizontal }: { article: Article; horizontal?: boolean }) {
  const { bookmarks } = useAppState();
  const dispatch = useDispatch();
  const saved = bookmarks.includes(article.id);
  const playable = isPlayable(article);
  return (
    <article className={cn('group relative overflow-hidden rounded-3xl bg-white ring-1 ring-inset ring-ink-100 transition duration-300 hover:-translate-y-1 hover:shadow-card', horizontal && 'flex')}>
      {/* Horizontal: the photo fills the row absolutely, so a portrait photo can't make the card taller. */}
      <Link to={`/app/learn/${article.id}`} className={cn('relative block shrink-0 overflow-hidden', horizontal ? 'min-h-[112px] w-28 sm:w-40' : 'h-44')} tabIndex={-1} aria-hidden>
        <Photo photo={article.photo} alt="" shape="none" className={horizontal ? '!absolute inset-0' : 'h-full w-full'} imgClassName="transition duration-700 group-hover:scale-105" />
        {!horizontal && <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-green-950/40 to-transparent" />}
        {!horizontal && (
          <span className="glass absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-green-900">{article.topic}</span>
        )}
        {playable && (
          <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-green-800 shadow-lift">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        )}
      </Link>
      <div className={cn('flex min-w-0 flex-1 flex-col p-4', horizontal && 'pr-12')}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-500">
          {horizontal && <Badge tone="mint">{article.topic}</Badge>}
          {playable && (
            <Badge tone="green" icon={<MediumIcon medium={mediumOf(article)} className="h-3 w-3" />}>
              {mediumOf(article) === 'audio' ? 'Audio' : 'Video'}
            </Badge>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {article.readMin} min
          </span>
        </div>
        <Link to={`/app/learn/${article.id}`} className="mt-2 line-clamp-2 font-display text-[16.5px] font-semibold leading-snug text-ink-900 hover:text-green-800">
          {article.title}
        </Link>
        {!horizontal && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{article.description}</p>}
      </div>
      <button
        aria-label={saved ? `Remove ${article.title} from favorites` : `Add ${article.title} to favorites`}
        aria-pressed={saved}
        onClick={() => dispatch({ type: 'TOGGLE_BOOKMARK', articleId: article.id })}
        className="glass absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-green-700 transition hover:scale-105"
      >
        <Heart className={cn('h-4 w-4', saved && 'fill-rose-500 text-rose-500')} />
      </button>
    </article>
  );
}
