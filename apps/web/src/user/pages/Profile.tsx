import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Award, Bell, Camera, Check, CreditCard, Crown, HeartPulse, Languages, LifeBuoy, MapPin, Pencil, Save, ShieldCheck, Sprout, Target, UserRound, Users } from 'lucide-react';
import { COUNTRIES, diffDays, GOALS, LANGUAGES, TIMEZONES, type ActivityLevel, type GoalKey, type PhotoKey, type Regularity } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { Avatar, LeafPair } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { Badge, Button, Card, CardHeader, EstimateMarker, Field, Input, PageHeader, PhaseBadge, Select, Stepper, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { AccountSecurity } from '@/user/components/AccountSecurity';
import { ListGroup, ListRow } from '@/user/components/learn-ui/ListGroup';
import { MODE_LABEL } from '@/user/components/learn-ui/tones';
import { cn, initials } from '@/lib/utils';

const GOAL_TONE = ['bg-rose-50 text-rose-700', 'bg-green-50 text-green-800', 'bg-lavender-50 text-lavender-700', 'bg-sky-50 text-sky-700', 'bg-peach-50 text-peach-700', 'bg-butter-100 text-green-900', 'bg-indigo-50 text-indigo-700'];

export default function Profile() {
  const { profile, cycleProfile, today, auth } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const goalsRef = useRef<HTMLDivElement>(null);
  const [f, setF] = useState({
    name: profile.name,
    dob: profile.dob,
    country: profile.country,
    timezone: profile.timezone,
    language: profile.language,
    heightCm: profile.heightCm ? String(profile.heightCm) : '',
    weightKg: profile.weightKg ? String(profile.weightKg) : '',
    activityLevel: profile.activityLevel ?? ('moderate' as ActivityLevel),
  });
  const [goals, setGoals] = useState<GoalKey[]>(profile.goals);
  const [cyc, setCyc] = useState({ cycle: cycleProfile.typicalCycleLength ?? 28, period: cycleProfile.typicalPeriodLength ?? 5, regularity: cycleProfile.regularity });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const age = profile.dob ? Math.floor(diffDays(profile.dob, today) / 365.25) : null;
  const focus = GOALS.filter((g) => profile.goals.includes(g.key));

  const saveProfile = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2 || f.name.length > 60) e.name = 'Enter a name between 2 and 60 characters.';
    if (!f.dob || f.dob > today) e.dob = 'Enter a valid date of birth.';
    else {
      const a = Math.floor(diffDays(f.dob, today) / 365.25);
      if (a < 13 || a > 100) e.dob = 'Please check your date of birth.';
    }
    if (f.heightCm && (+f.heightCm < 100 || +f.heightCm > 230)) e.heightCm = 'Between 100 and 230 cm.';
    if (f.weightKg && (+f.weightKg < 30 || +f.weightKg > 250)) e.weightKg = 'Between 30 and 250 kg.';
    setErrors(e);
    if (Object.keys(e).length) return toast.error('Please fix the highlighted fields');
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: { name: f.name.trim(), dob: f.dob, country: f.country, timezone: f.timezone, language: f.language, heightCm: f.heightCm ? +f.heightCm : undefined, weightKg: f.weightKg ? +f.weightKg : undefined, activityLevel: f.activityLevel },
    });
    if (f.timezone !== profile.timezone) toast.info('Timezone changed', 'Cycle days and reminder times are recalculated in your new timezone.');
    toast.success('Profile saved');
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files?.[0];
    e.target.value = '';
    if (!fl) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(fl.type)) return toast.error('Unsupported file', 'Use a JPG, PNG or WebP image.');
    if (fl.size > 2 * 1024 * 1024) return toast.error('File too large', 'Images must be under 2 MB.');
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(fl);
    toast.info('Preview only', 'Uploading photos requires the backend (secure storage, EXIF stripping).');
  };

  return (
    <div>
      <PageHeader eyebrow="Profile & settings" title="My profile" subtitle="Your details help personalise HealthX. Optional fields stay optional." breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Profile & Settings', to: '/app/profile' }, { label: 'My profile' }]} />

      {/* ---------- Header: arch portrait, name, plan, life-stage mode, goals ---------- */}
      <section className="bg-wash relative mb-8 overflow-hidden rounded-[34px] p-6 ring-1 ring-inset ring-green-100 sm:p-8 lg:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-10">
          <div className="mx-auto w-fit">
            <div className="relative h-56 w-44 sm:h-60 sm:w-48">
              <LeafPair className="-left-10 -top-6 h-36 w-36" />
              {preview || profile.avatar ? (
                <Photo key={preview ?? profile.avatar} src={preview ?? undefined} photo={preview ? undefined : profile.avatar} alt={preview ? 'New profile preview' : `${profile.name || 'Your'} profile photo`} shape="arch" position="50% 30%" className="relative h-full w-full shadow-lift ring-[6px] ring-white" />
              ) : (
                <span className="arch relative flex h-full w-full items-center justify-center bg-gradient-to-b from-green-100 to-green-200 font-display text-5xl font-semibold text-green-800 shadow-lift ring-[6px] ring-white">{initials(profile.name)}</span>
              )}
              <button aria-label="Change photo" onClick={() => file.current?.click()} className="absolute -right-1 bottom-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-700 text-white shadow-lift ring-4 ring-white transition hover:bg-green-800">
                <Camera className="h-5 w-5" />
              </button>
              <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
            </div>
            <p className="mb-2 mt-5 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">Or choose an avatar</p>
            <div className="flex justify-center gap-2">
              {(['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'] as PhotoKey[]).map((a) => (
                <button
                  key={a}
                  aria-label={`Use ${a}`}
                  aria-pressed={profile.avatar === a && !preview}
                  onClick={() => {
                    dispatch({ type: 'UPDATE_PROFILE', patch: { avatar: a } });
                    setPreview(null);
                  }}
                  className={cn('rounded-full ring-2 ring-offset-2 transition', profile.avatar === a && !preview ? 'ring-green-600' : 'ring-transparent hover:ring-green-200')}
                >
                  <Avatar name="" photoKey={a} size={44} />
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 text-center md:text-left">
            <p className="eyebrow">Member since {new Date(profile.memberSince).getFullYear()}</p>
            <h2 className="mt-1.5 font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[40px]">{profile.name || 'Your profile'}</h2>
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[15px] text-ink-500 md:justify-start">
              {age ? (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-4 w-4 text-green-600" /> {age} years
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-green-600" /> {profile.country}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-4 w-4 text-green-600" /> {profile.language.split(' ')[0]}
              </span>
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              <Badge tone={profile.plan === 'premium' ? 'butter' : 'green'} className="px-3 py-1 text-[13px] capitalize" icon={profile.plan === 'premium' ? <Crown className="h-3.5 w-3.5" /> : undefined}>
                {profile.plan}
              </Badge>
              <Link to="/app/life-stages" className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1 text-[13px] font-semibold text-lavender-700 transition hover:bg-lavender-200">
                <Sprout className="h-3.5 w-3.5" /> {MODE_LABEL[profile.mode]} · Change
              </Link>
            </div>

            <div className="mt-6 rounded-3xl bg-white/80 p-4 text-left ring-1 ring-inset ring-white">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">Focus areas</p>
                <button type="button" onClick={() => goalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-green-700 hover:bg-green-50">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
              {focus.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {focus.map((g, i) => (
                    <span key={g.key} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold', GOAL_TONE[i % GOAL_TONE.length])}>
                      <Icon name={g.icon} className="h-4 w-4" /> {g.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-500">No goals chosen yet — pick a few below to personalise your dashboard.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <ListGroup title="Account" eyebrow="Shortcuts">
            {[
              { to: '/app/notifications', icon: Bell, label: 'Notifications & reminders', tone: 'peach' as const },
              { to: '/app/privacy', icon: ShieldCheck, label: 'Privacy & data', tone: 'green' as const },
              { to: '/app/integrations', icon: HeartPulse, label: 'Health integrations', phase: 2 as const, tone: 'rose' as const },
              { to: '/app/achievements', icon: Award, label: 'Achievements', phase: 2 as const, tone: 'butter' as const },
              { to: '/app/community', icon: Users, label: 'Community', phase: 4 as const, tone: 'lavender' as const },
              { to: '/app/subscription', icon: CreditCard, label: 'Subscription', meta: profile.plan === 'premium' ? 'Premium' : 'Free', tone: 'indigo' as const },
              { to: '/app/settings', icon: Languages, label: 'Language & preferences', meta: profile.language.split(' ')[0], tone: 'sky' as const },
              { to: '/faq', icon: LifeBuoy, label: 'Help & support', tone: 'green' as const },
            ].map((r) => (
              <ListRow
                key={r.to}
                to={r.to}
                tone={r.tone}
                icon={<r.icon />}
                label={r.label}
                hint={r.phase ? <PhaseBadge phase={r.phase} className="mt-0.5" /> : undefined}
                right={r.meta ? <span className="text-xs font-semibold text-ink-500">{r.meta}</span> : undefined}
              />
            ))}
          </ListGroup>
          <AccountSecurity email={auth.email ?? profile.email} />
        </div>

        <div className="space-y-6 xl:col-span-8">
          <Card className="card-pad">
            <CardHeader title="Personal details" subtitle="Used to personalise your plan and reminders" icon={<UserRound className="h-5 w-5" />} action={<Button size="sm" leftIcon={<Save className="h-4 w-4" />} onClick={saveProfile}>Save</Button>} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="pf-name" error={errors.name} required>
                <Input id="pf-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} />
              </Field>
              <Field label="Date of birth" htmlFor="pf-dob" error={errors.dob} required>
                <Input id="pf-dob" type="date" max={today} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} invalid={!!errors.dob} />
              </Field>
              <Field label="Country" htmlFor="pf-country">
                <Select id="pf-country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Timezone" htmlFor="pf-tz" hint="Used for cycle days and reminder times">
                <Select id="pf-tz" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
                  {TIMEZONES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Preferred language" htmlFor="pf-lang" hint="UI translations arrive with localisation (D-15)">
                <Select id="pf-lang" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>
                  {LANGUAGES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Activity level" htmlFor="pf-act" hint="Optional">
                <Select id="pf-act" value={f.activityLevel} onChange={(e) => setF({ ...f, activityLevel: e.target.value as ActivityLevel })}>
                  <option value="sedentary">Mostly sitting</option>
                  <option value="light">Lightly active</option>
                  <option value="moderate">Moderately active</option>
                  <option value="active">Very active</option>
                </Select>
              </Field>
              <Field label={`Height (${profile.units === 'metric' ? 'cm' : 'cm — imperial display coming'})`} htmlFor="pf-h" error={errors.heightCm} hint="Optional">
                <Input id="pf-h" type="number" value={f.heightCm} onChange={(e) => setF({ ...f, heightCm: e.target.value })} invalid={!!errors.heightCm} />
              </Field>
              <Field label="Weight (kg)" htmlFor="pf-w" error={errors.weightKg} hint="Optional">
                <Input id="pf-w" type="number" value={f.weightKg} onChange={(e) => setF({ ...f, weightKg: e.target.value })} invalid={!!errors.weightKg} />
              </Field>
            </div>
          </Card>

          <div ref={goalsRef} className="scroll-mt-24">
            <Card className="card-pad">
              <CardHeader
                title="My goals"
                subtitle="These personalise your dashboard and content"
                icon={<Target className="h-5 w-5" />}
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!goals.length) return toast.error('Choose at least one goal');
                      dispatch({ type: 'UPDATE_PROFILE', patch: { goals } });
                      toast.success('Goals updated');
                    }}
                  >
                    Save goals
                  </Button>
                }
              />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {GOALS.map((g) => {
                  const on = goals.includes(g.key);
                  return (
                    <button
                      key={g.key}
                      aria-pressed={on}
                      onClick={() => setGoals(on ? goals.filter((x) => x !== g.key) : [...goals, g.key])}
                      className={cn('flex min-h-[64px] items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset transition', on ? 'bg-green-50 ring-2 ring-green-600' : 'bg-white ring-ink-100 hover:ring-green-300')}
                    >
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', on ? 'bg-green-700 text-white' : 'bg-ink-50 text-ink-500')}>
                        <Icon name={g.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-ink-900">{g.label}</span>
                          {g.phase > 1 && <PhaseBadge phase={g.phase as 2 | 3} />}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-ink-500">{g.description}</span>
                      </span>
                      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition', on ? 'border-green-700 bg-green-700 text-white' : 'border-ink-200')}>{on && <Check className="h-3.5 w-3.5" />}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card className="card-pad">
            <CardHeader
              title="Cycle settings"
              subtitle="Used only until you’ve logged enough cycles — then your history takes over"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    dispatch({ type: 'UPDATE_CYCLE_PROFILE', patch: { typicalCycleLength: cyc.cycle, typicalPeriodLength: cyc.period, regularity: cyc.regularity } });
                    toast.success('Cycle settings saved', 'Estimates updated.');
                  }}
                >
                  Save
                </Button>
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-inset ring-rose-100">
                <p className="label">Typical cycle length</p>
                <Stepper value={cyc.cycle} onChange={(v) => setCyc({ ...cyc, cycle: v })} min={15} max={60} suffix="days" />
              </div>
              <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-inset ring-rose-100">
                <p className="label">Typical period length</p>
                <Stepper value={cyc.period} onChange={(v) => setCyc({ ...cyc, period: v })} min={1} max={12} suffix="days" />
              </div>
              <div className="rounded-2xl bg-lavender-50 p-4 ring-1 ring-inset ring-lavender-100">
                <Field label="Regularity" htmlFor="pf-reg">
                  <Select id="pf-reg" value={cyc.regularity} onChange={(e) => setCyc({ ...cyc, regularity: e.target.value as Regularity })}>
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                    <option value="not_sure">Not sure</option>
                  </Select>
                </Field>
              </div>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <EstimateMarker /> Cycle predictions are estimates based on what you enter and log.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
