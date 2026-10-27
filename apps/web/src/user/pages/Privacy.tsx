import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Bell, Bot, Building2, CalendarHeart, Check, Database, Download, Droplets, Dumbbell, FileJson, Link2, Lock, Moon, Salad, ShieldCheck, Smile, Sprout, Stethoscope, Trash2, Unlink, Users } from 'lucide-react';
import { COPY, formatDate, timeAgo } from '@healthx/shared';
import { useStore } from '@/store/AppStore';
import { userApi } from '@/lib/api';
import { Photo } from '@/components/media/Photo';
import { BackendBadge, Badge, Button, Card, CardHeader, Field, Input, Modal, Notice, PageHeader, PhaseBadge, ProgressBar, Switch, useToast, type TileTone } from '@/components/ui';
import { RowIcon } from '@/user/components/learn-ui/ListGroup';
import { TONE_SOFT } from '@/user/components/learn-ui/tones';
import { cn, simulate } from '@/lib/utils';
import { apiMessage } from '@/store/apiErrors';
import { exclusive } from '@/store/session';

const CONSENT_ICON = { analytics: BarChart3, ai_personalization: Bot, health_integrations: Activity, notifications: Bell, health_processing: Lock } as const;
const CONSENT_TONE: Record<keyof typeof CONSENT_ICON, TileTone> = { analytics: 'sky', ai_personalization: 'lavender', health_integrations: 'rose', notifications: 'peach', health_processing: 'green' };

