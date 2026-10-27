import { userApi } from '@/lib/api';

const LOCK = 'healthx-session';
const MAX_HOLD_MS = 20_000;
const noop = () => undefined;

/**
 * Runs one session-bearing API call at a time across this browser's tabs. All tabs share one refresh cookie;
 * refresh tokens rotate (and rotation ends the other tabs' access tokens), and the server revokes the whole
 * session family when a rotated-out token comes back. Two tabs renewing at the same moment would therefore
 * sign the user out everywhere — taking turns avoids that. A stuck request frees the lock after 20 s.
 */
export async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return fn();
  let result!: Promise<T>;
  await locks.request(LOCK, () => {
    result = fn();
    return Promise.race([result.then(noop, noop), new Promise<void>((r) => setTimeout(r, MAX_HOLD_MS))]);
  });
  return result;
}

/** Restores/renews the session from the refresh cookie (one tab at a time). */
export const refreshSession = () => exclusive(() => userApi.refresh());
