import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'info' | 'error';
interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
}

interface ToastApi {
  success: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((tone: Tone, title: string, body?: string) => {
    const id = ++seq;
    setItems((xs) => [...xs.slice(-3), { id, tone, title, body }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3800);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, b) => push('success', t, b),
      info: (t, b) => push('info', t, b),
      error: (t, b) => push('error', t, b),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => {
          const I = t.tone === 'success' ? CircleCheck : t.tone === 'error' ? TriangleAlert : Info;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex animate-fade-up items-start gap-3 rounded-2xl border bg-white p-4 shadow-lift',
                t.tone === 'success' && 'border-green-200',
                t.tone === 'error' && 'border-danger/30',
                t.tone === 'info' && 'border-sky-200',
              )}
            >
              <I className={cn('mt-0.5 h-5 w-5 shrink-0', t.tone === 'success' ? 'text-green-600' : t.tone === 'error' ? 'text-danger' : 'text-sky-500')} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                {t.body && <p className="mt-0.5 text-sm text-ink-600">{t.body}</p>}
              </div>
              <button
                aria-label="Dismiss"
                className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside ToastProvider');
  return c;
}
