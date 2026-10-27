import { router } from 'expo-router';

/** Maps the platform-neutral deep links used in shared mock data to mobile routes. */
export function openLink(to: string) {
  if (to.startsWith('/insights/weekly')) return router.push('/weekly-report');
  if (to === '/insights') return router.push('/insights');
  return router.push(to as never);
}
