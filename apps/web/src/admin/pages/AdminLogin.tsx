import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, FilePen, KeyRound, Lock, Mail, MailCheck, ShieldCheck, Smartphone, Stethoscope, UserRound, type LucideIcon } from 'lucide-react';
import { Badge, Button, Field, Input, Notice, useToast } from '@/components/ui';
import { useDispatch } from '@/store/AppStore';
import { adminApi, ApiError } from '@/lib/api';
import { cn, simulate } from '@/lib/utils';
import { AuthShell } from '../AuthShell';
import { PERSONA } from '../adminData';
import { useAdmin } from '../adminState';
import { SecurityNote } from '../components';
import { ALL_CAPABILITIES, ALL_ROLES, canWith, ROLE_META, type StaffRole } from '../rbac';
import NoAccess from './NoAccess';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ROLE_ICON: Record<StaffRole, LucideIcon> = { end_user: UserRound, content_manager: FilePen, medical_content_reviewer: Stethoscope, admin: ShieldCheck };
const ROLE_DISC: Record<StaffRole, string> = {
  end_user: 'bg-ink-100 text-ink-600',
  content_manager: 'bg-sky-100 text-sky-700',
  medical_content_reviewer: 'bg-lavender-100 text-lavender-700',
  admin: 'bg-green-100 text-green-800',
};

type Step = 'credentials' | 'mfa' | 'role' | 'forgot' | 'forgot_sent' | 'no_access';

const errMessage = (e: unknown, fallback: string) => (e instanceof ApiError ? (e.offline || e.status >= 500 ? 'Can’t reach the HealthX server. Try again in a moment.' : e.message) : fallback);

