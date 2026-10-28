/**
 * Health integrations (SRS §28–§31, §43; mockup M42; P2-04, P2-05). Connect / disconnect is stored via
 * TOGGLE_CONNECTION; connecting first needs the optional health-integrations consent (the server
 * enforces it). Apple Health is offered on iPhone and Health Connect on Android (both in the web
 * preview). Data syncing itself is simulated: "Sync now" reports what HealthX would import for the
 * allowed data types over the last 7 days, with empty and error states and a retry. Which types may be
 * read and the last sync are remembered on this phone (the API can't store them yet); in production
 * they come from the OS sheet (HealthKit / Health Connect). Access is read-only.
 */
import { addDays, lastNDays, sleepOn, stepsOn, timeAgo, type AppState, type HealthConnection } from '@healthx/shared';
import { router } from 'expo-router';
import { Activity, ChevronRight, CircleAlert, Footprints, HeartPulse, Inbox, Lock, Moon, RefreshCw, Ruler, Scale, ShieldCheck, Smartphone, Watch, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { ToggleRow } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { TILE_TONES, type TileTone } from '@/components/Tiles';
import { PageIntro, TintIcon } from '@/components/b-kit';
import { DEVICE_ONLY_NOTE } from '@/lib/deviceData';
import { simulate } from '@/lib/hooks';
import { useOffline } from '@/lib/network';
import { useStore } from '@/lib/store';
import { brandText, colors, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useDeviceData } from '@/lib/useDeviceData';

const TYPE_ICON: Record<string, LucideIcon> = { Steps: Footprints, Distance: Ruler, Sleep: Moon, Workouts: Activity, Activity, Weight: Scale, 'Heart rate': HeartPulse };
const SOURCE_ICON: Record<HealthConnection['id'], LucideIcon> = { apple_health: HeartPulse, health_connect: Smartphone, wearable: Watch };
const SOURCE_TONE: Record<HealthConnection['id'], TileTone> = { apple_health: 'rose', health_connect: 'green', wearable: 'indigo' };
const NOTE: Record<HealthConnection['id'], string> = {
  apple_health: 'Available on iPhone',
  health_connect: 'Available on Android devices',
  wearable: 'Smartwatches and rings — later phase',
};
/** Where each source can be used: Apple Health only on iPhone, Health Connect only on Android. */
const UNSUPPORTED: Partial<Record<HealthConnection['id'], string>> =
  Platform.OS === 'ios' ? { health_connect: 'Health Connect is for Android phones — use Apple Health on iPhone.' } : Platform.OS === 'android' ? { apple_health: 'Apple Health is only on iPhone — use Health Connect on Android.' } : {};

interface SyncInfo {
  at: string;
  result: 'ok' | 'empty' | 'error';
  found?: string[];
}

/** What a sync would import for the allowed types over the last 7 days (simulated from the person's logs). */
function simulatedImport(state: AppState, types: string[]): string[] {
  const days = lastNDays(state.today, 7);
  const stepDays = days.filter((d) => stepsOn(state, d) > 0).length;
  const nights = days.filter((d) => sleepOn(state, d)).length;
  const sessions = state.sessions.filter((s) => s.date >= addDays(state.today, -6)).length;
  const found: Record<string, string | null> = {
    Steps: stepDays ? `${stepDays} day${stepDays === 1 ? '' : 's'} of steps` : null,
    Distance: stepDays ? `${stepDays} day${stepDays === 1 ? '' : 's'} of distance` : null,
    Activity: stepDays ? `${stepDays} active day${stepDays === 1 ? '' : 's'}` : null,
    Sleep: nights ? `${nights} night${nights === 1 ? '' : 's'} of sleep` : null,
    Workouts: sessions ? `${sessions} workout${sessions === 1 ? '' : 's'}` : null,
    Weight: state.profile.weightKg ? '1 weight reading' : null,
    'Heart rate': null,
  };
  return types.map((t) => found[t]).filter((x): x is string => !!x);
}

export default function Integrations() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const offline = useOffline();
  const [busy, setBusy] = useState<string | null>(null);
  // Data types switched OFF by the person, per connection (kept on this phone, see header).
  const { value: off, set: setOff } = useDeviceData<Record<string, string[]>>('integration-types', {});
  const syncs = useDeviceData<Record<string, SyncInfo>>('integration-sync', {});
  const [ask, setAsk] = useState<HealthConnection | null>(null);
  const [leaving, setLeaving] = useState<HealthConnection | null>(null);
  const consent = state.consents.find((x) => x.id === 'health_integrations');
  const allowedTypes = (c: HealthConnection) => c.dataTypes.filter((t) => !(off[c.id] ?? []).includes(t));

  const sync = async (c: HealthConnection) => {
    setBusy(`sync:${c.id}`);
    await simulate(null, 1200);
    const at = new Date().toISOString();
    if (offline) {
      syncs.set((s) => ({ ...s, [c.id]: { at: s[c.id]?.at ?? at, result: 'error' } }));
      toast('Couldn’t sync — you seem to be offline', 'error');
    } else {
      const found = simulatedImport(state, allowedTypes(c));
      syncs.set((s) => ({ ...s, [c.id]: { at, result: found.length ? 'ok' : 'empty', found } }));
    }
    setBusy(null);
  };

  const toggle = async (c: HealthConnection, consented = false) => {
    if (!c.connected && !consented && !consent?.granted) return setAsk(c);
    setBusy(c.id);
    await simulate(null, c.connected ? 400 : 1100);
    dispatch({ type: 'TOGGLE_CONNECTION', id: c.id });
    setBusy(null);
    toast(c.connected ? `${c.label} disconnected — imported data stays in your history` : `${c.label} connected (simulated)`, c.connected ? 'info' : 'success');
    if (c.connected) syncs.set((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== c.id)));
    else void sync({ ...c, connected: true });
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
                      {c.connected ? (busy === `sync:${c.id}` ? 'Syncing…' : `Connected · synced ${timeAgo(syncs.value[c.id]?.at ?? c.lastSync ?? new Date().toISOString())}`) : (UNSUPPORTED[c.id] ? 'Not available on this phone' : NOTE[c.id])}
                    </AppText>
                  </View>
                </View>
              </View>
              {c.connected ? (
                <View style={{ marginTop: 8 }}>
                  <AppText variant="overline" color={colors.textSubtle} style={{ marginTop: 6 }}>
                    Data HealthX may read · read-only
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
                  <AppText variant="caption" muted style={{ marginTop: 4 }}>
                    Reading {allowedTypes(c).length} of {c.dataTypes.length} data types. {DEVICE_ONLY_NOTE}
                  </AppText>
                  {(() => {
                    const s = syncs.value[c.id];
                    if (busy === `sync:${c.id}` || !s) return null;
                    if (s.result === 'error')
                      return (
                        <View style={[styles.result, styles.resultError]} accessibilityRole="alert">
                          <CircleAlert size={16} color={colors.danger} />
                          <AppText variant="small" style={{ flex: 1 }}>
                            Couldn’t sync. Check your connection and try again.
                          </AppText>
                        </View>
                      );
                    if (s.result === 'empty')
                      return (
                        <View style={styles.result}>
                          <Inbox size={16} color={palette.ink[500]} />
                          <AppText variant="small" style={{ flex: 1 }}>
                            No data found in {c.label.replace(' (Android)', '')} for the last 7 days.
                          </AppText>
                        </View>
                      );
                    return (
                      <View style={styles.result}>
                        <ShieldCheck size={16} color={palette.green[700]} />
                        <View style={{ flex: 1 }}>
                          <AppText variant="smallMedium">Found in the last 7 days</AppText>
                          <AppText variant="caption" muted>
                            {s.found?.join(' · ')} — matched with what you logged, so nothing is counted twice (simulated).
                          </AppText>
                        </View>
                      </View>
                    );
                  })()}
                  <View style={{ gap: 8, marginTop: 10 }}>
                    <Button
                      label={syncs.value[c.id]?.result === 'error' ? 'Try again' : 'Sync now'}
                      icon={RefreshCw}
                      variant="soft"
                      size="sm"
                      full
                      loading={busy === `sync:${c.id}`}
                      disabled={!!busy && busy !== `sync:${c.id}`}
                      onPress={() => void sync(c)}
                    />
                    <Button label={`Disconnect ${c.label.replace(' (Android)', '')}`} variant="secondary" size="sm" full loading={busy === c.id} onPress={() => setLeaving(c)} />
                  </View>
                </View>
              ) : later ? (
                <Pill label="Planned for a later phase" tone="ink" style={{ marginTop: 12 }} />
              ) : UNSUPPORTED[c.id] ? (
                <AppText variant="caption" muted style={{ marginTop: 12 }}>
                  {UNSUPPORTED[c.id]}
                </AppText>
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
        We only read the data types you allow — HealthX never writes to or changes your health apps. You can disconnect anytime.
      </AppText>
      <BackendNote style={{ marginTop: 14 }} text="Real syncing needs HealthKit / Health Connect permissions and the health-integration service (Phase 2). Simulated here." />

      <Sheet
        visible={!!leaving}
        onClose={() => setLeaving(null)}
        eyebrow="Health integrations"
        title={leaving ? `Disconnect ${leaving.label.replace(' (Android)', '')}?` : 'Disconnect?'}
        subtitle="HealthX stops reading new data. What was already imported stays in your history, and manual logging keeps working."
        footer={
          <View style={{ gap: 8 }}>
            <Button
              label="Disconnect"
              variant="danger"
              full
              onPress={() => {
                const c = leaving;
                setLeaving(null);
                if (c) void toggle(c);
              }}
            />
            <Button label="Keep connected" variant="ghost" full onPress={() => setLeaving(null)} />
          </View>
        }>
        <AppText variant="caption" muted>
          You can also turn off the health-integrations consent in Privacy.
        </AppText>
      </Sheet>

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
  result: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10, padding: 12, borderRadius: 16, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100] },
  resultError: { backgroundColor: colors.dangerSoft, borderColor: palette.rose[200] },
});
