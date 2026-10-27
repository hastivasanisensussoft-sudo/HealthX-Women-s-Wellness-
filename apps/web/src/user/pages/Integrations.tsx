import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Footprints, HeartPulse, Link2, Link2Off, Moon, ShieldCheck, Smartphone, Watch } from 'lucide-react';
import { timeAgo, type HealthConnection } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { LogoMark } from '@/components/brand/Brand';
import { BackendBadge, Badge, Button, Card, ConfirmDialog, PageHeader, PhaseBadge, Switch, useToast } from '@/components/ui';
import { ArchPortrait } from '@/user/components/learn-ui/ArchPortrait';
import { cn, simulate } from '@/lib/utils';

const ICONS: Record<HealthConnection['id'], typeof HeartPulse> = { apple_health: HeartPulse, health_connect: Smartphone, wearable: Watch };
const HINTS: Record<HealthConnection['id'], string> = {
  apple_health: 'Available on iPhone',
  health_connect: 'Available on Android devices',
  wearable: 'Selected wearables (later phase)',
};
const TINT: Record<HealthConnection['id'], string> = { apple_health: 'bg-rose-50 text-rose-600', health_connect: 'bg-sky-50 text-sky-600', wearable: 'bg-indigo-50 text-indigo-600' };

/** Health integrations (SRS §28, mockup M42) — Phase 2; syncing needs the mobile app + backend, so it is simulated here. */
export default function Integrations() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const consent = state.consents.find((c) => c.id === 'health_integrations');
  const [askConsent, setAskConsent] = useState<HealthConnection['id'] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Per-type read permissions are granted in the OS sheet in production; kept locally in the demo.
  const [types, setTypes] = useState<Record<string, boolean>>({});
  const connected = state.connections.filter((c) => c.connected).length;

  const toggle = async (c: HealthConnection, consentJustGranted = false) => {
    if (!c.connected && !consent?.granted && !consentJustGranted) return setAskConsent(c.id);
    setBusy(c.id);
    await simulate(true, 700);
    setBusy(null);
    dispatch({ type: 'TOGGLE_CONNECTION', id: c.id });
    toast.success(c.connected ? `${c.label} disconnected` : `${c.label} connected (simulated)`, c.connected ? 'Imported data stays in your history unless you delete it.' : 'We only read the data types you allow.');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profile & settings"
        title="Health integrations"
        badge={<PhaseBadge phase={2} />}
        subtitle="Connect Apple Health or Health Connect to sync steps, sleep and workouts automatically."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Profile & Settings', to: '/app/profile' }, { label: 'Health integrations' }]}
      />

      {/* ---------- Hero ---------- */}
      <section className="bg-wash relative !mt-0 overflow-hidden rounded-[34px] p-6 ring-1 ring-inset ring-green-100 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow">Connected health</p>
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[38px]">Your steps, sleep and workouts — in one calm place</h2>
            <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-ink-600">Sync only what you choose. HealthX reads the data types you allow and never writes cycle or reproductive data to other apps.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset', consent?.granted ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-white text-ink-600 ring-ink-200')}>
                <ShieldCheck className="h-4 w-4" /> {consent?.granted ? 'Import consent given' : 'Import consent not given yet'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-600 ring-1 ring-inset ring-ink-200">
                <Link2 className="h-4 w-4 text-green-600" /> {connected} connected
              </span>
            </div>
          </div>
          <ArchPortrait photo="woman-running" alt="" position="50% 35%" className="mx-auto hidden h-72 w-56 lg:block" leafClassName="-left-12 -top-6 h-36 w-36">
            <span className="glass absolute -left-10 bottom-10 flex items-center gap-2 rounded-2xl px-3 py-2 shadow-card">
              <LogoMark className="h-7 w-7" />
              <span className="flex gap-1 text-green-700" aria-hidden>
                <Footprints className="h-4 w-4" />
                <Moon className="h-4 w-4" />
                <Activity className="h-4 w-4" />
              </span>
            </span>
          </ArchPortrait>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          {state.connections.map((c) => {
            const I = ICONS[c.id];
            const later = c.phase === 3;
            return (
              <Card key={c.id} className={cn('card-pad', later && 'bg-ink-50/60', c.connected && 'ring-2 ring-green-200')}>
                <div className="flex flex-wrap items-center gap-4">
                  <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', c.connected ? 'bg-green-700 text-white' : TINT[c.id])}>
                    <I className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-display text-[18px] font-semibold text-ink-900">
                      {c.label} <PhaseBadge phase={c.phase} />
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-ink-500">
                      <span className={cn('h-2 w-2 rounded-full', c.connected ? 'bg-green-500' : 'bg-ink-300')} aria-hidden />
                      {c.connected ? `Connected · synced ${c.lastSync ? timeAgo(c.lastSync) : 'just now'}` : HINTS[c.id]}
                    </p>
                  </div>
                  {later ? (
                    <div className="w-full sm:w-auto">
                      <Badge tone="gray">Coming later</Badge>
                    </div>
                  ) : (
                    <Button
                      variant={c.connected ? 'outline' : 'primary'}
                      size="sm"
                      className="h-10 w-full sm:w-auto"
                      loading={busy === c.id}
                      leftIcon={c.connected ? <Link2Off className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                      onClick={() => toggle(c)}
                    >
                      {c.connected ? `Disconnect` : 'Connect'}
                    </Button>
                  )}
                </div>
                {!c.connected && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {c.dataTypes.map((t) => (
                      <span key={t} className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-600 ring-1 ring-inset ring-ink-100">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {c.connected && (
                  <div className="mt-5">
                    <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">Data HealthX may read</p>
                    <div className="grid gap-0 divide-y divide-ink-100 rounded-2xl ring-1 ring-inset ring-ink-100 sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 sm:p-1">
                      {c.dataTypes.map((t) => {
                        const key = `${c.id}:${t}`;
                        const on = types[key] ?? ['Steps', 'Distance', 'Workouts', 'Sleep'].includes(t);
                        return (
                          <div key={t} className="px-4 py-3">
                            <Switch checked={on} onChange={(v) => setTypes((x) => ({ ...x, [key]: v }))} label={t} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        <div className="space-y-4 xl:col-span-4">
          <Card className="card-pad">
            <p className="eyebrow">Consent</p>
            <div className="mt-3">
              <Switch
                checked={!!consent?.granted}
                onChange={(v) => {
                  dispatch({ type: 'SET_CONSENT', id: 'health_integrations', granted: v });
                  toast.success(v ? 'Consent given' : 'Consent withdrawn', v ? 'You can now connect a health app.' : 'Every connected health app was disconnected.');
                }}
                label="Allow health data import"
                description={consent?.granted ? 'You allowed HealthX to import health data from connected apps.' : 'You’ll be asked for consent before the first connection. Withdrawing it disconnects every app.'}
              />
            </div>
            <Link to="/app/privacy" className="mt-4 inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold text-green-700 hover:underline">
              All consents in Privacy & data <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="card-pad">
            <p className="flex items-center gap-2 font-display text-[17px] font-semibold text-ink-900">
              <ShieldCheck className="h-5 w-5 text-green-600" /> How syncing works
            </p>
            <ol className="mt-4 space-y-3">
              {[
                'We only read the data types you allow — you can change them anytime.',
                'Imported values are labelled with their source, e.g. “Apple Health”.',
                'Disconnecting stops new imports straight away.',
                'HealthX never writes cycle or reproductive data to other apps.',
              ].map((t, i) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-ink-600">
                  <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm text-green-800 ring-1 ring-inset ring-green-100">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <BackendBadge className="mt-5" />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!askConsent}
        onClose={() => setAskConsent(null)}
        title="Allow health data import?"
        body="HealthX will import only the data types you choose from this app. You can withdraw this consent anytime in Privacy & data."
        confirmLabel="Allow & connect"
        onConfirm={() => {
          dispatch({ type: 'SET_CONSENT', id: 'health_integrations', granted: true });
          const c = state.connections.find((x) => x.id === askConsent);
          if (c) void toggle(c, true);
        }}
      />
    </div>
  );
}
