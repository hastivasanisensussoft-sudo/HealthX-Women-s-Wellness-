/**
 * Which reminders the phone should schedule (SRS §37, §41) — pure, so it is unit-tested; the mobile app
 * turns each entry into a local notification.
 * - daily: check-in, hydration, movement, sleep goal (at each type's time, if switched on);
 * - weekly: the weekly report (Mondays);
 * - one-off: the estimated-period reminder two days before the estimate, and dated reminders such as
 *   appointments.
 * Respects the notifications consent, quiet hours for daily reminders, discreet wording and pregnancy
 * mode (period reminders pause, D-21). Content notifications come from the in-app inbox instead.
 */
import { NOTIFICATION_TYPES } from './catalog';
import { COPY } from './copy';
import { cycleStateOf } from './selectors';
import { normalizeNotificationPrefs, type AppState } from './state';
import type { NotificationType } from './types';

/** `weekday` uses 1 = Sunday … 7 = Saturday (the phone's convention). */
export type ReminderSchedule = { kind: 'daily'; hour: number; minute: number } | { kind: 'weekly'; weekday: number; hour: number; minute: number } | { kind: 'date'; at: Date };

export interface PlannedReminder {
  key: string;
  title: string;
  body: string;
  schedule: ReminderSchedule;
}

const DAILY_COPY: Partial<Record<NotificationType, { title: string; body: string }>> = {
  habit: { title: 'Daily check-in', body: 'Time for your daily wellness check-in — it takes under 30 seconds.' },
  hydration: { title: 'Hydration', body: 'A glass of water now keeps you on track for today’s goal.' },
  workout: { title: 'Time to move', body: 'Even 10 minutes of movement counts.' },
  sleep: { title: 'Sleep goal', body: 'Time to start winding down for your sleep goal.' },
};

const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const clock = (t: string) => {
  const [hour, minute] = t.split(':').map(Number);
  return { hour, minute };
};
/** Local date-time for an ISO date and a HH:MM time. */
const at = (date: string, time: string) => {
  const [y, mo, d] = date.split('-').map(Number);
  const { hour, minute } = clock(time);
  return new Date(y, mo - 1, d, hour, minute, 0);
};

export function inQuietHours(time: string, q: AppState['notificationPrefs']['quietHours']) {
  if (!q.enabled) return false;
  const x = minutesOf(time);
  const from = minutesOf(q.from);
  const to = minutesOf(q.to);
  return from <= to ? x >= from && x < to : x >= from || x < to;
}

export function reminderPlan(s: AppState, now = new Date()): PlannedReminder[] {
  if (!s.consents.find((c) => c.id === 'notifications')?.granted) return [];
  const prefs = normalizeNotificationPrefs(s.notificationPrefs);
  const text = (title: string, body: string) => (prefs.discreet ? { title: 'HealthX', body: 'You have a new HealthX reminder.' } : { title, body });
  const out: PlannedReminder[] = [];

  for (const [type, copy] of Object.entries(DAILY_COPY) as [NotificationType, { title: string; body: string }][]) {
    const p = prefs.types[type];
    if (!p.enabled || inQuietHours(p.time, prefs.quietHours)) continue;
    out.push({ key: `type:${type}`, ...text(copy.title, copy.body), schedule: { kind: 'daily', ...clock(p.time) } });
  }
  if (prefs.types.report.enabled) out.push({ key: 'type:report', ...text('Weekly report', 'Your weekly summary is ready.'), schedule: { kind: 'weekly', weekday: 2, ...clock(prefs.types.report.time) } });

  // Period reminder: two days before the estimated start. Paused in pregnancy mode (D-21).
  const cs = cycleStateOf(s);
  if (prefs.types.cycle.enabled && s.profile.mode !== 'pregnancy' && cs.nextPeriodStart) {
    const when = at(cs.nextPeriodStart, prefs.types.cycle.time);
    when.setDate(when.getDate() - 2);
    if (when > now) out.push({ key: 'type:cycle', ...text('Cycle', `Your estimated period may begin soon. ${COPY.estimate}`), schedule: { kind: 'date', at: when } });
  }

  for (const r of s.reminders) {
    if (!r.enabled) continue;
    if (r.type === 'cycle' && s.profile.mode === 'pregnancy') continue;
    const example = NOTIFICATION_TYPES.find((n) => n.key === r.type)?.example ?? '';
    if (r.date) {
      const when = at(r.date, r.time);
      if (when > now) out.push({ key: `rem:${r.id}`, ...text(r.title, example), schedule: { kind: 'date', at: when } });
    } else if (!inQuietHours(r.time, prefs.quietHours)) {
      out.push({ key: `rem:${r.id}`, ...text(r.title, example), schedule: { kind: 'daily', ...clock(r.time) } });
    }
  }
  return out;
}
