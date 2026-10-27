import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudOff, Loader2, RotateCw } from 'lucide-react';
import { Logo } from '@/components/brand/Brand';
import { Button, useToast } from '@/components/ui';
import { ADMIN_SESSION_END_EVENT, adminApi, ApiError, isApiMode, setOfflineDemo } from '@/lib/api';
import { describeApiError } from './apiErrors';
import { ADMIN_STORAGE_KEY, AdminCtx, adminReducer, initialAdminState, loadAdminState, type AdminAction, type AdminState } from './adminState';

type Status = 'booting' | 'ready' | 'unreachable';

/** Signed-out placeholder in API mode: no seed data is shown before the server answers. */
function signedOutState(): AdminState {
  return { ...initialAdminState(), session: null, content: [], users: [], staff: [], audit: [], support: [], privacy: [], refunds: [], campaigns: [], media: [] };
}

/**
 * Admin store.
 * - API mode (default): the HealthX API owns the state, decides every permission and writes the audit
 *   log; each dispatch is sent to `/v1/admin/actions` and the role-scoped state it returns replaces ours.
 * - Offline demo: the original browser-only store (localStorage, nothing enforced).
 */
export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const apiMode = useMemo(isApiMode, []);
  const toast = useToast();
  const nav = useNavigate();
  const [state, setStateRaw] = useState<AdminState>(() => (apiMode ? signedOutState() : loadAdminState()));
  const [status, setStatus] = useState<Status>(apiMode ? 'booting' : 'ready');
  const stateRef = useRef(state);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const setState = useCallback((s: AdminState) => {
    stateRef.current = s;
    setStateRaw(s);
  }, []);

  // Offline demo keeps its localStorage persistence.
  useEffect(() => {
    if (apiMode) return;
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }, [apiMode, state]);

  const reload = useCallback(async () => {
    if (!apiMode || !adminApi.signedIn) return;
    try {
      setState(await adminApi.adminState());
    } catch {
      /* session-end / offline handled elsewhere */
    }
  }, [apiMode, setState]);

  const boot = useCallback(async () => {
    setStatus('booting');
    try {
      await adminApi.health();
    } catch {
      setStatus('unreachable');
      return;
    }
    if (await adminApi.refresh()) {
      if (adminApi.user?.role !== 'end_user') {
        try {
          setState(await adminApi.adminState());
        } catch {
          setState(signedOutState());
        }
      } else {
        await adminApi.logout().catch(() => undefined);
      }
    }
    setStatus('ready');
  }, [setState]);

  useEffect(() => {
    if (apiMode) void boot();
  }, [apiMode, boot]);

  // Pick up changes made by other staff (and permission edits) when the tab regains focus.
  useEffect(() => {
    if (!apiMode) return;
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [apiMode, reload]);

  useEffect(() => {
    if (!apiMode) return;
    const onEnd = () => {
      setState(signedOutState());
      toast.info('Your admin session has ended', 'Please sign in again.');
      nav('/admin/login', { replace: true, state: { reason: 'session_end' } });
    };
    window.addEventListener(ADMIN_SESSION_END_EVENT, onEnd);
    return () => window.removeEventListener(ADMIN_SESSION_END_EVENT, onEnd);
  }, [apiMode, nav, setState, toast]);

  const signOut = useCallback(async () => {
    if (apiMode) {
      await adminApi.logout().catch(() => undefined);
      setState(signedOutState());
    } else {
      setState(adminReducer(stateRef.current, { type: 'SIGN_OUT' }));
    }
  }, [apiMode, setState]);

  /** After a successful API sign-in: load the role-scoped state for this staff member. */
  const adoptSession = useCallback(async () => {
    const s = await adminApi.adminState();
    setState(s);
    return s;
  }, [setState]);

  const dispatch = useCallback(
    (a: AdminAction): Promise<AdminState | null> => {
      if (!apiMode) {
        const next = adminReducer(stateRef.current, a);
        setState(next);
        return Promise.resolve(next);
      }
      switch (a.type) {
        case 'LOG': // the server writes the audit log itself
          return Promise.resolve(stateRef.current);
        case 'SIGN_OUT':
          return signOut().then(() => stateRef.current);
        case 'SIGN_IN':
        case 'RESET':
          toast.error('Not available with the server', 'Role switching and demo resets only exist in the offline demo.');
          return Promise.resolve(null);
      }
      // Optimistic update so the UI responds instantly; the server's answer replaces it.
      setState(adminReducer(stateRef.current, a));
      const run = queue.current.then(async () => {
        try {
          const next = await adminApi.adminAction(a);
          setState(next);
          return next;
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 401)) {
            const m = describeApiError(e);
            toast.error(m.title, m.body);
          }
          try {
            setState(await adminApi.adminState());
          } catch {
            /* keep what we have */
          }
          return null;
        }
      });
      queue.current = run.catch(() => undefined);
      return run;
    },
    [apiMode, setState, signOut, toast],
  );

  const audit = useCallback(
    (action: string, target: string, detail?: string) => {
      if (apiMode) return; // server-side audit only
      const s = stateRef.current.session;
      void dispatch({ type: 'LOG', entry: { actor: s?.name ?? 'system', role: s?.role ?? 'system', action, target, detail } });
    },
    [apiMode, dispatch],
  );

  const value = useMemo(() => ({ state, dispatch, audit, apiMode, signOut, adoptSession, reload }), [state, dispatch, audit, apiMode, signOut, adoptSession, reload]);

  if (apiMode && status !== 'ready') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-green-50 px-4 text-center">
        <Logo to="/" tagline={false} />
        {status === 'booting' ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-600" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Connecting to the HealthX server…
          </p>
        ) : (
          <div className="card card-pad max-w-md" role="alert">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
              <CloudOff className="h-6 w-6" />
            </span>
            <h1 className="mt-3 text-lg font-bold text-ink-900">Can’t reach the HealthX server</h1>
            <p className="mt-1 text-sm text-ink-500">The Web Admin needs the API to sign you in and enforce permissions. Start it with <code className="rounded bg-ink-100 px-1">npm run api</code> and try again.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button leftIcon={<RotateCw className="h-4 w-4" />} onClick={() => void boot()}>
                Try again
              </Button>
              <Button variant="outline" onClick={() => setOfflineDemo(true)}>
                Use offline demo
              </Button>
            </div>
            <p className="mt-3 text-xs text-ink-400">Offline demo keeps data in this browser only and doesn’t enforce permissions.</p>
          </div>
        )}
      </div>
    );
  }

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
