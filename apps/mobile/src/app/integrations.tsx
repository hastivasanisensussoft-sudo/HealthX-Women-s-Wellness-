/**
 * Health integrations (SRS §28–§31, Phase 2; mockup M42). Connect / disconnect is stored via
 * TOGGLE_CONNECTION; connecting first needs the optional health-integrations consent (the server
 * enforces it). Data syncing itself is simulated, and per-data-type permissions are kept on this
 * screen for the demo — in production they come from the OS sheet (HealthKit / Health Connect).
 */
import { timeAgo, type HealthConnection } from '@healthx/shared';
import { router } from 'expo-router';
import { Activity, ChevronRight, Footprints, HeartPulse, Lock, Moon, Ruler, Scale, ShieldCheck, Smartphone, Watch, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { ToggleRow } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { PageIntro, TintIcon } from '@/components/b-kit';
import { simulate } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { brandText, colors, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const TYPE_ICON: Record<string, LucideIcon> = { Steps: Footprints, Distance: Ruler, Sleep: Moon, Workouts: Activity, Activity, Weight: Scale, 'Heart rate': HeartPulse };
const SOURCE_ICON: Record<HealthConnection['id'], LucideIcon> = { apple_health: HeartPulse, health_connect: Smartphone, wearable: Watch };
const SOURCE_TONE: Record<HealthConnection['id'], TileTone> = { apple_health: 'rose', health_connect: 'green', wearable: 'indigo' };
const NOTE: Record<HealthConnection['id'], string> = {
  apple_health: 'Available on iPhone',
  health_connect: 'Available on Android devices',
  wearable: 'Smartwatches and rings — later phase',
};

export default function Integrations() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  // Data types switched OFF by the user, per connection (demo-only, see header).
  const [off, setOff] = useState<Record<string, string[]>>({ apple_health: ['Weight', 'Heart rate'] });
  const [ask, setAsk] = useState<HealthConnection | null>(null);
  const consent = state.consents.find((x) => x.id === 'health_integrations');

  const toggle = async (c: HealthConnection, consented = false) => {
    if (!c.connected && !consented && !consent?.granted) return setAsk(c);
    setBusy(c.id);
    await simulate(null, c.connected ? 400 : 1100);
    dispatch({ type: 'TOGGLE_CONNECTION', id: c.id });
    setBusy(null);
    toast(c.connected ? `${c.label} disconnected — imported data stays in your history` : `${c.label} connected (simulated)`, c.connected ? 'info' : 'success');
  };

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      <PageIntro eyebrow="Consent first · simulated sync" title="Health integrations" subtitle="Sync steps, workouts and sleep automatically. Manual logging always keeps working." />

      <Pressable accessibilityRole="button" accessibilityLabel="Manage consents in Privacy" onPress={() => router.push('/privacy')} style={({ pressed }) => [styles.consent, consent?.granted ? styles.consentOn : styles.consentOff, pressed && { opacity: 0.92 }]}>
        <TintIcon icon={consent?.granted ? ShieldCheck : Lock} tone={consent?.granted ? 'green' : 'lavender'} size={40} solid />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold">{consent?.granted ? 'Health-integrations consent is on' : 'We’ll ask for your consent first'}</AppText>
          <AppText variant="caption" muted>
            {consent?.granted ? 'You can withdraw it anytime in Privacy.' : 'Nothing connects until you allow it.'}
          </AppText>
        </View>
        <ChevronRight size={18} color={palette.green[700]} />
      </Pressable>

      <View style={{ gap: 14, marginTop: 16 }}>
        {state.connections.map((c) => {
          const Icon = SOURCE_ICON[c.id];
          const tone = TILE_TONES[SOURCE_TONE[c.id]];
          const later = c.phase === 3;
          return (
            <View key={c.id} style={[styles.card, c.connected && styles.cardOn, later && styles.later]}>
              <View style={styles.head}>
                <View style={[styles.logo, { backgroundColor: c.connected ? palette.green[700] : tone.bg, borderColor: c.connected ? palette.green[700] : tone.border }]}>
                  <Icon size={24} color={c.connected ? '#fff' : tone.icon} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <AppText variant="h3">{c.label}</AppText>
                    {later ? <PhaseBadge phase={3} /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {c.connected ? <View style={styles.live} /> : null}
                    <AppText variant="caption" color={c.connected ? palette.green[700] : undefined} muted={!c.connected}>
                      {c.connected ? `Connected · synced ${c.lastSync ? timeAgo(c.lastSync) : 'just now'}` : NOTE[c.id]}
                    </AppText>
                  </View>
                </View>
              </View>
              {c.connected ? (
                <View style={{ marginTop: 8 }}>
                  <AppText variant="overline" color={colors.textSubtle} style={{ marginTop: 6 }}>
                    Data HealthX may read
                  </AppText>
                  {c.dataTypes.map((t, i) => {
                    const TIcon = TYPE_ICON[t] ?? Activity;
                    const enabled = !(off[c.id] ?? []).includes(t);
                    return (
                      <ToggleRow
                        key={t}
                        title={t}
                        value={enabled}
                        right={<TIcon size={14} color={palette.green[600]} />}
                        onChange={(v) => setOff((o) => ({ ...o, [c.id]: v ? (o[c.id] ?? []).filter((x) => x !== t) : [...(o[c.id] ?? []), t] }))}
                        last={i === c.dataTypes.length - 1}
                      />
                    );
                  })}
                  <Button label={`Disconnect ${c.label.replace(' (Android)', '')}`} variant="secondary" size="sm" full loading={busy === c.id} onPress={() => toggle(c)} style={{ marginTop: 8 }} />
                </View>
              ) : later ? (
                <Pill label="Planned for a later phase" tone="ink" style={{ marginTop: 12 }} />
              ) : (
                <>
                  <View style={styles.types}>
                    {c.dataTypes.map((t) => {
                      const TIcon = TYPE_ICON[t] ?? Activity;
                      return <Pill key={t} label={t} tone="green" icon={<TIcon size={11} color={brandText} />} />;
                    })}
                  </View>
                  <Button label={`Connect ${c.label.replace(' (Android)', '')}`} size="sm" full loading={busy === c.id} onPress={() => toggle(c)} style={{ marginTop: 14 }} />
                </>
              )}
            </View>
          );
        })}
      </View>
      <AppText variant="caption" muted style={{ marginTop: 12, fontStyle: 'italic' }}>
        We only read the data types you allow. You can disconnect anytime.
      </AppText>
      <BackendNote style={{ marginTop: 14 }} text="Real syncing needs HealthKit / Health Connect permissions and the health-integration service (Phase 2). Simulated here." />

      <Sheet
        visible={!!ask}
        onClose={() => setAsk(null)}
        title="Allow health integrations?"
        subtitle={ask ? `Needed before connecting ${ask.label}.` : undefined}
        footer={
          <Button
            label="Allow & connect"
            full
            onPress={() => {
              const c = ask;
              setAsk(null);
              if (!c) return;
              dispatch({ type: 'SET_CONSENT', id: 'health_integrations', granted: true });
              void toggle(c, true);
            }}
          />
        }>
        <View style={styles.sheetBody}>
          <TintIcon icon={ShieldCheck} tone="green" size={44} />
          <AppText variant="small" muted style={{ flex: 1 }}>
            {consent?.description ?? 'Import steps, sleep and workouts from Apple Health or Health Connect.'} You can withdraw this anytime in Privacy.
          </AppText>
        </View>
        {ask ? (
          <View style={[styles.types, { marginTop: 12 }]}>
            {ask.dataTypes.map((t) => (
              <Pill key={t} label={t} tone="green" />
            ))}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, borderWidth: 1 },
  consentOn: { backgroundColor: palette.green[50], borderColor: palette.green[100] },
  consentOff: { backgroundColor: palette.lavender[50], borderColor: palette.lavender[100] },
  card: { padding: 16, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  cardOn: { borderColor: palette.green[200] },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  live: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.green[500] },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  later: { opacity: 0.8 },
  sheetBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
