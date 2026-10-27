import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BellRing, Camera, Check, HeartHandshake, Loader2, Lock, ShieldCheck, Sparkles, Sprout, Stethoscope } from 'lucide-react';
import {
  addDays,
  COPY,
  COUNTRIES,
  diffDays,
  GOALS,
  LANGUAGES,
  TIMEZONES,
  type ActivityLevel,
  type CycleProfile,
  type GoalKey,
  type NotificationType,
  type PhotoKey,
  type Regularity,
} from '@healthx/shared';
import { useAppState, useDispatch, useStore } from '@/store/AppStore';
import { userApi } from '@/lib/api';
import { Avatar, Leaf, LeafPair, Logo, MoodFace } from '@/components/brand/Brand';
import { CycleRing } from '@/components/cycle/CycleRing';
import { Photo } from '@/components/media/Photo';
import { Badge, Button, Checkbox, Field, Input, Notice, PhaseBadge, Segmented, Select, Stepper, Switch, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, simulate } from '@/lib/utils';

/** Welcome (0) → 5 core steps (1–5) → Done (6). Mirrors mockup M06–M10; consent comes before any cycle data is collected. */
const CORE_STEPS = ['Goals', 'About you', 'Privacy', 'Cycle', 'Reminders'] as const;
const DONE = CORE_STEPS.length + 1;
const DRAFT_KEY = 'healthx.onboarding.draft.v2';
/**
 * [ADD A-18] Where the unfinished onboarding draft (it includes DOB and cycle details) is kept. With the API it
 * stays in this tab only (sessionStorage) and per account, so another person signing up in the same browser
 * never sees it; the offline demo keeps the original localStorage draft.
 */
const draftSlot = (api: boolean): [Storage, string] => (api ? [sessionStorage, `${DRAFT_KEY}:${userApi.user?.id ?? 'pending'}`] : [localStorage, DRAFT_KEY]);
const AVATARS: PhotoKey[] = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'];
const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: 'light', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'High' },
];
const REMINDER_CHOICES: { type: NotificationType; label: string }[] = [
  { type: 'cycle', label: 'Your estimated period may begin soon*' },
  { type: 'habit', label: 'Time for your daily check-in' },
  { type: 'hydration', label: 'Hydration reminders' },
];

interface Draft {
  step: number;
  consents: Record<string, boolean>;
  terms: boolean;
  goals: GoalKey[];
  name: string;
  dob: string;
  country: string;
  language: string;
  timezone: string;
  avatar: PhotoKey | null;
  activity: ActivityLevel;
  heightCm: string;
  weightKg: string;
  lastPeriod: string;
  lastPeriodUnknown: boolean;
  cycleLength: number;
  cycleUnknown: boolean;
  periodLength: number;
  periodUnknown: boolean;
  regularity: Regularity;
  reminders: NotificationType[];
  notifications: boolean | null;
}

const detectTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
};

