/**
 * Notification preferences + reminders (SRS §41: "All notifications must be configurable"): type switches
 * with times, discreet mode, editable quiet hours, daily or one-date reminders. Reminders are delivered by
 * the phone itself (local notifications) — there is no push server yet.
 */
import { NOTIFICATION_TYPES, formatClock, formatDate, normalizeNotificationPrefs, reminderPlan, type ISODate, type NotificationPrefs, type NotificationType } from '@healthx/shared';
import { router, useFocusEffect } from 'expo-router';
import { BellRing, CalendarDays, Clock, EyeOff, Plus, ShieldCheck, Smartphone, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { BackendNote, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateSheet } from '@/components/DateSheet';
import { EmptyState } from '@/components/Feedback';
import { Chip, Stepper, TextField, ToggleRow } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { GroupHeader, PageIntro, TintIcon } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { localRemindersSupported, reminderPermission, requestReminderPermission, syncLocalReminders, type PermissionState } from '@/lib/localReminders';
import { useStore } from '@/lib/store';
import { colors, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const toClock = (m: number) => `${String(Math.floor((((m % 1440) + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const TONE: Record<NotificationType, TileTone> = { cycle: 'rose', habit: 'lavender', hydration: 'sky', workout: 'green', sleep: 'indigo', appointment: 'peach', content: 'butter', report: 'indigo' };

export default function NotificationSettings() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const prefs = state.notificationPrefs;
  const [editing, setEditing] = useState<NotificationType | null>(null);
  const [time, setTime] = useState(540);
  const [remOpen, setRemOpen] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remType, setRemType] = useState<NotificationType>('habit');
  const [remTime, setRemTime] = useState(1200);
  const [remErr, setRemErr] = useState<string | null>(null);
  const [remDate, setRemDate] = useState<ISODate | null>(null);
  const [remRepeat, setRemRepeat] = useState<'daily' | 'date'>('daily');
  const [remDateOpen, setRemDateOpen] = useState(false);
  const [quietOpen, setQuietOpen] = useState(false);
  const [quiet, setQuiet] = useState({ from: toMin(prefs.quietHours.from), to: toMin(prefs.quietHours.to) });
  const [permission, setPermission] = useState<PermissionState>(localRemindersSupported ? 'undetermined' : 'unsupported');
  const onCount = NOTIFICATION_TYPES.filter((t) => prefs.types[t.key].enabled).length;
  const consented = !!state.consents.find((c) => c.id === 'notifications')?.granted;
  const scheduled = reminderPlan(state).length;

  // Re-read the phone's permission whenever the screen is shown (it can change in the OS settings).
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void reminderPermission().then((p) => live && setPermission(p));
      return () => {
        live = false;
      };
    }, []),
  );

  const save = (next: NotificationPrefs) => dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: normalizeNotificationPrefs(next) });
  const setType = (k: NotificationType, patch: Partial<{ enabled: boolean; time: string }>) => save({ ...prefs, types: { ...prefs.types, [k]: { ...prefs.types[k], ...patch } } });

  const allowOnPhone = async () => {
    const p = await requestReminderPermission();
    setPermission(p);
    if (p === 'granted') {
      const n = await syncLocalReminders(state);
      toast(n ? `${n} reminder${n === 1 ? '' : 's'} scheduled on this phone` : 'Reminders allowed on this phone');
    } else if (p === 'denied') toast('Notifications are off for HealthX in your phone settings', 'info');
  };

  return (
    <Screen back>
      <PageIntro eyebrow={`${onCount} of ${NOTIFICATION_TYPES.length} types on`} title="Notification settings" subtitle="Choose what HealthX may remind you about and when. Every type can be turned off." />

      <Card tone={consented && permission === 'granted' ? 'mint' : 'lavender'} style={{ gap: 10, marginBottom: 14 }}>
        <View style={styles.privacyHead}>
          <TintIcon icon={consented ? Smartphone : ShieldCheck} tone={consented && permission === 'granted' ? 'green' : 'lavender'} size={36} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium">
              {!consented
                ? 'Notifications consent is off'
                : permission === 'granted'
                  ? `Delivered by this phone · ${scheduled} scheduled`
                  : permission === 'unsupported'
                    ? 'Reminders arrive in the phone app'
                    : permission === 'denied'
                      ? 'Blocked in your phone settings'
                      : 'Allow reminders on this phone'}
            </AppText>
            <AppText variant="caption" muted>
              {!consented
                ? 'Nothing is sent while it is off. Turn it on in the Privacy Center to use reminders.'
                : permission === 'unsupported'
                  ? 'This web preview can’t show reminders. Your settings are saved and apply on your phone.'
                  : permission === 'denied'
                    ? 'Open your phone settings and allow notifications for HealthX.'
                    : permission === 'granted'
                      ? 'Your phone shows them even when the app is closed. Quiet hours and discreet mode apply.'
                      : 'Your phone will ask once. You can change this any time.'}
            </AppText>
          </View>
        </View>
        {!consented ? (
          <Button label="Open Privacy Center" size="sm" variant="soft" onPress={() => router.push('/privacy')} style={{ alignSelf: 'flex-start' }} />
        ) : permission === 'undetermined' ? (
          <Button label="Allow reminders" icon={BellRing} size="sm" onPress={() => void allowOnPhone()} style={{ alignSelf: 'flex-start' }} />
        ) : permission === 'denied' ? (
          <Button label="Open phone settings" size="sm" variant="soft" onPress={() => void Linking.openSettings()} style={{ alignSelf: 'flex-start' }} />
        ) : null}
      </Card>

      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {NOTIFICATION_TYPES.map((t, i) => {
          const p = prefs.types[t.key];
          const tone = TILE_TONES[TONE[t.key]];
          return (
            <View key={t.key} style={[styles.row, i < NOTIFICATION_TYPES.length - 1 && styles.border]}>
              <View style={[styles.icon, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                <KeyIcon name={t.icon} size={18} color={tone.icon} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{t.label}</AppText>
                <AppText variant="caption" muted numberOfLines={2}>
                  “{prefs.discreet ? 'You have a new reminder from HealthX.' : t.example}”
                </AppText>
                {p.enabled ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t.label} time ${formatClock(p.time)}, change`}
                    onPress={() => {
                      setEditing(t.key);
                      setTime(toMin(p.time));
                    }}
                    style={styles.time}>
                    <Clock size={12} color={palette.green[700]} />
                    <AppText variant="smallMedium" color={palette.green[700]}>
                      {formatClock(p.time)} · change
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
              <Switch accessibilityLabel={t.label} value={p.enabled} onValueChange={(v) => setType(t.key, { enabled: v })} trackColor={{ false: palette.ink[200], true: palette.green[600] }} thumbColor="#fff" ios_backgroundColor={palette.ink[200]} />
            </View>
          );
        })}
      </Card>

      <GroupHeader eyebrow="Privacy" title="Privacy & quiet time" />
      <Card>
        <View style={styles.privacyHead}>
          <TintIcon icon={EyeOff} tone="lavender" size={36} />
          <AppText variant="small" muted style={{ flex: 1 }}>
            Discreet mode keeps lock-screen text neutral — useful on shared devices.
          </AppText>
        </View>
        <ToggleRow
          title="Discreet notifications"
          subtitle="Lock-screen text never mentions periods or symptoms."
          right={<Pill label="Recommended" tone="lavender" />}
          value={prefs.discreet}
          onChange={(v) => save({ ...prefs, discreet: v })}
        />
        <ToggleRow
          title="Quiet hours"
          subtitle={`${formatClock(prefs.quietHours.from)} – ${formatClock(prefs.quietHours.to)} · daily reminders in this window are skipped`}
          value={prefs.quietHours.enabled}
          onChange={(v) => save({ ...prefs, quietHours: { ...prefs.quietHours, enabled: v } })}
          last
        />
        <Button
          label="Change quiet hours"
          icon={Clock}
          size="sm"
          variant="ghost"
          onPress={() => {
            setQuiet({ from: toMin(prefs.quietHours.from), to: toMin(prefs.quietHours.to) });
            setQuietOpen(true);
          }}
          style={{ alignSelf: 'flex-start' }}
        />
      </Card>

      <GroupHeader eyebrow={`${state.reminders.filter((r) => r.enabled).length} on`} title="Reminders" action="Add" onAction={() => setRemOpen(true)} />
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {state.reminders.length ? (
          state.reminders.map((r, i) => (
            <View key={r.id} style={[styles.row, i < state.reminders.length - 1 && styles.border]}>
              <TintIcon icon={BellRing} tone={TONE[r.type] ?? 'green'} size={38} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{r.title}</AppText>
                <AppText variant="caption" muted>
                  {formatClock(r.time)} · {r.date ? `${formatDate(r.date, 'medium')}${r.date < state.today ? ' (past)' : ''}` : 'Daily'}
                  {r.type === 'cycle' ? ' · estimate' : ''}
                  {r.type === 'cycle' && state.profile.mode === 'pregnancy' ? ' · paused in pregnancy mode' : ''}
                </AppText>
              </View>
              <Switch accessibilityLabel={r.title} value={r.enabled} onValueChange={() => dispatch({ type: 'TOGGLE_REMINDER', id: r.id })} trackColor={{ false: palette.ink[200], true: palette.green[600] }} thumbColor="#fff" ios_backgroundColor={palette.ink[200]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${r.title}`}
                onPress={() => {
                  dispatch({ type: 'DELETE_REMINDER', id: r.id });
                  toast('Reminder deleted', 'info');
                }}
                hitSlop={8}
                style={styles.del}>
                <Trash2 size={15} color={palette.ink[400]} />
              </Pressable>
            </View>
          ))
        ) : (
          <EmptyState icon={BellRing} title="No reminders" action="Add reminder" onAction={() => setRemOpen(true)} />
        )}
      </Card>
      <Button label="Add reminder" icon={Plus} variant="secondary" full onPress={() => setRemOpen(true)} style={{ marginTop: 12 }} />
      <BackendNote style={{ marginTop: 14 }} text="Settings and reminders sync to your account. Reminders are shown by this phone (local notifications); server push — e.g. new content from the HealthX team — needs a push provider and device registration on the backend." />

      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title="Reminder time"
        footer={
          <Button
            label="Save time"
            full
            onPress={() => {
              if (editing) setType(editing, { time: toClock(time) });
              setEditing(null);
              toast('Time updated');
            }}
          />
        }>
        <Stepper label="Time" value={time} onChange={setTime} step={15} min={-100000} max={100000} format={(v) => formatClock(toClock(v))} />
      </Sheet>

      <Sheet
        visible={remOpen}
        onClose={() => setRemOpen(false)}
        title="New reminder"
        footer={
          <Button
            label="Add reminder"
            full
            onPress={() => {
              if (remTitle.trim().length < 3) return setRemErr('Give the reminder a name (3+ characters).');
              if (remRepeat === 'date' && (!remDate || remDate < state.today)) return setRemErr('Choose today or a future date.');
              dispatch({
                type: 'ADD_REMINDER',
                reminder: { title: remTitle.trim(), type: remType, time: toClock(remTime), enabled: true, ...(remRepeat === 'date' && remDate ? { date: remDate } : {}) },
              });
              toast('Reminder added');
              setRemTitle('');
              setRemErr(null);
              setRemDate(null);
              setRemRepeat('daily');
              setRemOpen(false);
            }}
          />
        }>
        <View style={{ gap: 14 }}>
          <TextField label="Reminder" value={remTitle} onChangeText={setRemTitle} placeholder="e.g. Evening stretch" error={remErr} maxLength={60} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {NOTIFICATION_TYPES.map((t) => (
              <Chip key={t.key} label={t.label} selected={remType === t.key} onPress={() => setRemType(t.key)} />
            ))}
          </View>
          <Stepper label="Time" value={remTime} onChange={setRemTime} step={15} min={-100000} max={100000} format={(v) => formatClock(toClock(v))} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Every day" selected={remRepeat === 'daily'} onPress={() => setRemRepeat('daily')} />
            <Chip label="On one date" selected={remRepeat === 'date'} onPress={() => setRemRepeat('date')} />
          </View>
          {remRepeat === 'date' ? (
            <Button label={remDate ? `Date: ${formatDate(remDate, 'long')}` : 'Choose a date'} icon={CalendarDays} variant="secondary" onPress={() => setRemDateOpen(true)} />
          ) : null}
        </View>
      </Sheet>
      <DateSheet visible={remDateOpen} onClose={() => setRemDateOpen(false)} eyebrow="Reminder" title="Remind me on" value={remDate} onChange={setRemDate} />

      <Sheet
        visible={quietOpen}
        onClose={() => setQuietOpen(false)}
        title="Quiet hours"
        subtitle="Daily reminders inside this window are skipped. One-date reminders (like appointments) still arrive."
        footer={
          <Button
            label="Save quiet hours"
            full
            onPress={() => {
              save({ ...prefs, quietHours: { enabled: true, from: toClock(quiet.from), to: toClock(quiet.to) } });
              setQuietOpen(false);
              toast('Quiet hours updated');
            }}
          />
        }>
        <View style={{ gap: 14 }}>
          <Stepper label="From" value={quiet.from} onChange={(v) => setQuiet((q) => ({ ...q, from: v }))} step={30} min={-100000} max={100000} format={(v) => formatClock(toClock(v))} />
          <Stepper label="Until" value={quiet.to} onChange={(v) => setQuiet((q) => ({ ...q, to: v }))} step={30} min={-100000} max={100000} format={(v) => formatClock(toClock(v))} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  icon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: palette.green[50] },
  privacyHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 6 },
  del: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
