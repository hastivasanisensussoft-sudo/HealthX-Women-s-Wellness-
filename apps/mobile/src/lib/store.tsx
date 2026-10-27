/**
 * App state for the mobile app.
 *
 * API mode (default): the HealthX API (apps/api) is the source of truth for the signed-in user's
 * data. Each dispatch is applied optimistically with the shared reducer and sent to the server
 * (POST /v1/me/actions, idempotent ids, in order). Once the queue drains the state is re-fetched,
 * which adopts the server's ids for new entries and rolls back refused writes (dropped, never
 * retried). It is also re-fetched on foreground and every 30 s, so web changes appear here.
 * Health data is NOT cached on the device in API mode (memory only).
 *
 * Offline demo mode (EXPO_PUBLIC_DEMO_MODE=true, or chosen when the server can't be reached):
 * the original device-only demo — shared reducer + AsyncStorage, nothing sent anywhere.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STATE_VERSION,
  buildDailyPlan,
  createEmptyState,
  createInitialState,
  reducer,
  todayISO,
  type Action,
  type AppState,
} from '@healthx/shared';
import { router, usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState, View } from 'react-native';

import { api, ApiError, isOfflineDemoChosen, onSessionEnd, setOfflineDemoChosen } from './api';
import { useToast } from './toast';
import { BootCover, OfflineDemoBanner, ServerUnreachable } from '@/components/ConnectionStates';

const KEY = 'healthx.mobile.state';
const SYNC_MS = 30_000;
const STAFF_MESSAGE = 'Staff accounts sign in to the HealthX Web Admin, not the app.';
/** Routes a signed-out user may see; everything else redirects to Welcome. */
const PUBLIC_PATHS = new Set(['/', '/welcome', '/login', '/signup', '/forgot-password', '/verify-email']);

export type Mode = 'api' | 'offline';
type Status = 'booting' | 'ready' | 'unreachable';

export interface AuthApi {
  login(email: string, password: string): Promise<void>;
  register(input: { name: string; email: string; password: string; acceptTerms: boolean }): Promise<void>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  requestMagicLink(email: string): Promise<void>;
  verifyMagicLink(token: string): Promise<void>;
  /** Confirms an email address from a "Confirm your HealthX email" link (no session needed). */
  verifyEmail(token: string): Promise<void>;
  /** Apple / Google sign-in. In API mode the server reports that OAuth isn't configured. */
  oauth(provider: 'apple' | 'google'): Promise<void>;
}

export interface AccountApi {
  /** Sends a new "Confirm your HealthX email" link (API mode). */
  resendVerification(): Promise<void>;
  exportData(): Promise<Record<string, unknown>>;
  deleteAccount(password: string): Promise<void>;
  startTrial(): Promise<void>;
  cancelSubscription(): Promise<void>;
  loadSampleData(): Promise<void>;
}

