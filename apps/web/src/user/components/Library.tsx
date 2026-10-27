import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ChevronDown, Clock, FileText, Headphones, Heart, Moon, Pause, Play, PlayCircle, RotateCcw, RotateCw, Timer, X } from 'lucide-react';
import { formatDate, LIBRARY_DURATIONS, LIBRARY_MEDIA, QUICK_HELP, type Article } from '@healthx/shared';
import { categoryLabel, isQuickHelp, mediumOf, type LibraryFilter, type Medium } from './libraryUtils';
import { CATEGORY_TONE, TONE_SOFT } from './learn-ui/tones';
import { useAppState, useDispatch } from '@/store/AppStore';
import { Photo } from '@/components/media/Photo';
import { Badge, ChipToggle, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';

export function MediumIcon({ medium, className }: { medium: Medium; className?: string }) {
  const I = medium === 'audio' ? Headphones : medium === 'video' ? PlayCircle : FileText;
  return <I className={className} />;
}

/** "Filter by medium and time" chip rows (mockup M26/M27): format chips with icons, then duration pills. */
export function LibraryFilters({ value, onChange, stacked }: { value: LibraryFilter; onChange: (f: LibraryFilter) => void; stacked?: boolean }) {
  return (
    <div className={cn('grid gap-4', !stacked && 'lg:grid-cols-[auto_1fr] lg:items-start lg:gap-8')}>
      <div role="group" aria-label="Filter by medium">
        <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">Format</p>
        <div className="flex flex-wrap gap-2">
          <ChipToggle tone="rose" selected={value.favorites} onClick={() => onChange({ ...value, favorites: !value.favorites })} icon={<Heart className={cn('h-3.5 w-3.5', value.favorites && 'fill-current')} />}>
            Favorites{value.favorites ? ' ✕' : ''}
          </ChipToggle>
          {LIBRARY_MEDIA.map((m) => (
            <ChipToggle key={m.key} selected={value.medium === m.key} onClick={() => onChange({ ...value, medium: value.medium === m.key ? null : m.key })} icon={<MediumIcon medium={m.key} className="h-3.5 w-3.5" />}>
              {m.label}
            </ChipToggle>
          ))}
        </div>
      </div>
      <div role="group" aria-label="Filter by time">
        <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">Time</p>
        <div className="flex flex-wrap gap-2">
          {LIBRARY_DURATIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={value.duration === d.key}
              onClick={() => onChange({ ...value, duration: value.duration === d.key ? null : d.key })}
              className={cn(
                'inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition',
                value.duration === d.key ? 'bg-green-800 text-white shadow-sm' : 'bg-green-50 text-green-900 ring-1 ring-inset ring-green-100 hover:bg-green-100',
              )}
            >
              <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Heart toggle for a library item (glass on photos, soft on white). */
export function FavButton({ article, className, variant = 'glass' }: { article: Article; className?: string; variant?: 'glass' | 'soft' }) {
  const { bookmarks } = useAppState();
  const dispatch = useDispatch();
  const on = bookmarks.includes(article.id);
  return (
    <button
      type="button"
      aria-label={on ? `Remove ${article.title} from favorites` : `Add ${article.title} to favorites`}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_BOOKMARK', articleId: article.id });
      }}
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:scale-105',
        variant === 'glass' ? 'glass text-green-700 shadow-soft' : 'bg-white text-ink-500 ring-1 ring-inset ring-ink-100 hover:text-rose-500',
        className,
      )}
    >
      <Heart className={cn('h-[18px] w-[18px]', on && 'fill-rose-500 text-rose-500')} />
    </button>
  );
}

const QH_BG: Record<string, string> = {
  rose: 'from-rose-50 to-white ring-rose-100',
  green: 'from-green-50 to-white ring-green-100',
  peach: 'from-peach-50 to-white ring-peach-100',
  lavender: 'from-lavender-50 to-white ring-lavender-100',
  indigo: 'from-indigo-50 to-white ring-indigo-100',
  butter: 'from-butter-50 to-white ring-butter-100',
  sky: 'from-sky-50 to-white ring-sky-100',
};

