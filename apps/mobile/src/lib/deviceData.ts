/**
 * Personal data the HealthX API can't store yet (decided 2026-10-27): weight history, the questions
 * for a healthcare provider, the grocery list, the profile photo and similar. It stays ON THIS PHONE:
 * - iOS / Android: the OS keychain / keystore (expo-secure-store, encrypted);
 * - web preview: sessionStorage, so it is gone when the tab closes.
 * It is never sent to the server, so Admins can't see it and it isn't in the account export.
 * Values are kept small (secure storage is meant for small items), so lists are capped.
 */
import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type DeviceDataName =
  | 'weights'
  | 'provider-questions'
  | 'grocery'
  | 'photo'
  | 'integration-types'
  | 'trial'
  | 'menopause-questions'
  | 'coach-chat'
  | 'coach-usage'
  | 'subscription'
  | 'integration-sync';
const NAMES: DeviceDataName[] = ['weights', 'provider-questions', 'grocery', 'photo', 'integration-types', 'trial', 'menopause-questions', 'coach-chat', 'coach-usage', 'subscription', 'integration-sync'];

/** Secure storage keys may only contain letters, digits, ".", "-" and "_". */
export const keyFor = (userId: string, name: DeviceDataName) => `healthx.device.${(userId || 'anon').replace(/[^\w.-]/g, '_')}.${name}`;

export async function readDevice(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writeDevice(key: string, value: string | null) {
  try {
    if (Platform.OS === 'web') {
      if (typeof sessionStorage === 'undefined') return;
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
      return;
    }
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch {
    /* storage unavailable: the value lasts until the app closes */
  }
}

/** Wording the screens show next to phone-only data. */
export const DEVICE_ONLY_NOTE = Platform.OS === 'web' ? 'Kept in this browser tab only — not synced to your account yet.' : 'Saved on this phone only (encrypted) — not synced to your account yet.';

/** Removes every phone-only item for an account (on account deletion), including the photo file. */
export async function clearDeviceData(userId: string) {
  try {
    const photo = JSON.parse((await readDevice(keyFor(userId, 'photo'))) ?? 'null') as string | null;
    if (Platform.OS !== 'web' && photo?.startsWith('file:')) {
      const f = new File(photo);
      if (f.exists) f.delete();
    }
  } catch {
    /* nothing to remove */
  }
  await Promise.all(NAMES.map((n) => writeDevice(keyFor(userId, n), null)));
}

