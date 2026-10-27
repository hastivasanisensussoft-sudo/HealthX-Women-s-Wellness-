import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, KeyRound, LogOut, Mail, Monitor, ShieldCheck, Smartphone } from 'lucide-react';
import { timeAgo } from '@healthx/shared';
import { BackendBadge, Badge, Button, ConfirmDialog, Field, Input, Modal, useToast } from '@/components/ui';
import { userApi } from '@/lib/api';
import { useStore } from '@/store/AppStore';
import { apiMessage } from '@/store/apiErrors';
import { exclusive } from '@/store/session';
import { RowIcon } from './learn-ui/ListGroup';

type Sess = { id: string; client: string; userAgent: string; createdAt: string; lastSeenAt: string; current: boolean };

const deviceLabel = (s: Sess) => {
  const ua = s.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : s.client === 'mobile' ? 'HealthX app' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : '';
  return [browser, os].filter(Boolean).join(' · ') || (s.client === 'mobile' ? 'Mobile app' : 'Web');
};

/** Profile → Account & security: change password, active sessions, log out everywhere (SRS §47, A-04). */
export function AccountSecurity({ email }: { email: string }) {
  const { mode, signOut } = useStore();
  const api = mode === 'api';
  const toast = useToast();
  const nav = useNavigate();
  const [sessions, setSessions] = useState<Sess[] | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [logoutAll, setLogoutAll] = useState(false);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      setSessions((await exclusive(() => userApi.sessions())).sessions);
    } catch {
      setSessions([]);
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const changePassword = async () => {
    const e: Record<string, string> = {};
    if (!pw.current) e.current = 'Enter your current password.';
    if (pw.next.length < 8) e.next = 'Use at least 8 characters.';
    if (pw.confirm !== pw.next) e.confirm = 'Passwords don’t match.';
    setPwErr(e);
    if (Object.keys(e).length) return;
    if (!api) {
      toast.info('Change password (offline demo)', 'Connect to the server to change your password.');
      return setPwOpen(false);
    }
    setBusy(true);
    try {
      await exclusive(() => userApi.changePassword(pw.current, pw.next));
      toast.success('Password changed', 'Your other devices have been signed out.');
      setPwOpen(false);
      setPw({ current: '', next: '', confirm: '' });
      void load();
    } catch (err) {
      const msg = apiMessage(err);
      setPwErr(/current/i.test(msg) ? { current: msg } : { next: msg });
    } finally {
      setBusy(false);
    }
  };

  // The server sends a confirmation link after sign-up; the offline demo has no real email.
  const unverified = api && userApi.user?.emailVerified === false;
  const resendLink = async () => {
    setBusy(true);
    try {
      await exclusive(() => userApi.resendVerification());
      toast.success('Link sent', import.meta.env.DEV ? 'Development: the link is in the dev outbox (/api/v1/dev/outbox).' : `Check ${email} for the confirmation link.`);
    } catch (err) {
      toast.error('Couldn’t send the link', apiMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (s: Sess) => {
    try {
      await exclusive(() => userApi.revokeSession(s.id));
      toast.success('Device signed out');
      void load();
    } catch (err) {
      toast.error('Couldn’t sign that device out', apiMessage(err));
    }
  };

  return (
    <section aria-labelledby="acct-sec-title" className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-ink-100 bg-gradient-to-br from-green-50 to-white px-5 py-4 sm:px-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-green-700 shadow-soft">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 id="acct-sec-title" className="font-display text-[17px] font-semibold text-ink-900">
            Account & security
          </h3>
          <p className="text-xs text-ink-500">Sign-in, password and devices</p>
        </div>
      </div>
      <ul className="divide-y divide-ink-100 text-sm">
        <li className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
          <RowIcon tone="sky" size="sm">
            <Mail />
          </RowIcon>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink-900">Email</span>
            <span className="block truncate text-ink-500">{email}</span>
          </span>
          {unverified ? (
            <span className="flex shrink-0 items-center gap-2">
              <Badge tone="warning">Not confirmed</Badge>
              <button className="min-h-[36px] rounded-full px-2 font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60" disabled={busy} onClick={resendLink}>
                Resend link
              </button>
            </span>
          ) : (
            <Badge tone="green" icon={<Check className="h-3 w-3" />}>
              Verified
            </Badge>
          )}
        </li>
        <li className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
          <RowIcon tone="lavender" size="sm">
            <KeyRound />
          </RowIcon>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink-900">Password</span>
            <span className="block text-ink-500">Use 8+ characters</span>
          </span>
          <button className="min-h-[40px] rounded-full bg-green-50 px-4 font-semibold text-green-800 ring-1 ring-inset ring-green-100 hover:bg-green-100" onClick={() => setPwOpen(true)}>
            Change
          </button>
        </li>
        <li className="px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <RowIcon tone="peach" size="sm">
              <Smartphone />
            </RowIcon>
            <span className="min-w-0 flex-1 font-semibold text-ink-900">Active sessions</span>
            <span className="rounded-full bg-ink-50 px-2.5 py-1 font-mono text-xs text-ink-700">{api ? (sessions ? `${sessions.length} device${sessions.length === 1 ? '' : 's'}` : '…') : '1 device'}</span>
          </div>
          {api && sessions && sessions.length > 0 && (
            <ul className="mt-3 space-y-2" aria-label="Signed-in devices">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-ink-50/70 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-500 shadow-xs">
                    {s.client === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink-800">{deviceLabel(s)}</span>
                    <span className="block text-xs text-ink-400">Active {timeAgo(s.lastSeenAt)}</span>
                  </span>
                  {s.current ? (
                    <Badge tone="mint">This device</Badge>
                  ) : (
                    <button className="min-h-[36px] rounded-full px-3 text-xs font-semibold text-danger hover:bg-danger-soft" onClick={() => revoke(s)}>
                      Sign out
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
      <div className="border-t border-ink-100 p-5 sm:px-6">
        <Button variant="outline" size="sm" className="h-11 w-full" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => setLogoutAll(true)}>
          Log out of all devices
        </Button>
        {!api && (
          <div className="mt-3 flex justify-center">
            <BackendBadge />
          </div>
        )}
      </div>

      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        description="Changing your password signs you out on your other devices."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPwOpen(false)}>
              Cancel
            </Button>
            <Button onClick={changePassword} loading={busy}>
              Update password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Current password" htmlFor="cp-current" error={pwErr.current}>
            <Input id="cp-current" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} invalid={!!pwErr.current} />
          </Field>
          <Field label="New password" htmlFor="cp-next" error={pwErr.next} hint="At least 8 characters — avoid common passwords.">
            <Input id="cp-next" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} invalid={!!pwErr.next} />
          </Field>
          <Field label="Confirm new password" htmlFor="cp-confirm" error={pwErr.confirm}>
            <Input id="cp-confirm" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} invalid={!!pwErr.confirm} />
          </Field>
        </div>
      </Modal>
      <ConfirmDialog
        open={logoutAll}
        onClose={() => setLogoutAll(false)}
        title="Log out everywhere?"
        body={api ? 'You’ll be signed out of every device, including this one.' : 'Offline demo: signs you out of this browser.'}
        confirmLabel="Log out all"
        onConfirm={async () => {
          await signOut({ everywhere: true });
          toast.success('Signed out everywhere');
          nav('/login');
        }}
      />
    </section>
  );
}