/** Privacy Center (SRS §42, §68). API mode: export and deletion are performed by the server for your own account only. */
export default function Privacy() {
  const { state, dispatch, mode, signOut } = useStore();
  const api = mode === 'api';
  const toast = useToast();
  const nav = useNavigate();
  const [action, setAction] = useState<'export' | 'delete' | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const collected: [string, number, typeof Database, TileTone][] = [
    ['Periods', state.periods.length, CalendarHeart, 'rose'],
    ['Symptom entries', state.symptomLogs.length, Stethoscope, 'rose'],
    ['Check-ins', state.checkIns.length, Smile, 'lavender'],
    ['Water entries', state.water.length, Droplets, 'sky'],
    ['Sleep logs', state.sleep.length, Moon, 'indigo'],
    ['Workouts', state.sessions.length, Dumbbell, 'green'],
    ['Meals', state.meals.length, Salad, 'peach'],
    ['Fertility observations', state.fertility.length, Sprout, 'green'],
  ];
  const optional = state.consents.filter((c) => !c.required);
  const required = state.consents.find((c) => c.required);
  const totalRecords = collected.reduce((a, [, n]) => a + n, 0);
  const consentsOn = optional.filter((c) => c.granted).length;
  const connectedApps = state.connections.filter((c) => c.connected).length;
  const analyticsOn = !!state.consents.find((c) => c.id === 'analytics')?.granted;

  const download = (data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthx-export-${state.today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const run = async () => {
    const needsPassword = !api || action === 'delete';
    if (needsPassword && password.length < 1) return setError('Re-enter your password to continue.');
    if (!api && password.length < 8) return setError('Re-enter your password to continue (8+ characters).');
    if (action === 'delete' && confirm !== 'DELETE') return setError('Type DELETE to confirm.');
    setError(null);
    if (api) {
      setProgress(0.6);
      try {
        if (action === 'export') {
          download(await exclusive(() => userApi.exportData()));
          toast.success('Export ready', 'A copy of your data was downloaded as JSON.');
          close();
        } else {
          await exclusive(() => userApi.deleteAccount(password));
          await signOut();
          toast.success('Account deleted', 'Your account and wellness data have been permanently erased.');
          close();
          nav('/', { replace: true });
        }
      } catch (e) {
        setProgress(null);
        setError(apiMessage(e));
      }
      return;
    }
    for (const p of [0.15, 0.45, 0.75, 1]) {
      setProgress(p);
      await simulate(true, 450);
    }
    if (action === 'export') {
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), format: 'healthx-demo-export-v1', data: state }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `healthx-export-${state.today}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export ready', 'Your data was downloaded as JSON.');
      close();
    } else {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
      dispatch({ type: 'RESET_DEMO' });
      dispatch({ type: 'SIGN_OUT' });
      toast.success('Account deleted (simulated)', 'All local demo data was erased.');
      close();
      nav('/', { replace: true });
    }
  };
  const close = () => {
    setAction(null);
    setPassword('');
    setConfirm('');
    setError(null);
    setProgress(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Privacy center"
        title="Privacy & data"
        subtitle="See what’s collected, control your consents, and export or delete your data at any time."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Profile & Settings', to: '/app/profile' }, { label: 'Privacy & data' }]}
      />

      {/* ---------- Hero ---------- */}
      <section className="relative isolate mb-8 overflow-hidden rounded-[34px] bg-green-950 p-6 text-white shadow-lift sm:p-8 lg:p-10">
        <Photo photo="nature-leaves" alt="" shape="none" className="!absolute inset-0 -z-10 opacity-40" />
        <span aria-hidden className="bg-forest absolute inset-0 -z-10 opacity-90" />
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/20">
              <ShieldCheck className="h-6 w-6 text-green-200" />
            </span>
            <h2 className="mt-4 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[38px]">Your data, your choice</h2>
            <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-white/75">Your health data is encrypted and only used with your consent. {COPY.employerPrivacy}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {['Consent first', 'Export anytime', 'Delete anytime'].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/15">
                  <Check className="h-3.5 w-3.5 text-green-300" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              { k: 'Records stored', v: totalRecords, icon: Database },
              { k: 'Consents on', v: `${consentsOn}/${optional.length}`, icon: ShieldCheck },
              { k: 'Connected apps', v: connectedApps, icon: Link2 },
            ].map((s) => (
              <div key={s.k} className="glass-dark rounded-3xl p-3.5 sm:p-4">
                <s.icon className="h-5 w-5 text-green-200" aria-hidden />
                <p className="num mt-3 text-[26px] leading-none sm:text-[30px]">{s.v}</p>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/65">{s.k}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <Card className="card-pad">
            <CardHeader title="Data collected" subtitle="What HealthX stores for you right now" icon={<Database className="h-5 w-5" />} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {collected.map(([k, v, I, tone]) => (
                <div key={k} className={cn('rounded-2xl p-3.5 ring-1 ring-inset', TONE_SOFT[tone])}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xs">
                    <I className="h-4 w-4" />
                  </span>
                  <p className="num mt-3 text-[24px] leading-none text-ink-900">{v}</p>
                  <p className="mt-1 text-xs font-semibold">{k}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-400">
              Plus your profile ({state.profile.name}, {state.profile.country}) and preferences.
            </p>
          </Card>

          <Card className="overflow-hidden">
            <div className="card-pad pb-3 sm:pb-3">
              <CardHeader title="Consents" subtitle="Optional consents can be withdrawn instantly" icon={<ShieldCheck className="h-5 w-5" />} className="mb-0" />
            </div>
            <ul className="divide-y divide-ink-100">
              {required && (
                <li className="flex items-start gap-3.5 bg-ink-50/70 px-5 py-4 sm:px-6">
                  <RowIcon tone="green">
                    <Lock />
                  </RowIcon>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-800">
                      {required.label} <Badge tone="gray">Required</Badge>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">{required.description}</p>
                  </div>
                </li>
              )}
              {optional.map((c) => {
                const I = CONSENT_ICON[c.id];
                return (
                  <li key={c.id} className="flex items-start gap-3.5 px-5 py-4 sm:px-6">
                    <RowIcon tone={CONSENT_TONE[c.id]} className={cn(!c.granted && 'opacity-60')}>
                      <I />
                    </RowIcon>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <Switch
                        checked={c.granted}
                        onChange={(v) => {
                          dispatch({ type: 'SET_CONSENT', id: c.id, granted: v });
                          toast.success(v ? 'Consent given' : 'Consent withdrawn', `${c.label} · takes effect immediately`);
                        }}
                        label={
                          <span className="flex flex-wrap items-center gap-2">
                            {c.label}
                            {(c.id === 'ai_personalization' || c.id === 'health_integrations') && <PhaseBadge phase={2} />}
                          </span>
                        }
                        description={`${c.description} · ${c.version} · updated ${formatDate(c.updatedAt, 'short')}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="card-pad">
            <CardHeader
              title="Health integrations"
              subtitle="Only the data types you allow are read"
              icon={<Link2 className="h-5 w-5" />}
              action={
                <Link to="/app/integrations" className="inline-flex min-h-[40px] items-center rounded-full px-3 text-sm font-semibold text-green-700 hover:bg-green-50">
                  Manage
                </Link>
              }
            />
            <ul className="space-y-2.5">
              {state.connections.map((c) => (
                <li key={c.id} className={cn('flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-inset sm:flex-row sm:items-center sm:justify-between', c.connected ? 'bg-green-50/60 ring-green-100' : 'bg-white ring-ink-100')}>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                      {c.label} <PhaseBadge phase={c.phase} />
                      {c.connected && <Badge tone="green">Connected</Badge>}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">{c.dataTypes.join(' · ')}</p>
                    {c.connected && c.lastSync && <p className="text-xs text-ink-400">Last sync {timeAgo(c.lastSync)} (simulated)</p>}
                  </div>
                  <Button
                    size="sm"
                    className="h-10 shrink-0"
                    variant={c.connected ? 'outline' : 'secondary'}
                    leftIcon={c.connected ? <Unlink className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                    onClick={() => {
                      dispatch({ type: 'TOGGLE_CONNECTION', id: c.id });
                      toast.info(c.connected ? `${c.label} disconnected` : `${c.label} connected (simulated)`, 'Real sync needs the native app + backend.');
                    }}
                  >
                    {c.connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card className="card-pad">
            <CardHeader title="Data sharing" subtitle="Who can see what" icon={<Building2 className="h-5 w-5" />} />
            <ul className="divide-y divide-ink-100 text-sm">
              {[
                { icon: Building2, t: 'HealthX Business (employer programme)', b: <Badge tone="gray">Not connected</Badge> },
                { icon: Users, t: 'Other third parties', b: <Badge tone="green">Only with your consent</Badge> },
                { icon: BarChart3, t: 'Analytics events', b: <Badge tone={analyticsOn ? 'mint' : 'gray'}>{analyticsOn ? 'Anonymous only' : 'Off'}</Badge> },
              ].map((r) => (
                <li key={r.t} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-2.5 text-ink-700">
                    <r.icon className="h-4 w-4 shrink-0 text-ink-400" /> {r.t}
                  </span>
                  {r.b}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="card-pad">
            <div>
              <CardHeader title="Export your data" subtitle="A copy of everything you’ve logged (JSON)" icon={<Download className="h-5 w-5" />} />
              <ul className="mb-4 space-y-2 text-sm text-ink-600">
                {['Your profile and preferences', 'Every log — cycle, symptoms, check-ins, water, sleep, workouts, meals', 'Consents and reminders'].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> {t}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="w-full" leftIcon={<Download className="h-4 w-4" />} onClick={() => setAction('export')}>
                Export data
              </Button>
              <p className="mt-2 text-xs text-ink-400">{api ? 'Downloads a copy of your data from the HealthX server as JSON.' : 'Offline demo: downloads the local data immediately.'}</p>
            </div>
          </Card>

          <section aria-labelledby="danger-title" className="overflow-hidden rounded-2xl border border-danger/25 bg-white shadow-card">
            <div className="flex items-center gap-3 border-b border-danger/15 bg-danger-soft px-5 py-4 sm:px-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-danger">
                <Trash2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-danger">Danger zone</p>
                <h3 id="danger-title" className="font-display text-[17px] font-semibold text-ink-900">
                  Delete account
                </h3>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-sm text-ink-600">Permanently erase your account and all health data</p>
              <Notice tone="warning" className="my-4">
                This can’t be undone. If you have a Premium subscription, cancel it in the App Store / Google Play first.
              </Notice>
              <Button variant="danger" className="w-full" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setAction('delete')}>
                Delete my account
              </Button>
              {!api && (
                <div className="mt-3 flex justify-center">
                  <BackendBadge />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={!!action}
        onClose={close}
        title={action === 'export' ? 'Export your data' : 'Delete your account'}
        description={api && action === 'export' ? undefined : 'For your security, please confirm it’s you.'}
        size="sm"
        footer={
          progress === null ? (
            <>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button variant={action === 'delete' ? 'danger' : 'primary'} onClick={run}>
                {action === 'export' ? 'Start export' : 'Delete permanently'}
              </Button>
            </>
          ) : undefined
        }
      >
        {progress !== null ? (
          <div className="py-4 text-center">
            <span className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-full', action === 'delete' ? 'bg-danger-soft text-danger' : 'bg-green-50 text-green-700')}>
              {action === 'delete' ? <Trash2 className="h-6 w-6" /> : <Download className="h-6 w-6" />}
            </span>
            <p className="mt-3 font-semibold text-ink-800">{action === 'export' ? 'Preparing your export…' : 'Deleting your data…'}</p>
            <ProgressBar value={progress} className="mt-4" color={action === 'delete' ? 'bg-danger' : 'bg-green-500'} />
            <p className="mt-2 font-mono text-sm text-ink-500">{Math.round(progress * 100)}%</p>
          </div>
        ) : (
          <div className="space-y-4">
            {action === 'delete' && (
              <div className="rounded-2xl bg-danger-soft p-3.5 text-sm text-ink-700">
                <p className="font-semibold text-danger">This permanently erases:</p>
                <p className="mt-1">Your account, {totalRecords} logged records, consents, reminders and preferences.</p>
              </div>
            )}
            {api && action === 'export' ? (
              <p className="text-sm text-ink-600">Your data will download as a JSON file. Keep it somewhere safe — it contains your health information.</p>
            ) : (
              <Field label="Password" htmlFor="pv-pw" error={action === 'export' ? error : null}>
                <Input id="pv-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            )}
            {api && action === 'export' && error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}
            {action === 'delete' && (
              <Field label="Type DELETE to confirm" htmlFor="pv-confirm" error={error}>
                <Input id="pv-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
