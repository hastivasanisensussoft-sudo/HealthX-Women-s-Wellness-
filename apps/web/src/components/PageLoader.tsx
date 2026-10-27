import { LogoMark } from '@/components/brand/Brand';

/** Suspense fallback while a page chunk loads: the logo breathing inside soft rings, plus a skeleton hint. */
export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6" aria-busy="true" aria-label="Loading page">
      <div className="flex flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span aria-hidden className="absolute inset-0 animate-breathe rounded-full bg-green-100/70" />
          <span aria-hidden className="absolute inset-4 animate-breathe rounded-full bg-green-50 [animation-delay:300ms]" />
          <LogoMark className="relative h-12 w-12 animate-pulse-soft" />
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">Loading…</p>
        <div aria-hidden className="mt-6 w-56 space-y-2">
          <div className="skeleton h-2.5 w-full rounded-full" />
          <div className="skeleton mx-auto h-2.5 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}
