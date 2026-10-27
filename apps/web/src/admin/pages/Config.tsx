import { useMemo, useState, type ReactNode } from 'react';
import { Bell, CalendarHeart, Droplets, Gauge, Lightbulb, Lock, Moon, Plus, RotateCcw, SlidersHorizontal, Stethoscope, Target, type LucideIcon } from 'lucide-react';
import {
  COPY,
  createInitialState,
  CYCLE_RULES,
  DEFAULT_WEIGHTS,
  NOTIFICATION_TYPES,
  SYMPTOM_CATEGORIES,
  SYMPTOMS,
  wellnessScore,
  type SymptomCategory,
  type WellnessWeights,
} from '@healthx/shared';
import { Badge, Button, Card, CardHeader, Field, Input, Notice, PhaseBadge, ProgressRing, Select, Switch, useToast, type Tone } from '@/components/ui';
import { cv } from '@/theme/engine';
import { cn } from '@/lib/utils';
import { useAdmin } from '../adminState';
import { AdminHeader, StatusPill } from '../components';

type Tab = 'score' | 'defaults' | 'cycle' | 'rules' | 'symptoms' | 'notifications';

const WEIGHT_KEYS: (keyof WellnessWeights)[] = ['activity', 'sleep', 'hydration', 'nutrition', 'habits', 'mood'];
const WEIGHT_LABEL: Record<keyof WellnessWeights, string> = { activity: 'Activity', sleep: 'Sleep', hydration: 'Hydration', nutrition: 'Nutrition', habits: 'Habits', mood: 'Mood' };
const WEIGHT_COLOR: Record<keyof WellnessWeights, string> = {
  activity: 'bg-green-500',
  sleep: 'bg-indigo-400',
  hydration: 'bg-sky-400',
  nutrition: 'bg-butter-400',
  habits: 'bg-peach-400',
  mood: 'bg-lavender-400',
};

const DISC: Record<Tone, string> = {
  green: 'bg-green-100 text-green-700',
  rose: 'bg-rose-100 text-rose-600',
  lavender: 'bg-lavender-100 text-lavender-600',
  peach: 'bg-peach-100 text-peach-600',
  sky: 'bg-sky-100 text-sky-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  butter: 'bg-butter-100 text-butter-600',
};