interface StoreValue {
  state: AppState;
  dispatch: (a: Action) => void;
  ready: boolean;
  mode: Mode;
  /** Where signed-out screens send the user: Log in after a session ended elsewhere, else Welcome. */
  signedOutRoute: '/welcome' | '/login';
  /** False while the signed-in account hasn't confirmed its email (API mode). */
  emailVerified: boolean;
  auth: AuthApi;
  account: AccountApi;
  /** Re-fetch from the server (API mode). */
  sync: () => Promise<void>;
  switchToOfflineDemo: () => Promise<void>;
  switchToServer: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Signed-out shell — no sample data is shown to a signed-out API user. */
const signedOut = (): AppState => {
  const s = createEmptyState(todayISO(), '');
  return { ...s, auth: { ...s.auth, signedIn: false, onboarded: false } };
};

/** Offline demo: first launch starts signed out so welcome → auth → onboarding is visible. */
const freshDemo = (): AppState => {
  const s = createInitialState(todayISO());
  return { ...s, auth: { ...s.auth, signedIn: false } };
};

/** Readable message for any error thrown by the API client. */
export const errorMessage = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  e instanceof ApiError ? e.message : e instanceof Error && e.message ? e.message : fallback;

/** Actions the app must never send to the server (identity, entitlement, whole-state). */
const LOCAL_ONLY = new Set(['HYDRATE', 'SIGN_IN', 'SIGN_UP', 'SIGN_OUT', 'RESET_DEMO', 'SET_PLAN', 'SET_ROLE', 'SET_WEIGHTS']);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, signedOut);
  const [mode, setMode] = useState<Mode>('api');
  const [signedOutRoute, setSignedOutRoute] = useState<'/welcome' | '/login'>('/welcome');
  const [status, setStatusState] = useState<Status>('booting');
  const statusRef = useRef<Status>('booting');
  const setStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatusState(s);
  }, []);
  const toast = useToast();
  const [emailVerified, setEmailVerifiedState] = useState(true);
  const verifiedRef = useRef(true);
  const setEmailVerified = useCallback((v: boolean) => {
    verifiedRef.current = v;
    setEmailVerifiedState(v);
  }, []);
  const modeRef = useRef<Mode>('api');
  const loaded = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const writes = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const hydrate = useCallback((s: AppState) => rawDispatch({ type: 'HYDRATE', state: s }), []);

  // ---------- server sync ----------
  const sync = useCallback(async () => {
    // While writes are queued, skip: the queue re-syncs itself once it drains.
    if (modeRef.current !== 'api' || !api.signedIn || pending.current > 0) return;
    const w = writes.current;
    try {
      const s = await api.getState();
      // A write that started meanwhile isn't in this copy — its own re-sync follows.
      if (pending.current === 0 && writes.current === w) hydrate(s);
      if (!verifiedRef.current) setEmailVerified((await api.me()).user.emailVerified !== false);
    } catch {
      // Offline or session ended: the next foreground / 30 s tick (or the session-end handler) takes over.
    }
  }, [hydrate, setEmailVerified]);

  const send = useCallback(
    (a: Action) => {
      pending.current += 1;
      writes.current += 1;
      queue.current = queue.current.then(async () => {
        try {
          await api.sendAction(a);
        } catch (e) {
          // A refused write (400/404/409/413/429) or one that couldn't be delivered is dropped — never
          // retried — and surfaced; the re-sync below rolls it back. 401: the session-end handler takes over.
          if (!(e instanceof ApiError && e.status === 401)) toast(e instanceof ApiError && e.offline ? 'Not saved — can’t reach the HealthX server.' : errorMessage(e), 'error');
        } finally {
          pending.current -= 1;
          // Once writes settle, re-fetch: entities created here get their server ids (the shared reducer
          // makes ids on each side), and anything the server refused disappears.
          if (pending.current === 0) void sync();
        }
      });
    },
    [sync, toast],
  );

  const loadFromServer = useCallback(async () => {
    const s = await api.getState();
    setSignedOutRoute('/welcome');
    setEmailVerified(api.user?.emailVerified !== false);
    hydrate(s);
  }, [hydrate, setEmailVerified]);

  // ---------- boot ----------
  const connect = useCallback(async () => {
    setStatus('booting');
    try {
      await api.health();
    } catch {
      setStatus('unreachable');
      return;
    }
    try {
      if (await api.refresh()) {
        if (api.user?.role !== 'end_user') {
          await api.logout().catch(() => undefined);
          hydrate(signedOut());
        } else await loadFromServer();
      } else hydrate(signedOut());
      setStatus('ready');
    } catch (e) {
      if (e instanceof ApiError && e.offline) setStatus('unreachable');
      else {
        hydrate(signedOut());
        setStatus('ready');
      }
    }
  }, [hydrate, loadFromServer, setStatus]);

  const loadOfflineDemo = useCallback(async () => {
    let next = freshDemo();
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as AppState;
        if (saved.version === STATE_VERSION) {
          const today = todayISO();
          // Carry the demo forward to the real "today" so cycle day etc. keep moving.
          next = { ...saved, today, plan: saved.plan.date === today ? saved.plan : { date: today, items: buildDailyPlan(saved, today) } };
        }
      }
    } catch {
      // Storage unavailable → keep in-memory demo state.
    }
    hydrate(next);
    loaded.current = true;
    setStatus('ready');
  }, [hydrate, setStatus]);

  useEffect(() => {
    (async () => {
      if (await isOfflineDemoChosen()) {
        modeRef.current = 'offline';
        setMode('offline');
        await loadOfflineDemo();
      } else await connect();
    })();
  }, [connect, loadOfflineDemo]);

  // Offline demo persists to the device; API mode never caches health data on the device.
  useEffect(() => {
    if (mode !== 'offline' || !loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, mode]);

  // Session ended elsewhere (logout-all, deactivation, expiry) → back to Log in (via the guard below).
  useEffect(() => {
    onSessionEnd(() => {
      setSignedOutRoute('/login');
      hydrate(signedOut());
      toast('Your session ended — please sign in again.', 'info');
    });
    return () => onSessionEnd(null);
  }, [hydrate, toast]);

  // Signed-out users only see the public screens (deep links included).
  const pathname = usePathname();
  const signedIn = state.auth.signedIn;
  useEffect(() => {
    if (status === 'ready' && !signedIn && !PUBLIC_PATHS.has(pathname)) router.replace(signedOutRoute);
  }, [status, signedIn, pathname, signedOutRoute]);

  // Pick up changes from other devices: on foreground and periodically.
  useEffect(() => {
    if (mode !== 'api' || status !== 'ready') return;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') void sync();
    });
    const t = setInterval(() => void sync(), SYNC_MS);
    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, [mode, status, sync]);

  // ---------- auth ----------
  const afterSignIn = useCallback(async () => {
    if (api.user?.role !== 'end_user') {
      await api.logout().catch(() => undefined);
      throw new Error(STAFF_MESSAGE);
    }
    await loadFromServer();
  }, [loadFromServer]);

  const auth = useMemo<AuthApi>(
    () => ({
      async login(email, password) {
        if (modeRef.current === 'offline') {
          await sleep(500);
          rawDispatch({ type: 'SIGN_IN', email });
          return;
        }
        const r = await api.login(email, password);
        if (r.kind === 'mfa') throw new Error(STAFF_MESSAGE);
        await afterSignIn();
      },
      async register(input) {
        if (modeRef.current === 'offline') {
          await sleep(500);
          rawDispatch({ type: 'SIGN_UP', email: input.email, name: input.name });
          return;
        }
        await api.register(input);
        await loadFromServer();
      },
      async logout() {
        if (modeRef.current === 'offline') {
          rawDispatch({ type: 'SIGN_OUT' });
          return;
        }
        await queue.current; // let queued writes finish first
        await api.logout().catch(() => undefined);
        hydrate(signedOut());
      },
      async logoutAll() {
        if (modeRef.current === 'offline') {
          rawDispatch({ type: 'SIGN_OUT' });
          return;
        }
        await queue.current;
        await api.logoutAll();
        hydrate(signedOut());
      },
      async forgotPassword(email) {
        if (modeRef.current === 'offline') return void (await sleep(600));
        await api.forgotPassword(email);
      },
      async requestMagicLink(email) {
        if (modeRef.current === 'offline') return void (await sleep(600));
        await api.requestMagicLink(email);
      },
      async verifyMagicLink(token) {
        if (modeRef.current === 'offline') throw new Error('Magic links need the HealthX server.');
        await api.verifyMagicLink(token);
        await afterSignIn();
      },
      async verifyEmail(token) {
        if (modeRef.current === 'offline') throw new Error('Email confirmation needs the HealthX server.');
        await api.verifyEmail(token);
        // The link may belong to another account than the one signed in here — re-read this one.
        if (api.signedIn) setEmailVerified((await api.me()).user.emailVerified !== false);
      },
      async oauth(provider) {
        if (modeRef.current === 'offline') {
          await sleep(600);
          rawDispatch({ type: 'SIGN_IN', email: provider === 'apple' ? 'aisha@privaterelay.example' : 'aisha@example.com' });
          return;
        }
        await api.oauth(provider); // the API answers 501 "not configured" — surfaced to the user
      },
    }),
    [afterSignIn, hydrate, loadFromServer, setEmailVerified],
  );

  // ---------- account ----------
  const account = useMemo<AccountApi>(
    () => ({
      async resendVerification() {
        if (modeRef.current === 'offline') throw new Error('Email confirmation needs the HealthX server.');
        await api.resendVerification();
      },
      async exportData() {
        if (modeRef.current === 'offline') {
          const { articles: _a, workouts: _w, ...data } = stateRef.current;
          return { exportedAt: new Date().toISOString(), format: 'healthx-export-v1 (offline demo)', data };
        }
        await queue.current;
        return api.exportData();
      },
      async deleteAccount(password) {
        if (modeRef.current === 'offline') {
          await AsyncStorage.removeItem(KEY).catch(() => undefined);
          hydrate(freshDemo());
          return;
        }
        await queue.current;
        await api.deleteAccount(password);
        await api.logout().catch(() => undefined); // clears the stored refresh token
        hydrate(signedOut());
      },
      async startTrial() {
        if (modeRef.current === 'offline') return rawDispatch({ type: 'SET_PLAN', plan: 'premium' });
        await api.startTrial();
        await sync();
      },
      async cancelSubscription() {
        if (modeRef.current === 'offline') return rawDispatch({ type: 'SET_PLAN', plan: 'free' });
        await api.cancelSubscription();
        await sync();
      },
      async loadSampleData() {
        if (modeRef.current === 'offline') {
          await AsyncStorage.removeItem(KEY).catch(() => undefined);
          rawDispatch({ type: 'RESET_DEMO' });
          return;
        }
        await queue.current;
        await api.loadSampleData();
        await sync();
      },
    }),
    [hydrate, sync],
  );

  // ---------- dispatch (stable identity — screens may depend on it in effects) ----------
  const dispatch = useCallback(
    (a: Action) => {
      if (modeRef.current === 'offline') return rawDispatch(a);
      if (a.type === 'HYDRATE') return rawDispatch(a);
      if (a.type === 'SIGN_OUT') return void auth.logout();
      if (a.type === 'RESET_DEMO') return void account.loadSampleData().catch((e) => toast(errorMessage(e), 'error'));
      if (a.type === 'SET_PLAN') return void (a.plan === 'premium' ? account.startTrial() : account.cancelSubscription()).catch((e) => toast(errorMessage(e), 'error'));
      if (LOCAL_ONLY.has(a.type)) return; // identity/role changes never come from the app
      rawDispatch(a); // optimistic
      send(a);
    },
    [account, auth, send, toast],
  );

  /** The navigator is only mounted while status is 'ready' — navigate only then. */
  const switchToOfflineDemo = useCallback(async () => {
    const wasMounted = statusRef.current === 'ready';
    await setOfflineDemoChosen(true);
    modeRef.current = 'offline';
    setMode('offline');
    await loadOfflineDemo();
    if (wasMounted) router.replace('/');
  }, [loadOfflineDemo]);

  const switchToServer = useCallback(async () => {
    await setOfflineDemoChosen(false);
    modeRef.current = 'api';
    setMode('api');
    loaded.current = false;
    const wasMounted = statusRef.current === 'ready';
    hydrate(signedOut());
    await connect();
    if (wasMounted && statusRef.current === 'ready') router.replace('/');
  }, [connect, hydrate]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      ready: status === 'ready',
      mode,
      signedOutRoute,
      emailVerified: mode === 'offline' || emailVerified,
      auth,
      account,
      sync,
      switchToOfflineDemo,
      switchToServer,
    }),
    [state, dispatch, status, mode, signedOutRoute, emailVerified, auth, account, sync, switchToOfflineDemo, switchToServer],
  );

  if (status === 'unreachable') return <ServerUnreachable onRetry={connect} onOfflineDemo={switchToOfflineDemo} />;
  return (
    <StoreContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {mode === 'offline' ? <OfflineDemoBanner onConnect={() => void switchToServer()} /> : null}
        <View style={{ flex: 1 }}>{children}</View>
        {/* Loading cover while the session/state loads (the splash route has its own). */}
        {status === 'booting' && pathname !== '/' ? <BootCover /> : null}
      </View>
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/** Offline demo only: forget the device copy (used by Settings → reset). */
export async function clearPersistedState() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
