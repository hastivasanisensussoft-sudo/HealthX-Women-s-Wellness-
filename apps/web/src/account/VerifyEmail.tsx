import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck, Loader2, RotateCw, Smartphone } from 'lucide-react';
import { Button, ButtonLink, Notice } from '@/components/ui';
import { ApiError, userApi } from '@/lib/api';
import { apiMessage } from '@/store/apiErrors';
import { AccountLayout } from './AccountLayout';

/** [ADD A-01] Confirms the email address from the single-use link sent after sign-up (/verify-email?token=…). */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'working' | 'done' | 'invalid' | 'error'>(token ? 'working' : 'invalid');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  const verify = useCallback(async () => {
    setStatus('working');
    try {
      await userApi.verifyEmail(token);
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
    if (!token || ran.current) return;
    ran.current = true;
    void verify();
  }, [token, verify]);

  return (
    <AccountLayout eyebrow="Almost there" title="Confirm your email" image="herbal-tea" position="40% 50%" message="One quick confirmation and your account is fully set up.">
      {status === 'working' ? (
        <p className="flex items-center justify-center gap-2 py-6 text-sm font-semibold text-ink-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin text-green-700" /> Confirming your email…
        </p>
      ) : status === 'done' ? (
        <div className="bg-wash rounded-3xl p-6 text-center ring-1 ring-green-100" role="status">
          <CircleCheck className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-3 font-bold text-green-950">Your email is confirmed</p>
          <p className="mt-1 text-sm text-ink-500">Thanks — your account is fully set up. You can go back to the HealthX app.</p>
          <ButtonLink to="/get-the-app" variant="outline" className="mt-5 w-full" leftIcon={<Smartphone className="h-4 w-4" />}>
            About the HealthX app
          </ButtonLink>
        </div>
      ) : (
        <div className="space-y-4">
          <Notice tone="warning" title={status === 'invalid' ? 'This link has expired or was already used' : 'We couldn’t confirm your email'}>
            {status === 'invalid' ? 'Confirmation links work once and expire after 24 hours. In the HealthX app, open Profile and use “Resend link” to get a new one.' : message}
          </Notice>
          {status === 'error' && (
            <Button className="w-full" leftIcon={<RotateCw className="h-4 w-4" />} onClick={() => void verify()}>
              Try again
            </Button>
          )}
        </div>
      )}
    </AccountLayout>
  );
}
