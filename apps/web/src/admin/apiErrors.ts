import { ApiError } from '@/lib/api';

/** Human message for a rejected admin request (the server's own wording when it gives one). */
export function describeApiError(e: unknown): { title: string; body?: string } {
  if (e instanceof ApiError) {
    if (e.offline || e.status >= 500) return { title: 'Can’t reach the HealthX server', body: 'Nothing was saved. Check that the API is running and try again.' };
    if (e.status === 403) return { title: 'You don’t have permission to do that', body: e.message };
    if (e.status === 401) return { title: 'Your session has ended', body: 'Please sign in again.' };
    return { title: 'Couldn’t save', body: e.message };
  }
  return { title: 'Something went wrong', body: 'Please try again.' };
}
