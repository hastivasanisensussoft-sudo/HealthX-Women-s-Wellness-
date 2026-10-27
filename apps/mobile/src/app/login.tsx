/** Log in (SRS §48, mockup M04): Apple / Google, email + password, magic link — against the HealthX API. */
import { router, useLocalSearchParams } from 'expo-router';
import { CircleAlert, Eye, EyeOff, Lock, Mail, Wand2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Inputs';
import { SocialButtons } from '@/components/SocialButtons';
import { AppText } from '@/components/Text';
import { isEmail } from '@/lib/hooks';
import { errorMessage, useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function Login() {
  const { auth, mode } = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ email?: string; magic?: string }>();
  const [email, setEmail] = useState(params.email ?? (mode === 'offline' ? 'aisha@example.com' : ''));
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const verified = useRef(false);

  const enter = () => router.replace('/');

  // Opening a magic link (…/login?magic=TOKEN) signs in once.
  useEffect(() => {
    if (!params.magic || verified.current) return;
    verified.current = true;
    (async () => {
      setLoading(true);
      try {
        await auth.verifyMagicLink(params.magic!);
        toast('Signed in with your magic link');
        router.replace('/');
      } catch (e) {
        setErrors({ form: errorMessage(e) });
      } finally {
        setLoading(false);
      }
    })();
  }, [auth, params.magic, toast]);

  const submit = async () => {
    const e: typeof errors = {};
    if (!isEmail(email)) e.email = 'Enter a valid email address.';
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await auth.login(email.trim(), password);
      toast('Welcome back!');
      enter();
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const magic = async () => {
    if (!isEmail(email)) {
      setErrors({ email: 'Enter your email to receive a magic link.' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await auth.requestMagicLink(email.trim());
      setMagicSent(true);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your wellness journey"
      photo="portrait-curly"
      eyebrow="Good to see you"
      tagline="Pick up right where you left off."
      footer={
        <Pressable accessibilityRole="link" onPress={() => router.replace('/signup')} style={styles.switch}>
          <AppText variant="small" color={palette.ink[700]}>
            New here? <AppText variant="smallMedium" color={palette.green[700]} style={{ fontFamily: font.bold }}>Create account</AppText>
          </AppText>
        </Pressable>
      }>
      <SocialButtons onSuccess={enter} />
      <View style={{ gap: 12, marginTop: 4 }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          error={errors.email}
          icon={<Mail size={18} color={palette.ink[400]} />}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secure={!show}
          autoCapitalize="none"
          placeholder="At least 8 characters"
          error={errors.password}
          hint={mode === 'offline' ? 'Offline demo: any 8+ character password works' : undefined}
          icon={<Lock size={18} color={palette.ink[400]} />}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow((s) => !s)} hitSlop={8}>
              {show ? <EyeOff size={18} color={palette.green[700]} /> : <Eye size={18} color={palette.green[700]} />}
            </Pressable>
          }
        />
        <Pressable accessibilityRole="link" onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', paddingVertical: 4 }} hitSlop={8}>
          <AppText variant="smallMedium" color={palette.green[700]}>
            Forgot password?
          </AppText>
        </Pressable>
        {errors.form ? (
          <View accessibilityRole="alert" style={styles.formError}>
            <CircleAlert size={16} color={colors.danger} />
            <AppText variant="small" color={colors.danger} style={{ flex: 1 }}>
              {errors.form}
            </AppText>
          </View>
        ) : null}
        <Button label="Log in" icon={Lock} size="lg" full loading={loading} onPress={submit} style={{ marginTop: 4 }} />
        <Button label={magicSent ? 'Magic link sent' : 'Email me a magic link'} icon={Wand2} variant="secondary" size="lg" full disabled={magicSent} onPress={magic} />
        {magicSent ? (
          <AppText variant="caption" muted center accessibilityLiveRegion="polite">
            {mode === 'offline'
              ? 'Offline demo: no email is sent. Log in with any password instead.'
              : `If an account exists for ${email.trim()}, we’ve sent a single-use sign-in link. It expires in 15 minutes.`}
          </AppText>
        ) : null}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  switch: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: palette.green[50] },
  formError: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.dangerSoft, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: palette.rose[200] },
});
