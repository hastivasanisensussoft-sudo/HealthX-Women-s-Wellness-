/** Small "confirm your email · resend" hint for accounts that haven't confirmed their address (API mode). */
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { errorMessage, useStore } from '@/lib/store';
import { brandText, colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export function VerifyEmailHint() {
  const { emailVerified, account } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (emailVerified) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await account.resendVerification();
      toast('Confirmation email sent');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <MailCheck size={16} color={palette.green[700]} />
      </View>
      <AppText variant="caption" color={brandText} style={{ flex: 1, fontSize: 12.5, lineHeight: 17 }}>
        Confirm your email — open the link we sent you.
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Resend confirmation email" onPress={resend} disabled={busy} hitSlop={8} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
        <AppText variant="caption" color={brandText} style={{ fontFamily: font.bold }}>
          {busy ? 'Sending…' : 'Resend'}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingLeft: 8, paddingRight: 8, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: palette.green[100], backgroundColor: palette.green[50] },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  btn: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: palette.green[200] },
});