function IconDisc({ icon: Icon, tone, className }: { icon: LucideIcon; tone: Tone; className?: string }) {
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', DISC[tone], className)}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function PanelHead({ icon, tone, title, subtitle, action }: { icon: LucideIcon; tone: Tone; title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <IconDisc icon={icon} tone={tone} className="h-11 w-11" />
        <div className="min-w-0">
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function ScoreWeights() {
  const { state, dispatch, audit } = useAdmin();
  const toast = useToast();
  const saved = state.scoreWeights;
  // An app user's own data must never feed an admin screen, so the preview uses the synthetic demo profile.
  const sample = useMemo(() => createInitialState(), []);
  const appState = useMemo(() => ({ ...sample, weights: saved }), [sample, saved]);
  const [draft, setDraft] = useState<WellnessWeights>(saved);
  const total = WEIGHT_KEYS.reduce((a, k) => a + (Number.isFinite(draft[k]) ? draft[k] : 0), 0);
  const invalidKey = WEIGHT_KEYS.find((k) => !Number.isInteger(draft[k]) || draft[k] < 0 || draft[k] > 100);
  const error = invalidKey ? `${WEIGHT_LABEL[invalidKey]} must be a whole number from 0 to 100.` : total !== 100 ? `Weights must total 100% — currently ${total}%.` : null;
  const changed = WEIGHT_KEYS.some((k) => draft[k] !== appState.weights[k]);
  const current = wellnessScore(appState);
  const preview = useMemo(() => (error ? null : wellnessScore(appState, appState.today, draft)), [appState, draft, error]);

  const save = () => {
    if (error) return;
    const diff = WEIGHT_KEYS.filter((k) => draft[k] !== appState.weights[k])
      .map((k) => `${WEIGHT_LABEL[k]} ${appState.weights[k]}→${draft[k]}`)
      .join(', ');
    void dispatch({ type: 'SET_SCORE_WEIGHTS', weights: draft }).then((ok) => ok && toast.success('Weights saved', 'The Wellness Score in the mobile app uses these weights from its next sync.'));
    audit('config.score_weights', 'Wellness Score weights', diff);
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="card-pad">
        <PanelHead icon={SlidersHorizontal} tone="green" title="Wellness Score weights" subtitle="SRS §31 — weighting must be configurable" />
        <div className="mb-6 flex h-3.5 overflow-hidden rounded-full bg-ink-100" aria-hidden>
          {WEIGHT_KEYS.map((k) => (
            <span key={k} className={cn('h-full transition-all', WEIGHT_COLOR[k])} style={{ width: `${Math.min(100, (draft[k] / Math.max(total, 100)) * 100)}%` }} />
          ))}
        </div>
        <div className="space-y-3">
          {WEIGHT_KEYS.map((k) => (
            <div key={k} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-4 gap-y-2 rounded-2xl bg-ink-50/60 px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)_96px]">
              <label htmlFor={`w-${k}`} className="flex items-center gap-2.5 text-sm font-semibold text-ink-800">
                <span className={cn('h-3 w-3 rounded-full', WEIGHT_COLOR[k])} />
                {WEIGHT_LABEL[k]}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={draft[k]}
                aria-label={`${WEIGHT_LABEL[k]} weight slider`}
                onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
                className="order-3 col-span-2 w-full accent-green-600 sm:order-none sm:col-span-1"
              />
              <div className="relative">
                <Input
                  id={`w-${k}`}
                  type="number"
                  min={0}
                  max={100}
                  value={Number.isFinite(draft[k]) ? draft[k] : ''}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value === '' ? NaN : Number(e.target.value) })}
                  className="h-11 pr-8 text-right font-semibold tabular-nums"
                  invalid={invalidKey === k}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className={cn('mt-5 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold', error ? 'bg-danger-soft text-danger' : 'bg-green-50 text-green-800')} role={error ? 'alert' : undefined}>
          <span>{error ?? 'Weights total 100% ✓'}</span>
          <span className="num text-base">{total}%</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={save} disabled={!!error || !changed}>
            Save weights
          </Button>
          <Button variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setDraft(DEFAULT_WEIGHTS)}>
            Reset to defaults
          </Button>
          {changed && !error && (
            <Button variant="ghost" onClick={() => setDraft(appState.weights)}>
              Discard changes
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-1 2xl:content-start">
        <Card className="card-pad text-center">
          <CardHeader title="Live preview" subtitle="Demo user, today" icon={<Gauge className="h-5 w-5" />} className="text-left" />
          <div className="flex items-center justify-around gap-2">
            <div>
              <ProgressRing value={(current.score ?? 0) / 100} size={104} stroke={10} color={cv('ink', 300)} track={cv('ink', 100)}>
                <span className="num text-2xl text-ink-700">{current.score ?? '—'}</span>
              </ProgressRing>
              <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">Current</p>
            </div>
            <div>
              <ProgressRing value={(preview?.score ?? 0) / 100} size={104} stroke={10}>
                <span className="num text-2xl text-green-800">{preview?.score ?? '—'}</span>
              </ProgressRing>
              <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">With these weights</p>
            </div>
          </div>
          {preview && preview.missing.length > 0 && (
            <p className="mt-4 text-xs leading-relaxed text-ink-500">
              Missing today: {preview.missing.map((m) => WEIGHT_LABEL[m]).join(', ')} — excluded and remaining weights re-normalised (D-06).
            </p>
          )}
        </Card>
        <Notice tone="safety" className="h-fit">
          {COPY.wellnessScore}
        </Notice>
      </div>
    </div>
  );
}

