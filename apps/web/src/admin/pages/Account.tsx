import { useCallback, useEffect, useState } from 'react';
import { Clock, Globe, KeyRound, LifeBuoy, LogOut, Monitor, RefreshCw, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { LANGUAGES, timeAgo, TIMEZONES } from '@healthx/shared';
import { Avatar } from '@/components/brand/Brand';
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Input, Modal, Notice, Select, Switch, useToast } from '@/components/ui';
import { adminApi, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { defaultAccount, newBackupCodes, type StaffAccount } from '../adminData';
import { useAdmin } from '../adminState';
import { AdminHeader, HeroStat, RoleBadge, SecurityNote, StatusPill } from '../components';

const DAY = 86_400_000;

type ServerSession = { id: string; client: string; userAgent: string; createdAt: string; lastSeenAt: string; current: boolean };
type SessionRow = { id: string; device: string; detail: string; current: boolean };

const CLIENTS: Record<string, string> = { 'web-admin': 'Web Admin', web: 'Web app', mobile: 'Mobile app' };

/** "Chrome on Windows" from a user-agent string (best effort). */
function deviceLabel(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /okhttp|Expo|ReactNative/i.test(ua) ? 'HealthX app' : 'Unknown browser';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}

/** Staff "My account": profile preferences, password, MFA, backup codes and active sessions (mockup W "My Account"). */
export default function Account() {
  const { state, dispatch, audit, apiMode, signOut } = useAdmin();
  const toast = useToast();
  const session = state.session!;
  const saved: StaffAccount = state.accounts[session.email] ?? defaultAccount();
  const [prefs, setPrefs] = useState({ language: saved.language, timezone: saved.timezone, reviewAlerts: saved.reviewAlerts, weeklyDigest: saved.weeklyDigest });
  const dirty = prefs.language !== saved.language || prefs.timezone !== saved.timezone || prefs.reviewAlerts !== saved.reviewAlerts || prefs.weeklyDigest !== saved.weeklyDigest;
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState<Partial<Record<'current' | 'next' | 'confirm', string>>>({});
  const [codesOpen, setCodesOpen] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [serverSessions, setServerSessions] = useState<ServerSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [endAllOpen, setEndAllOpen] = useState(false);
  // With the API the password date is a server fact it doesn't share yet; show only what this page saw.
  const [pwChangedNow, setPwChangedNow] = useState(false);
  const min = state.settings.passwordMinLength;
  const changedDays = Math.floor((Date.now() - new Date(saved.passwordChangedAt).getTime()) / DAY);
  const pwStatus = apiMode ? (pwChangedNow ? 'Changed just now' : 'Changing it signs you out everywhere else') : `Last changed ${changedDays === 0 ? 'today' : `${changedDays} days ago`}`;

  const update = (patch: Partial<StaffAccount>, action: string, detail?: string) => {
    const result = dispatch({ type: 'UPDATE_ACCOUNT', email: session.email, patch });
    audit(action, session.name, detail);
    return result;
  };

  const savePrefs = () => {
    void update(prefs, 'staff.account_update', `${prefs.language} · ${prefs.timezone}`).then((ok) => ok && toast.success('Preferences saved'));
  };

  const loadSessions = useCallback(async () => {
    try {
      setServerSessions((await adminApi.sessions()).sessions);
      setSessionsError(null);
    } catch (e) {
      setSessionsError(e instanceof ApiError ? e.message : 'Couldn’t load your sessions.');
    }
  }, []);

  useEffect(() => {
    if (apiMode) void loadSessions();
  }, [apiMode, loadSessions]);

  const revoke = async (ids: string[], done: string) => {
    try {
      for (const id of ids) await adminApi.revokeSession(id);
      toast.success(done);
    } catch (e) {
      toast.error('Couldn’t sign that session out', e instanceof ApiError ? e.message : undefined);
    }
    await loadSessions();
  };

  const endEverywhere = async () => {
    try {
      await adminApi.logoutAll();
    } catch (e) {
      toast.error('Couldn’t sign out everywhere', e instanceof ApiError ? e.message : undefined);
      return;
    }
    await signOut();
    toast.success('Signed out on every device');
  };

  const changePassword = async () => {
    const e: typeof pwErr = {};
    if (pw.current.length < 8) e.current = 'Enter your current password.';
    if (pw.next.length < min) e.next = `Use at least ${min} characters.`;
    else if (!/[a-z]/.test(pw.next) || !/[A-Z]/.test(pw.next) || !/\d/.test(pw.next) || !/[^A-Za-z0-9]/.test(pw.next)) e.next = 'Mix upper- and lower-case letters, a number and a symbol.';
    else if (pw.next === pw.current) e.next = 'Choose a password you haven’t used here.';
    if (!e.next && pw.confirm !== pw.next) e.confirm = 'Passwords don’t match.';
    setPwErr(e);
    if (Object.keys(e).length) return;
    if (apiMode) {
      setPwBusy(true);
      try {
        await adminApi.changePassword(pw.current, pw.next);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'wrong_password') setPwErr({ current: err.message });
        else setPwErr({ next: err instanceof ApiError ? err.message : 'Couldn’t change your password. Try again.' });
        return;
      } finally {
        setPwBusy(false);
      }
      setPwChangedNow(true);
      toast.success('Password changed', 'Your other sessions were signed out.');
      setPwOpen(false);
      setPw({ current: '', next: '', confirm: '' });
      void loadSessions();
      return;
    }
    update({ passwordChangedAt: new Date().toISOString(), sessions: saved.sessions.filter((s) => s.current) }, 'staff.password_change', 'Other sessions signed out');
    toast.success('Password changed', 'Other sessions were signed out (simulated).');
    setPwOpen(false);
    setPw({ current: '', next: '', confirm: '' });
  };

  const rows: SessionRow[] = apiMode
    ? (serverSessions ?? []).map((x) => ({ id: x.id, device: deviceLabel(x.userAgent), detail: `${CLIENTS[x.client] ?? x.client} · ${x.current ? 'active now' : timeAgo(x.lastSeenAt)}`, current: x.current }))
    : saved.sessions.map((x) => ({ id: x.id, device: x.device, detail: `${x.location} · ${x.current ? 'active now' : timeAgo(x.lastActive)}`, current: x.current }));
  const others = rows.filter((x) => !x.current);

  return (
    <>
      <AdminHeader title="My account" subtitle="Your staff profile, sign-in security and active sessions." badge={<RoleBadge role={session.role} />} />

      <section className="relative mb-8 overflow-hidden rounded-[34px] bg-forest p-6 text-white shadow-lift sm:p-8">
        <span aria-hidden className="leaf pointer-events-none absolute -right-12 -top-14 h-48 w-48 bg-white/[0.05]" />
        <span aria-hidden className="leaf-alt pointer-events-none absolute -bottom-16 right-1/3 h-40 w-40 bg-green-400/[0.07]" />
        <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <span className="relative w-fit shrink-0">
              <Avatar name={session.name} size={84} className="ring-4 ring-green-300/40" />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-green-300 text-green-950 ring-4 ring-green-900" title="MFA on">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-green-200/85">Staff profile</p>
              <h2 className="mt-1.5 truncate font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">{session.name}</h2>
              <p className="mt-1 truncate text-[15px] text-green-50/80">{session.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <RoleBadge role={session.role} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-[3px] text-xs font-semibold text-green-50 ring-1 ring-inset ring-white/15">
                  <ShieldCheck className="h-3 w-3" /> MFA on
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-[3px] text-xs font-semibold text-green-50 ring-1 ring-inset ring-white/15">
                  <Clock className="h-3 w-3" /> Signed in {new Date(session.signedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <HeroStat icon={<Monitor className="h-3.5 w-3.5" />} label="Sessions" value={rows.length} hint="signed in" />
            <HeroStat icon={<KeyRound className="h-3.5 w-3.5" />} label="Backup codes" value={apiMode ? '—' : saved.backupCodes.length} hint={apiMode ? 'coming soon' : 'remaining'} />
            <HeroStat icon={<Globe className="h-3.5 w-3.5" />} label="Timezone" value={<span className="block truncate text-[17px] leading-tight">{saved.timezone.split('/').pop()?.replace(/_/g, ' ')}</span>} hint={saved.language} className="col-span-2 sm:col-span-1" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="card-pad">
          <CardHeader title="Profile & preferences" subtitle="Language, timezone and the emails you get" icon={<UserRound className="h-5 w-5" />} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="acc-name" hint="Managed by your organisation’s identity provider.">
              <Input id="acc-name" value={session.name} disabled readOnly />
            </Field>
            <Field label="Work email" htmlFor="acc-email" hint="Ask an Admin who manages staff to change it.">
              <Input id="acc-email" value={session.email} disabled readOnly />
            </Field>
            <Field label="Language" htmlFor="acc-lang">
              <Select id="acc-lang" value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Timezone" htmlFor="acc-tz">
              <Select id="acc-tz" value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}>
                {TIMEZONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-6 space-y-3">
            <p className="eyebrow">Email notifications</p>
            <div className="rounded-2xl border border-ink-100 px-4 py-3">
              <Switch checked={prefs.reviewAlerts} onChange={(v) => setPrefs({ ...prefs, reviewAlerts: v })} label="Email me when work is assigned to me" description="Reviews, compliance checks and requests (simulated)." />
            </div>
            <div className="rounded-2xl border border-ink-100 px-4 py-3">
              <Switch checked={prefs.weeklyDigest} onChange={(v) => setPrefs({ ...prefs, weeklyDigest: v })} label="Weekly summary email" description="Aggregate numbers only — never user health data." />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-5">
            <Button onClick={savePrefs} disabled={!dirty}>
              Save changes
            </Button>
            {dirty && <Badge tone="warning">Unsaved changes</Badge>}
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="card-pad">
            <CardHeader title="Sign-in security" subtitle="Password, authenticator and recovery" icon={<ShieldCheck className="h-5 w-5" />} />
            <ul className="space-y-3">
              <li className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50/70 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <KeyRound className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900">Password</span>
                    <span className="block text-sm text-ink-500">{pwStatus}</span>
                  </span>
                </span>
                <Button size="sm" variant="outline" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => (setPwOpen(true), setPwErr({}))}>
                  Change
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50/70 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender-100 text-lavender-600">
                    <Smartphone className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900">Authenticator app (MFA)</span>
                    <span className="block text-sm text-ink-500">Required for every staff role (§47, D-33)</span>
                  </span>
                </span>
                <StatusPill tone="green">On</StatusPill>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50/70 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-butter-100 text-butter-600">
                    <LifeBuoy className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900">Backup codes</span>
                    <span className="block text-sm text-ink-500">{apiMode ? 'Not available yet — if you lose your phone, ask an Admin who manages staff for help.' : `${saved.backupCodes.length} remaining · use one if you lose your phone`}</span>
                  </span>
                </span>
                {apiMode ? (
                  <Badge tone="gray">Coming soon</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => (setCodesOpen(true), audit('staff.backup_codes_view', session.name))}>
                    View
                  </Button>
                )}
              </li>
            </ul>
          </Card>

          <Card className="card-pad">
            <CardHeader
              title="Active sessions"
              subtitle={`${rows.length} signed in`}
              icon={<Monitor className="h-5 w-5" />}
              action={
                others.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (apiMode) return void revoke(others.map((x) => x.id), 'Signed out of other sessions');
                      update({ sessions: saved.sessions.filter((s) => s.current) }, 'staff.sessions_revoke_all', `${others.length} sessions`);
                      toast.success('Signed out of other sessions');
                    }}
                  >
                    Sign out all others
                  </Button>
                )
              }
            />
            <ul className="space-y-2.5">
              {sessionsError && (
                <li>
                  <Notice tone="warning">{sessionsError}</Notice>
                </li>
              )}
              {rows.map((s) => (
                <li key={s.id} className={cn('flex items-center justify-between gap-3 rounded-2xl border px-4 py-3', s.current ? 'border-green-200 bg-green-50/60' : 'border-ink-100')}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', s.current ? 'bg-white text-green-700 shadow-xs' : 'bg-ink-100 text-ink-600')}>
                      {/iPad|iPhone|Android/.test(s.device) ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink-900">{s.device}</span>
                      <span className="block truncate text-xs text-ink-500">{s.detail}</span>
                    </span>
                  </span>
                  {s.current ? (
                    <StatusPill tone="mint">Current</StatusPill>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<LogOut className="h-4 w-4" />}
                      onClick={() => {
                        if (apiMode) return void revoke([s.id], 'Session signed out');
                        update({ sessions: saved.sessions.filter((x) => x.id !== s.id) }, 'staff.session_revoke', s.device);
                        toast.success('Session signed out', s.device);
                      }}
                    >
                      Sign out
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {apiMode && (
              <div className="mt-4 border-t border-ink-100 pt-4">
                <Button size="sm" variant="outline" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => setEndAllOpen(true)}>
                  Sign out everywhere
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
      <SecurityNote className="mt-6" />

      <ConfirmDialog
        open={endAllOpen}
        onClose={() => setEndAllOpen(false)}
        onConfirm={() => void endEverywhere()}
        title="Sign out everywhere?"
        body="This ends every session on your account, including this one. You’ll need your password and authenticator code to sign in again."
        confirmLabel="Sign out everywhere"
        danger
      />

      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPwOpen(false)}>
              Cancel
            </Button>
            <Button loading={pwBusy} onClick={() => void changePassword()}>
              Change password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Current password" required htmlFor="pw-cur" error={pwErr.current}>
            <Input id="pw-cur" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} invalid={!!pwErr.current} />
          </Field>
          <Field label="New password" required htmlFor="pw-new" error={pwErr.next} hint={`At least ${min} characters with upper- and lower-case letters, a number and a symbol.`}>
            <Input id="pw-new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} invalid={!!pwErr.next} />
          </Field>
          <Field label="Confirm new password" required htmlFor="pw-conf" error={pwErr.confirm}>
            <Input id="pw-conf" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} invalid={!!pwErr.confirm} />
          </Field>
          <Notice tone="info">{apiMode ? 'Changing your password signs you out everywhere else.' : 'Changing your password signs you out everywhere else. Offline demo — nothing is changed on a server.'}</Notice>
        </div>
      </Modal>

      <Modal
        open={codesOpen}
        onClose={() => setCodesOpen(false)}
        title="Backup codes"
        description="Each code works once. Store them somewhere safe."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                update({ backupCodes: newBackupCodes() }, 'staff.backup_codes_regenerate');
                toast.success('New backup codes generated', 'Your old codes no longer work.');
              }}
            >
              Regenerate
            </Button>
            <Button onClick={() => setCodesOpen(false)}>Done</Button>
          </>
        }
      >
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm" aria-label="Backup codes">
          {saved.backupCodes.map((c) => (
            <li key={c} className="rounded-xl border border-dashed border-green-200 bg-green-50/60 px-3 py-2.5 text-center font-medium tracking-wider text-ink-800">
              {c}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