export default function AdminLogin() {
  const { state, dispatch, apiMode, adoptSession } = useAdmin();
  const appDispatch = useDispatch();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const locState = loc.state as { from?: string; reason?: string } | null;
  const from = locState?.from ?? '/admin';

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; code?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [role, setRole] = useState<StaffRole>('admin');
  const [resetEmail, setResetEmail] = useState('');
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [deniedName, setDeniedName] = useState<string | undefined>();
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Development helper: the API exposes the current authenticator code for seeded staff ONLY outside production.
  useEffect(() => {
    if (!import.meta.env.DEV || !apiMode || step !== 'mfa') return;
    let alive = true;
    const load = () =>
      fetch(`/api/v1/dev/mfa-code?email=${encodeURIComponent(email.trim())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { code?: string } | null) => {
          if (alive) setDevCode(j?.code ?? null);
        })
        .catch(() => {
          if (alive) setDevCode(null);
        });
    void load();
    const t = window.setInterval(load, 10_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [apiMode, step, email]);

  if (state.session) return <Navigate to="/admin" replace />;
  if (step === 'no_access')
    return (
      <NoAccess
        name={deniedName}
        onBack={() => {
          setStep('credentials');
          setPassword('');
        }}
      />
    );

  const submitCredentials = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid work email address.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    if (apiMode) {
      try {
        const r = await adminApi.login(email.trim(), password);
        if (r.kind === 'mfa') {
          setMfaToken(r.mfaToken);
          setCode('');
          setStep('mfa');
        } else {
          // An app (End User) account: no admin access, and no session is kept in the admin client.
          setDeniedName(r.user.name);
          await adminApi.logout().catch(() => undefined);
          setStep('no_access');
        }
      } catch (err) {
        setErrors({ form: errMessage(err, 'Sign-in failed. Please try again.') });
      } finally {
        setLoading(false);
      }
      return;
    }
    await simulate(true, 700);
    setLoading(false);
    setStep('mfa');
    setCooldown(30);
    toast.info('Verification code sent', 'Simulated — enter any 6 digits (000000 simulates a wrong code).');
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setErrors({ code: 'Enter the 6-digit code from your authenticator app.' });
      return;
    }
    setLoading(true);
    if (apiMode) {
      try {
        await adminApi.verifyMfa(mfaToken, code);
        const s = await adoptSession();
        const r = s.session?.role ?? 'admin';
        toast.success(`Signed in as ${ROLE_META[r].label}`, `Your session ends after ${s.settings.sessionTimeoutMin} minutes of inactivity.`);
        nav(from, { replace: true });
      } catch (err) {
        const expired = err instanceof ApiError && err.status === 401 && /expired|start again/i.test(err.message);
        if (expired) {
          setStep('credentials');
          setErrors({ form: err.message });
        } else {
          setErrors({ code: errMessage(err, 'That code didn’t work. Try again.') });
        }
        setCode('');
      } finally {
        setLoading(false);
      }
      return;
    }
    await simulate(true, 600);
    setLoading(false);
    if (code === '000000') {
      setErrors({ code: 'That code didn’t match. Check your authenticator and try again.' });
      return;
    }
    setErrors({});
    setStep('role');
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(resetEmail.trim())) {
      setResetErr('Enter a valid work email address.');
      return;
    }
    setResetErr(null);
    setLoading(true);
    if (apiMode) {
      try {
        await adminApi.forgotPassword(resetEmail.trim());
        setStep('forgot_sent');
      } catch (err) {
        setResetErr(errMessage(err, 'Couldn’t send the link. Try again.'));
      } finally {
        setLoading(false);
      }
      return;
    }
    await simulate(true, 700);
    setLoading(false);
    // Same response whether or not the account exists (no account enumeration).
    dispatch({ type: 'LOG', entry: { actor: 'system', role: 'system', action: 'staff.password_reset_requested', target: 'staff account', detail: 'Reset link sent if the account exists (simulated)' } });
    setStep('forgot_sent');
  };

  /** The demo persona's privileged permissions (the demo Admin holds all of them). */
  const privilegesOf = (r: StaffRole) => (r === 'admin' ? (state.staff.find((m) => m.email === PERSONA[r].email)?.privileges ?? []) : []);

  const finish = () => {
    const p = PERSONA[role];
    dispatch({ type: 'SIGN_IN', session: { name: p.name, email: p.email, role, privileges: privilegesOf(role), signedInAt: new Date().toISOString() } });
    dispatch({
      type: 'LOG',
      entry: { actor: p.name, role, action: role === 'end_user' ? 'staff.login_denied' : 'staff.login', target: p.name, detail: `MFA verified · signed in via ${email.trim() || 'demo'}` },
    });
    if (role === 'end_user') {
      nav('/admin', { replace: true });
      return;
    }
    appDispatch({ type: 'SET_ROLE', role: 'admin' });
    toast.success(`Signed in as ${ROLE_META[role].label}`, `Demo session — expires after ${state.settings.sessionTimeoutMin} minutes of inactivity.`);
    nav(from, { replace: true });
  };

  const steps: Step[] = apiMode ? ['credentials', 'mfa'] : ['credentials', 'mfa', 'role'];
  const stepIdx = steps.indexOf(step);

  return (
    <AuthShell photo="doctor-consult" position="70% 30%">
      {/* Stepper */}
      <ol className={cn('mb-5 flex items-center gap-2', step.startsWith('forgot') && 'invisible')} aria-label="Sign-in steps" aria-hidden={step.startsWith('forgot')}>
        {steps.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={cn('num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition', done ? 'bg-green-600 text-white' : active ? 'bg-green-900 text-white ring-4 ring-green-500/15' : 'bg-white text-ink-400 ring-1 ring-ink-200')}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('hidden font-mono text-[11px] font-medium uppercase tracking-[0.12em] sm:inline', active ? 'text-green-800' : 'text-ink-400')}>{['Sign in', 'Verify', 'Role'][i]}</span>
              {i < steps.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-green-400' : 'bg-ink-200')} />}
            </li>
          );
        })}
      </ol>

      <div className="card animate-fade-up p-6 sm:p-8">
        {step === 'credentials' && (
          <form onSubmit={submitCredentials} noValidate className="space-y-4">
            <div>
              <p className="eyebrow">Web Admin · Step 1</p>
              <h1 className="mt-1.5 font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-ink-900">Staff sign in</h1>
              <p className="mt-1 text-[15px] text-ink-500">Use your HealthX staff account.</p>
            </div>
            {locState?.reason === 'session_end' && (
              <Notice tone="info" title="Your session ended">
                Please sign in again.
              </Notice>
            )}
            <Field label="Work email" htmlFor="adm-email" error={errors.email} required>
              <Input id="adm-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} leftIcon={<Mail className="h-4 w-4" />} placeholder="name@healthx.example" />
            </Field>
            <Field label="Password" htmlFor="adm-pw" error={errors.password} required>
              <Input
                id="adm-pw"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!errors.password}
                leftIcon={<Lock className="h-4 w-4" />}
                rightSlot={
                  <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((v) => !v)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </Field>
            <div className="-mt-1 text-right">
              <button
                type="button"
                className="text-sm font-semibold text-green-700 hover:underline"
                onClick={() => {
                  setResetEmail(email);
                  setResetErr(null);
                  setStep('forgot');
                }}
              >
                Forgot password?
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Continue
            </Button>
            {errors.form && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                {errors.form}
              </p>
            )}
            {apiMode ? (
              <Notice tone="info" title="Staff accounts">
                Sign in with your staff email and password, then the 6-digit code from your authenticator app. Your role and permissions come from your account and are enforced by the server.
              </Notice>
            ) : (
              <Notice tone="warning" title="Offline demo — permissions are not enforced">
                Any valid email and an 8+ character password work, then you pick a role. Nothing is checked by a server.
              </Notice>
            )}
          </form>
        )}

        {step === 'forgot' && (
          <form onSubmit={submitReset} noValidate className="space-y-4">
            <button type="button" onClick={() => setStep('credentials')} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full text-sm font-semibold text-green-700 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </button>
            <div>
              <p className="eyebrow">Account recovery</p>
              <h1 className="mt-1.5 font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-ink-900">Forgot password</h1>
              <p className="mt-1 text-[15px] text-ink-500">We’ll email you a secure reset link.</p>
            </div>
            <Field label="Work email" htmlFor="adm-reset" error={resetErr} required>
              <Input id="adm-reset" type="email" autoComplete="username" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} invalid={!!resetErr} leftIcon={<Mail className="h-4 w-4" />} placeholder="name@healthx.example" autoFocus />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Send reset link
            </Button>
            <p className="flex items-start gap-2 text-xs text-ink-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700" /> MFA is still required after you reset your password.
            </p>
          </form>
        )}

        {step === 'forgot_sent' && (
          <div className="space-y-4 text-center" role="status">
            <span className="relative mx-auto flex h-16 w-16 items-center justify-center">
              <span aria-hidden className="leaf absolute -right-2 -top-1 h-7 w-7 bg-rose-100" />
              <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-green-50 to-green-100" />
              <MailCheck className="relative h-7 w-7 text-green-700" />
            </span>
            <h1 className="font-display text-[24px] font-semibold text-ink-900">Check your email</h1>
            <p className="text-[15px] leading-relaxed text-ink-600">If this email belongs to a staff account, a reset link has been sent. It expires in 30 minutes.</p>
            <Button className="w-full" variant="outline" onClick={() => setStep('credentials')}>
              Back to sign in
            </Button>
            <p className="text-xs text-ink-400">{apiMode ? 'In development the link appears in the API’s email outbox (/v1/dev/outbox).' : 'Simulated — no email is sent in this demo.'}</p>
          </div>
        )}

        {step === 'mfa' && (
          <form onSubmit={submitCode} noValidate className="space-y-5">
            <div className="flex items-start gap-4">
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-green-100 text-green-700 ring-1 ring-inset ring-green-100">
                <Smartphone className="h-6 w-6" />
                <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-white ring-2 ring-white">
                  <KeyRound className="h-3.5 w-3.5" />
                </span>
              </span>
              <div className="min-w-0">
                <p className="eyebrow">Web Admin · Step 2</p>
                <h1 className="mt-1 font-display text-[24px] font-semibold leading-tight text-ink-900">Two-step verification</h1>
                <p className="mt-1 break-words text-sm text-ink-500">Enter the 6-digit code from your authenticator app for {email.trim()}.</p>
              </div>
            </div>
            <Field label="Verification code" htmlFor="adm-code" error={errors.code} required>
              <Input
                id="adm-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                invalid={!!errors.code}
                className="h-16 bg-green-50/40 text-center font-mono text-[28px] font-medium tracking-[0.5em] placeholder:tracking-[0.5em]"
                placeholder="••••••"
                autoFocus
              />
            </Field>
            <div aria-hidden className="-mt-2 flex justify-center gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={cn('h-1.5 w-7 rounded-full transition-colors', i < code.length ? 'bg-green-600' : 'bg-ink-200')} />
              ))}
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading} leftIcon={<ShieldCheck className="h-4 w-4" />}>
              Verify
            </Button>
            {apiMode && devCode && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900">
                <span>
                  <b>Development only:</b> current code <span className="font-mono text-sm font-bold tracking-widest">{devCode}</span>
                </span>
                <button type="button" className="font-semibold text-sky-700 hover:underline" onClick={() => setCode(devCode)}>
                  Use code
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4 text-sm">
              <button type="button" className="min-h-[40px] font-semibold text-ink-500 hover:text-ink-800" onClick={() => setStep('credentials')}>
                Use a different account
              </button>
              {apiMode ? (
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-400">Codes refresh every 30 seconds</span>
              ) : (
                <button
                  type="button"
                  disabled={cooldown > 0}
                  className="min-h-[40px] rounded-full font-semibold text-green-700 hover:underline disabled:text-ink-400 disabled:no-underline"
                  onClick={() => {
                    setCooldown(30);
                    toast.info('New code sent (simulated)');
                  }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'role' && (
          <div className="space-y-4">
            <div>
              <p className="eyebrow">Offline demo · Step 3</p>
              <h1 className="mt-1.5 font-display text-[24px] font-semibold leading-tight text-ink-900">Choose a demo role</h1>
              <p className="mt-1 text-sm text-ink-500">In production your role comes from your staff account. Pick one to explore role-based access.</p>
            </div>
            <div role="radiogroup" aria-label="Demo role" className="space-y-2.5">
              {ALL_ROLES.map((r) => {
                const capCount = ALL_CAPABILITIES.filter((c) => canWith(state.permissions, r, c, privilegesOf(r))).length;
                const I = ROLE_ICON[r];
                const on = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRole(r)}
                    className={cn('flex w-full items-start gap-3 rounded-3xl border p-3.5 text-left transition', on ? 'border-green-600 bg-green-50 ring-4 ring-green-500/10' : 'border-ink-200 bg-white hover:border-green-300')}
                  >
                    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', ROLE_DISC[r])}>
                      <I className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-[16px] font-semibold text-ink-900">{ROLE_META[r].label}</span>
                        <Badge tone="gray">{ROLE_META[r].srs}</Badge>
                      </span>
                      <span className="mt-1 block text-sm leading-snug text-ink-500">{ROLE_META[r].description}</span>
                      <span className="mt-1.5 block font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
                        {PERSONA[r].name} · {r === 'end_user' ? 'no admin access' : `${capCount} permissions`}
                      </span>
                    </span>
                    <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-green-600 bg-green-600' : 'border-ink-300')}>
                      {on && <Check className="h-3 w-3 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button size="lg" className="w-full" onClick={finish} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Enter admin portal
            </Button>
            <SecurityNote />
          </div>
        )}
      </div>
    </AuthShell>
  );
}
