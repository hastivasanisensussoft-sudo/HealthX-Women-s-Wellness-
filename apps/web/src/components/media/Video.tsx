import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Play, RotateCcw, Video as VideoIcon } from 'lucide-react';
import { VIDEOS, type VideoKey } from '@healthx/shared';
import { Modal } from '@/components/ui/Overlay';
import { posterUrl, VIDEO_CATEGORY_LABEL, videoUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { Photo } from './Photo';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Whether the element has come near the viewport yet, and whether it is on screen now. */
function useNearViewport<T extends Element>(rootMargin = '200px') {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setSeen(true);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, seen, visible };
}

/** The browser's Data Saver setting (Chrome / Android). */
const saveData = () => typeof navigator !== 'undefined' && !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

/** Player dialog. If the clip can't play, the routine is still shown as steps. */
export function VideoPlayerModal({ video, onClose }: { video: VideoKey | null; onClose: () => void }) {
  const meta = video ? VIDEOS[video] : null;
  const src = video ? videoUrl(video) : undefined;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
  }, [video, src, attempt]);
  if (!meta || !video) return null;
  return (
    <Modal open onClose={onClose} title={meta.title} description={`${VIDEO_CATEGORY_LABEL[meta.category]} · ${meta.sessionMinutes}-minute routine`} size="lg">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-green-950">
        {src && status !== 'error' && (
          <video
            key={attempt}
            src={src}
            poster={posterUrl(video)}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={`${meta.title} — video preview`}
            onCanPlay={() => setStatus('ready')}
            onError={() => setStatus('error')}
            className="h-full w-full object-cover"
          />
        )}
        {status === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-green-950/30" role="status" aria-label="Loading video">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0">
            <Photo src={posterUrl(video)} alt="" shape="none" className="absolute inset-0" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-green-950/70 p-6 text-center text-white" role="status">
              <VideoIcon className="h-7 w-7" />
              <p className="max-w-sm text-sm font-medium">This video can’t play right now. You can still follow the routine step by step below.</p>
              {src && (
                <button onClick={() => setAttempt((a) => a + 1)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-green-900 hover:bg-green-50">
                  <RotateCcw className="h-4 w-4" /> Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="mt-5 text-[15px] leading-relaxed text-ink-600">{meta.description}</p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {meta.steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3 rounded-2xl bg-green-50/70 p-3 text-sm text-ink-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white font-mono text-xs font-medium text-green-800 ring-1 ring-green-200">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-ink-400">Short preview clip (free stock footage). Go at your own pace and stop if anything feels uncomfortable. This is general wellness guidance, not medical advice.</p>
    </Modal>
  );
}

/** Poster card that opens the player. */
export function VideoCard({
  video,
  title,
  subtitle,
  className,
  aspect = 'aspect-[4/3]',
  compact,
}: {
  video: VideoKey;
  title?: string;
  subtitle?: string;
  className?: string;
  /** Tailwind aspect class for the poster. */
  aspect?: string;
  compact?: boolean;
}) {
  const meta = VIDEOS[video];
  const [open, setOpen] = useState(false);
  const name = title ?? meta.title;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Play video: ${name}`} className={cn('group relative block w-full overflow-hidden rounded-3xl text-left shadow-card', className)}>
        <Photo src={posterUrl(video)} alt="" shape="none" className={cn('w-full', aspect)} imgClassName="transition duration-700 group-hover:scale-105" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-green-950/85 via-green-950/15 to-transparent" />
        <span className="glass absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-green-900">
          <VideoIcon className="h-3.5 w-3.5" /> Video preview
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-green-950/45 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">{meta.sessionMinutes} min</span>
        <span aria-hidden className={cn('absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-green-800 shadow-lift transition duration-300 group-hover:scale-110', compact ? 'h-12 w-12' : 'h-16 w-16')}>
          <span className="absolute inset-0 rounded-full bg-white/30 motion-safe:animate-ping motion-safe:[animation-duration:2.2s]" />
          <Play className={cn('ml-0.5 fill-current', compact ? 'h-5 w-5' : 'h-6 w-6')} />
        </span>
        <span className={cn('absolute inset-x-0 bottom-0 text-white', compact ? 'p-3.5' : 'p-5')}>
          <span className={cn('block font-display font-semibold leading-snug', compact ? 'text-[15px]' : 'text-lg')}>{name}</span>
          <span className="mt-0.5 block text-[13px] text-white/80">{subtitle ?? VIDEO_CATEGORY_LABEL[meta.category]}</span>
        </span>
      </button>
      <VideoPlayerModal video={open ? video : null} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * Muted looping background clip for hero panels. The clip only loads once the panel scrolls near the
 * viewport and pauses while it is off screen; a still image is shown when motion is reduced, Data Saver
 * is on, or the clip fails.
 */
export function AmbientVideo({ video, className, children }: { video: VideoKey; className?: string; children?: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const { ref, seen, visible } = useNearViewport<HTMLDivElement>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = videoUrl(video);
  const [failed, setFailed] = useState(false);
  const animate = !reduced && !!src && !failed && !saveData();
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (visible) void v.play().catch(() => undefined);
    else v.pause();
  }, [visible, seen, animate]);
  return (
    <div ref={ref} className={cn('relative isolate overflow-hidden', className)}>
      {animate && seen ? (
        <video ref={videoRef} src={src} poster={posterUrl(video)} autoPlay muted loop playsInline preload="none" aria-hidden onError={() => setFailed(true)} className="absolute inset-0 -z-10 h-full w-full object-cover" />
      ) : (
        <Photo src={posterUrl(video)} alt="" shape="none" className="!absolute inset-0 -z-10" />
      )}
      {children}
    </div>
  );
}
