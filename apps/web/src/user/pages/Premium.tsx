import { useState } from 'react';
import { Building2, Check, Crown, Leaf, RotateCcw, Sparkles, Users, X } from 'lucide-react';
import { useStore } from '@/store/AppStore';
import { BackendBadge, Badge, Button, Card, ConfirmDialog, Notice, PageHeader, PhaseBadge, Segmented, SectionTitle, useToast } from '@/components/ui';
import { Photo } from '@/components/media/Photo';
import { ArchPortrait } from '@/user/components/learn-ui/ArchPortrait';
import { cn, simulate } from '@/lib/utils';

const ROWS: [string, boolean, boolean][] = [
  ['Period & cycle tracking', true, true],
  ['Basic symptoms & mood', true, true],
  ['Daily check-in & plan', true, true],
  ['Hydration, steps & workouts', true, true],
  ['Basic trends & weekly summary', true, true],
  ['Educational articles', true, true],
  ['Advanced insights & cycle correlations', false, true],
  ['Advanced cycle history', false, true],
  ['AI wellness coach', false, true],
  ['Nutrition tracking', false, true],
  ['Personalised programs & workouts', false, true],
  ['Advanced wellness reports', false, true],
];

const Yes = ({ dark }: { dark?: boolean }) => (
  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', dark ? 'bg-butter-300 text-green-950' : 'bg-green-100 text-green-700')}>
    <Check className="h-3.5 w-3.5" strokeWidth={3} />
  </span>
);

