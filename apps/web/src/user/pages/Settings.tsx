import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, Code2, CreditCard, Database, FileText, Globe, HeartPulse, Info, LogOut, Monitor, Palette, RefreshCw, Ruler, ScrollText, ShieldCheck, Sparkles, Stethoscope, Trash } from 'lucide-react';
import { COPY, LANGUAGES, type Units } from '@healthx/shared';
import { useStore } from '@/store/AppStore';
import { Avatar } from '@/components/brand/Brand';
import { Badge, Button, ButtonLink, ConfirmDialog, PageHeader, Segmented, Select, useToast } from '@/components/ui';
import { ListGroup, ListRow } from '@/user/components/learn-ui/ListGroup';
import { MODE_LABEL } from '@/user/components/learn-ui/tones';
import { cn } from '@/lib/utils';

const SWATCHES = ['bg-green-700', 'bg-rose-500', 'bg-lavender-500', 'bg-sky-500', 'bg-peach-500', 'bg-indigo-500'];

export default function Settings() {
  const { state, dispatch, mode, signOut, loadSampleData, clearData } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const [reset, setReset] = useState(false);
  const [empty, setEmpty] = useState(false);
  const { profile } = state;

  const links = [
    { to: '/app/notifications', icon: Bell, t: 'Notifications & reminders', d: 'Types, times, discreet mode, quiet hours', tone: 'peach' as const },
    { to: '/app/privacy', icon: ShieldCheck, t: 'Privacy & data', d: 'Consents, integrations, export, delete account', tone: 'green' as const },
    { to: '/app/profile', icon: Sparkles, t: 'Profile & goals', d: 'Personal details, goals and cycle settings', tone: 'lavender' as const },
    { to: '/app/subscription', icon: CreditCard, t: 'Subscription & plans', d: profile.plan === 'premium' ? 'Premium' : 'Free plan', tone: 'butter' as const },
    { to: '/app/integrations', icon: HeartPulse, t: 'Health integrations', d: 'Apple Health, Health Connect', tone: 'rose' as const },
  ];

  return (
    <div>
      <PageHeader eyebrow="Profile & settings" title="Settings" subtitle="Preferences, demo controls and app information." breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Profile & Settings', to: '/app/profile' }, { label: 'Preferences & settings' }]} />

      {/* ---------- Who's signed in + appearance ---------- */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card card-pad flex flex-wrap items-center gap-4">
          <Avatar name={profile.name} photoKey={profile.avatar} size={60} className="ring-4 ring-green-50" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[20px] font-semibold text-ink-900">{profile.name || 'Your profile'}</p>
            <p className="truncate text-sm text-ink-500">{profile.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone={profile.plan === 'premium' ? 'butter' : 'mint'}>{profile.plan === 'premium' ? 'Premium' : 'Free plan'}</Badge>
              <Badge tone="lavender">{MODE_LABEL[profile.mode]}</Badge>
            </div>
          </div>
          <ButtonLink to="/app/profile" variant="secondary" size="sm" className="h-10 w-full sm:w-auto">
            Edit profile
          </ButtonLink>
        </div>
        <Link to="/app/settings/appearance" className="bg-wash group relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 ring-1 ring-inset ring-green-100 transition hover:-translate-y-0.5 hover:shadow-card sm:p-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-green-700 shadow-soft">
            <Palette className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[19px] font-semibold text-ink-900">Appearance & theme</span>
            <span className="block text-sm text-ink-600">Accent colours, light or dark mode, with a live preview.</span>
            <span className="mt-2.5 flex items-center gap-1.5" aria-hidden>
              {SWATCHES.map((c) => (
                <span key={c} className={cn('h-6 w-6 rounded-full ring-2 ring-white shadow-xs', c)} />
              ))}
              <span className="h-6 w-6 overflow-hidden rounded-full bg-white shadow-xs ring-2 ring-white">
                <span className="block h-full w-1/2 bg-ink-900" />
              </span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-green-700 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-7">
          <ListGroup title="Preferences" eyebrow="Your app">
            <ListRow
              stack
              icon={<Ruler />}
              tone="sky"
              label="Units"
              hint={profile.units === 'metric' ? 'Metric (L, kg, cm, °C)' : 'Imperial (oz, lb, ft, °F)'}
              right={
                <Segmented
                  value={profile.units}
                  onChange={(u: Units) => {
                    dispatch({ type: 'UPDATE_PROFILE', patch: { units: u } });
                    toast.success('Units updated', u === 'metric' ? 'Metric (L, kg, cm, °C)' : 'Imperial (oz, lb, ft, °F)');
                  }}
                  options={[
                    { value: 'metric', label: 'Metric' },
                    { value: 'imperial', label: 'Imperial' },
                  ]}
                />
              }
            />
            <ListRow
              stack
              icon={<Globe />}
              tone="lavender"
              label={<label htmlFor="st-lang">Language</label>}
              hint="Full translations are part of localisation readiness (D-15)."
              right={
                <div className="w-full sm:w-52">
                  <Select
                    id="st-lang"
                    value={profile.language}
                    onChange={(e) => {
                      dispatch({ type: 'UPDATE_PROFILE', patch: { language: e.target.value } });
                      toast.info('Language saved', 'Translations are not included in this demo.');
                    }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </Select>
                </div>
              }
            />
          </ListGroup>

          <ListGroup title="Account & privacy" eyebrow="Manage">
            {links.map((l) => (
              <ListRow key={l.to} to={l.to} icon={<l.icon />} tone={l.tone} label={l.t} hint={l.d} />
            ))}
          </ListGroup>

          <ListGroup title={mode === 'api' ? 'Your data' : 'Demo data'} eyebrow="Data" footer={`${mode === 'api' ? 'Stored in your HealthX account on the server.' : 'Everything is stored only in this browser.'} Use “empty data” to preview first-time and empty states across the app.`}>
            <ListRow
              stack
              icon={<RefreshCw />}
              tone="green"
              label="Sample history"
              hint="Replace your logs with fresh sample data."
              right={
                <Button variant="secondary" size="sm" className="h-10" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setReset(true)}>
                  Reset sample data
                </Button>
              }
            />
            <ListRow
              stack
              icon={<Database />}
              tone="peach"
              label="First-time view"
              hint="Empty your logs to explore empty states."
              right={
                <Button variant="outline" size="sm" className="h-10" leftIcon={<Trash className="h-4 w-4" />} onClick={() => setEmpty(true)}>
                  Start with empty data
                </Button>
              }
            />
          </ListGroup>
        </div>

        <div className="space-y-8 xl:col-span-5">
          <ListGroup title="About HealthX" eyebrow="App information" footer={COPY.notDiagnostic}>
            <ListRow icon={<Info />} tone="green" label="Version" right={<span className="font-mono text-sm text-ink-700">{mode === 'api' ? '0.1.0 · preview' : '0.1.0 · offline demo'}</span>} />
            <ListRow icon={<Monitor />} tone="sky" label="Build" right={<span className="font-mono text-sm text-ink-700">Web · React</span>} />
            <ListRow to="/terms" icon={<ScrollText />} tone="lavender" label="Terms of use" />
            <ListRow to="/privacy-policy" icon={<FileText />} tone="lavender" label="Privacy policy" />
            <ListRow onClick={() => toast.info('Medical disclaimer', 'Provided at launch.')} icon={<Stethoscope />} tone="lavender" label="Medical disclaimer" />
            <ListRow onClick={() => toast.info('Open-source licences', 'Provided at launch.')} icon={<Code2 />} tone="lavender" label="Open-source licences" />
          </ListGroup>
          <Button
            variant="outline"
            className="h-12 w-full !text-danger hover:border-danger hover:bg-danger-soft"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={async () => {
              await signOut();
              nav('/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={reset}
        onClose={() => setReset(false)}
        title="Reset sample data?"
        body="Your logged data will be replaced with fresh sample history (your account stays the same)."
        confirmLabel="Reset"
        onConfirm={async () => {
          try {
            await loadSampleData();
            toast.success('Sample data restored');
          } catch {
            /* the store already showed the error */
          }
        }}
      />
      <ConfirmDialog
        open={empty}
        onClose={() => setEmpty(false)}
        danger
        title="Clear all your logged data?"
        body="Your logs will be emptied so you can explore first-time states. You can restore the sample data anytime."
        confirmLabel="Clear data"
        onConfirm={async () => {
          try {
            await clearData();
            toast.success('Data cleared');
            nav('/app');
          } catch {
            /* the store already showed the error */
          }
        }}
      />
    </div>
  );
}
