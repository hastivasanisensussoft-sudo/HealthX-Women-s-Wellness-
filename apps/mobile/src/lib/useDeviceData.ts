/** Hook for phone-only data (see deviceData.ts for what is stored and where). */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { keyFor, readDevice, writeDevice, type DeviceDataName } from './deviceData';
import { useStore } from './store';

// One copy per key for the whole app, so every screen showing the same item (e.g. the profile photo on
// Home, Profile and Edit profile) updates together.
const MISSING: unique symbol = Symbol('not loaded');
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
const loading = new Set<string>();

const publish = (key: string, v: unknown) => {
  cache.set(key, v);
  listeners.get(key)?.forEach((fn) => fn());
};

/** Phone-only value for the signed-in person, loaded once and saved on every change. */
export function useDeviceData<T>(name: DeviceDataName, initial: T) {
  const { state } = useStore();
  const userId = state.profile.id || state.profile.email;
  const key = keyFor(userId, name);
  const initialRef = useRef(initial);

  const subscribe = useCallback(
    (onChange: () => void) => {
      let set = listeners.get(key);
      if (!set) listeners.set(key, (set = new Set()));
      set.add(onChange);
      return () => {
        set.delete(onChange);
      };
    },
    [key],
  );
  const snapshot = useCallback(() => (cache.has(key) ? cache.get(key) : MISSING), [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(() => {
    if (cache.has(key) || loading.has(key)) return;
    loading.add(key);
    void readDevice(key).then((stored) => {
      loading.delete(key);
      if (cache.has(key)) return; // a save happened while loading
      let v: unknown = initialRef.current;
      try {
        if (stored) v = JSON.parse(stored);
      } catch {
        /* unreadable: start empty */
      }
      publish(key, v);
    });
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = (cache.has(key) ? cache.get(key) : initialRef.current) as T;
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      publish(key, v);
      void writeDevice(key, v === null || v === undefined ? null : JSON.stringify(v));
    },
    [key],
  );
  return { value: raw === MISSING ? initial : (raw as T), set, ready: raw !== MISSING };
}