/** Subscriptions (SRS §49) — Phase 2. Billing via App Store / Google Play is undecided (D-13). */
export default function Premium() {
  const { state, mode, setPlan } = useStore();
  const { profile } = state;
  const api = mode === 'api';
  const toast = useToast();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const premium = profile.plan === 'premium';

  const start = async () => {
    setBusy(true);
    try {
      if (!api) await simulate(true, 1200);
      await setPlan('premium');
      toast.success('Welcome to Premium ✨', api ? 'Your 7-day free trial has started — no payment was taken.' : 'Offline demo — no payment was taken.');
    } catch {
      /* the store already showed the server's message (e.g. trial already used) */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <PageHeader eyebrow="Profile & settings" title="Subscription & plans" badge={<PhaseBadge phase={2} />} subtitle="Your current plan and HealthX Premium — deeper insights and personal guidance. Core tracking stays free, always." breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Profile & Settings', to: '/app/profile' }, { label: 'Subscription & plans' }]} />
        {premium && (
          <Notice tone="green" title={api ? 'You’re on Premium' : 'You’re on Premium (offline demo)'} icon={<Crown className="h-4 w-4 text-green-700" />}>
            {api ? 'Premium features are unlocked for your account (free trial — paid billing isn’t connected yet).' : 'All Premium features are unlocked in this demo.'}{' '}
            <button className="font-semibold underline" onClick={() => setCancelOpen(true)}>
              Cancel subscription
            </button>
          </Notice>
        )}
      </div>

      {/* ---------- Hero ---------- */}
      <section className="bg-wash relative overflow-hidden rounded-[34px] p-6 ring-1 ring-inset ring-green-100 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow">
              <Sparkles className="h-4 w-4" /> HealthX Premium
            </p>
            <h2 className="mt-2 font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-900 sm:text-[42px]">
              Deeper insights, <span className="mr-2 font-script text-[38px] font-bold text-green-700 sm:text-[52px]">gentle</span> guidance
            </h2>
            <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-ink-600">Pattern insights across your cycle, the AI wellness coach and personalised programs. Your core tracking stays free, always.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Segmented
                value={cycle}
                onChange={setCycle}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: <span>Yearly <Badge tone="green" className="ml-1">Save more</Badge></span> },
                ]}
              />
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
              {[api ? '7-day free trial' : 'Simulated in the offline demo', 'No payment is taken in this preview', 'Cancel anytime — you keep your data'].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-600" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <ArchPortrait photo="pilates-mat" alt="" position="30% 50%" className="mx-auto hidden h-72 w-56 lg:block" leafClassName="-left-12 -top-6 h-36 w-36" />
        </div>
      </section>

      {/* ---------- Plan cards ---------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className={cn('card-pad flex flex-col', !premium && 'ring-2 ring-green-600')}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                <Leaf className="h-5 w-5" />
              </span>
              <p className="font-display text-xl font-semibold text-ink-900">Free</p>
            </div>
            {!premium && <Badge tone="green">Current plan</Badge>}
          </div>
          <p className="mt-5 flex items-baseline gap-1.5">
            <span className="num text-5xl text-ink-900">₹0</span>
            <span className="text-sm font-semibold text-ink-500">forever</span>
          </p>
          <p className="mt-1 text-ink-500">Everything you need for everyday tracking.</p>
          <ul className="mt-5 space-y-2.5 border-t border-ink-100 pt-5">
            {ROWS.filter(([, free]) => free).map(([f]) => (
              <li key={f} className="flex items-center gap-2.5 text-[15px] text-ink-700">
                <Yes /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            <Button variant="outline" className="w-full" disabled={!premium} onClick={() => setCancelOpen(true)}>
              {premium ? 'Downgrade to Free' : 'Your plan'}
            </Button>
          </div>
        </Card>

        <div className={cn('bg-forest relative order-first flex flex-col overflow-hidden rounded-[30px] p-6 text-white shadow-lift sm:p-8 lg:order-none', premium ? 'ring-2 ring-butter-300' : 'ring-1 ring-white/10')}>
          <span aria-hidden className="leaf absolute -right-10 -top-10 h-40 w-40 bg-white/5" />
          <div className="relative flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-butter-300 text-green-950">
                  <Crown className="h-5 w-5" />
                </span>
                <p className="font-display text-xl font-semibold">Premium</p>
              </div>
              {premium ? <Badge tone="butter">Current plan</Badge> : <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-white/20">Recommended</span>}
            </div>
            <p className="num mt-5 text-5xl">Price TBA</p>
            <p className="mt-1 text-white/70">{cycle === 'yearly' ? 'Billed yearly' : 'Billed monthly'} · pricing announced at launch (D-13)</p>
            <p className="mt-5 border-t border-white/10 pt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-green-200">Everything in Free, plus</p>
            <ul className="mt-3 space-y-2.5">
              {ROWS.filter(([, free]) => !free).map(([f]) => (
                <li key={f} className="flex items-center gap-2.5 text-[15px] text-white/90">
                  <Yes dark /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Button variant="butter" size="lg" className="w-full" loading={busy} disabled={premium} onClick={start}>
                {premium ? 'Active' : api ? 'Start 7-day free trial' : 'Start Premium (simulated)'}
              </Button>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <BackendBadge label="App Store / Google Play billing required" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Comparison ---------- */}
      <section>
        <SectionTitle eyebrow="Compare" title="Free and Premium side by side" />
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium sm:px-6">Feature</th>
                <th className="w-20 px-2 py-3 text-center font-medium sm:w-28">Free</th>
                <th className="w-20 bg-green-50 px-2 py-3 text-center font-medium text-green-800 sm:w-28">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ROWS.map(([f, free, prem]) => (
                <tr key={f}>
                  <td className="px-4 py-3 font-medium text-ink-800 sm:px-6">{f}</td>
                  <td className="px-2 py-3 text-center">{free ? <Check className="mx-auto h-5 w-5 text-green-600" aria-label="Included" /> : <X className="mx-auto h-5 w-5 text-ink-300" aria-label="Not included" />}</td>
                  <td className="bg-green-50/50 px-2 py-3 text-center">{prem ? <Check className="mx-auto h-5 w-5 text-green-600" aria-label="Included" /> : <X className="mx-auto h-5 w-5 text-ink-300" aria-label="Not included" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ---------- How the trial works ---------- */}
      <section className="rounded-[34px] bg-sage/60 p-6 sm:p-8">
        <SectionTitle eyebrow="How it works" title="Try Premium without pressure" />
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Start your trial', api ? 'Seven days, no payment taken — paid billing isn’t connected yet.' : 'Switches the demo to Premium instantly. No payment is taken.'],
            ['Explore at your pace', 'Pattern insights, the AI coach, nutrition and personalised programs.'],
            ['Keep or cancel', 'Cancel anytime from this page — you keep all your data.'],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-3xl bg-white p-5 shadow-card">
              <span className="num flex h-10 w-10 items-center justify-center rounded-full bg-green-700 text-lg text-white">{i + 1}</span>
              <p className="mt-3 font-display text-[17px] font-semibold text-ink-900">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          { icon: Users, t: 'Family plan', d: 'Multiple private profiles under one subscription. Each member’s data stays private.', photo: 'friends-group' as const, tone: 'bg-lavender-50 text-lavender-600' },
          { icon: Building2, t: 'HealthX Business', d: 'Workplace wellness programmes see aggregated engagement only — never individual cycle or reproductive data.', photo: 'friends-yoga' as const, tone: 'bg-green-50 text-green-700' },
        ].map((x) => (
          <Card key={x.t} className="flex overflow-hidden">
            <Photo photo={x.photo} alt="" shape="none" className="hidden w-36 shrink-0 sm:block" />
            <div className="card-pad flex gap-4">
              <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', x.tone)}>
                <x.icon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-[17px] font-semibold text-ink-900">{x.t}</p>
                <p className="text-sm text-ink-500">{x.d}</p>
                <Badge tone="gray" className="mt-2">
                  Future
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="text-center">
        <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => toast.info('Restore purchases (simulated)', 'No previous purchases found for this demo account.')}>
          Restore purchases
        </Button>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Premium?"
        body={api ? 'You’ll keep all your data. Your trial ends now and you switch to Free — the free trial can’t be restarted.' : 'You’ll keep all your data. Premium features lock at the end of the billing period. (Demo: switches to Free immediately.)'}
        confirmLabel="Cancel Premium"
        danger
        onConfirm={async () => {
          try {
            await setPlan('free');
            toast.success('Premium cancelled', 'You’re back on the Free plan.');
          } catch {
            /* error already shown */
          }
        }}
      />
    </div>
  );
}