function Defaults() {
  const { state, dispatch, audit } = useAdmin();
  const toast = useToast();
  const [water, setWater] = useState(String(state.defaults.waterMl));
  const [sleep, setSleep] = useState(String(state.defaults.sleepHours));
  const [errors, setErrors] = useState<{ water?: string; sleep?: string }>({});
  const save = () => {
    const w = Number(water);
    const s = Number(sleep);
    const e: typeof errors = {};
    if (!Number.isFinite(w) || w < 1000 || w > 5000 || w % 50 !== 0) e.water = 'Use 1,000–5,000 ml in steps of 50.';
    if (!Number.isFinite(s) || s < 5 || s > 11 || (s * 2) % 1 !== 0) e.sleep = 'Use 5–11 hours in half-hour steps.';
    setErrors(e);
    if (Object.keys(e).length) return;
    void dispatch({ type: 'SET_DEFAULTS', defaults: { waterMl: w, sleepHours: s } }).then((ok) => ok && toast.success('Defaults saved', 'Applies to new users; existing users keep their own targets.'));
    audit('config.update', 'Default targets', `water ${w} ml, sleep ${s} h`);
  };
  return (
    <Card className="card-pad">
      <PanelHead icon={Target} tone="sky" title="Default daily targets" subtitle="Starting values users can edit (decision D-24)" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-sky-100/70 p-5 ring-1 ring-inset ring-sky-100">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-sky-600 shadow-soft">
            <Droplets className="h-5 w-5" />
          </span>
          <Field label="Hydration target (ml)" htmlFor="def-water" error={errors.water} hint="SRS §29 example: 2.4 L">
            <Input id="def-water" type="number" step={50} value={water} onChange={(e) => setWater(e.target.value)} invalid={!!errors.water} />
          </Field>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/70 p-5 ring-1 ring-inset ring-indigo-100">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-indigo-600 shadow-soft">
            <Moon className="h-5 w-5" />
          </span>
          <Field label="Sleep target (hours)" htmlFor="def-sleep" error={errors.sleep} hint="Used by the §37 sleep rule">
            <Input id="def-sleep" type="number" step={0.5} value={sleep} onChange={(e) => setSleep(e.target.value)} invalid={!!errors.sleep} />
          </Field>
        </div>
      </div>
      <Notice tone="info" className="mt-5">
        Defaults are general wellness starting points, not medical recommendations.
      </Notice>
      <Button className="mt-5" onClick={save}>
        Save defaults
      </Button>
    </Card>
  );
}

