import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { createEmptyState, createInitialState, reducer, STATE_VERSION, todayISO, type Action, type AppState, type Plan } from '@healthx/shared';
import { ApiError, isApiMode, SESSION_END_EVENT, userApi } from '@/lib/api';
import { apiMessage } from './apiErrors';
import { exclusive } from './session';

/**
 * App-user store. Two modes:
 * - API mode (default): the HealthX API (apps/api) owns the data. Actions are applied optimistically
 *   with the shared reducer and sent to the server, which validates them and stores them per user;
 *   a rejected action rolls back by re-fetching. Logged health data is never written to browser storage
 *   (only an unfinished onboarding draft, kept per account in this tab's sessionStorage). Session calls
 *   take turns across tabs (store/session.ts) because the tabs share one rotating refresh cookie.
 * - Offline demo (VITE_DEMO_MODE / chosen when the API can't be reached): the original browser-only
 *   demo — shared reducer + localStorage, no server, nothing enforced.
 */
const STORAGE_KEY = 'healthx.demo.state';

/** Never sent to the API: identity, entitlement, role and whole-state replacement are server decisions. */
const LOCAL_ONLY = new Set<Action['type']>(['HYDRATE', 'SIGN_IN', 'SIGN_UP', 'SIGN_OUT', 'RESET_DEMO', 'SET_PLAN', 'SET_ROLE', 'SET_WEIGHTS']);

/**
 * Actions whose reducer creates records with generated ids. The server generates its own ids, so after
 * these the store re-syncs once the send queue drains — later edits/deletes then use the server's ids.
 */
const CREATES = new Set<Action['type']>(['COMPLETE_ONBOARDING', 'START_PERIOD', 'ADD_PERIOD', 'LOG_SYMPTOMS', 'ADD_CUSTOM_SYMPTOM', 'ADD_WATER', 'LOG_WORKOUT', 'ADD_MEAL', 'ADD_HABIT', 'ADD_GOAL', 'ADD_REMINDER', 'ADD_POST']);

/**
 * The server refuses references it doesn't know (404). A check-in re-saved after one of its symptoms was
 * removed (an archived custom symptom) would carry that id along — drop it, locally and on the server.
 */
function sanitize(a: Action, s: AppState): Action {
  if (a.type !== 'SAVE_CHECKIN' || !a.checkIn.symptomIds?.length) return a;
  const known = new Set(s.symptomDefs.map((d) => d.id));
  const symptomIds = a.checkIn.symptomIds.filter((id) => known.has(id));
  return symptomIds.length === a.checkIn.symptomIds.length ? a : { ...a, checkIn: { ...a.checkIn, symptomIds } };
}

export type Phase = 'loading' | 'ready' | 'unreachable';
export const STORE_NOTICE_EVENT = 'healthx:store-notice';
export interface StoreNotice {
  tone: 'error' | 'info' | 'success';
  title: string;
  body?: string;
}
const notify = (n: StoreNotice) => window.dispatchEvent(new CustomEvent<StoreNotice>(STORE_NOTICE_EVENT, { detail: n }));

function loadDemo(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Regenerate when the schema changed or the calendar day rolled over, so demo data stays "current".
      if (parsed.version === STATE_VERSION && parsed.today === todayISO()) return parsed;
      if (parsed.version === STATE_VERSION) {
        const fresh = createInitialState();
        return { ...fresh, auth: parsed.auth };
      }
    }
  } catch {
    /* storage unavailable — fall through to fresh demo data */
  }
  return createInitialState();
}

/** Placeholder while signed out in API mode (never shown inside the app; guards redirect). */
function signedOut(): AppState {
  const s = createEmptyState(todayISO());
  return { ...s, auth: { ...s.auth, signedIn: false, onboarded: false } };
}

