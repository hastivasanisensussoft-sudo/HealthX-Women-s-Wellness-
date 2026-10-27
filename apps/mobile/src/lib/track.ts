/**
 * App-usage events for the Web Admin's activity view (SRS §53): app opened, screens viewed (route
 * patterns like "/workout/[id]", never values), videos played, AI coach questions (never their text).
 *
 * Sent only in API mode, while signed in, with the analytics consent on (the API checks the consent
 * again and drops events without it). Offline demo mode sends nothing. Data writes (period, water…)
 * are recorded by the API itself, whatever this switch says, because they are the user's records.
 */
import type { UsageEvent } from '@healthx/shared';

import { api } from './api';

const MAX_BATCH = 20;
const FLUSH_MS = 4000;

let enabled = false;
let queue: { name: UsageEvent; detail?: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function setTracking(on: boolean) {
  enabled = on;
  if (!on) {
    queue = [];
    if (timer) clearTimeout(timer);
    timer = null;
  }
}

export function track(name: UsageEvent, detail?: string) {
  if (!enabled) return;
  queue.push(detail ? { name, detail: detail.slice(0, 120) } : { name });
  if (queue.length >= MAX_BATCH) void flush();
  else timer ??= setTimeout(() => void flush(), FLUSH_MS);
}

export async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  const batch = queue.splice(0, MAX_BATCH);
  if (!batch.length || !enabled || !api.signedIn) return;
  try {
    await api.trackEvents(batch);
  } catch {
    /* usage events are best-effort; the app never blocks on them */
  }
}
