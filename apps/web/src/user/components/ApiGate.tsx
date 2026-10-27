import type { ReactNode } from 'react';
import { CloudOff, Info, Loader2, RotateCw, ServerOff } from 'lucide-react';
import { LeafPair, Logo } from '@/components/brand/Brand';
import { Button } from '@/components/ui';
import { setOfflineDemo } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/AppStore';

const DEMO_FORCED = import.meta.env.VITE_DEMO_MODE === 'true';

/**
 * Wraps screens that need the HealthX server: shows a loader while the session is restored, and a
 * clear "can't reach the server" state (retry or switch to the offline demo) when the API is down.
 */
export function ApiGate({ children }: { children: ReactNode }) {
  const { mode, phase, retry } = useStore();
  if (mode === 'demo' || phase === 'ready') return <>{children}</>;
  if (phase === 'loading') {
    return (
      <div className="bg-wash flex min-h-screen flex-col items-center justify-center gap-6 px-4" role="status" aria-live="polite">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span aria-hidden className="absolute inset-0 animate-breathe rounded-full bg-green-100" />
          <span aria-hidden className="absolute inset-4 rounded-full bg-white shadow-soft" />
          <Loader2 className="relative h-7 w-7 animate-spin text-green-700" />
        </div>
        <Logo />
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-500">Connecting to HealthX…</p>
      </div>
    );
  }
  return (
    <div className="bg-wash flex min-h-screen items-center justify-center px-4 py-10">
      <div role="alert" className="relative w-full max-w-lg overflow-hidden rounded-[34px] bg-white p-7 text-center shadow-lift ring-1 ring-inset ring-green-100 sm:p-10">
        <span aria-hidden className="leaf absolute -right-8 -top-8 h-28 w-28 bg-green-50" />
        <span aria-hidden className="leaf-alt absolute -bottom-8 -left-8 h-24 w-24 bg-rose-50" />
        <div className="relative">
          <div className="flex justify-center">
            <Logo tagline={false} />
          </div>
          <div className="relative mx-auto mt-7 flex h-24 w-24 items-center justify-center">
            <LeafPair className="-right-5 -top-3 h-14 w-14" />
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-green-100 text-green-700 ring-8 ring-green-50/60">
              <ServerOff className="h-9 w-9" />
            </span>
          </div>
          <h1 className="mt-6 font-display text-[24px] font-semibold tracking-[-0.015em] text-ink-900 sm:text-[26px]">Can’t reach the HealthX server</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-500">
            Your account and wellness data live on the HealthX server, so signing in needs a connection. Check your internet connection and try again.
          </p>
          {import.meta.env.DEV && (
            <p className="mt-3 text-xs text-ink-400">
              Running locally? Start the API with <code className="rounded bg-ink-50 px-1">npm run api</code> (or <code className="rounded bg-ink-50 px-1">npm run dev</code> from the project root).
            </p>
          )}
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button leftIcon={<RotateCw className="h-4 w-4" />} onClick={retry}>
              Try again
            </Button>
            <Button variant="outline" leftIcon={<CloudOff className="h-4 w-4" />} onClick={() => setOfflineDemo(true)}>
              Use offline demo
            </Button>
          </div>
          <p className="mx-auto mt-5 flex max-w-sm items-start justify-center gap-2 rounded-2xl bg-butter-50 px-3 py-2.5 text-left text-xs leading-relaxed text-ink-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-butter-600" />
            The offline demo uses sample data stored in this browser only — nothing is checked or saved by a server.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Persistent notice while the browser-only offline demo is active. */
export function OfflineDemoBanner({ className }: { className?: string }) {
  const { mode } = useStore();
  if (mode !== 'demo') return null;
  return (
    <div role="status" className={cn('flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 border-b border-butter-200 bg-butter-50 px-4 py-1.5 text-center text-[13px] text-green-950 sm:gap-x-3 sm:py-2 sm:text-sm', className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-butter-200 px-2.5 py-0.5 text-xs font-semibold">
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        <b>Offline demo</b>
      </span>
      <span>— data stays in this browser, nothing is checked by a server.</span>
      {!DEMO_FORCED && (
        <button type="button" onClick={() => setOfflineDemo(false)} className="inline-flex min-h-[32px] items-center rounded-full px-2 font-semibold text-green-800 underline decoration-green-800/40 underline-offset-2 hover:bg-butter-100 hover:text-green-950">
          Connect to server
        </button>
      )}
    </div>
  );
}