function CycleEngine() {
  const rows: [string, string][] = [
    ['Averaging window', `${CYCLE_RULES.averagingWindow} most recent completed cycles`],
    ['Plausible cycle length', `${CYCLE_RULES.plausibleCycle.min}–${CYCLE_RULES.plausibleCycle.max} days`],
    ['Plausible period length', `${CYCLE_RULES.plausiblePeriod.min}–${CYCLE_RULES.plausiblePeriod.max} days`],
    ['Irregular-variation threshold', `spread > ${CYCLE_RULES.irregularSpread} days`],
    ['Ovulation estimate', `${CYCLE_RULES.lutealEstimate} days before next estimated period (calendar estimate only)`],
  ];
  return (
    <Card className="card-pad">
      <PanelHead
        icon={CalendarHeart}
        tone="rose"
        title="Cycle Engine thresholds"
        subtitle="Read-only — values are demo placeholders"
        action={
          <Badge tone="warning" icon={<Lock className="h-3 w-3" />}>
            D-09 pending
          </Badge>
        }
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([k, v], i) => (
          <div key={k} className={cn('rounded-2xl border border-ink-100 bg-ink-50/50 px-4 py-3.5', i === rows.length - 1 && 'sm:col-span-2')}>
            <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">{k}</dt>
            <dd className="mt-1 text-[15px] font-semibold text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
      <Notice tone="safety" className="mt-5">
        The prediction algorithm, plausible ranges and irregularity threshold need product and Medical Content Reviewer sign-off (D-09) before they become editable. The engine never assumes a fixed 28-day cycle (§10).
      </Notice>
    </Card>
  );
}

function Rules() {
  const { state, dispatch, audit } = useAdmin();
  const on = state.rules.filter((r) => r.enabled).length;
  return (
    <Card className="card-pad">
      <PanelHead icon={Lightbulb} tone="butter" title="Insight rules" subtitle="Deterministic rules engine — AI never performs these calculations (§37)" action={<Badge tone="mint">{`${on} of ${state.rules.length} on`}</Badge>} />
      <ul className="space-y-3">
        {state.rules.map((r) => (
          <li key={r.id} className={cn('flex flex-col gap-3 rounded-2xl border px-4 py-3.5 transition sm:flex-row sm:items-center sm:justify-between', r.enabled ? 'border-green-100 bg-green-50/50' : 'border-ink-100 bg-white')}>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                {r.name} {r.phase === 2 && <PhaseBadge phase={2} />}
                <StatusPill tone={r.enabled ? 'green' : 'gray'}>{r.enabled ? 'On' : 'Off'}</StatusPill>
              </p>
              <p className="mt-0.5 font-mono text-xs text-ink-400">{r.id}</p>
              <p className="mt-1 text-sm text-ink-600">{r.condition}</p>
            </div>
            <Switch
              checked={r.enabled}
              onChange={() => {
                dispatch({ type: 'TOGGLE_RULE', id: r.id });
                audit('config.rule_toggle', r.id, r.enabled ? 'disabled' : 'enabled');
              }}
              label={<span className="sr-only">{r.name}</span>}
            />
          </li>
        ))}
      </ul>
      <Notice tone="info" className="mt-5">
        Insight copy is worded as observed patterns and reviewed by the Medical Content Reviewer (D-40). Toggles here affect the demo admin only.
      </Notice>
    </Card>
  );
}

function Symptoms() {
  const { state, dispatch, audit } = useAdmin();
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<SymptomCategory>('physical');
  const [err, setErr] = useState<string | null>(null);
  const all = [...SYMPTOMS.map((s) => ({ id: s.id, label: s.label, category: s.category, custom: false })), ...state.customSymptoms.map((s) => ({ ...s, custom: true }))];

  const add = () => {
    const l = label.trim();
    if (l.length < 2 || l.length > 40) return setErr('Use 2–40 characters.');
    if (!/^[\p{L}\p{N} '()-]+$/u.test(l)) return setErr('Use letters, numbers, spaces, hyphens or brackets only.');
    if (all.some((s) => s.label.toLowerCase() === l.toLowerCase())) return setErr('That symptom is already in the catalogue.');
    setErr(null);
    void dispatch({ type: 'ADD_SYMPTOM', label: l, category }).then((ok) => {
      if (!ok) return;
      toast.success('Symptom added', 'New catalogue items reach the apps without a release (§14).');
      setLabel('');
    });
    audit('config.symptom_add', l, `Category: ${category}`);
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="card-pad">
        <PanelHead icon={Stethoscope} tone="lavender" title="Symptom catalogue" subtitle={`${all.length} symptoms · flexible framework (§14)`} />
        <div className="space-y-5">
          {SYMPTOM_CATEGORIES.map((c) => {
            const items = all.filter((s) => s.category === c.key);
            if (!items.length) return null;
            return (
              <div key={c.key}>
                <p className="mb-2 flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500">
                  {c.label} <span className="rounded-full bg-ink-100 px-1.5 text-ink-500">{items.length}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((s) => (
                    <span key={s.id} className={cn('chip', s.custom ? 'border-lavender-200 bg-lavender-50 text-lavender-700' : 'border-ink-200 bg-white text-ink-700')}>
                      {s.label}
                      {s.custom && <span className="rounded-full bg-lavender-100 px-1.5 font-mono text-[10px] font-medium uppercase">new</span>}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="card-pad h-fit">
        <PanelHead icon={Plus} tone="green" title="Add to catalogue" />
        <div className="space-y-4">
          <Field label="Symptom name" required htmlFor="sym-label" error={err}>
            <Input id="sym-label" value={label} onChange={(e) => setLabel(e.target.value)} invalid={!!err} placeholder="e.g. Joint stiffness" />
          </Field>
          <Field label="Category" htmlFor="sym-cat">
            <Select id="sym-cat" value={category} onChange={(e) => setCategory(e.target.value as SymptomCategory)}>
              {SYMPTOM_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button className="w-full" onClick={add}>
            Add symptom
          </Button>
          <p className="text-xs leading-relaxed text-ink-500">Labels are reviewed for neutral, non-diagnostic wording (D-30 unified catalogue).</p>
        </div>
      </Card>
    </div>
  );
}

function Notifications() {
  return (
    <Card className="card-pad">
      <PanelHead icon={Bell} tone="peach" title="Notification templates" subtitle="SRS §41 copy — read-only in the demo" action={<Badge tone="lavender">Requires medical review (D-40)</Badge>} />
      <ul className="grid gap-3 lg:grid-cols-2">
        {NOTIFICATION_TYPES.map((n) => (
          <li key={n.key} className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
            <span className="text-sm font-semibold text-ink-900">{n.label}</span>
            <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-ink-700 shadow-xs">“{n.example}”</p>
            <p className="mt-2 text-xs text-ink-500">Discreet: “You have a new HealthX reminder.” [ADD A-08]</p>
          </li>
        ))}
      </ul>
      <Notice tone="info" className="mt-5">
        Push payloads never carry health details (§47). Users control every type, time and quiet hours in the app.
      </Notice>
    </Card>
  );
}

export default function Config() {
  const { state } = useAdmin();
  const [tab, setTab] = useState<Tab>('score');
  const symptomCount = SYMPTOMS.length + state.customSymptoms.length;
  const areas: { value: Tab; label: string; hint: string; icon: LucideIcon; tone: Tone }[] = [
    { value: 'score', label: 'Wellness score', hint: 'Engagement-metric weights', icon: SlidersHorizontal, tone: 'green' },
    { value: 'defaults', label: 'Default targets', hint: 'Water & sleep starting values', icon: Target, tone: 'sky' },
    { value: 'cycle', label: 'Cycle engine', hint: 'Read-only thresholds (D-09)', icon: CalendarHeart, tone: 'rose' },
    { value: 'rules', label: 'Insight rules', hint: `${state.rules.filter((r) => r.enabled).length} of ${state.rules.length} enabled`, icon: Lightbulb, tone: 'butter' },
    { value: 'symptoms', label: 'Symptom catalogue', hint: `${symptomCount} symptoms`, icon: Stethoscope, tone: 'lavender' },
    { value: 'notifications', label: 'Notification copy', hint: 'Read-only examples', icon: Bell, tone: 'peach' },
  ];
  return (
    <>
      <AdminHeader title="Configuration" subtitle="Platform settings managed by Admins (§6.4 “Manage configurations”). Every change is audited." />
      <div className="grid gap-6 xl:grid-cols-[264px_minmax(0,1fr)]">
        <div className="min-w-0 xl:sticky xl:top-28 xl:self-start">
          <p className="eyebrow mb-3 hidden xl:flex">Configuration areas</p>
          <div role="tablist" aria-label="Configuration areas" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto p-1 xl:mx-0 xl:flex-col xl:gap-1.5 xl:overflow-visible xl:p-0">
            {areas.map((a) => {
              const on = tab === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(a.value)}
                  className={cn(
                    'flex shrink-0 items-center gap-3 rounded-full text-left transition xl:w-full xl:rounded-2xl xl:p-2.5',
                    on ? 'bg-green-800 px-4 py-2 text-white shadow-sm xl:bg-white xl:text-ink-900 xl:shadow-card xl:ring-1 xl:ring-green-200' : 'bg-white px-4 py-2 text-ink-600 ring-1 ring-ink-100 hover:text-ink-900 xl:bg-transparent xl:ring-0 xl:hover:bg-white/80',
                  )}
                >
                  <IconDisc icon={a.icon} tone={a.tone} className="hidden xl:flex" />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-sm font-semibold">{a.label}</span>
                    <span className="hidden truncate text-xs text-ink-500 xl:block">{a.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-w-0">
          {tab === 'score' && <ScoreWeights />}
          {tab === 'defaults' && <Defaults />}
          {tab === 'cycle' && <CycleEngine />}
          {tab === 'rules' && <Rules />}
          {tab === 'symptoms' && <Symptoms />}
          {tab === 'notifications' && <Notifications />}
        </div>
      </div>
    </>
  );
}
