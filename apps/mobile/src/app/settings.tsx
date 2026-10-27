/** Settings: appearance, connection (server / offline demo), sample data, sign out, about & disclaimers. */
import { COPY, DEMO } from '@healthx/shared';
import { router } from 'expo-router';
import { Bell, Cloud, CloudOff, Globe, Info, LogOut, MonitorSmartphone, Palette, RotateCcw, Shield, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/Art';
import { Disclaimer, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ToggleRow } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { GroupHeader, LeafPair, MenuCard, MenuRow, PageIntro, TintIcon } from '@/components/b-kit';
import { API_URL } from '@/lib/api';
import { setSimulatedOffline, useOffline } from '@/lib/network';
import { errorMessage, useStore } from '@/lib/store';
import { brandText, colors, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function Settings() {
  const { auth, account, mode, switchToOfflineDemo, switchToServer } = useStore();
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const offline = useOffline();

  return (
    <Screen back>
      <PageIntro eyebrow="App & account" title="Settings" />

      <View style={styles.brand}>
        <LeafPair size={110} style={{ right: -20, top: -24 }} />
        <Logo size={40} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Pill label="Version 0.1.0" tone="ink" />
          <Pill label={mode === 'api' ? 'Connected to the HealthX server' : 'Offline demo'} tone={mode === 'api' ? 'green' : 'butter'} icon={mode === 'api' ? <Cloud size={11} color={brandText} /> : <CloudOff size={11} color="#8A6400" />} />
        </View>
      </View>

      <GroupHeader eyebrow="Personalise" title="Look & feel" />
      <MenuCard>
        <MenuRow icon={Palette} tone="lavender" title="Appearance" subtitle="Theme, accent colour & dark mode" onPress={() => router.push('/appearance' as never)} />
        <MenuRow icon={Globe} title="Preferences" subtitle="Units, language & time zone" onPress={() => router.push('/preferences')} />
        <MenuRow icon={Bell} tone="sky" title="Notifications & reminders" onPress={() => router.push('/notification-settings')} />
        <MenuRow icon={Shield} tone="green" title="Privacy & data" subtitle="Consents, export, delete account" onPress={() => router.push('/privacy')} last />
      </MenuCard>

      <GroupHeader eyebrow="Data" title="Connection" />
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <TintIcon icon={mode === 'api' ? Cloud : CloudOff} tone={mode === 'api' ? 'green' : 'butter'} size={38} />
          <AppText variant="small" style={{ flex: 1 }}>
            {mode === 'api'
              ? `Your account and data are stored on the HealthX server (${API_URL}) and sync across your devices.`
              : 'Offline demo: sample data stays on this device only. Nothing is sent to a server and nothing syncs.'}
          </AppText>
        </View>
        <Button label={mode === 'api' ? 'Use offline demo instead' : 'Connect to the HealthX server'} variant="secondary" onPress={() => void (mode === 'api' ? switchToOfflineDemo() : switchToServer())} />
      </Card>

      <GroupHeader eyebrow="Try things out" title="Demo" />
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <TintIcon icon={Sparkles} tone="butter" size={38} />
          <AppText variant="small" style={{ flex: 1 }}>
            {DEMO.banner}
          </AppText>
        </View>
        <ToggleRow
          title="Simulate offline"
          subtitle="Preview the offline banner and the “Couldn’t load” states in the library and community. Logs still save on this device."
          value={offline}
          onChange={(v) => {
            setSimulatedOffline(v);
            toast(v ? 'Offline mode simulated' : 'Back online', 'info');
          }}
          last
        />
        <Button label={mode === 'api' ? 'Replace my data with sample history' : 'Reset demo data'} icon={RotateCcw} variant="secondary" onPress={() => setResetOpen(true)} />
      </Card>

      <GroupHeader eyebrow="Good to know" title="About" />
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <TintIcon icon={Info} tone="sky" size={38} />
          <AppText variant="small" style={{ flex: 1 }}>
            {COPY.notDiagnostic}
          </AppText>
        </View>
        <Disclaimer tone="danger" text={COPY.emergency} />
        <AppText variant="caption" muted>
          Photos: Unsplash License (see CREDITS.md). Sample articles are placeholders pending medical review.
        </AppText>
      </Card>

      <View style={styles.signOut}>
        <Button
          label="Sign out"
          icon={LogOut}
          variant="ghost"
          onPress={async () => {
            await auth.logout();
            toast('Signed out', 'info');
            router.replace('/welcome');
          }}
        />
        {mode === 'api' ? (
          <Button
            label="Sign out of all devices"
            icon={MonitorSmartphone}
            variant="ghost"
            onPress={async () => {
              try {
                await auth.logoutAll();
                toast('Signed out on every device', 'info');
                router.replace('/welcome');
              } catch (e) {
                toast(errorMessage(e), 'error');
              }
            }}
          />
        ) : null}
      </View>

      <Sheet
        visible={resetOpen}
        onClose={() => setResetOpen(false)}
        title={mode === 'api' ? 'Replace your data with sample history?' : 'Reset demo data?'}
        subtitle={mode === 'api' ? 'Your account stays; everything you’ve logged is replaced by about 75 days of sample history.' : 'Restores the full sample history (about 75 days) on this device.'}
        footer={
          <Button
            label="Reset"
            full
            onPress={async () => {
              try {
                await account.loadSampleData();
                setResetOpen(false);
                toast('Sample history loaded');
                router.replace('/home');
              } catch (e) {
                toast(errorMessage(e), 'error');
              }
            }}
          />
        }>
        <AppText variant="small" muted>
          {mode === 'api' ? 'This only affects your own account. It can’t be undone.' : 'Anything you’ve logged in this demo will be replaced.'}
        </AppText>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { padding: 20, borderRadius: 28, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100], overflow: 'hidden', ...shadow.card },
  signOut: { alignItems: 'center', gap: 4, marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
});
