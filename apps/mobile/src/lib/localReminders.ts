/**
 * Reminders delivered by the phone itself (expo-notifications local notifications; no push server).
 * What to schedule comes from the shared, unit-tested reminderPlan() (notification settings, personal
 * reminders, the cycle estimate, consent, quiet hours, discreet wording and pregnancy mode); this file
 * only asks for permission and hands the plan to the OS. Not available on the web preview.
 */
import { reminderPlan, type AppState, type ReminderSchedule } from '@healthx/shared';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

export const localRemindersSupported = Platform.OS !== 'web';
const CHANNEL = 'reminders';

if (localRemindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function reminderPermission(): Promise<PermissionState> {
  if (!localRemindersSupported) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** Asks the OS for permission (only ever after the person chose to allow reminders). */
export async function requestReminderPermission(): Promise<PermissionState> {
  if (!localRemindersSupported) return 'unsupported';
  try {
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: AndroidImportance.DEFAULT });
    const p = await Notifications.requestPermissionsAsync();
    return p.granted ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

const trigger = (s: ReminderSchedule): Notifications.SchedulableNotificationTriggerInput => {
  const T = Notifications.SchedulableTriggerInputTypes;
  if (s.kind === 'daily') return { type: T.DAILY, hour: s.hour, minute: s.minute, channelId: CHANNEL };
  if (s.kind === 'weekly') return { type: T.WEEKLY, weekday: s.weekday, hour: s.hour, minute: s.minute, channelId: CHANNEL };
  return { type: T.DATE, date: s.at, channelId: CHANNEL };
};

/** Replaces everything HealthX scheduled with the current plan. Returns how many are scheduled. */
export async function syncLocalReminders(s: AppState | null): Promise<number> {
  if (!localRemindersSupported) return 0;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!s || !s.auth.signedIn) return 0;
    if ((await reminderPermission()) !== 'granted') return 0;
    const plan = reminderPlan(s);
    for (const p of plan) await Notifications.scheduleNotificationAsync({ content: { title: p.title, body: p.body, data: { source: 'healthx', key: p.key } }, trigger: trigger(p.schedule) });
    return plan.length;
  } catch {
    return 0;
  }
}
