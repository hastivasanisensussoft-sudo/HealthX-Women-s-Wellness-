import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck, Loader2, RotateCw } from 'lucide-react';
import { AuthLayout } from '@/user/layout/AuthLayout';
import { Button, ButtonLink, Notice } from '@/components/ui';
import { ApiError, userApi } from '@/lib/api';
import { useStore } from '@/store/AppStore';
import { apiMessage } from '@/store/apiErrors';
import { refreshSession } from '@/store/session';

/** [ADD A-01] Confirms the email address from the single-use link sent after sign-up (/verify-email?token=…). */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { mode } = useStore();
  const [status, setStatus] = useState<'working' | 'done' | 'invalid' | 'error'>(token ? 'working' : 'invalid');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  const verify = useCallback(async () => {
    setStatus('working');
    try {
      await userApi.verifyEmail(token);
      if (userApi.signedIn) await refreshSession(); // picks up the verified flag for this session
      setStatus('done');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_token') setStatus('invalid');
      else {
        setMessage(apiMessage(e));
        setStatus('error');
      }
    }
  }, [token]);

  useEffect(() => {
    if (mode !== 'api' || !token || ran.current) return;
    ran.current = true;
    void verify();
  }, [mode, token, verify]);

  const next = userApi.signedIn ? { to: '/app', label: 'Continue to HealthX' } : { to: '/login', label: 'Log in' };

  return (
    <AuthLayout eyebrow="Almost there" title="Confirm your email" image="herbal-tea" position="40% 50%" message="One quick confirmation and your account is fully set up.">
      {mode === 'demo' ? (
        <Notice tone="info" title="Needs the HealthX server">
          Email confirmation works only when the app is connected to the server.{' '}
          <Link to="/login" className="font-semibold underline">
            Back to log in
          </Link>
        </Notice>
      ) : status === 'working' ? (
        <p className="flex items-center justify-center gap-2 py-6 text-sm font-semibold text-ink-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin text-green-700" /> Confirming your email…
        </p>
      ) : status === 'done' ? (
        <div className="bg-wash rounded-3xl p-6 text-center ring-1 ring-green-100" role="status">
          <CircleCheck className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-3 font-bold text-green-950">Your email is confirmed</p>
          <p className="mt-1 text-sm text-ink-500">Thanks — your account is fully set up.</p>
          <ButtonLink to={next.to} className="mt-5 w-full">
            {next.label}
          </ButtonLink>
        </div>
      ) : (
        <div className="space-y-4">
          <Notice tone="warning" title={status === 'invalid' ? 'This link has expired or was already used' : 'We couldn’t confirm your email'}>
            {status === 'invalid' ? 'Confirmation links work once and expire after 24 hours. Sign in and use “Resend link” on your profile to get a new one.' : message}
          </Notice>
          {status === 'error' && (
            <Button className="w-full" leftIcon={<RotateCw className="h-4 w-4" />} onClick={() => void verify()}>
              Try again
            </Button>
          )}
          <ButtonLink to={next.to} variant={status === 'error' ? 'outline' : undefined} className="w-full">
            {next.label}
          </ButtonLink>
        </div>
      )}
    </AuthLayout>
  );
}
