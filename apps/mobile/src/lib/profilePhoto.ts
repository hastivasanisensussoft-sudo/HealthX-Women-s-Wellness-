/**
 * Profile photo from the camera or gallery (decided 2026-10-27: it stays on this phone).
 * - iOS / Android: the cropped photo is copied into the app's own documents folder; only its path is
 *   kept (in secure storage, see deviceData.ts).
 * - Web preview: a data URL in sessionStorage, gone when the tab closes.
 * It is never uploaded, so Admins can't see it. Sample avatars (profile.avatar) still sync as before.
 */
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useDeviceData } from './useDeviceData';

export type PhotoSource = 'camera' | 'library';
export type PickOutcome = 'saved' | 'cancelled' | 'denied' | 'too_large' | 'failed';

const MAX_WEB_BYTES = 1_500_000;

/** Deletes a photo file this app saved (ignores anything else, e.g. a web data URL). */
export function deletePhotoFile(uri: string | null | undefined) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* already gone */
  }
}

async function choose(source: PhotoSource): Promise<{ outcome: Exclude<PickOutcome, 'saved'> } | { outcome: 'saved'; uri: string }> {
  if (source === 'camera') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) return { outcome: 'denied' };
  }
  // The system photo picker needs no library permission.
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: Platform.OS === 'web' };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.length) return { outcome: 'cancelled' };
  const asset = res.assets[0];
  if (Platform.OS === 'web') {
    if (!asset.base64) return { outcome: 'failed' };
    if ((asset.fileSize ?? asset.base64.length) > MAX_WEB_BYTES) return { outcome: 'too_large' };
    return { outcome: 'saved', uri: `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` };
  }
  const ext = asset.mimeType === 'image/png' ? 'png' : 'jpg';
  const dest = new File(Paths.document, `profile-photo-${Date.now()}.${ext}`);
  await new File(asset.uri).copy(dest);
  return { outcome: 'saved', uri: dest.uri };
}

/** The signed-in person's own photo (or null) and the actions to change it. */
export function useProfilePhoto() {
  const { value, set, ready } = useDeviceData<string | null>('photo', null);
  const pick = useCallback(
    async (source: PhotoSource): Promise<PickOutcome> => {
      try {
        const r = await choose(source);
        if (r.outcome !== 'saved') return r.outcome;
        deletePhotoFile(value);
        set(r.uri);
        return 'saved';
      } catch {
        return 'failed';
      }
    },
    [value, set],
  );
  const remove = useCallback(() => {
    deletePhotoFile(value);
    set(null);
  }, [value, set]);
  return { uri: value, ready, pick, remove };
}

export const PICK_MESSAGES: Record<Exclude<PickOutcome, 'saved' | 'cancelled'>, string> = {
  denied: 'Camera access is off for HealthX — you can allow it in your phone settings.',
  too_large: 'That photo is too large for the web preview — try a smaller one.',
  failed: 'Couldn’t use that photo. Please try another.',
};
