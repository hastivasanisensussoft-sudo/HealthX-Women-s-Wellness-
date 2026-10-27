import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Wand2 } from 'lucide-react';
import { AuthLayout, OrDivider, SocialButtons } from '@/user/layout/AuthLayout';
import { Button, Checkbox, Field, Input, ProgressBar, useToast } from '@/components/ui';
import { useStore } from '@/store/AppStore';
import { ApiError, userApi } from '@/lib/api';
import { simulate } from '@/lib/utils';
import { apiMessage } from '@/store/apiErrors';

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export default function Signup() {
  const nav = useNavigate();
  const toast = useToast();
  const { dispatch, mode, completeSignIn } = useStore();
  const api = mode === 'api';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const s = strength(password);

  const start = () => {
    dispatch({ type: 'SIGN_UP', email: email || 'new.member@example.com', name });
    nav('/onboarding', { state: { name } });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    else if (s < 2) next.password = 'Add a mix of letters, numbers or symbols.';
    if (!agree) next.agree = 'Please accept the terms and privacy policy to continue.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (!api) {
        await simulate(true, 1000);
        toast.success('Account created', 'Offline demo — no real account was created.');
        return start();
      }
      await userApi.register({ name: name.trim(), email: email.trim(), password, acceptTerms: agree });
      await completeSignIn();
      toast.success('Account created', 'Let’s set up your space.');
      nav('/onboarding', { state: { name } });
    } catch (err) {
      const msg = apiMessage(err);
      // Show server validation next to the field it's about.
      if (/password/i.test(msg)) setErrors({ password: msg });
      else if (/email|account/i.test(msg)) setErrors({ email: msg });
      else if (/name/i.test(msg)) setErrors({ name: msg });
      else if (/terms/i.test(msg)) setErrors({ agree: msg });
      else setErrors({ form: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Sign up · free"
      title="Create your account"
      subtitle="Free forever for core tracking. Takes about a minute."
      image="portrait-indian"
      message="Set up in about a minute. You choose what to share, and you can export or delete it anytime."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-green-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SocialButtons
        onSocial={async (p) => {
          if (!api) {
            setBusy(true);
            await simulate(true, 800);
            setBusy(false);
            toast.info(`${p} sign-up simulated`, 'Offline demo — only your name and email would be requested.');
            return start();
          }
          try {
            await userApi.oauth(p === 'Apple' ? 'apple' : 'google');
          } catch (err) {
            setErrors({ form: err instanceof ApiError && err.status === 501 ? `${p} sign-up isn’t configured in this environment yet. Use email and password instead.` : `${p} sign-up failed. Please try again.` });
          }
        }}
      />
      <OrDivider label="or sign up with email" />
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
            {errors.form}
          </p>
        )}
        <Field label="First name" htmlFor="name" error={errors.name} required>
          <Input id="name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} leftIcon={<User className="h-4 w-4" />} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email} required>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} leftIcon={<Mail className="h-4 w-4" />} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} required>
          <Input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!errors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            rightSlot={
              <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          {password && (
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar value={s / 4} height="h-1.5" color={s <= 1 ? 'bg-danger' : s === 2 ? 'bg-warning' : 'bg-green-500'} label="Password strength" />
              <span className="w-16 shrink-0 text-xs font-semibold text-ink-500">{['Weak', 'Weak', 'Fair', 'Good', 'Strong'][s]}</span>
            </div>
          )}
        </Field>
        <div>
          <Checkbox
            checked={agree}
            onChange={setAgree}
            label={
              <>
                I agree to the{' '}
                <a className="font-semibold text-green-700 underline" href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms
                </a>{' '}
                and{' '}
                <a className="font-semibold text-green-700 underline" href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                . I understand HealthX is a wellness app, not a medical service.
              </>
            }
          />
          {errors.agree && <p className="mt-1.5 text-sm font-medium text-danger">{errors.agree}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
        <p className="flex flex-wrap items-center justify-center gap-1 text-center text-sm text-ink-500">
          <Wand2 className="h-4 w-4 text-green-600" /> Prefer no password?{' '}
          <Link to="/login?mode=magic" className="font-semibold text-green-700 hover:underline">
            Email me a magic link
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
