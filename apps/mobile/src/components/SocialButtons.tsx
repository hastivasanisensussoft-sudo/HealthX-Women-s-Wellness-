import { Apple } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from './Text';
import { errorMessage, useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { colors, font, palette } from '@/lib/theme';

function GoogleGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

function SocialButton({ label, icon, dark, loading, disabled, onPress }: { label: string; icon: ReactNode; dark?: boolean; loading?: boolean; disabled?: boolean; onPress: () => void }) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={!!off} aria-busy={!!loading}
      disabled={!!off}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, dark ? styles.dark : styles.light, pressed && !off && { transform: [{ scale: 0.98 }], opacity: 0.92 }, off && !loading && { opacity: 0.5 }]}>
      {loading ? <ActivityIndicator color={dark ? colors.surface : palette.green[700]} /> : icon}
      <AppText style={[styles.label, { color: dark ? colors.surface : colors.text }]}>{label}</AppText>
    </Pressable>
  );
}

/**
 * "Continue with Apple / Google" (SRS §48, mockup M03/M04) — shown above the email form,
 * followed by an "or" divider. With the API, the server answers that Apple/Google OAuth isn't
 * configured yet (no client credentials) and that message is shown; the offline demo simulates it.
 */
export function SocialButtons({ onSuccess }: { onSuccess: () => void }) {
  const toast = useToast();
  const { auth, mode } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (provider: 'Apple' | 'Google') => {
    setBusy(provider);
    try {
      await auth.oauth(provider === 'Apple' ? 'apple' : 'google');
      if (mode === 'offline') toast(`Signed in with ${provider} — offline demo`, 'info');
      onSuccess();
    } catch (e) {
      toast(errorMessage(e), 'info');
    } finally {
      setBusy(null);
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <SocialButton label="Continue with Apple" dark icon={<Apple size={18} color={colors.surface} fill={colors.surface} />} loading={busy === 'Apple'} disabled={!!busy && busy !== 'Apple'} onPress={() => run('Apple')} />
      <SocialButton label="Continue with Google" icon={<GoogleGlyph />} loading={busy === 'Google'} disabled={!!busy && busy !== 'Google'} onPress={() => run('Google')} />
      <View style={styles.divider}>
        <View style={styles.line} />
        <AppText variant="overline" color={palette.ink[500]}>
          or
        </AppText>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5 },
  dark: { backgroundColor: colors.text, borderColor: colors.text },
  light: { backgroundColor: colors.surface, borderColor: palette.ink[200] },
  label: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.1 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: palette.ink[200] },
});
