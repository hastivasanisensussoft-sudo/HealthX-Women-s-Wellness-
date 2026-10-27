import { useState } from 'react';
import { MailWarning, X } from 'lucide-react';
import { useToast } from '@/components/ui';
import { userApi } from '@/lib/api';
import { useStore } from '@/store/AppStore';
import { apiMessage } from '@/store/apiErrors';
import { exclusive } from '@/store/session';

/** API mode: reminds a signed-in user to confirm their email address (the server emails a link after sign-up). */
export function VerifyEmailBanner() {
  const { mode } = useStore();
  const toast = useToast();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  if (mode !== 'api' || hidden || userApi.user?.emailVerified !== false) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await exclusive(() => userApi.resendVerification());
      toast.success('Link sent', import.meta.env.DEV ? 'Development: the link is in the dev outbox (/api/v1/dev/outbox).' : `Check ${userApi.user?.email ?? 'your inbox'} for the confirmation link.`);
    } catch (e) {
      toast.error('Couldn’t send the link', apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b border-lavender-100 bg-lavender-50 px-4 py-2 text-center text-sm text-ink-800">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-lavender-600 shadow-xs">
        <MailWarning className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        Please confirm your email — we sent a link to <b className="break-all text-ink-900">{userApi.user?.email}</b>.
      </span>
      <button type="button" onClick={resend} disabled={busy} className="inline-flex min-h-[32px] items-center rounded-full bg-white px-3 text-sm font-semibold text-green-800 ring-1 ring-inset ring-lavender-200 hover:bg-green-50 disabled:opacity-60">
        {busy ? 'Sending…' : 'Resend link'}
      </button>
      <button type="button" aria-label="Dismiss" onClick={() => setHidden(true)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