export default function Onboarding() {
  const { auth, today, profile, notificationPrefs } = useAppState();
  const dispatch = useDispatch();
  const { mode, loadSampleData } = useStore();
  const nav = useNavigate();
  const toast = useToast();

  const initial: Draft = useMemo(() => {
    try {
      const [store, key] = draftSlot(mode === 'api');
      const raw = store.getItem(key);
      if (raw) return JSON.parse(raw) as Draft; // [ADD A-18] resume where you left off
    } catch {
      /* ignore */
    }
    return {
      step: 0,
      consents: { health_processing: true, notifications: false, analytics: false, ai_personalization: false, health_integrations: false },
      terms: false,
      goals: [],
      name: profile.name,
      dob: '',
      country: 'India',
      language: 'English',
      timezone: detectTimezone(),
      avatar: null,
      activity: 'moderate',
      heightCm: '',
      weightKg: '',
      lastPeriod: addDays(today, -10),
      lastPeriodUnknown: false,
      cycleLength: 28,
      cycleUnknown: true,
      periodLength: 5,
      periodUnknown: false,
      regularity: 'not_sure',
      reminders: ['cycle', 'habit', 'hydration'],
      notifications: null,
    };
  }, [today, profile.name, mode]);

  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    try {
      const [store, key] = draftSlot(mode === 'api');
      store.setItem(key, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d, mode]);

  if (!auth.signedIn) return <Navigate to="/signup" replace />;
  if (auth.onboarded) return <Navigate to="/app" replace />;

  const noCycleGoals = d.goals.length > 0 && d.goals.every((g) => g === 'menopause' || g === 'pregnancy_wellness');
  const timezones = TIMEZONES.includes(d.timezone) ? TIMEZONES : [d.timezone, ...TIMEZONES];

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (d.step === 1 && d.goals.length === 0) e.goals = 'Choose at least one goal — you can change these later.';
    if (d.step === 2) {
      if (d.name.trim().length < 2) e.name = 'Please enter your name.';
      if (!d.dob) e.dob = 'Please enter your date of birth.';
      else {
        const age = Math.floor(diffDays(d.dob, today) / 365.25);
        if (d.dob > today) e.dob = 'Date of birth can’t be in the future.';
        else if (age < 13 || age > 100) e.dob = 'Please check your date of birth.';
      }
      if (d.heightCm && (+d.heightCm < 100 || +d.heightCm > 230)) e.heightCm = 'Enter a height between 100 and 230 cm.';
      if (d.weightKg && (+d.weightKg < 30 || +d.weightKg > 250)) e.weightKg = 'Enter a weight between 30 and 250 kg.';
    }
    if (d.step === 3 && !d.terms) e.terms = 'Please accept the terms and privacy policy to continue.';
    if (d.step === 4 && !noCycleGoals && !d.lastPeriodUnknown) {
      if (!d.lastPeriod) e.lastPeriod = 'Choose a date or tick “I don’t remember”.';
      else if (d.lastPeriod > today) e.lastPeriod = 'This date can’t be in the future.';
      else if (diffDays(d.lastPeriod, today) > 120) e.lastPeriod = 'That’s more than 120 days ago — tick “I don’t remember” if you’re unsure.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => validate() && set('step', Math.min(d.step + 1, DONE));
  const back = () => set('step', Math.max(0, d.step - 1));
  const skip = () => {
    setErrors({});
    set('step', d.step + 1);
  };

  const answerNotifications = async (allow: boolean) => {
    let granted = allow;
    if (allow && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        granted = res !== 'denied';
        if (res === 'denied') toast.info('Notifications are blocked in this browser', 'You can turn them on later in your browser settings.');
      } catch {
        /* older browsers — keep the in-app choice */
      }
    }
    setD((x) => ({ ...x, notifications: granted, consents: { ...x.consents, notifications: granted }, step: DONE }));
  };

  const profilePatch = () => ({
    language: d.language,
    timezone: d.timezone,
    avatar: d.avatar ?? undefined,
    activityLevel: d.activity,
    heightCm: d.heightCm ? +d.heightCm : undefined,
    weightKg: d.weightKg ? +d.weightKg : undefined,
  });

  const complete = async (withSample: boolean) => {
    setBusy(true);
    if (mode === 'demo') await simulate(true, 700);
    const cycle: CycleProfile = {
      lastPeriodStart: noCycleGoals || d.lastPeriodUnknown ? null : d.lastPeriod,
      typicalCycleLength: d.cycleUnknown ? null : d.cycleLength,
      typicalPeriodLength: d.periodUnknown ? null : d.periodLength,
      regularity: d.regularity,
    };
    if (withSample) {
      try {
        await loadSampleData(); // API mode: the user's own sample history on the server
      } catch {
        setBusy(false);
        return;
      }
      dispatch({ type: 'UPDATE_PROFILE', patch: { name: d.name.trim(), goals: d.goals, country: d.country, ...profilePatch() } });
      // Apply the consent choices made during onboarding to the sample account too.
      for (const id of ['analytics', 'ai_personalization', 'health_integrations', 'notifications'] as const) dispatch({ type: 'SET_CONSENT', id, granted: !!d.consents[id] });
    } else {
      dispatch({ type: 'COMPLETE_ONBOARDING', name: d.name.trim(), dob: d.dob, country: d.country, goals: d.goals, cycle, consents: d.consents });
      dispatch({ type: 'UPDATE_PROFILE', patch: profilePatch() });
      const types = { ...notificationPrefs.types };
      for (const c of REMINDER_CHOICES) types[c.type] = { ...types[c.type], enabled: !!d.notifications && d.reminders.includes(c.type) };
      dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...notificationPrefs, types } });
    }
    try {
      const [store, key] = draftSlot(mode === 'api');
      store.removeItem(key);
    } catch {
      /* ignore */
    }
    setBusy(false);
    toast.success(`Welcome, ${d.name.split(' ')[0]}!`, withSample ? 'Sample history loaded so you can explore every feature.' : 'Your space is ready.');
    nav('/app', { replace: true });
  };

  const core = d.step >= 1 && d.step <= CORE_STEPS.length;
  const previewLen = d.cycleUnknown ? 28 : d.cycleLength;
  const sinceLast = !d.lastPeriodUnknown && d.lastPeriod && d.lastPeriod <= today ? diffDays(d.lastPeriod, today) : null;
  const previewDay = sinceLast !== null && sinceLast < previewLen ? sinceLast + 1 : null;

  const navButtons = (
    <div className={cn('flex items-center justify-between gap-3', d.step === 0 ? 'mt-8' : 'mt-6')}>
      <Button variant="ghost" onClick={back} disabled={d.step === 0} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        Back
      </Button>
      <Button size="lg" onClick={next} rightIcon={<ArrowRight className="h-4 w-4" />}>
        {d.step === 0 ? 'Get started' : d.step === 3 ? 'Agree & continue' : d.step === 4 && noCycleGoals ? 'Skip' : 'Continue'}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          {core ? (
            <div className="flex items-center gap-2">
              <p className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-800 ring-1 ring-inset ring-green-100">
                Step {d.step} of {CORE_STEPS.length}
              </p>
              {d.step === 1 && (
                <button type="button" onClick={skip} className="min-h-[44px] rounded-full px-3 text-sm font-bold text-green-800 hover:bg-green-50">
                  Skip
                </button>
              )}
            </div>
          ) : (
            <span className="hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 sm:inline-flex">
              <Lock className="h-3.5 w-3.5" /> Private by design
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
        {d.step === 0 && (
          <div className="grid animate-fade-up items-stretch gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
            <section className="bg-forest relative isolate flex flex-col overflow-hidden rounded-[34px] p-7 text-white sm:p-10">
              <Leaf className="pointer-events-none absolute -bottom-16 -right-12 -z-10 h-64 w-64 -rotate-12 text-green-300/10" color="currentColor" vein={false} />
              <p className="font-script text-[30px] font-bold leading-none text-butter-300">hello there ♡</p>
              <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[50px]">Understand your body, gently.</h1>
              <p className="mt-4 max-w-md text-[16.5px] leading-relaxed text-white/75">Track your cycle, mood, sleep and habits in one place. Your data stays private — always.</p>
              <div className="relative mx-auto mt-10 w-[64%] max-w-[260px]">
                <LeafPair className="-left-12 -top-9 h-36 w-36" />
                <Photo photo="portrait-curly" alt="Smiling woman resting her head on her hand" shape="arch" priority position="50% 22%" className="relative aspect-[4/5] w-full bg-butter-300 ring-[6px] ring-white/10" />
                <div aria-hidden className="glass absolute -left-10 bottom-8 flex animate-float items-center gap-3 rounded-2xl p-3 pr-4 text-ink-900 shadow-lift sm:-left-16">
                  <MoodFace mood="good" size={40} />
                  <span>
                    <span className="block text-sm font-bold">How are you today?</span>
                    <span className="block text-xs text-ink-500">Check in under 30 seconds</span>
                  </span>
                </div>
              </div>
            </section>
            <div className="flex flex-col justify-center">
              <p className="eyebrow">Before we begin</p>
              <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight text-green-950">Five short steps, about a minute</h2>
              <div className="mt-6 space-y-3">
                {[
                  { icon: Sparkles, t: 'What HealthX does', d: 'Cycle & period tracking, daily check-ins, movement, hydration and gentle insights — personalised to your goals.', tone: 'bg-butter-100 text-butter-600' },
                  { icon: Lock, t: 'Our privacy approach', d: 'You choose what to share. Health data is encrypted, only used with your consent, and you can export or delete it anytime.', tone: 'bg-green-100 text-green-700' },
                  { icon: Stethoscope, t: 'A wellness companion', d: COPY.notDiagnostic, tone: 'bg-lavender-100 text-lavender-600' },
                ].map((x) => (
                  <div key={x.t} className="flex gap-4 rounded-3xl bg-white p-4 shadow-card ring-1 ring-ink-100 sm:p-5">
                    <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', x.tone)}>
                      <x.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-[17px] font-semibold text-ink-900">{x.t}</p>
                      <p className="mt-0.5 text-[14.5px] leading-relaxed text-ink-500">{x.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ol className="mt-6 flex flex-wrap gap-2" aria-label="Setup steps">
                {CORE_STEPS.map((s, i) => (
                  <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 ring-1 ring-ink-100">
                    <span className="num text-green-700">{i + 1}</span> {s}
                  </li>
                ))}
              </ol>
              {navButtons}
            </div>
          </div>
        )}

        {core && (
          <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-10">
            <aside className="hidden lg:block">
              <div className="bg-forest sticky top-24 overflow-hidden rounded-[30px] p-6 text-white">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-green-200">Your setup</p>
                <ol className="mt-4 space-y-1" aria-label="Onboarding progress">
                  {CORE_STEPS.map((s, i) => {
                    const n = i + 1;
                    const done = n < d.step;
                    const cur = n === d.step;
                    return (
                      <li key={s} aria-current={cur ? 'step' : undefined}>
                        <button
                          type="button"
                          disabled={!done}
                          onClick={() => set('step', n)}
                          className={cn('flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition', cur ? 'bg-white text-green-900' : done ? 'text-white/85 hover:bg-white/10' : 'text-white/45')}
                        >
                          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs', cur ? 'bg-green-700 text-white' : done ? 'bg-butter-300 text-green-950' : 'ring-1 ring-inset ring-white/25')}>
                            {done ? <Check className="h-3.5 w-3.5" /> : n}
                          </span>
                          {s}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <div className="relative mx-auto mt-8 w-[70%]">
                  <LeafPair className="-left-8 -top-6 h-24 w-24" />
                  <Photo photo={STEP_PHOTO[d.step] ?? 'portrait-indian'} alt="" shape="arch" position="50% 25%" className="relative aspect-[4/5] w-full ring-4 ring-white/10" />
                </div>
                <p className="mt-6 flex gap-2 text-xs leading-relaxed text-white/70">
                  <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-butter-300" /> Consent comes first — no cycle details are asked for until you’ve agreed.
                </p>
              </div>
            </aside>

            <div className="min-w-0">
              <ol className="mb-5 flex gap-1.5 lg:hidden" aria-label="Onboarding progress">
                {CORE_STEPS.map((s, i) => (
                  <li key={s} className="min-w-0 flex-1" aria-current={i + 1 === d.step ? 'step' : undefined}>
                    <div className={cn('h-1.5 rounded-full transition', i + 1 <= d.step ? 'bg-green-600' : 'bg-green-100')} />
                    <p className={cn('mt-1.5 truncate text-[11px] font-semibold', i + 1 === d.step ? 'text-green-800' : 'text-ink-400')}>{s}</p>
                  </li>
                ))}
              </ol>

              <div key={d.step} className="animate-fade-up rounded-[30px] bg-white p-5 shadow-card ring-1 ring-ink-100 sm:p-8">
                {d.step === 1 && (
                  <div>
                    <StepTitle eyebrow="Your goals" icon={<HeartHandshake className="h-6 w-6" />} title="What are your goals?" body="Select all that apply — we’ll personalise your plan. You can change this anytime." />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {GOALS.map((g) => {
                        const on = d.goals.includes(g.key);
                        return (
                          <button
                            key={g.key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set('goals', on ? d.goals.filter((x) => x !== g.key) : [...d.goals, g.key])}
                            className={cn(
                              'relative flex min-h-[84px] items-start gap-3 rounded-3xl p-4 text-left ring-1 ring-inset transition',
                              on ? 'bg-green-800 text-white shadow-card ring-green-800' : 'bg-white ring-ink-200 hover:bg-green-50/50 hover:ring-green-300',
                            )}
                          >
                            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', on ? 'bg-white/15 text-white' : 'bg-green-50 text-green-700')}>
                              <Icon name={g.icon} className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1 pr-6">
                              <span className={cn('flex flex-wrap items-center gap-1.5 font-display text-[16px] font-semibold', on ? 'text-white' : 'text-ink-900')}>
                                {g.label}
                                {g.phase > 1 && <PhaseBadge phase={g.phase as 2 | 3} />}
                              </span>
                              <span className={cn('mt-0.5 block text-sm', on ? 'text-white/80' : 'text-ink-500')}>{g.description}</span>
                            </span>
                            <span className={cn('absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full', on ? 'bg-butter-300 text-green-950' : 'ring-2 ring-inset ring-ink-200')}>{on && <Check className="h-3.5 w-3.5" />}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.goals && (
                      <p role="alert" className="mt-4 rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger">
                        {errors.goals}
                      </p>
                    )}
                    <p className="mt-4 text-sm text-ink-500">Goals marked Phase 2/3 unlock education content now; their full tracking modules arrive in later releases.</p>
                  </div>
                )}

                {d.step === 2 && (
                  <div>
                    <StepTitle eyebrow="About you" icon={<Sparkles className="h-6 w-6" />} title="About you" body="Only your name and date of birth are needed. Everything under “Optional” can be skipped." />
                    <div className="bg-wash flex flex-col items-center gap-4 rounded-3xl p-5 sm:flex-row sm:p-6">
                      <div className="relative shrink-0">
                        <Avatar name={d.name || 'You'} photoKey={d.avatar ?? undefined} size={84} />
                        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-green-700 text-white">
                          <Camera className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="font-display text-[17px] font-semibold text-ink-900">Choose an avatar</p>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start" role="radiogroup" aria-label="Choose an avatar">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={d.avatar === null}
                            onClick={() => set('avatar', null)}
                            className={cn('rounded-full ring-offset-2 transition', d.avatar === null ? 'ring-2 ring-green-600' : 'opacity-70 hover:opacity-100')}
                            aria-label="Use my initial"
                          >
                            <Avatar name={d.name || 'You'} size={40} />
                          </button>
                          {AVATARS.map((a) => (
                            <button
                              key={a}
                              type="button"
                              role="radio"
                              aria-checked={d.avatar === a}
                              onClick={() => set('avatar', a)}
                              className={cn('rounded-full ring-offset-2 transition', d.avatar === a ? 'ring-2 ring-green-600' : 'opacity-70 hover:opacity-100')}
                              aria-label={`Avatar ${a.slice(-1)}`}
                            >
                              <Avatar name="" photoKey={a} size={40} />
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-ink-500">Photo upload needs the backend — pick an avatar for now.</p>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <Field label="Name" htmlFor="ob-name" error={errors.name} required className="sm:col-span-2">
                        <Input id="ob-name" value={d.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} autoComplete="name" />
                      </Field>
                      <Field label="Date of birth" htmlFor="ob-dob" error={errors.dob} required hint="Age requirements depend on your country." className="sm:col-span-2">
                        <Input id="ob-dob" type="date" max={today} value={d.dob} onChange={(e) => set('dob', e.target.value)} invalid={!!errors.dob} />
                      </Field>
                      <Field label="Country" htmlFor="ob-country">
                        <Select id="ob-country" value={d.country} onChange={(e) => set('country', e.target.value)}>
                          {COUNTRIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Language" htmlFor="ob-lang">
                        <Select id="ob-lang" value={d.language} onChange={(e) => set('language', e.target.value)}>
                          {LANGUAGES.map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Timezone" htmlFor="ob-tz" hint="Detected automatically — change it if it’s wrong." className="sm:col-span-2">
                        <Select id="ob-tz" value={d.timezone} onChange={(e) => set('timezone', e.target.value)}>
                          {timezones.map((t) => (
                            <option key={t} value={t}>
                              {t}
                              {t === detectTimezone() ? ' (auto)' : ''}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <div className="mt-6 rounded-3xl bg-ink-50 p-5">
                      <p className="mb-4 flex items-center gap-2 font-display text-[16px] font-semibold text-ink-900">
                        Optional <Badge tone="gray">Skip anytime</Badge>
                      </p>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Height (cm)" htmlFor="ob-h" error={errors.heightCm}>
                          <Input id="ob-h" type="number" inputMode="numeric" value={d.heightCm} onChange={(e) => set('heightCm', e.target.value)} invalid={!!errors.heightCm} />
                        </Field>
                        <Field label="Weight (kg)" htmlFor="ob-w" error={errors.weightKg}>
                          <Input id="ob-w" type="number" inputMode="decimal" value={d.weightKg} onChange={(e) => set('weightKg', e.target.value)} invalid={!!errors.weightKg} />
                        </Field>
                      </div>
                      <p className="label mt-5">Activity level</p>
                      <Segmented className="w-full bg-white [&>button]:flex-1" value={d.activity} onChange={(v) => set('activity', v)} options={ACTIVITY} />
                    </div>
                  </div>
                )}

                {d.step === 3 && (
                  <div>
                    <StepTitle eyebrow="Privacy" icon={<ShieldCheck className="h-6 w-6" />} title="Your privacy, your choice" body="You can change optional choices anytime in Profile → Privacy & Data." />
                    <div className="rounded-3xl bg-green-50 p-5 ring-1 ring-inset ring-green-100 sm:p-6">
                      <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-green-950">
                        <Lock className="h-4 w-4" /> Required
                      </p>
                      <div className="mt-4 space-y-4">
                        <div className="rounded-2xl bg-white p-4 ring-1 ring-green-100">
                          <Checkbox
                            checked={d.terms}
                            onChange={(v) => set('terms', v)}
                            label={
                              <>
                                I agree to the{' '}
                                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 underline">
                                  Terms
                                </a>{' '}
                                and{' '}
                                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 underline">
                                  Privacy Policy
                                </a>
                                , and I understand HealthX does not provide medical diagnosis.
                              </>
                            }
                          />
                          {errors.terms && (
                            <p role="alert" className="mt-2 text-sm font-medium text-danger">
                              {errors.terms}
                            </p>
                          )}
                        </div>
                        <div className="px-1">
                          <Switch checked disabled onChange={() => undefined} label={<span className="flex items-center gap-2">Process my health data to run the app <Badge tone="gray">Required</Badge></span>} description="Store the cycle and wellness data you log so the app can work." />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 divide-y divide-ink-100 rounded-3xl ring-1 ring-ink-100">
                      <p className="px-5 pb-1 pt-5 font-display text-[16px] font-semibold text-ink-900">Optional — off until you turn them on</p>
                      {[
                        { id: 'ai_personalization', label: 'AI personalisation', desc: 'Let the AI coach use your logs to personalise suggestions.', phase: 2 as const },
                        { id: 'analytics', label: 'Product analytics', desc: 'Anonymous usage events only — never your health values.' },
                        { id: 'health_integrations', label: 'Apple Health / Health Connect', desc: 'Import steps, sleep and workouts when available.', phase: 2 as const },
                      ].map((c) => (
                        <div key={c.id} className="p-5">
                          <Switch
                            checked={!!d.consents[c.id]}
                            onChange={(v) => set('consents', { ...d.consents, [c.id]: v })}
                            label={
                              <span className="flex flex-wrap items-center gap-2">
                                {c.label}
                                {c.phase && <PhaseBadge phase={c.phase} />}
                              </span>
                            }
                            description={c.desc}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-center text-xs italic text-ink-500">{COPY.employerPrivacy} HealthX is a wellness app, not a medical device.</p>
                  </div>
                )}

                {d.step === 4 && (
                  <div>
                    <StepTitle eyebrow="Your cycle" icon={<Icon name="calendar-heart" className="h-6 w-6" />} title="Tell us about your cycle" body="Every cycle is different — we never assume 28 days. Estimates improve as you log." />
                    {noCycleGoals ? (
                      <Notice tone="green" title="No cycle details needed">
                        Based on your goals, you can skip this step. You can add cycle details later from Settings.
                      </Notice>
                    ) : (
                      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_240px]">
                        <div className="space-y-6">
                          <Field label="When did your last period start?" htmlFor="ob-lp" error={errors.lastPeriod}>
                            <Input id="ob-lp" type="date" max={today} disabled={d.lastPeriodUnknown} value={d.lastPeriod} onChange={(e) => set('lastPeriod', e.target.value)} invalid={!!errors.lastPeriod} />
                            <div className="mt-2">
                              <Checkbox checked={d.lastPeriodUnknown} onChange={(v) => set('lastPeriodUnknown', v)} label="I don’t remember" />
                            </div>
                          </Field>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-3xl bg-rose-50/70 p-4 ring-1 ring-inset ring-rose-100">
                              <p className="label">Typical cycle length</p>
                              <Stepper value={d.cycleLength} onChange={(v) => set('cycleLength', v)} min={15} max={60} suffix="days" />
                              <div className="mt-3">
                                <Checkbox checked={d.cycleUnknown} onChange={(v) => set('cycleUnknown', v)} label="Not sure" />
                              </div>
                            </div>
                            <div className="rounded-3xl bg-rose-50/70 p-4 ring-1 ring-inset ring-rose-100">
                              <p className="label">Typical period length</p>
                              <Stepper value={d.periodLength} onChange={(v) => set('periodLength', v)} min={1} max={12} suffix="days" />
                              <div className="mt-3">
                                <Checkbox checked={d.periodUnknown} onChange={(v) => set('periodUnknown', v)} label="Not sure" />
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="label">Is your cycle regular?</p>
                            <Segmented
                              className="w-full [&>button]:flex-1"
                              value={d.regularity}
                              onChange={(v) => set('regularity', v)}
                              options={[
                                { value: 'regular', label: 'Yes' },
                                { value: 'irregular', label: 'No' },
                                { value: 'not_sure', label: 'Not sure' },
                              ]}
                            />
                          </div>
                        </div>
                        <div className="bg-wash flex flex-col items-center justify-center rounded-3xl p-5 text-center">
                          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">Preview</p>
                          <div className="mt-3 rounded-full bg-white p-1.5 shadow-card">
                            <CycleRing cycleLength={previewLen} periodLength={Math.min(d.periodUnknown ? 5 : d.periodLength, previewLen)} currentDay={previewDay} size={168} stroke={14} showLabels={false}>
                              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-400">Cycle day</p>
                              <p className="num text-[32px] leading-none text-ink-900">{previewDay ? `${previewDay}*` : '—'}</p>
                              <p className="mt-1 text-[11px] font-semibold text-ink-500">{d.cycleUnknown ? 'Typical 28 days' : `${previewLen}-day cycle`}</p>
                            </CycleRing>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-ink-500">An example of your cycle dial. Everything here is an estimate* and updates as you log.</p>
                        </div>
                      </div>
                    )}
                    <Notice tone="safety" className="mt-6">
                      {COPY.estimate} Estimates are labelled with an asterisk (*) throughout the app.
                    </Notice>
                  </div>
                )}

                {d.step === 5 && (
                  <div className="mx-auto max-w-lg text-center">
                    <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
                      <span aria-hidden className="absolute inset-0 animate-breathe rounded-full bg-green-100" />
                      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-700 text-white shadow-glow">
                        <BellRing className="h-9 w-9" />
                      </span>
                    </div>
                    <h1 className="mt-6 font-display text-[30px] font-semibold leading-tight tracking-[-0.015em] text-green-950 sm:text-[34px]">Gentle reminders that help</h1>
                    <p className="mt-2 text-ink-500">You choose which ones — change anytime in Notifications & reminders.</p>
                    <div aria-hidden className="mx-auto mt-6 flex max-w-sm items-start gap-3 rounded-2xl bg-ink-50 p-3 text-left ring-1 ring-ink-100">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white">
                        <BellRing className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2 text-xs font-bold text-ink-800">
                          HealthX <span className="font-medium text-ink-400">Lock-screen preview</span>
                        </span>
                        <span className="block text-sm text-ink-600">Time for your daily check-in</span>
                      </span>
                    </div>
                    <div className="mt-5 space-y-3 rounded-3xl bg-green-50 p-5 text-left ring-1 ring-inset ring-green-100">
                      {REMINDER_CHOICES.map((r) => (
                        <Checkbox
                          key={r.type}
                          checked={d.reminders.includes(r.type)}
                          onChange={(v) => set('reminders', v ? [...d.reminders, r.type] : d.reminders.filter((x) => x !== r.type))}
                          label={r.label}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-ink-400">Reminder text never shows health details on your lock screen.</p>
                    <Button size="lg" className="mt-6 w-full" onClick={() => answerNotifications(true)} disabled={d.reminders.length === 0}>
                      Allow notifications
                    </Button>
                    <button type="button" onClick={() => answerNotifications(false)} className="mt-3 min-h-[44px] rounded-full px-4 text-sm font-bold text-green-700 hover:bg-green-50">
                      Not now
                    </button>
                  </div>
                )}
              </div>

              {d.step < 5 ? (
                navButtons
              ) : (
                <div className="mt-6 flex">
                  <Button variant="ghost" onClick={back} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                    Back
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {d.step === DONE && (
          <div className="mx-auto max-w-4xl animate-fade-up">
            <section className="bg-forest relative isolate overflow-hidden rounded-[34px] px-6 py-10 text-center text-white sm:px-12 sm:py-14">
              <Leaf className="pointer-events-none absolute -left-12 -top-12 -z-10 h-48 w-48 rotate-12 text-green-300/10" color="currentColor" vein={false} />
              <Leaf className="pointer-events-none absolute -bottom-14 -right-10 -z-10 h-56 w-56 -rotate-12 text-butter-300/10" color="currentColor" vein={false} />
              <span className="mx-auto flex h-20 w-20 animate-scale-in items-center justify-center rounded-full bg-butter-300 text-green-950 shadow-lift">
                <Check className="h-10 w-10" />
              </span>
              <p className="mt-5 font-script text-[28px] font-bold leading-none text-butter-300">welcome in ♡</p>
              <h2 className="mt-2 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] sm:text-[44px]">You’re all set, {d.name.split(' ')[0] || 'friend'}!</h2>
              <p className="mx-auto mt-3 max-w-md text-[17px] text-white/75">Your dashboard is ready. Choose how you’d like to begin:</p>
            </section>
            <div className="mt-5 grid gap-4 text-left sm:grid-cols-2">
              <button
                onClick={() => complete(false)}
                disabled={busy}
                className="flex gap-4 rounded-[28px] bg-white p-6 text-left shadow-card ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-green-300 disabled:opacity-60"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                  <Sprout className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-display text-[19px] font-semibold text-ink-900">Start fresh</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-500">Begin with an empty dashboard and log your own data. See the empty states and first-time guidance.</span>
                </span>
              </button>
              <button onClick={() => complete(true)} disabled={busy} className="flex gap-4 rounded-[28px] bg-green-50 p-6 text-left shadow-card ring-2 ring-green-600 transition hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-700 text-white">{busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}</span>
                <span>
                  <span className="flex flex-wrap items-center gap-2 font-display text-[19px] font-semibold text-ink-900">
                    Explore with sample data <Badge tone="green">Recommended for demo</Badge>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-500">Load ~75 days of realistic history to try insights, charts and reports.</span>
                </span>
              </button>
            </div>
            <div className="mt-6 text-center">
              <button type="button" onClick={back} className="min-h-[44px] rounded-full px-4 text-sm font-semibold text-ink-500 hover:bg-white hover:text-green-700">
                ← Back to reminders
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const STEP_PHOTO: Record<number, PhotoKey> = { 1: 'portrait-indian', 2: 'woman-reading', 3: 'cozy-comfort', 4: 'period-comfort', 5: 'herbal-tea' };

function StepTitle({ icon, title, body, eyebrow }: { icon: ReactNode; title: string; body: string; eyebrow: string }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-inset ring-green-100">{icon}</span>
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-green-950 sm:text-[32px]">{title}</h1>
        <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-ink-500">{body}</p>
      </div>
    </div>
  );
}
