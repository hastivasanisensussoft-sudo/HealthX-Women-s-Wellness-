/** Privacy Center (SRS §42, §68): control hero, data visibility, consent switches, integrations, export and delete account. */
import { COPY, formatDate, timeAgo } from '@healthx/shared';
import { router } from 'expo-router';
import { Activity, CalendarHeart, Database, Download, Droplets, Lock, Moon, ShieldCheck, Smile, Stethoscope, Trash2, Undo2, Utensils, Watch, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ToggleRow } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GlassStat, GroupHeader, HeroPanel, PageIntro, TintIcon, type Tone, ON_DARK } from '@/components/b-kit';
import { saveJson } from '@/lib/saveJson';
import { errorMessage, useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function Privacy() {
  const { state, dispatch, account, mode } = useStore();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  const counts: { label: string; n: number; icon: LucideIcon; tone: Tone }[] = [
    { label: 'Periods', n: state.periods.length, icon: CalendarHeart, tone: 'rose' },
    { label: 'Symptom logs', n: state.symptomLogs.length, icon: Stethoscope, tone: 'peach' },
    { label: 'Check-ins', n: state.checkIns.length, icon: Smile, tone: 'lavender' },
    { label: 'Water entries', n: state.water.length, icon: Droplets, tone: 'sky' },
    { label: 'Sleep logs', n: state.sleep.length, icon: Moon, tone: 'indigo' },
    { label: 'Workouts', n: state.sessions.length, icon: Activity, tone: 'green' },
    { label: 'Meals', n: state.meals.length, icon: Utensils, tone: 'butter' },
  ];
  const total = counts.reduce((a, c) => a + c.n, 0);
  const granted = state.consents.filter((c) => c.granted).length;

  const runExport = async () => {
    setExporting(true);
    try {
      const data = await account.exportData();
      const how = await saveJson(`healthx-export-${state.today}.json`, data);
      if (how !== 'dismissed') toast(how === 'downloaded' ? 'Export downloaded' : 'Export ready to save or share');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setExporting(false);
    }
  };

  const optional = state.consents.filter((c) => !c.required && c.granted);
  const withdrawOptional = () => {
    optional.forEach((c) => dispatch({ type: 'SET_CONSENT', id: c.id, granted: false }));
    toast(optional.length ? `Withdrew ${optional.length} optional consent${optional.length === 1 ? '' : 's'} — takes effect now` : 'No optional consents are on', 'info');
  };

  return (
    <Screen back>
      <PageIntro eyebrow="Privacy center" title="Privacy & data" />

      <HeroPanel>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View style={styles.shield}>
            <ShieldCheck size={26} color={palette.butter[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title" color="#fff">
              You’re in control
            </AppText>
            <AppText variant="small" color={ON_DARK.text} style={{ marginTop: 4 }}>
              We collect only what the app needs, encrypt it, and use it only for the purposes you consent to. {COPY.employerPrivacy}
            </AppText>
          </View>
        </View>
        <View style={styles.glassRow}>
          <GlassStat label="Records" value={String(total)} />
          <GlassStat label="Consents" value={`${granted}/${state.consents.length} on`} />
          <GlassStat label="Employer" value="None" />
        </View>
      </HeroPanel>

      <GroupHeader eyebrow="Visibility" title="Data collected" />
      <View style={styles.counts}>
        {counts.map((c) => (
          <View key={c.label} style={styles.count}>
            <TintIcon icon={c.icon} tone={c.tone} size={32} />
            <AppText style={styles.countNum}>{c.n}</AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {c.label}
            </AppText>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <Database size={14} color={palette.ink[500]} />
        <AppText variant="caption" muted style={{ flex: 1 }}>
          Stored on this device in the demo. Production: encrypted in transit and at rest.
        </AppText>
      </View>

      <GroupHeader eyebrow="Your choices" title="Consents" />
      <Card>
        {state.consents.map((c, i) => (
          <ToggleRow
            key={c.id}
            title={c.label}
            subtitle={`${c.description} · ${c.version}, updated ${formatDate(c.updatedAt, 'short')}`}
            value={c.granted}
            disabled={c.required}
            right={c.required ? <Lock size={14} color={palette.ink[500]} /> : c.id === 'ai_personalization' || c.id === 'health_integrations' ? <PhaseBadge phase={2} /> : null}
            onChange={(v) => {
              dispatch({ type: 'SET_CONSENT', id: c.id, granted: v });
              toast(v ? `${c.label} turned on` : `${c.label} withdrawn — takes effect immediately`, v ? 'success' : 'info');
            }}
            last={i === state.consents.length - 1}
          />
        ))}
        <Button label="Withdraw optional consents" icon={Undo2} variant="secondary" size="sm" onPress={withdrawOptional} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
      </Card>

      <GroupHeader eyebrow="Connected apps" title="Health integrations" action="Manage" onAction={() => router.push('/integrations')} />
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {state.connections.map((c, i) => (
          <View key={c.id} style={[styles.conn, i < state.connections.length - 1 && styles.border]}>
            <TintIcon icon={Watch} tone="sky" size={40} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <AppText variant="bodyMedium">{c.label}</AppText>
                <PhaseBadge phase={c.phase} />
              </View>
              <AppText variant="caption" muted>
                {c.connected && c.lastSync ? `Connected · synced ${timeAgo(c.lastSync)}` : c.dataTypes.join(', ')}
              </AppText>
            </View>
            {c.connected ? (
              <Button
                label="Disconnect"
                size="sm"
                variant="secondary"
                onPress={() => {
                  dispatch({ type: 'TOGGLE_CONNECTION', id: c.id });
                  toast(`${c.label} disconnected`);
                }}
              />
            ) : c.phase === 3 ? null : (
              // Connecting asks for the health-integrations consent first (Integrations screen).
              <Button label="Connect" size="sm" variant="soft" onPress={() => router.push('/integrations')} />
            )}
          </View>
        ))}
      </Card>

      <GroupHeader eyebrow="At a glance" title="AI, analytics & sharing" />
      <Card style={{ gap: 0 }} padded={false}>
        <Row label="AI personalisation" value={state.consents.find((c) => c.id === 'ai_personalization')?.granted ? 'On' : 'Off'} />
        <Row label="Product analytics" value={state.consents.find((c) => c.id === 'analytics')?.granted ? 'On (no health values)' : 'Off'} />
        <Row label="Notifications" value={state.notificationPrefs.discreet ? 'Discreet' : 'Standard'} />
        <Row label="Data sharing" value="Only with your consent · no employer access" last />
      </Card>

      <GroupHeader eyebrow="Your rights" title="Your data rights" />
      <View style={styles.right}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TintIcon icon={Download} tone="green" size={40} solid />
          <View style={{ flex: 1 }}>
            <AppText variant="h3">Export my data</AppText>
            <AppText variant="caption" muted>
              Everything you’ve logged, as a JSON file{mode === 'api' ? ' (from your HealthX account)' : ' (offline demo data on this device)'}.
            </AppText>
          </View>
        </View>
        <Button label={exporting ? 'Preparing…' : 'Export my data'} icon={Download} variant="secondary" loading={exporting} onPress={runExport} style={{ marginTop: 12 }} />
      </View>
      <View style={[styles.right, styles.danger]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={styles.dangerIcon}>
            <Trash2 size={18} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" color={colors.danger}>
              Delete account
            </AppText>
            <AppText variant="caption" muted>
              Permanently removes your account and health data.
            </AppText>
          </View>
        </View>
        <Button label="Delete my account" variant="danger" onPress={() => router.push('/delete-account')} style={{ marginTop: 12 }} />
      </View>
      <BackendNote
        style={{ marginTop: 14 }}
        text={
          mode === 'api'
            ? 'Apple Health / Health Connect syncing still needs the health-integration service. Export and deletion run on the HealthX server.'
            : 'Offline demo: export and deletion only affect the sample data on this device.'
        }
      />
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.border]}>
      <AppText variant="body">{label}</AppText>
      <AppText variant="smallMedium" color={palette.green[700]} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  shield: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  glassRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  count: { width: '31%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: palette.ink[100] },
  countNum: { fontFamily: font.display, fontSize: 20, lineHeight: 26, color: colors.text, marginTop: 8 },
  conn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 13, paddingHorizontal: 16 },
  right: { padding: 16, borderRadius: 24, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100] },
  danger: { marginTop: 12, backgroundColor: colors.dangerSoft, borderColor: '#F5C2C2' },
  dangerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
