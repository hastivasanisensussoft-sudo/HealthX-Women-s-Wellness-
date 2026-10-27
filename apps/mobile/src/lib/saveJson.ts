/**
 * Hands a JSON export to the user: a file download on web, the system share sheet on iOS/Android
 * (save to Files, AirDrop, email…). A file-based export would need expo-file-system + expo-sharing,
 * which aren't installed — the share sheet keeps dependencies minimal.
 */
import { Platform, Share } from 'react-native';

export async function saveJson(filename: string, data: unknown): Promise<'downloaded' | 'shared' | 'dismissed'> {
  const json = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'downloaded';
  }
  const r = await Share.share({ title: filename, message: json });
  return r.action === Share.dismissedAction ? 'dismissed' : 'shared';
}
