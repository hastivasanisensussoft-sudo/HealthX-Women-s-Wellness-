import { ApiError } from '@/lib/api';

/** User-facing text for a failed API call: the server's own message for 4xx, a calm generic one for outages and 5xx. */
export function apiMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(e instanceof ApiError)) return fallback;
  if (!e.offline && e.status >= 500) return 'The HealthX server had a problem. Please try again in a moment.';
  return e.message;
}
