/** Sign up (SRS §47–§48, mockup M03): Apple / Google, email + password + terms, magic link — against the HealthX API. */
import { router } from 'expo-router';
import { CircleAlert, Eye, EyeOff, Lock, Mail, UserRound, Wand2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { CheckBox, TextField } from '@/components/Inputs';
import { SocialButtons } from '@/components/SocialButtons';
import { AppText } from '@/components/Text';
import { ApiError } from '@/lib/api';
import { isEmail } from '@/lib/hooks';
import { errorMessage, useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { WELCOME_ART } from '@/lib/welcomeArt';

const STRENGTH = ['Too short', 'Weak', 'Good', 'Strong'];

export default function Signup() {
  const { auth } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const strength = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password)].filter(Boolean).length;

  const submit = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Please enter your name.';
    if (!isEmail(email)) e.email = 'Enter a valid email address.';
    if (password.length < 8) e.password = 'Use at least 8 characters.';
    if (!agree) e.agree = 'Please accept the Terms and Privacy Policy to continue.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await auth.register({ name: name.trim(), email: email.trim(), password, acceptTerms: agree });
      router.replace({ pathname: '/onboarding', params: { name: name.trim() } });
    } catch (err) {
      // Put server validation messages next to the field they belong to.
      const msg = errorMessage(err);
      if (err instanceof ApiError && err.status === 409) setErrors({ email: msg });
      else if (/password/i.test(msg)) setErrors({ password: msg });
      else if (/email/i.test(msg)) setErrors({ email: msg });
      else setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free · takes 1 minute"
      art={WELCOME_ART.tea}
      eyebrow="Join HealthX"
      tagline="A calm, private start — at your own pace."
      footer={
        <Pressable accessibilityRole="link" onPress={() => router.replace('/login')} style={styles.switch}>
          <AppText variant="small" color={palette.ink[700]}>
            Already have an account? <AppText variant="smallMedium" color={palette.green[700]} style={{ fontFamily: font.bold }}>Log in</AppText>
          </AppText>
        </Pressable>
      }>
      <SocialButtons onSuccess={() => router.replace('/')} />
      <View style={{ gap: 14, marginTop: 4 }}>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="Your first name" error={errors.name} autoCapitalize="words" icon={<UserRound size={18} color={palette.ink[400]} />} />
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" error={errors.email} icon={<Mail size={18} color={palette.ink[400]} />} />
        <View style={{ gap: 8 }}>
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secure={!show}
            autoCapitalize="none"
            placeholder="At least 8 characters"
            error={errors.password}
            icon={<Lock size={18} color={palette.ink[400]} />}
            right={
              <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow((s) => !s)} hitSlop={8}>
                {show ? <EyeOff size={18} color={palette.green[700]} /> : <Eye size={18} color={palette.green[700]} />}
              </Pressable>
            }
          />
          <View style={styles.meterRow} accessibilityLabel={`Password strength ${strength} of 3`}>
            <View style={styles.meter}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.meterBar, { backgroundColor: i < strength ? [colors.danger, palette.butter[500], palette.green[600]][strength - 1] : palette.ink[100] }]} />
              ))}
            </View>
            <AppText variant="caption" color={strength === 3 ? palette.green[700] : palette.ink[500]} style={styles.meterText}>
              {password ? STRENGTH[strength] : 'A–Z · 0–9 · 8+'}
            </AppText>
          </View>
        </View>
        <CheckBox checked={agree} onPress={() => setAgree((a) => !a)} label="I agree to the Terms and Privacy Policy" style={[styles.terms, !!errors.agree && { borderColor: colors.danger }]}>
          <AppText variant="small" color={palette.ink[700]} style={{ flex: 1 }}>
            I agree to the Terms and Privacy Policy and understand HealthX is a wellness app, not a medical service.
          </AppText>
        </CheckBox>
        {errors.agree ? (
          <View style={styles.inlineError}>
            <CircleAlert size={14} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
              {errors.agree}
            </AppText>
          </View>
        ) : null}
        {errors.form ? (
          <View accessibilityRole="alert" style={styles.formError}>
            <CircleAlert size={16} color={colors.danger} />
            <AppText variant="small" color={colors.danger} style={{ flex: 1 }}>
              {errors.form}
            </AppText>
          </View>
        ) : null}
        <Button label="Create account" size="lg" full loading={loading} onPress={submit} style={{ marginTop: 4 }} />
        <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/login', params: { email: email.trim() } })} style={styles.magic}>
          <Wand2 size={15} color={palette.green[700]} />
          <AppText variant="small" color={palette.green[700]}>
            Prefer no password? <AppText variant="smallMedium" color={palette.green[700]} style={{ fontFamily: font.bold }}>Email me a magic link</AppText>
          </AppText>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meter: { flex: 1, flexDirection: 'row', gap: 6 },
  meterBar: { flex: 1, height: 6, borderRadius: 3 },
  meterText: { minWidth: 86, textAlign: 'right' },
  terms: { alignItems: 'flex-start', backgroundColor: palette.green[50], borderRadius: 18, padding: 14, borderWidth: 1, borderColor: palette.green[100] },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  formError: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.dangerSoft, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: palette.rose[200] },
  magic: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  switch: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: palette.green[50] },
});
