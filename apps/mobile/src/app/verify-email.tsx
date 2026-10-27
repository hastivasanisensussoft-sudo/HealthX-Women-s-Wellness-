/**
 * Opens a "Confirm your HealthX email" link (…/verify-email?token=…). The API builds the link from the
 * requesting origin, so it lands here in the web preview; links requested from a phone open the web app.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { CircleAlert, MailCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { StateArt } from '@/components/Feedback';
import { AppText } from '@/components/Text';
import { errorMessage, useStore } from '@/lib/store';
import { brandText, colors, palette } from '@/lib/theme';

export default function VerifyEmail() {
  const { auth, ready } = useStore();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const started = useRef(false);

  // Wait for the session restore so the signed-in account picks up the confirmed state.
  useEffect(() => {
    if (!token || !ready || started.current) return;
    started.current = true;
    (async () => {
      try {
        await auth.verifyEmail(token);
        setResult({ ok: true, text: 'Your email is confirmed. Thank you!' });
      } catch (e) {
        setResult({ ok: false, text: errorMessage(e) });
      }
    })();
  }, [auth, ready, token]);

  const shown = token ? result : { ok: false, text: 'This link is incomplete. Open the link from your email again.' };
  return (
    <AuthShell title="Confirm your email" subtitle="Confirming lets us keep your account secure" photo="woman-reading" eyebrow="Almost there" tagline="One quick step to secure your account.">
      <View style={[styles.panel, shown && !shown.ok && styles.panelError]}>
        {shown ? (
          <>
            <StateArt icon={shown.ok ? MailCheck : CircleAlert} tone={shown.ok ? 'green' : 'rose'} size={96} />
            <View accessibilityRole="alert" style={{ marginTop: 10 }}>
              <AppText variant="bodyMedium" center color={shown.ok ? brandText : colors.danger}>
                {shown.text}
              </AppText>
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator color={palette.green[700]} accessibilityLabel="Confirming your email" />
            <AppText variant="small" muted center style={{ marginTop: 10 }}>
              Confirming your email…
            </AppText>
          </>
        )}
      </View>
      <Button label="Continue" size="lg" full style={{ marginTop: 18 }} disabled={!shown} onPress={() => router.replace('/')} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', backgroundColor: palette.green[50], borderRadius: 26, padding: 20, borderWidth: 1, borderColor: palette.green[100], minHeight: 120, justifyContent: 'center' },
  panelError: { backgroundColor: palette.rose[50], borderColor: palette.rose[100] },
});