/** Quick Help card (Myflo tinted tile): format pill + title on a soft wash, photo with play/listen disc on the right. */
export function QuickHelpCard({ article }: { article: Article }) {
  const m = mediumOf(article);
  const tone = CATEGORY_TONE[article.category];
  return (
    <div className={cn('group relative flex min-h-[148px] overflow-hidden rounded-3xl bg-gradient-to-br ring-1 ring-inset transition duration-300 hover:-translate-y-0.5 hover:shadow-card', QH_BG[tone])}>
      <Link to={`/app/learn/${article.id}`} className="flex min-w-0 flex-1">
        <span className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
          <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset', TONE_SOFT[tone])}>
            <MediumIcon medium={m} className="h-3.5 w-3.5" /> {isQuickHelp(article) ? QUICK_HELP : categoryLabel(article)}
          </span>
          <span className="line-clamp-3 font-display text-[16.5px] font-semibold leading-snug text-ink-900 group-hover:text-green-800">{article.title}</span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-500">
            <Clock className="h-3 w-3" /> {article.readMin} min {m === 'audio' ? 'listen' : m === 'video' ? 'watch' : 'read'}
          </span>
        </span>
        <span className="relative w-[40%] shrink-0 overflow-hidden">
          <Photo photo={article.photo} alt="" shape="none" className="h-full w-full" imgClassName="transition duration-700 group-hover:scale-105" />
          {m !== 'article' && (
            <span aria-hidden className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-green-800 shadow-lift">
              {m === 'audio' ? <Headphones className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
            </span>
          )}
        </span>
      </Link>
      <FavButton article={article} className="absolute right-2.5 top-2.5 h-9 w-9" />
    </div>
  );
}

/** Most Asked Questions accordion item (mockup M27): numbered header, short answer preview, link to the full reviewed answer. */
export function FaqItem({ article, index, open, onToggle }: { article: Article; index: number; open: boolean; onToggle: () => void }) {
  const tone = CATEGORY_TONE[article.category];
  const panel = `faq-panel-${article.id}`;
  return (
    <li className={cn('overflow-hidden rounded-3xl bg-white ring-1 ring-inset transition duration-300', open ? 'shadow-card ring-green-200' : 'ring-ink-100 hover:ring-green-200')}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={panel} onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left sm:gap-4 sm:p-5">
          <span className={cn('num flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[15px] ring-1 ring-inset', open ? 'bg-green-800 text-white ring-green-800' : TONE_SOFT[tone])}>{String(index + 1).padStart(2, '0')}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[16.5px] font-semibold leading-snug text-ink-900">{article.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-500">
              <span className="font-semibold">{categoryLabel(article)}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {article.readMin} min read
              </span>
            </span>
          </span>
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition', open ? 'rotate-180 bg-green-50 text-green-800' : 'bg-ink-50 text-ink-500')}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </h3>
      {open && (
        <div id={panel} role="region" aria-label="Answer preview" className="animate-fade-up px-4 pb-5 sm:px-5">
          <div className="grid gap-5 border-t border-ink-100 pt-4 sm:grid-cols-[1fr_168px]">
            <div className="min-w-0">
              <p className="text-[15.5px] font-medium leading-relaxed text-ink-800">{article.description}</p>
              <ul className="mt-3 space-y-2">
                {article.body.slice(0, 2).map((p) => (
                  <li key={p} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-600">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-500">
                <BadgeCheck className="h-4 w-4 text-green-600" /> Reviewed by {article.reviewer} · {formatDate(article.reviewDate, 'medium')}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link to={`/app/learn/${article.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-green-700 px-4 text-sm font-semibold text-white transition hover:bg-green-800">
                  Read the full answer <ArrowRight className="h-4 w-4" />
                </Link>
                <FavButton article={article} variant="soft" />
              </div>
            </div>
            <Photo photo={article.photo} alt="" className="hidden aspect-[4/5] w-full sm:block" />
          </div>
        </div>
      )}
    </li>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Simulated audio/video player (mockup M29). There is no media file in the demo —
 * playback is a timer so progress, skip and the sleep timer can be tried.
 */
export function MediaPlayer({ article, open, onClose }: { article: Article; open: boolean; onClose: () => void }) {
  const total = article.readMin * 60;
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const sleepLeft = useRef<number | null>(null);
  const m = mediumOf(article);

  useEffect(() => {
    if (!open) setPlaying(false);
  }, [open]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPos((p) => {
        if (p + 1 >= total) {
          setPlaying(false);
          return total;
        }
        return p + 1;
      });
      if (sleepLeft.current !== null) {
        sleepLeft.current -= 1;
        if (sleepLeft.current <= 0) {
          sleepLeft.current = null;
          setSleepMin(null);
          setPlaying(false);
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, [playing, total]);

  const setSleep = (min: number | null) => {
    setSleepMin(min);
    sleepLeft.current = min ? min * 60 : null;
  };

  return (
    <Modal open={open} onClose={onClose} title={m === 'audio' ? 'Now playing' : 'Video'} size="sm">
      <div className="text-center">
        <div className="bg-forest relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-[34px] shadow-lift">
          <Photo photo={article.photo} alt="" shape="none" className={cn('!absolute inset-0', m === 'audio' && 'opacity-35 mix-blend-luminosity')} imgClassName={playing ? 'animate-ken-burns' : undefined} />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-green-950/70 via-transparent to-transparent" />
          {m === 'audio' && (
            <span aria-hidden className="absolute inset-0 m-auto flex h-28 w-28 items-center justify-center">
              <span className={cn('absolute inset-0 rounded-full bg-white/10', playing && 'animate-breathe')} />
              <span className="absolute inset-4 rounded-full bg-white/15" />
              <Moon className="relative h-12 w-12 text-green-100" />
            </span>
          )}
          {m === 'video' && !playing && <PlayCircle aria-hidden className="absolute inset-0 m-auto h-16 w-16 text-white drop-shadow" />}
          <span aria-hidden className="absolute inset-x-0 bottom-4 flex h-8 items-end justify-center gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className={cn('w-1 rounded-full bg-white/70', playing && 'animate-pulse-soft')} style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 6) * 0.15}s` }} />
            ))}
          </span>
        </div>
        <p className="mt-5 font-display text-xl font-semibold leading-snug text-ink-900">{article.title}</p>
        <p className="mt-1 font-mono text-[11.5px] uppercase tracking-[0.12em] text-green-700">
          {m === 'audio' ? 'Audio' : 'Video'} · {article.readMin} min{isQuickHelp(article) ? ` · ${QUICK_HELP}` : ''}
        </p>
        <div className="mt-5">
          <input
            type="range"
            min={0}
            max={total}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-label="Playback position"
            className="range w-full text-green-600"
            style={{ '--c': 'currentColor', '--p': `${(pos / total) * 100}%` } as CSSProperties}
          />
          <div className="mt-1.5 flex justify-between font-mono text-xs text-ink-500">
            <span>{fmt(pos)}</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-6 text-green-800">
          <button type="button" aria-label="Back 15 seconds" onClick={() => setPos((p) => Math.max(0, p - 15))} className="flex h-12 items-center gap-1 rounded-full px-3 font-mono text-sm font-medium hover:bg-green-50">
            <RotateCcw className="h-5 w-5" /> 15
          </button>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => {
              if (pos >= total) setPos(0);
              setPlaying((p) => !p);
            }}
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-green-700 text-white shadow-lift transition hover:bg-green-800 active:scale-95"
          >
            {playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
          </button>
          <button type="button" aria-label="Forward 15 seconds" onClick={() => setPos((p) => Math.min(total, p + 15))} className="flex h-12 items-center gap-1 rounded-full px-3 font-mono text-sm font-medium hover:bg-green-50">
            15 <RotateCw className="h-5 w-5" />
          </button>
        </div>
        {m === 'audio' && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-indigo-50 p-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700">
              <Timer className="h-4 w-4" /> Sleep timer
            </span>
            {[15, 30].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={sleepMin === n}
                onClick={() => setSleep(sleepMin === n ? null : n)}
                className={cn('min-h-[36px] rounded-full px-3.5 font-semibold transition', sleepMin === n ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 ring-1 ring-inset ring-indigo-100 hover:bg-indigo-100')}
              >
                {n} min
              </button>
            ))}
            {sleepMin && (
              <button type="button" aria-label="Turn off sleep timer" onClick={() => setSleep(null)} className="rounded-full p-1.5 text-indigo-600 hover:bg-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-green-50 p-3 text-left text-sm text-ink-700">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-green-700">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <span>
            <b className="text-ink-900">Medically reviewed</b> by {article.reviewer} · {formatDate(article.reviewDate, 'medium')}
          </span>
        </div>
        <p className="mt-3 text-xs text-ink-400">Demo player — no media file is streamed. Educational content, not medical advice.</p>
        <Badge tone="gray" className="mt-2">
          Simulated playback
        </Badge>
      </div>
    </Modal>
  );
}
