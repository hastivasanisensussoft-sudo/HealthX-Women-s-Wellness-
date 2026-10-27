import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck, Eye, EyeOff, Lock, Smartphone } from 'lucide-react';
import { Button, ButtonLink, Field, Input, Notice, useToast } from '@/components/ui';
import { ApiError, userApi } from '@/lib/api';
import { apiMessage } from '@/store/apiErrors';
import { AccountLayout } from './AccountLayout';

/** [ADD A-01] Choose a new password from the single-use emailed link (/reset-password?token=…), then sign in in the app. */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string; form?: string }>({});
  const [expired, setExpired] = useState(false);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (pw.length < 8) next.pw = 'Use at least 8 characters.';
    if (confirm !== pw) next.confirm = 'Passwords don’t match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await userApi.resetPassword(token, pw);
      setDone(true);
      toast.success('Password updated', 'Sign in to the HealthX app with your new password.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_token') setExpired(true);
      else if (err instanceof ApiError && err.offline) setOffline(true);
      else setErrors({ form: apiMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const invalid = !token || expired;

  return (
    <AccountLayout eyebrow="Account help" title="Choose a new password" subtitle="For your security, this signs you out on your other devices." image="meditation" position="50% 40%" message="Choose a new password and you’re back in — your data is just as you left it.">
      {offline ? (
        <Notice tone="info" title="Needs the HealthX server">
          Password reset works only when the HealthX server can be reached. Try again in a moment.
        </Notice>
      ) : done ? (
        <div className="bg-wash rounded-3xl p-6 text-center ring-1 ring-green-100" role="status">
          <CircleCheck className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-3 font-bold text-green-950">Your password has been changed</p>
          <p className="mt-1 text-sm text-ink-500">Open the HealthX app on your phone and sign in with your new password.</p>
          <ButtonLink to="/get-the-app" variant="outline" className="mt-5 w-full" leftIcon={<Smartphone className="h-4 w-4" />}>
            About the HealthX app
          </ButtonLink>
        </div>
      ) : invalid ? (
        <Notice tone="warning" title="This link has expired or was already used">
          Reset links work once and expire after 30 minutes. In the HealthX app, tap “Forgot password?” to get a new one, and use the latest email.
        </Notice>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {errors.form && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
              {errors.form}
            </p>
          )}
          <Field label="New password" htmlFor="rp-pw" error={errors.pw} hint="At least 8 characters — avoid common passwords.">
            <Input
              id="rp-pw"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              invalid={!!errors.pw}
              leftIcon={<Lock className="h-4 w-4" />}
              rightSlot={
                <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </Field>
          <Field label="Confirm new password" htmlFor="rp-confirm" error={errors.confirm}>
            <Input id="rp-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!errors.confirm} leftIcon={<Lock className="h-4 w-4" />} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Update password
          </Button>
        </form>
      )}
    </AccountLayout>
  );
}
