/**
 * Connection to the HealthX API (apps/api) via the same-origin `/api` proxy.
 * - `userApi`  → the app user's session (refresh cookie `hx_rt`).
 * - `adminApi` → Web Admin staff session (separate cookie `hx_rta`), so both can be open at once.
 * Offline demo mode (VITE_DEMO_MODE=true, or chosen when the API can't be reached) keeps the old
 * browser-only behaviour: nothing is sent to a server and no permission is enforced.
 */
import { ApiClient } from '@healthx/shared';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';
const OFFLINE_DEMO_KEY = 'healthx.offlineDemo';

export const SESSION_END_EVENT = 'healthx:session-end';
export const ADMIN_SESSION_END_EVENT = 'healthx:admin-session-end';

export const userApi = new ApiClient({ baseUrl: BASE, client: 'web', onSessionEnd: () => window.dispatchEvent(new Event(SESSION_END_EVENT)) });
export const adminApi = new ApiClient({ baseUrl: BASE, client: 'web-admin', onSessionEnd: () => window.dispatchEvent(new Event(ADMIN_SESSION_END_EVENT)) });

/** True when the app should talk to the API (the default). */
export function isApiMode(): boolean {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return false;
  try {
    return localStorage.getItem(OFFLINE_DEMO_KEY) !== '1';
  } catch {
    return true;
  }
}

/** Switch between API mode and the browser-only offline demo (reloads the page). */
export function setOfflineDemo(on: boolean) {
  try {
    if (on) localStorage.setItem(OFFLINE_DEMO_KEY, '1');
    else localStorage.removeItem(OFFLINE_DEMO_KEY);
  } catch {
    /* storage unavailable */
  }
  window.location.reload();
}

export { ApiError } from '@healthx/shared';
