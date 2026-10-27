/** Delete account (SRS §42, §68; mockup M35). Re-authenticate + type DELETE; the server erases the account and its data. */
import { router } from 'expo-router';
import { Download, KeyRound, ShieldAlert, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, Disclaimer } from '@/components/Badges';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { PageIntro, TintIcon } from '@/components/b-kit';
import { saveJson } from '@/lib/saveJson';
import { errorMessage, useStore } from '@/lib/store';
import { brandText, colors, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const DELETED = ['Profile & account', 'Cycle, period & symptom logs', 'Mood, water, activity & check-ins', 'Health integration connections'];

export default function DeleteAccount() {
  const { account, mode, state } = useStore();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ready = password.length >= 8 && confirm.trim().toUpperCase() === 'DELETE';

  const exportFirst = async () => {
    setExporting(true);
    try {
      const how = await saveJson(`healthx-export-${state.today}.json`, await account.exportData());
      if (how !== 'dismissed') toast(how === 'downloaded' ? 'Export downloaded' : 'Export ready to save or share');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setExporting(false);
    }
  };

  const doDelete = async () => {
    if (password.length < 8) return setErr('Re-enter your password to continue (8+ characters).');
    if (confirm.trim().toUpperCase() !== 'DELETE') return setErr('Type DELETE to confirm.');
    setErr(null);
    setDeleting(true);
    try {
      await account.deleteAccount(password);
      toast(mode === 'api' ? 'Your account and data were deleted' : 'Offline demo data deleted from this device', 'info');
      router.replace('/welcome');
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen back>
      <PageIntro eyebrow="Privacy · account" title="Delete account" />

      <View style={styles.warn}>
        <View style={styles.icon}>
          <Trash2 size={28} color="#fff" />
        </View>
        <AppText variant="title" center style={{ marginTop: 12 }}>
          Delete your account?
        </AppText>
        <AppText variant="small" color={palette.rose[700]} center>
          This cannot be undone.
        </AppText>
        <View style={styles.list}>
          <AppText variant="overline" color={colors.textSubtle} style={{ marginBottom: 4 }}>
            This will permanently delete:
          </AppText>
          {DELETED.map((d, i) => (
            <View key={d} style={[styles.item, i < DELETED.length - 1 && styles.border]}>
              <View style={styles.dot}>
                <X size={12} color="#fff" />
              </View>
              <AppText variant="body">{d}</AppText>
            </View>
          ))}
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={exportFirst} disabled={exporting} style={({ pressed }) => [styles.export, pressed && { opacity: 0.9 }]} hitSlop={6}>
        <TintIcon icon={Download} tone="green" size={38} solid />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold" color={brandText}>
            {exporting ? 'Preparing your export…' : 'Download my data first'}
          </AppText>
          <AppText variant="caption" muted>
            A JSON copy of everything you’ve logged
          </AppText>
        </View>
      </Pressable>

      <View style={styles.form}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TintIcon icon={KeyRound} tone="lavender" size={34} />
          <AppText variant="h3">Confirm it’s you</AppText>
        </View>
        <TextField label="Password" value={password} onChangeText={setPassword} secure autoCapitalize="none" hint={mode === 'offline' ? 'Offline demo: any 8+ characters.' : 'Re-entering your password protects your data.'} />
        <TextField label="Type DELETE to confirm" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" error={err} />
      </View>
      <Disclaimer tone="danger" style={{ marginTop: 14 }} text="If you have a store subscription, cancel it in your App Store / Google Play settings first." />
      <Button label="Delete permanently" icon={ShieldAlert} variant="danger" full size="lg" loading={deleting} disabled={!ready} onPress={doDelete} style={{ marginTop: 16 }} />
      <Button label="Cancel" variant="secondary" full onPress={() => router.back()} style={{ marginTop: 10 }} />
      {mode === 'api' ? (
        <AppText variant="caption" muted style={{ marginTop: 16 }}>
          Deletion runs on the HealthX server: your data is erased and every signed-in device is signed out.
        </AppText>
      ) : (
        <BackendNote style={{ marginTop: 16 }} text="Offline demo: this only resets the sample data stored on this device." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  warn: { alignItems: 'center', padding: 20, borderRadius: 30, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100] },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  list: { alignSelf: 'stretch', marginTop: 16, padding: 14, borderRadius: 20, backgroundColor: colors.surface },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.rose[500], alignItems: 'center', justifyContent: 'center' },
  export: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 22, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100] },
  form: { gap: 14, marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
});
