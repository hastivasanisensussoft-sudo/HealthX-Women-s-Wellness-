/**
 * Offline detection for the demo. On web it follows the browser's online/offline
 * events; everywhere it can also be simulated from Settings → Demo (no NetInfo
 * dependency is installed). Logs always save locally either way.
 */
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

let simulatedOffline = false;
const listeners = new Set<() => void>();

export function setSimulatedOffline(v: boolean) {
  simulatedOffline = v;
  listeners.forEach((l) => l());
}

export function getSimulatedOffline() {
  return simulatedOffline;
}

const isWeb = () => Platform.OS === 'web' && typeof window !== 'undefined';

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (isWeb()) {
    window.addEventListener('online', cb);
    window.addEventListener('offline', cb);
  }
  return () => {
    listeners.delete(cb);
    if (isWeb()) {
      window.removeEventListener('online', cb);
      window.removeEventListener('offline', cb);
    }
  };
}

function snapshot() {
  const browserOffline = isWeb() && typeof navigator !== 'undefined' && navigator.onLine === false;
  return simulatedOffline || browserOffline;
}

export function useOffline(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
