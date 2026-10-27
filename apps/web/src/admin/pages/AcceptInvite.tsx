import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Copy, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { Button, ButtonLink, Field, Input, Notice, useToast } from '@/components/ui';
import { adminApi, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AuthShell } from '../AuthShell';
import { useAdmin } from '../adminState';

/** Staff invite acceptance: set a password, then enrol an authenticator app (secret shown once). */
export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { apiMode } = useAdmin();
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<{ pw?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ secret: string; url: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof err = {};
    if (pw.length < 8) next.pw = 'Use at least 8 characters.';
    if (!next.pw && confirm !== pw) next.confirm = 'Passwords don’t match.';
    setErr(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const r = await adminApi.acceptInvite(token, pw);
      setMfa({ secret: r.mfaSecret, url: r.otpauthUrl });
    } catch (e2) {
      setErr({ form: e2 instanceof ApiError ? e2.message : 'Couldn’t accept the invite. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell photo="nature-leaves">
      <ol aria-label="Invite steps" className="mb-5 flex items-center gap-2">
        {['Password', 'Authenticator', 'Sign in'].map((s, i) => {
          const idx = mfa ? 1 : 0;
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={cn('num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm', done ? 'bg-green-600 text-white' : active ? 'bg-green-900 text-white ring-4 ring-green-500/15' : 'bg-white text-ink-400 ring-1 ring-ink-200')}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('hidden font-mono text-[11px] font-medium uppercase tracking-[0.12em] sm:inline', active ? 'text-green-800' : 'text-ink-400')}>{s}</span>
              {i < 2 && <span className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-green-400' : 'bg-ink-200')} />}
            </li>
          );
        })}
      </ol>
      <div className="card animate-fade-up space-y-5 p-6 sm:p-8">
        {!apiMode ? (
          <>
            <div>
              <p className="eyebrow">Staff invite</p>
              <h1 className="mt-1.5 font-display text-[26px] font-semibold leading-tight text-ink-900">Join HealthX Admin</h1>
            </div>
            <Notice tone="warning" title="Needs the HealthX server">
              Invites can only be accepted when the Web Admin is connected to the API.
            </Notice>
          </>
        ) : !token ? (
          <>
            <div>
              <p className="eyebrow">Staff invite</p>
              <h1 className="mt-1.5 font-display text-[26px] font-semibold leading-tight text-ink-900">Join HealthX Admin</h1>
            </div>
            <Notice tone="warning" title="Invite link incomplete">
              Open the link from your invite email again.
            </Notice>
          </>
        ) : mfa ? (
          <div className="space-y-4" role="status">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-green-100 text-green-700 ring-1 ring-inset ring-green-100">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="eyebrow">Step 2 · Two-step verification</p>
              <h1 className="mt-1.5 font-display text-[24px] font-semibold leading-tight text-ink-900">Set up two-step verification</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">Add this key to your authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). It’s shown only once.</p>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-green-300 bg-green-50/60 px-4 py-3.5">
              <code className="break-all font-mono text-[15px] font-medium tracking-[0.14em] text-green-950" aria-label="Authenticator secret">
                {mfa.secret}
              </code>
              <button
                type="button"
                aria-label="Copy key"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink-500 shadow-xs ring-1 ring-ink-100 hover:text-green-800"
                onClick={() => {
                  void navigator.clipboard?.writeText(mfa.secret).catch(() => undefined);
                  toast.success('Key copied');
                }}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <a href={mfa.url} className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline">
              <KeyRound className="h-4 w-4" /> Open in authenticator app
            </a>
            <ButtonLink to="/admin/login" size="lg" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Continue to sign in
            </ButtonLink>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <p className="eyebrow">Staff invite · Step 1</p>
              <h1 className="mt-1.5 font-display text-[26px] font-semibold leading-tight text-ink-900">Join HealthX Admin</h1>
              <p className="mt-1 text-[15px] text-ink-500">Choose a password for your staff account. Next you’ll set up two-step verification.</p>
            </div>
            <Field label="New password" htmlFor="inv-pw" error={err.pw} required hint="At least 8 characters; avoid common passwords.">
              <Input id="inv-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={!!err.pw} leftIcon={<Lock className="h-4 w-4" />} />
            </Field>
            <Field label="Confirm password" htmlFor="inv-pw2" error={err.confirm} required>
              <Input id="inv-pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!err.confirm} leftIcon={<Lock className="h-4 w-4" />} />
            </Field>
            {err.form && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                {err.form}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={busy} leftIcon={<Check className="h-4 w-4" />}>
              Accept invite
            </Button>
          </form>
        )}
        <p className="border-t border-ink-100 pt-4 text-center text-sm">
          <Link to="/admin/login" className="font-semibold text-green-700 hover:underline">
            Back to staff sign-in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
