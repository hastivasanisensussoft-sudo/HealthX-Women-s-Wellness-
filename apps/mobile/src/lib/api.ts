/**
 * Connection to the HealthX API (apps/api) for the mobile app.
 *
 * - Base URL: EXPO_PUBLIC_API_URL (default http://127.0.0.1:4000). On a phone or emulator,
 *   127.0.0.1 is the device itself, so set it to your computer's LAN IP, e.g.
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 (Android emulator: http://10.0.2.2:4000).
 * - Refresh token: iOS Keychain / Android Keystore via expo-secure-store (SRS §47 "tokens
 *   stored only in Keychain or Keystore"). SecureStore doesn't exist on web, so the web
 *   preview keeps it in sessionStorage for the tab's lifetime (preview/testing only).
 * - Access token: memory only (inside ApiClient).
 * - Offline demo mode (EXPO_PUBLIC_DEMO_MODE=true, or chosen when the API can't be reached)
 *   keeps the original device-only demo: nothing is sent to a server, no permission is enforced.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient, type TokenStore } from '@healthx/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '');
const REFRESH_KEY = 'healthx.refreshToken';
const OFFLINE_DEMO_KEY = 'healthx.mobile.offlineDemo';

const webStore: TokenStore = {
  async get() {
    try {
      return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  async set(token) {
    try {
      if (typeof sessionStorage === 'undefined') return;
      if (token) sessionStorage.setItem(REFRESH_KEY, token);
      else sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      /* storage unavailable — session lasts until reload */
    }
  },
};

const secureStore: TokenStore = {
  get: () => SecureStore.getItemAsync(REFRESH_KEY),
  async set(token) {
    if (token) await SecureStore.setItemAsync(REFRESH_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

let sessionEndListener: (() => void) | null = null;
/** The store registers a handler for "session ended" (revoked / expired / signed out elsewhere). */
export function onSessionEnd(fn: (() => void) | null) {
  sessionEndListener = fn;
}

export const api = new ApiClient({
  baseUrl: API_URL,
  client: 'mobile',
  tokenStore: Platform.OS === 'web' ? webStore : secureStore,
  onSessionEnd: () => sessionEndListener?.(),
});

export async function isOfflineDemoChosen(): Promise<boolean> {
  if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') return true;
  try {
    return (await AsyncStorage.getItem(OFFLINE_DEMO_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setOfflineDemoChosen(on: boolean) {
  try {
    if (on) await AsyncStorage.setItem(OFFLINE_DEMO_KEY, '1');
    else await AsyncStorage.removeItem(OFFLINE_DEMO_KEY);
  } catch {
    /* ignore */
  }
}

export { ApiError } from '@healthx/shared';
