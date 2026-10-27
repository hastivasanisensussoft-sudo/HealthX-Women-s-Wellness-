/** Notification preferences + reminders (SRS §41: "All notifications must be configurable"): type switches with times, discreet mode, quiet hours, custom reminders. */
import { NOTIFICATION_TYPES, formatClock, formatDate, type NotificationType } from '@healthx/shared';
import { BellRing, Clock, EyeOff, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { BackendNote, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/Feedback';
import { Chip, Stepper, TextField, ToggleRow } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { GroupHeader, PageIntro, TintIcon } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const toClock = (m: number) => `${String(Math.floor((((m % 1440) + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const TONE: Record<NotificationType, TileTone> = { cycle: 'rose', habit: 'lavender', hydration: 'sky', workout: 'green', content: 'butter', report: 'indigo' };

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
  const onCount = NOTIFICATION_TYPES.filter((t) => prefs.types[t.key].enabled).length;

  const setType = (k: NotificationType, patch: Partial<{ enabled: boolean; time: string }>) =>
    dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...prefs, types: { ...prefs.types, [k]: { ...prefs.types[k], ...patch } } } });

  return (
    <Screen back>
      <PageIntro eyebrow={`${onCount} of ${NOTIFICATION_TYPES.length} types on`} title="Notification settings" subtitle="Choose what HealthX may remind you about and when. Every type can be turned off." />

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
          onChange={(v) => dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...prefs, discreet: v } })}
        />
        <ToggleRow
          title="Quiet hours"
          subtitle={`${formatClock(prefs.quietHours.from)} – ${formatClock(prefs.quietHours.to)}`}
          value={prefs.quietHours.enabled}
          onChange={(v) => dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...prefs, quietHours: { ...prefs.quietHours, enabled: v } } })}
          last
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
                  {formatClock(r.time)} · {r.date ? formatDate(r.date, 'medium') : 'Daily'}
                  {r.type === 'cycle' ? ' · estimate' : ''}
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
      <BackendNote style={{ marginTop: 14 }} text="Push delivery needs a push provider & device registration (backend). Settings are saved locally in the demo." />

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
              dispatch({ type: 'ADD_REMINDER', reminder: { title: remTitle.trim(), type: remType, time: toClock(remTime), enabled: true } });
              toast('Reminder added');
              setRemTitle('');
              setRemErr(null);
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
