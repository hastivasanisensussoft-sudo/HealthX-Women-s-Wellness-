import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailCheck, RotateCw } from 'lucide-react';
import { AuthLayout } from '@/user/layout/AuthLayout';
import { Button, ButtonLink, Field, Input, useToast } from '@/components/ui';
import { simulate } from '@/lib/utils';
import { userApi } from '@/lib/api';
import { useStore } from '@/store/AppStore';
import { apiMessage } from '@/store/apiErrors';

const RESEND_SECONDS = 45;

/** [ADD A-01] Password reset / magic link — not in the SRS; shown because email/password login needs recovery (mockup M05). */
export default function ForgotPassword() {
  const toast = useToast();
  const { mode } = useStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    setBusy(true);
    try {
      if (mode === 'api') await userApi.forgotPassword(email.trim());
      else await simulate(true, 900);
      setSent(true);
      setWait(RESEND_SECONDS);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    setError(null);
    await send();
  };

  return (
    <AuthLayout
      title={sent ? 'Check your email' : 'Forgot password'}
      eyebrow="Account help"
      subtitle={sent ? undefined : 'Enter your email and we’ll send a reset or magic link.'}
      image="woman-tea"
      position="30% 40%"
      message="It happens to everyone. We’ll send a secure, single-use link to your inbox."
      footer={
        <Link to="/login" className="font-semibold text-green-700 hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="bg-wash rounded-3xl p-6 text-center ring-1 ring-green-100" role="status">
          <span className="relative mx-auto flex h-16 w-16 items-center justify-center">
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-green-200/60 [animation-duration:2.4s]" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-700 text-white shadow-glow">
              <MailCheck className="h-8 w-8" />
            </span>
          </span>
          <p className="mt-4 font-display text-lg font-semibold text-green-950">Your link is on its way</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            If an account exists for <strong className="text-ink-900">{email}</strong>, we’ve sent a link. It expires in 30 minutes.
          </p>
          <p className="mt-1 text-xs text-ink-400">
            For your security we never confirm whether an address is registered.{' '}
            {mode === 'api' ? (import.meta.env.DEV ? 'Development: the link appears in the dev outbox (/api/v1/dev/outbox).' : '') : '(Offline demo — no email is sent.)'}
          </p>
          <ButtonLink to={`mailto:${email}`} className="mt-5 w-full">
            Open email app
          </ButtonLink>
          <div className="mt-3 text-sm">
            {wait > 0 ? (
              <p className="text-ink-500" aria-live="polite">
                Resend link in <b className="text-green-800">0:{String(wait).padStart(2, '0')}</b>
              </p>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await send();
                  toast.success('Link sent again');
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:underline"
              >
                <RotateCw className="h-3.5 w-3.5" /> Resend link
              </button>
            )}
          </div>
          <p className="mt-4 text-xs italic text-ink-500">
            Wrong email?{' '}
            <button type="button" onClick={() => setSent(false)} className="font-semibold not-italic text-green-700 hover:underline">
              Change it
            </button>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Email" htmlFor="email" error={error}>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} leftIcon={<Mail className="h-4 w-4" />} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