interface Store {
  state: AppState;
  dispatch: (a: Action) => void;
  mode: 'api' | 'demo';
  phase: Phase;
  /** True after the server ended the session (expired/revoked) — the login page explains why. */
  sessionEnded: boolean;
  /** Reload the user's data from the server (no-op in demo mode). */
  refetch: () => Promise<void>;
  /** Retry the server connection after the "can't reach" screen. */
  retry: () => void;
  /** Call after a successful login/register/magic link: loads the user's data from the server. */
  completeSignIn: () => Promise<AppState | null>;
  signOut: (opts?: { everywhere?: boolean }) => Promise<void>;
  loadSampleData: () => Promise<void>;
  clearData: () => Promise<void>;
  /** Free trial / cancel (server decision in API mode). */
  setPlan: (plan: Plan) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const mode: 'api' | 'demo' = isApiMode() ? 'api' : 'demo';
  const [state, rawDispatch] = useReducer(reducer, undefined, mode === 'api' ? signedOut : loadDemo);
  const [phase, setPhase] = useState<Phase>(mode === 'api' ? 'loading' : 'ready');
  const [sessionEnded, setSessionEnded] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  /** Bumped on every optimistic change, so a slower state response can't overwrite a newer change. */
  const gen = useRef(0);
  /** Re-fetch once the send queue drains (after creates, rejections or a skipped refetch). */
  const resync = useRef(false);
  const needsResync = useRef(false);
  const booted = useRef(false);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  // Demo mode only: persist to localStorage. API mode never stores health data in the browser.
  useEffect(() => {
    if (mode !== 'demo') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode — demo still works in memory */
    }
  }, [state, mode]);

  const hydrate = useCallback((s: AppState) => rawDispatch({ type: 'HYDRATE', state: s }), []);

  const inflight = useRef<Promise<void> | null>(null);
  const refetch = useCallback((): Promise<void> => {
    if (mode !== 'api' || !userApi.signedIn) return Promise.resolve();
    // Focus + visibilitychange often fire together: share one request.
    if (inflight.current) return inflight.current;
    const g = gen.current;
    inflight.current = (async () => {
      try {
        const s = await exclusive(() => userApi.getState());
        // Don't overwrite optimistic changes that are still on their way to the server — try again once they land.
        if (pending.current === 0 && gen.current === g) hydrate(s);
        else resync.current = true;
        needsResync.current = false;
      } catch (e) {
        // Offline, or the server/proxy is down (5xx): the 30 s poll, focus or `online` retries.
        if (e instanceof ApiError && (e.offline || e.status >= 500)) needsResync.current = true;
      } finally {
        inflight.current = null;
      }
    })();
    return inflight.current;
  }, [mode, hydrate]);

  const settle = useCallback(async () => {
    if (pending.current !== 0 || !resync.current) return;
    resync.current = false;
    if (inflight.current) await inflight.current; // an older read may predate the last change
    await refetch();
  }, [refetch]);

  const boot = useCallback(async () => {
    setPhase('loading');
    try {
      await userApi.health();
    } catch {
      setPhase('unreachable');
      return;
    }
    // Restore the session and load the data in one turn, so another tab can't rotate the session in between.
    const restored = await exclusive(async (): Promise<AppState | null> => {
      if (!(await userApi.refresh())) return null;
      if (userApi.user?.role !== 'end_user') {
        await userApi.logout().catch(() => undefined); // a staff session doesn't belong in the app
        return null;
      }
      return userApi.getState().catch(() => null);
    });
    hydrate(restored ?? signedOut());
    setPhase('ready');
  }, [hydrate]);

  useEffect(() => {
    if (mode !== 'api' || booted.current) return;
    booted.current = true;
    void boot();
  }, [mode, boot]);

  // Keep in step with other devices (e.g. the mobile app) and recover after going offline.
  useEffect(() => {
    if (mode !== 'api') return;
    const onFocus = () => void refetch();
    const onVisible = () => document.visibilityState === 'visible' && void refetch();
    const onOnline = () => {
      if (needsResync.current) {
        notify({ tone: 'info', title: 'Back online', body: 'Your data has been refreshed from the server.' });
        void refetch();
      }
    };
    const onEnd = () => {
      hydrate(signedOut());
      setSessionEnded(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener(SESSION_END_EVENT, onEnd);
    // Background tabs don't poll (their throttled timers would fire together); they re-sync when shown.
    const t = window.setInterval(() => document.visibilityState !== 'hidden' && void refetch(), 30_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener(SESSION_END_EVENT, onEnd);
      window.clearInterval(t);
    };
  }, [mode, refetch, hydrate]);

  const fail = useCallback(
    (e: unknown, offlineTitle = 'Not saved — you’re offline') => {
      if (e instanceof ApiError) {
        if (e.offline) {
          needsResync.current = true;
          notify({ tone: 'error', title: offlineTitle, body: 'We’ll refresh your data when the connection is back.' });
          return;
        }
        if (e.status === 401) return; // the session-end handler takes over
        notify({ tone: 'error', title: e.status >= 500 ? 'Not saved — the server had a problem' : 'Couldn’t save that', body: apiMessage(e) });
      } else notify({ tone: 'error', title: 'Something went wrong', body: 'Please try again.' });
      resync.current = true; // roll back to the server's version
    },
    [],
  );

  const run = useCallback(
    async (op: () => Promise<unknown>, success?: StoreNotice) => {
      try {
        await exclusive(op);
        gen.current += 1; // a read that started before `op` must not overwrite its result
        if (inflight.current) await inflight.current;
        await refetch();
        if (success) notify(success);
      } catch (e) {
        fail(e, 'You’re offline');
        void settle();
        throw e;
      }
    },
    [refetch, fail, settle],
  );

  const signOut = useCallback(
    async (opts: { everywhere?: boolean } = {}) => {
      if (mode === 'demo') {
        rawDispatch({ type: 'SIGN_OUT' });
        return;
      }
      try {
        if (opts.everywhere) await exclusive(() => userApi.logoutAll());
        else await exclusive(() => userApi.logout());
      } catch {
        /* the local session is cleared regardless */
      }
      setSessionEnded(false);
      hydrate(signedOut());
    },
    [mode, hydrate],
  );

  const dispatch = useCallback(
    (action: Action) => {
      if (mode === 'demo') return rawDispatch(action);
      if (action.type === 'HYDRATE') return rawDispatch(action);
      const a = sanitize(action, latest.current);
      if (LOCAL_ONLY.has(a.type)) {
        // Pages use the store helpers for these; anything else that slips through is ignored safely.
        if (a.type === 'SIGN_OUT') void signOut();
        else if (a.type === 'RESET_DEMO') void run(() => userApi.loadSampleData()).catch(() => undefined);
        else if (a.type === 'SET_PLAN') void run(() => (a.plan === 'premium' ? userApi.startTrial() : userApi.cancelSubscription())).catch(() => undefined);
        return;
      }
      if (!userApi.signedIn) return;
      rawDispatch(a); // optimistic
      gen.current += 1;
      if (CREATES.has(a.type)) resync.current = true;
      pending.current += 1;
      queue.current = queue.current.then(async () => {
        try {
          await exclusive(() => userApi.sendAction(a));
        } catch (e) {
          fail(e);
        } finally {
          pending.current -= 1;
          gen.current += 1; // reads started before the server answered are stale now
        }
        await settle();
      });
    },
    [mode, signOut, run, fail, settle],
  );

  const completeSignIn = useCallback(async () => {
    if (mode === 'demo') return null;
    try {
      const s = await exclusive(() => userApi.getState());
      hydrate(s);
      setSessionEnded(false);
      setPhase('ready');
      return s;
    } catch (e) {
      fail(e);
      return null;
    }
  }, [mode, hydrate, fail]);

  const loadSampleData = useCallback(async () => {
    if (mode === 'demo') return rawDispatch({ type: 'RESET_DEMO' });
    await run(() => userApi.loadSampleData());
  }, [mode, run]);

  const clearData = useCallback(async () => {
    if (mode === 'demo') {
      const fresh = createEmptyState(state.today, state.auth.email);
      rawDispatch({ type: 'HYDRATE', state: { ...fresh, auth: { ...fresh.auth, onboarded: true }, profile: { ...fresh.profile, name: state.profile.name || 'Friend', goals: state.profile.goals } } });
      return;
    }
    await run(() => userApi.clearData());
  }, [mode, run, state.today, state.auth.email, state.profile.name, state.profile.goals]);

  const setPlan = useCallback(
    async (plan: Plan) => {
      if (mode === 'demo') return rawDispatch({ type: 'SET_PLAN', plan });
      await run(() => (plan === 'premium' ? userApi.startTrial() : userApi.cancelSubscription()));
    },
    [mode, run],
  );

  const value = useMemo<Store>(
    () => ({ state, dispatch, mode, phase, sessionEnded, refetch, retry: () => void boot(), completeSignIn, signOut, loadSampleData, clearData, setPlan }),
    [state, dispatch, mode, phase, sessionEnded, refetch, boot, completeSignIn, signOut, loadSampleData, clearData, setPlan],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside AppStoreProvider');
  return s;
}

export const useAppState = () => useStore().state;
export const useDispatch = () => useStore().dispatch;
