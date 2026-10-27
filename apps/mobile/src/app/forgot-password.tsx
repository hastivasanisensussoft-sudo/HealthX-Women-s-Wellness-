/** Forgot password (SRS §48, mockup M05). The API issues a single-use reset link (email delivery needs a provider). */
import { router } from 'expo-router';
import { ArrowLeft, Mail, MailCheck, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Sparkle } from '@/components/Art';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Inputs';
import { AppText } from '@/components/Text';
import { isEmail } from '@/lib/hooks';
import { errorMessage, useStore } from '@/lib/store';
import { brandText, colors, font, palette, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const RESEND_SECONDS = 45;

export default function ForgotPassword() {
  const toast = useToast();
  const { auth, mode } = useStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [left, setLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!sent || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, left]);

  const send = async () => {
    if (!isEmail(email)) return setError('Enter the email you signed up with.');
    setError(null);
    setLoading(true);
    try {
      await auth.forgotPassword(email.trim());
      setSent(true);
      setLeft(RESEND_SECONDS);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const openMail = async () => {
    try {
      await Linking.openURL('mailto:');
    } catch {
      toast('Open your email app to find the link', 'info');
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we'll send a reset or magic link." photo="woman-tea" eyebrow="Account help" tagline="We’ll help you back in, safely.">
      {!sent ? (
        <View style={styles.steps}>
          {['Enter your email', 'Open the link we send', 'Choose a new password'].map((t, i) => (
            <View key={t} style={styles.step}>
              <View style={[styles.stepNum, i === 0 && styles.stepNumOn]}>
                <AppText variant="caption" color={i === 0 ? '#fff' : brandText} style={{ fontFamily: font.bold }}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="caption" color={palette.ink[700]} center style={{ fontSize: 11.5 }}>
                {t}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 14 }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (sent) setSent(false);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          error={error}
          icon={<Mail size={18} color={palette.ink[400]} />}
        />
        {!sent ? <Button label="Send link" size="lg" full loading={loading} onPress={send} /> : null}
      </View>

      {sent ? (
        <View style={styles.card} accessibilityLiveRegion="polite">
          <View style={styles.iconWrap}>
            <Sparkle size={16} color={palette.butter[400]} style={{ right: -4, top: 0 }} />
            <View style={styles.icon}>
              <MailCheck size={30} color="#fff" />
            </View>
          </View>
          <AppText variant="h2" center style={{ marginTop: 12 }}>
            Check your email
          </AppText>
          <AppText variant="small" center color={palette.ink[700]} style={{ marginTop: 6 }}>
            If an account exists for <AppText variant="smallMedium">{email.trim()}</AppText>, we’ve sent a reset link.{'\n'}It expires in 30 minutes.
          </AppText>
          <Button label="Open email app" full onPress={openMail} style={{ marginTop: 16 }} />
          {left > 0 ? (
            <View style={styles.timer}>
              <AppText variant="caption" color={brandText}>
                Resend link in <AppText variant="caption" color={brandText} style={{ fontFamily: font.bold }}>0:{String(left).padStart(2, '0')}</AppText>
              </AppText>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={send} style={styles.resend} hitSlop={6}>
              <AppText variant="smallMedium" color={palette.green[700]}>
                Resend link
              </AppText>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <ShieldCheck size={13} color={palette.ink[500]} />
            <AppText variant="caption" muted center style={{ flexShrink: 1 }}>
              {mode === 'offline' ? 'Offline demo — no email is sent.' : 'For your security we never confirm whether an address is registered.'}
            </AppText>
          </View>
        </View>
      ) : null}

      {sent ? (
        <Pressable accessibilityRole="button" onPress={() => setSent(false)} style={{ alignItems: 'center', marginTop: 14, minHeight: 36, justifyContent: 'center' }}>
          <AppText variant="small" color={palette.green[700]}>
            Wrong email? <AppText variant="smallMedium" color={palette.green[700]} style={{ fontFamily: font.bold }}>Change it</AppText>
          </AppText>
        </Pressable>
      ) : null}
      <Button label="Back to log in" variant="ghost" size="sm" icon={ArrowLeft} onPress={() => router.replace('/login')} style={{ alignSelf: 'center', marginTop: 10 }} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  step: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: palette.green[50], borderRadius: 18, paddingVertical: 12, paddingHorizontal: 6, borderWidth: 1, borderColor: palette.green[100] },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.green[200], alignItems: 'center', justifyContent: 'center' },
  stepNumOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  card: { marginTop: 18, backgroundColor: palette.green[50], borderRadius: 26, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: palette.green[100] },
  iconWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: palette.green[700], alignItems: 'center', justifyContent: 'center', ...shadow.lift },
  timer: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  resend: { marginTop: 12, minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 },
});
