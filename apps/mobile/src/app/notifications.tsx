/** Notifications inbox (SRS §41): quick type switches, All / Unread, grouped new & earlier items, mark read, delete. */
import { NOTIFICATION_TYPES, timeAgo, type AppNotification, type NotificationType } from '@healthx/shared';
import { router } from 'expo-router';
import { BellOff, CheckCheck, Settings2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button, IconButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/Feedback';
import { Segmented } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { PageIntro } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { openLink } from '@/lib/links';
import { useStore } from '@/lib/store';
import { colors, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const TONE: Record<AppNotification['type'], TileTone> = { cycle: 'rose', habit: 'lavender', hydration: 'sky', workout: 'green', content: 'butter', report: 'indigo' };

export default function Notifications() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const sorted = [...state.notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const list = sorted.filter((n) => (filter === 'all' ? true : !n.read));
  const unread = state.notifications.filter((n) => !n.read).length;
  const prefs = state.notificationPrefs;
  const groups = filter === 'unread' ? [{ title: 'Unread', items: list }] : [{ title: 'New', items: list.filter((n) => !n.read) }, { title: 'Earlier', items: list.filter((n) => n.read) }];

  const setType = (k: NotificationType, enabled: boolean) => {
    dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...prefs, types: { ...prefs.types, [k]: { ...prefs.types[k], enabled } } } });
    toast(`${NOTIFICATION_TYPES.find((t) => t.key === k)?.label} reminders ${enabled ? 'on' : 'off'}`, 'info');
  };

  return (
    <Screen back right={<IconButton icon={Settings2} label="Notification settings" onPress={() => router.push('/notification-settings')} />}>
      <PageIntro eyebrow={unread ? `${unread} unread` : 'All caught up'} title="Notifications" />

      {/* Quick switches */}
      <AppText variant="overline" color={palette.green[700]} style={{ marginBottom: 8 }}>
        Remind me about
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingVertical: 4 }}>
        {NOTIFICATION_TYPES.map((t) => {
          const tone = TILE_TONES[TONE[t.key]];
          const on = prefs.types[t.key].enabled;
          return (
            <View key={t.key} style={[styles.switchCard, { backgroundColor: tone.bg, borderColor: tone.border }]}>
              <View style={styles.switchTop}>
                <View style={styles.switchIcon}>
                  <KeyIcon name={t.icon} size={16} color={tone.icon} />
                </View>
                <Switch
                  accessibilityLabel={`${t.label} reminders`}
                  value={on}
                  onValueChange={(v) => setType(t.key, v)}
                  trackColor={{ false: palette.ink[200], true: palette.green[600] }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={palette.ink[200]}
                />
              </View>
              <AppText variant="smallMedium" numberOfLines={1} style={{ marginTop: 8 }}>
                {t.label}
              </AppText>
              <AppText variant="caption" color={tone.hint} style={{ opacity: 0.8 }}>
                {on ? 'On' : 'Off'}
              </AppText>
            </View>
          );
        })}
      </ScrollView>

      <Segmented value={filter} onChange={setFilter} options={[{ key: 'all', label: 'All' }, { key: 'unread', label: `Unread (${unread})` }]} style={{ marginTop: 16 }} />
      {unread ? (
        <Button
          label="Mark all as read"
          icon={CheckCheck}
          variant="ghost"
          size="sm"
          onPress={() => {
            dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
            toast('All caught up');
          }}
          style={{ alignSelf: 'flex-end', marginTop: 6 }}
        />
      ) : null}

      {list.length ? (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <View key={g.title} style={{ marginTop: 12 }}>
              <AppText variant="overline" color={colors.textSubtle} style={{ marginBottom: 8 }}>
                {g.title}
              </AppText>
              <View style={{ gap: 10 }}>
                {g.items.map((n) => {
                  const meta = NOTIFICATION_TYPES.find((t) => t.key === n.type);
                  const tone = TILE_TONES[TONE[n.type]];
                  return (
                    <View key={n.id} style={[styles.item, !n.read && styles.unread]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}: ${n.body}`}
                        onPress={() => {
                          dispatch({ type: 'MARK_NOTIFICATION_READ', id: n.id });
                          if (n.to) openLink(n.to);
                        }}
                        style={styles.main}>
                        <View style={[styles.icon, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                          <KeyIcon name={meta?.icon ?? 'sparkles'} size={18} color={tone.icon} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText variant="bodyBold" style={{ flexShrink: 1 }}>
                              {n.title}
                            </AppText>
                            {!n.read ? <View style={styles.dot} /> : null}
                          </View>
                          <AppText variant="small" muted style={{ marginTop: 2 }}>
                            {n.body}
                          </AppText>
                          <AppText variant="caption" color={colors.textSubtle} style={{ marginTop: 6 }}>
                            {meta?.label} · {timeAgo(n.createdAt)}
                          </AppText>
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete notification"
                        onPress={() => {
                          dispatch({ type: 'DELETE_NOTIFICATION', id: n.id });
                          toast('Notification deleted', 'info');
                        }}
                        hitSlop={8}
                        style={styles.del}>
                        <Trash2 size={15} color={palette.ink[400]} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
      ) : (
        <Card tone="mint" style={{ marginTop: 12 }}>
          <EmptyState icon={BellOff} title={filter === 'unread' ? "You're all caught up" : 'No notifications yet'} text="Reminders you turn on will appear here." />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchCard: { width: 140, borderRadius: 22, padding: 12, borderWidth: 1 },
  switchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', gap: 8, backgroundColor: colors.surface, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  main: { flex: 1, flexDirection: 'row', gap: 12 },
  unread: { borderColor: palette.green[200], backgroundColor: palette.green[50] },
  icon: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.rose[500] },
  del: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
