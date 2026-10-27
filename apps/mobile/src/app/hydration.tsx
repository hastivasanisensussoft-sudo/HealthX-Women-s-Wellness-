/** Water (SRS §29, mockup M21): glass hero with the daily target, quick adds, custom amount, today's timeline, reminders, 7-day chart and a guided video. */
import { dailySeries, formatClock, waterOn, waterStreak } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Droplets, Flame, GlassWater, Milk, Pencil, Plus, Target, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button, IconButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Stepper, TextField } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GroupHeader, PageIntro, TintIcon, ON_DARK } from '@/components/b-kit';
import { WaterGlass } from '@/components/b-water';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function Hydration() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const total = waterOn(state, state.today);
  const pct = Math.min(1, total / state.waterTargetMl);
  const left = Math.max(0, state.waterTargetMl - total);
  const streak = waterStreak(state);
  const entries = state.water.filter((w) => w.date === state.today).sort((a, b) => (a.time < b.time ? 1 : -1));
  const week = useMemo(() => dailySeries(state, 7), [state]);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [customErr, setCustomErr] = useState<string | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const [target, setTarget] = useState(state.waterTargetMl);
  const reminder = state.notificationPrefs.types.hydration;

  const add = (ml: number) => {
    dispatch({ type: 'ADD_WATER', ml });
    toast(`+${ml} ml`);
  };
  const addCustom = () => {
    const ml = Number(custom);
    if (!ml || ml < 10) return setCustomErr('Enter an amount of at least 10 ml.');
    if (ml > 2000) return setCustomErr("That's more than 2 L in one go — please check.");
    setCustomErr(null);
    setCustom('');
    setCustomOpen(false);
    add(ml);
  };
  const setReminder = (enabled: boolean) => {
    const prefs = state.notificationPrefs;
    dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...prefs, types: { ...prefs.types, hydration: { ...prefs.types.hydration, enabled } } } });
    toast(enabled ? 'Hydration reminders on' : 'Hydration reminders off', 'info');
  };

  return (
    <Screen back right={<IconButton icon={Pencil} label="Edit daily target" onPress={() => setTargetOpen(true)} />}>
      <PageIntro eyebrow="Hydration · daily target" title="Water" />

      {/* Glass hero */}
      <View style={styles.hero}>
        <LinearGradient colors={[palette.sky[100], palette.sky[50]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.bubble, { width: 120, height: 120, top: -40, right: -30 }]} />
        <View style={[styles.bubble, { width: 46, height: 46, bottom: 26, right: 120 }]} />
        <WaterGlass value={pct} width={112} />
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color={palette.sky[700]}>
            Today
          </AppText>
          <AppText style={styles.big}>{(total / 1000).toFixed(1)} L</AppText>
          <AppText variant="small" color={palette.sky[700]}>
            of {(state.waterTargetMl / 1000).toFixed(1)} L goal · {Math.round(pct * 100)}%
          </AppText>
          <View style={styles.heroChips}>
            <View style={styles.chip}>
              <Target size={13} color={palette.sky[600]} />
              <AppText variant="caption" color={palette.sky[700]}>
                {left ? `${left} ml to go` : 'Goal reached'}
              </AppText>
            </View>
            <View style={styles.chip}>
              <Flame size={13} color={palette.peach[500]} />
              <AppText variant="caption" color={palette.peach[700]}>
                {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
              </AppText>
            </View>
          </View>
        </View>
      </View>
      <AppText variant="small" color={pct >= 1 ? palette.green[700] : colors.textMuted} center style={{ marginTop: 10 }}>
        {pct >= 1 ? 'Goal reached — well done! 🎉' : streak > 0 ? 'Reach your goal today to keep your streak going' : 'Reach your goal today to start a streak'}
      </AppText>

      {/* Quick adds */}
      <GroupHeader eyebrow="Quick add" title="Log a drink" />
      <View style={styles.quick}>
        <Pressable accessibilityRole="button" onPress={() => add(250)} style={({ pressed }) => [styles.add, styles.addMain, pressed && styles.pressed]}>
          <View style={[styles.addIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
            <GlassWater size={22} color="#fff" />
          </View>
          <AppText style={[styles.addLabel, { color: '#fff' }]}>+ 250 ml</AppText>
          <AppText variant="caption" color={ON_DARK.text}>
            A glass
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => add(500)} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
          <View style={styles.addIcon}>
            <Milk size={22} color={palette.sky[600]} />
          </View>
          <AppText style={styles.addLabel}>+ 500 ml</AppText>
          <AppText variant="caption" muted>
            A bottle
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setCustomOpen(true)} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
          <View style={styles.addIcon}>
            <Plus size={22} color={palette.sky[600]} />
          </View>
          <AppText style={styles.addLabel}>Custom</AppText>
          <AppText variant="caption" muted>
            Any amount
          </AppText>
        </Pressable>
      </View>

      {/* Today's timeline */}
      <GroupHeader eyebrow={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`} title="Today" />
      {entries.length ? (
        <Card padded={false} style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
          {entries.map((w, i) => (
            <View key={w.id} style={styles.entry}>
              <View style={styles.rail}>
                <View style={styles.dot}>
                  <Droplets size={13} color={palette.sky[600]} />
                </View>
                {i < entries.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={[styles.entryBody, i < entries.length - 1 && styles.border]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">{w.ml} ml</AppText>
                  <AppText variant="caption" muted>
                    {formatClock(w.time)}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${w.ml} millilitres at ${formatClock(w.time)}`}
                  onPress={() => {
                    dispatch({ type: 'REMOVE_WATER', id: w.id });
                    toast(`Removed ${w.ml} ml`, 'info');
                  }}
                  hitSlop={8}
                  style={styles.remove}>
                  <X size={15} color={palette.ink[500]} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Card tone="sky">
          <EmptyState icon={Droplets} title="No water logged today" text="Tap + 250 ml to log your first glass." />
        </Card>
      )}

      {/* Reminders */}
      <View style={styles.reminder}>
        <TintIcon icon={Bell} tone="rose" size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyMedium">Reminders</AppText>
          <AppText variant="caption" muted>
            {reminder.enabled ? `On · from ${formatClock(reminder.time)}` : 'Off'}
          </AppText>
        </View>
        <Switch
          accessibilityLabel="Hydration reminders"
          value={reminder.enabled}
          onValueChange={setReminder}
          trackColor={{ false: palette.green[200], true: palette.green[600] }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={palette.green[200]}
        />
      </View>

      <GroupHeader eyebrow="History" title="Last 7 days" />
      <Card>
        <BarChart
          data={week.map((d) => ({ label: d.label, value: d.water / 1000, highlight: d.date === state.today }))}
          target={state.waterTargetMl / 1000}
          color={palette.sky[400]}
          highlightColor={palette.sky[600]}
          showValues
          formatValue={(v) => v.toFixed(1)}
        />
        <AppText variant="caption" muted>
          Litres per day · dashed line = your {(state.waterTargetMl / 1000).toFixed(1)} L target · highlighted = today
        </AppText>
      </Card>

      <GroupHeader eyebrow="Video preview" title="Make it a habit" />
      <VideoCard video="hydration" width="100%" height={190} />
      <AppText variant="caption" muted style={{ marginTop: 12 }}>
        Needs vary with heat, activity and health conditions. This is general wellness guidance, not medical advice.
      </AppText>

      <Sheet visible={customOpen} onClose={() => setCustomOpen(false)} title="Custom amount" subtitle="How much did you drink?" footer={<Button label="Add" icon={Plus} full onPress={addCustom} />}>
        <TextField label="Amount (ml)" value={custom} onChangeText={(v) => setCustom(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g. 400" error={customErr} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[150, 350, 750].map((ml) => (
            <Button key={ml} label={`${ml} ml`} size="sm" variant="soft" style={{ flex: 1 }} onPress={() => setCustom(String(ml))} />
          ))}
        </View>
      </Sheet>

      <Sheet
        visible={targetOpen}
        onClose={() => setTargetOpen(false)}
        title="Daily water target"
        subtitle="Pick a target that feels realistic. Needs vary with heat and activity."
        footer={
          <Button
            label="Save target"
            full
            onPress={() => {
              dispatch({ type: 'SET_WATER_TARGET', ml: target });
              setTargetOpen(false);
              toast('Target updated');
            }}
          />
        }>
        <Stepper label="Daily target" value={target} onChange={setTarget} step={100} min={1000} max={4500} format={(v) => `${(v / 1000).toFixed(1)} L`} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: palette.sky[100] },
  bubble: { position: 'absolute', borderRadius: 999, backgroundColor: palette.sky[200], opacity: 0.45 },
  big: { fontFamily: font.displayBold, fontSize: 44, lineHeight: 50, color: palette.ink[900], letterSpacing: -1, marginTop: 2 },
  heroChips: { gap: 6, marginTop: 12, alignItems: 'flex-start' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  quick: { flexDirection: 'row', gap: 10 },
  add: { flex: 1, borderRadius: 22, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.sky[100], ...shadow.card, minHeight: 120 },
  addMain: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  addIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.sky[50], alignItems: 'center', justifyContent: 'center' },
  addLabel: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text, marginTop: 12 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  entry: { flexDirection: 'row', gap: 12 },
  rail: { width: 28, alignItems: 'center', paddingTop: 12 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.sky[50], borderWidth: 1, borderColor: palette.sky[100], alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, backgroundColor: palette.sky[100], marginTop: 2 },
  entryBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  remove: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.ink[50], alignItems: 'center', justifyContent: 'center' },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 22, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100] },
});
