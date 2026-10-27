import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Wand2 } from 'lucide-react';
import { AuthLayout, OrDivider, SocialButtons } from '@/user/layout/AuthLayout';
import { Button, Field, Input, Notice, Segmented, useToast } from '@/components/ui';
import { useStore } from '@/store/AppStore';
import { ApiError, userApi } from '@/lib/api';
import { simulate } from '@/lib/utils';
import { apiMessage } from '@/store/apiErrors';

const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e);
const DEV_HINT = import.meta.env.DEV;

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string; reason?: string } };
  const toast = useToast();
  const { state, dispatch, mode, sessionEnded, completeSignIn } = useStore();
  const { auth } = state;
  const api = mode === 'api';
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'password' | 'magic'>(params.get('mode') === 'magic' ? 'magic' : 'password');
  const [email, setEmail] = useState(api ? (DEV_HINT ? 'aisha@example.com' : '') : (auth.email ?? 'aisha@example.com'));
  const [password, setPassword] = useState(api ? '' : 'wellness123');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const magicTried = useRef(false);

  const goIn = (onboarded: boolean) => nav(onboarded ? loc.state?.from ?? '/app' : '/onboarding', { replace: true });

  /** Offline demo: no server — sign in locally. */
  const finishDemo = () => {
    dispatch({ type: 'SIGN_IN', email });
    toast.success('Welcome back!', 'Signed in to the offline demo.');
    goIn(auth.onboarded);
  };

  // Magic link landing: /login?magic=TOKEN
  useEffect(() => {
    const token = params.get('magic');
    if (!api || !token || magicTried.current) return;
    magicTried.current = true;
    (async () => {
      setBusy(true);
      try {
        await userApi.verifyMagicLink(token);
        const s = await completeSignIn();
        toast.success('Signed in', 'Welcome back to HealthX.');
        if (s) goIn(s.auth.onboarded);
      } catch (e) {
        setErrors({ form: apiMessage(e, 'This sign-in link didn’t work. Request a new one.') });
        setTab('magic');
        params.delete('magic');
        setParams(params, { replace: true });
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!emailOk(email)) next.email = 'Enter a valid email address.';
    if (tab === 'password' && !password) next.password = 'Enter your password.';
    else if (!api && tab === 'password' && password.length < 8) next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (!api) {
        if (tab === 'magic') {
          await simulate(true, 900);
          setMagicSent(true);
        } else {
          // Offline demo: any password containing "wrong" previews the invalid-credentials error.
          await simulate(true, 900, password.includes('wrong'));
          finishDemo();
        }
        return;
      }
      if (tab === 'magic') {
        await userApi.requestMagicLink(email.trim());
        setMagicSent(true);
        return;
      }
      const r = await userApi.login(email.trim(), password);
      if (r.kind === 'mfa') {
        setErrors({ form: 'This is a HealthX staff account. Staff sign in to the Web Admin at /admin.' });
        return;
      }
      const s = await completeSignIn();
      toast.success('Welcome back!', r.user.name ? `Signed in as ${r.user.name}.` : undefined);
      if (s) goIn(s.auth.onboarded);
    } catch (err) {
      setErrors({ form: apiMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const social = async (p: 'Apple' | 'Google') => {
    if (!api) {
      setBusy(true);
      await simulate(true, 800);
      setBusy(false);
      toast.info(`${p} sign-in simulated`, 'Offline demo — no real OAuth.');
      return finishDemo();
    }
    try {
      await userApi.oauth(p === 'Apple' ? 'apple' : 'google');
    } catch (err) {
      setErrors({ form: err instanceof ApiError && err.status === 501 ? `${p} sign-in isn’t configured in this environment yet. Use email and password or a magic link.` : `${p} sign-in failed. Please try again.` });
    }
  };

  return (
    <AuthLayout
      eyebrow="Log in"
      title="Welcome back"
      subtitle="Log in to continue your wellness journey."
      image="portrait-curly"
      message="Pick up where you left off. Your data stays private, and every estimate is clearly marked."
      footer={
        <>
          New to HealthX?{' '}
          <Link to="/signup" className="font-semibold text-green-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {(sessionEnded || loc.state?.reason === 'session_end') && (
        <Notice tone="info" className="mb-5" title="Your session ended">
          For your security you’ve been signed out. Please sign in again.
        </Notice>
      )}
      <SocialButtons onSocial={social} />
      <OrDivider />
      <Segmented
        className="mb-5 w-full [&>button]:flex-1"
        value={tab}
        onChange={(m) => {
          setTab(m);
          setMagicSent(false);
          setErrors({});
        }}
        options={[
          { value: 'password', label: 'Password' },
          { value: 'magic', label: 'Magic link' },
        ]}
      />
      {magicSent ? (
        <Notice tone="green" title="Check your inbox" icon={<Wand2 className="h-4 w-4 text-green-600" />}>
          If an account exists for <strong>{email}</strong>, we’ve sent a single-use sign-in link. It expires in 15 minutes.{' '}
          {api ? (
            DEV_HINT && <span className="block pt-1 text-xs text-ink-500">Development: the link appears in the dev outbox (/api/v1/dev/outbox).</span>
          ) : (
            <button className="font-semibold underline" onClick={finishDemo}>
              Simulate opening the link
            </button>
          )}
        </Notice>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {errors.form && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
              {errors.form}
            </p>
          )}
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} leftIcon={<Mail className="h-4 w-4" />} />
          </Field>
          {tab === 'password' && (
            <Field
              label={
                <span className="flex items-center justify-between">
                  Password
                  <Link to="/forgot-password" className="text-sm font-semibold text-green-700 hover:underline">
                    Forgot password?
                  </Link>
                </span>
              }
              htmlFor="password"
              error={errors.password}
              hint={api ? (DEV_HINT ? 'Development demo account: aisha@example.com · HealthX-demo-2026' : undefined) : 'Offline demo tip: include “wrong” in the password to preview the error state.'}
            >
              <Input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!errors.password}
                leftIcon={<Lock className="h-4 w-4" />}
                rightSlot={
                  <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </Field>
          )}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {tab === 'password' ? 'Log in' : 'Email me a magic link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
