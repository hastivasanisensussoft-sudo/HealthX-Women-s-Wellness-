import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Baby, BedDouble, Bone, CalendarPlus, Check, Dumbbell, Flame, HeartPulse, MessageCircleQuestion, Moon, Plus, Salad, Siren, Smile, Sprout, Sun, Target, Thermometer, Trash2, Weight } from 'lucide-react';
import { addDays, COPY, dailySeries, diffDays, formatDate, lastNDays, palette, type LifeStageMode, type PhotoKey, type Severity } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { BarTrend } from '@/components/charts/Charts';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, IconTile, Input, Notice, PageHeader, PhaseBadge, ProgressRing, Segmented, Tabs, useToast, type TileTone } from '@/components/ui';
import { cn } from '@/lib/utils';

type Tab = 'pregnancy' | 'perimenopause' | 'menopause';

const MODES: { key: LifeStageMode; label: string; icon: typeof Sprout; photo: PhotoKey; position?: string; blurb: string }[] = [
  { key: 'cycle', label: 'Cycle (default)', icon: Sprout, photo: 'portrait-curly', position: '50% 25%', blurb: 'Period, phase and symptom tracking' },
  { key: 'pregnancy', label: 'Pregnancy', icon: Baby, photo: 'pregnant-woman', position: '50% 35%', blurb: 'Week-by-week wellness education' },
  { key: 'perimenopause', label: 'Perimenopause', icon: Sun, photo: 'mature-woman', position: '50% 25%', blurb: 'Cycle changes, hot flashes, sleep and mood' },
  { key: 'menopause', label: 'Menopause', icon: Moon, photo: 'senior-woman-active', position: '50% 30%', blurb: 'Strength, sleep and bone health' },
];

/** Life-stage modes (SRS §22–§25) — Phase 3 previews. */
export default function LifeStages() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('perimenopause');
  const [pendingMode, setPendingMode] = useState<LifeStageMode | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pregnancy & menopause"
        badge={<PhaseBadge phase={3} />}
        subtitle="Life-stage modes adapt your dashboard, content and reminders. These are previews of upcoming modules."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Learn', to: '/app/learn' }, { label: 'Fertility & pregnancy', to: '/app/learn/fertility-pregnancy' }, { label: 'Life stages' }]}
      />

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-1.5">Your current mode</p>
            <h2 className="font-display text-[20px] font-semibold tracking-[-0.015em] text-ink-900">Choose the stage that fits you now</h2>
            <p className="mt-1 text-sm text-ink-500">Switching mode never deletes your data.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {MODES.map((m) => {
            const on = state.profile.mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => !on && setPendingMode(m.key)}
                aria-pressed={on}
                className={cn('group flex flex-col overflow-hidden rounded-3xl bg-white text-left transition duration-200', on ? 'shadow-card ring-2 ring-green-600' : 'ring-1 ring-inset ring-ink-100 hover:-translate-y-0.5 hover:shadow-card hover:ring-green-200')}
              >
                <span className="relative block h-32 w-full sm:h-40">
                  <Photo photo={m.photo} alt="" shape="none" position={m.position} className="!absolute inset-0" imgClassName="transition duration-700 group-hover:scale-105" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-green-950/55 via-transparent to-transparent" />
                  <span className={cn('absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full shadow-soft', on ? 'bg-green-700 text-white' : 'bg-white text-green-700')}>
                    <m.icon className="h-5 w-5" />
                  </span>
                  {on && (
                    <span className="glass absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-green-900">
                      <Check className="h-3 w-3" /> Current
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col p-3.5 sm:p-4">
                  <span className="font-display text-[16px] font-semibold text-ink-900">{m.label}</span>
                  <span className="mt-0.5 text-[13px] leading-snug text-ink-500">{m.blurb}</span>
                  <span className={cn('mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold', on ? 'text-green-700' : 'text-ink-600 group-hover:text-green-700')}>
                    {on ? 'Current mode' : 'Switch to this mode'} {!on && <ArrowRight className="h-3.5 w-3.5" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'pregnancy', label: 'Pregnancy wellness' },
            { value: 'perimenopause', label: 'Perimenopause' },
            { value: 'menopause', label: 'Menopause' },
          ]}
        />
        <div className="mt-6">
          {tab === 'pregnancy' && <Pregnancy />}
          {tab === 'perimenopause' && <Perimenopause />}
          {tab === 'menopause' && <Menopause />}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingMode}
        onClose={() => setPendingMode(null)}
        title={`Switch to ${MODES.find((m) => m.key === pendingMode)?.label}?`}
        body={pendingMode === 'pregnancy' ? 'Period estimates and period reminders will pause while you’re in pregnancy mode (D-21). You can switch back anytime.' : 'Your dashboard emphasis and content will adapt. You can switch back anytime.'}
        confirmLabel="Switch mode"
        onConfirm={() => {
          if (pendingMode) {
            dispatch({ type: 'SET_MODE', mode: pendingMode });
            toast.success('Mode updated', 'Preview only — full life-stage modes arrive in Phase 3.');
          }
        }}
      />
    </div>
  );
}

function Pregnancy() {
  const { today } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const [due, setDue] = useState(addDays(today, 7 * 18));
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>(['Which activities are right for me now?', 'What should I eat more of?']);
  const [q, setQ] = useState('');
  const [qError, setQError] = useState<string | null>(null);
  const daysToDue = diffDays(today, due);
  const week = Math.max(1, Math.min(42, 40 - Math.ceil(daysToDue / 7)));
  const validDue = daysToDue >= -14 && daysToDue <= 300;
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  const addQuestion = () => {
    if (q.trim().length < 3) return setQError('Write at least 3 characters.');
    setQuestions([...questions, q.trim()]);
    setQ('');
    setQError(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="min-w-0 space-y-6 xl:col-span-8">
        <Notice tone="safety" title="Important">
          {COPY.pregnancy}
        </Notice>
        <Card className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-lavender-50">
          <span aria-hidden className="leaf absolute -right-6 -top-6 h-28 w-28 bg-rose-100/70" />
          <div className="card-pad relative grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="mx-auto rounded-full bg-white p-2 shadow-soft">
              <ProgressRing value={validDue ? week / 40 : 0} size={156} stroke={14} color={palette.rose[400]} track={palette.rose[50]}>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">Week</p>
                <p className="num text-[48px] leading-none text-ink-900">{validDue ? week : '—'}</p>
                <p className="text-xs text-ink-400">of 40</p>
              </ProgressRing>
            </div>
            <div className="min-w-0">
              {validDue && <Badge tone="rose">Trimester {trimester}</Badge>}
              <p className="mt-2 font-display text-[22px] font-semibold text-ink-900">{validDue ? `About ${Math.max(0, daysToDue)} days to go` : 'Add your due date'}</p>
              {validDue && <p className="text-sm text-ink-500">Due {formatDate(due, 'long')}</p>}
              <div className="mt-3 flex h-2.5 gap-1" aria-hidden>
                {[13, 14, 13].map((w, i) => (
                  <span key={i} className="relative h-full overflow-hidden rounded-full bg-rose-100" style={{ flexGrow: w, flexBasis: 0 }}>
                    <span className="absolute inset-y-0 left-0 rounded-full bg-rose-400" style={{ width: `${Math.max(0, Math.min(1, (week - [0, 13, 27][i]) / w)) * 100}%` }} />
                  </span>
                ))}
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-400" aria-hidden>
                <span>1st</span>
                <span>2nd</span>
                <span>3rd</span>
              </div>
              <Field label="Estimated due date" htmlFor="pg-due" error={error} hint="From your healthcare provider (D-21: input method TBD)" className="mt-4 max-w-xs">
                <Input
                  id="pg-due"
                  type="date"
                  value={due}
                  onChange={(e) => {
                    setDue(e.target.value);
                    const d = diffDays(today, e.target.value);
                    setError(d < -14 || d > 300 ? 'Please check the date — it should be within the next 10 months.' : null);
                  }}
                  invalid={!!error}
                />
              </Field>
            </div>
          </div>
        </Card>
        <Card className="card-pad">
          <CardHeader title={`Week ${validDue ? week : ''} wellness`} subtitle="General education to discuss with your prenatal care team" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: HeartPulse, t: 'Gentle activity', d: 'Walking or prenatal yoga — ask your provider what suits you.', cls: 'bg-rose-50 text-rose-600' },
              { icon: Salad, t: 'Nutrition education', d: 'Regular, balanced meals with plenty of fluids.', cls: 'bg-peach-50 text-peach-600' },
              { icon: BedDouble, t: 'Rest', d: 'Listen to your body and rest when you need to.', cls: 'bg-indigo-50 text-indigo-600' },
            ].map((x) => (
              <div key={x.t} className="rounded-3xl bg-ink-50/60 p-4">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', x.cls)}>
                  <x.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold text-ink-900">{x.t}</p>
                <p className="mt-1 text-sm text-ink-600">{x.d}</p>
              </div>
            ))}
          </div>
          <Link to="/app/learn/a_pregnancy_wellness" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline">
            Read: Pregnancy wellness — gentle movement and hydration <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
        <Card className="card-pad">
          <CardHeader title="My questions" subtitle="For your healthcare provider — jot them down so you remember at your next visit" icon={<MessageCircleQuestion className="h-5 w-5" />} />
          {questions.length === 0 ? (
            <EmptyState compact icon={<MessageCircleQuestion className="h-5 w-5" />} title="No questions yet" body="Add anything you’d like to ask." />
          ) : (
            <ol className="space-y-2">
              {questions.map((x, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl bg-ink-50 py-2 pl-3 pr-1.5 text-sm text-ink-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[11px] text-green-800 ring-1 ring-green-200">{i + 1}</span>
                  <span className="min-w-0 flex-1">{x}</span>
                  <button aria-label="Remove question" onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-white hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-3 flex gap-2">
            <div className="min-w-0 flex-1">
              <Input value={q} maxLength={140} onChange={(e) => (setQ(e.target.value), qError && setQError(null))} onKeyDown={(e) => e.key === 'Enter' && addQuestion()} placeholder="Add a question…" aria-label="New question" invalid={!!qError} />
            </div>
            <Button variant="secondary" className="h-12" leftIcon={<Plus className="h-4 w-4" />} onClick={addQuestion}>
              Add
            </Button>
          </div>
          {qError && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
              {qError}
            </p>
          )}
        </Card>
      </div>
      <div className="min-w-0 space-y-6 xl:col-span-4">
        <Card className="overflow-hidden">
          <Photo photo="doctor-consult" alt="" shape="none" className="h-48 w-full" />
          <div className="card-pad">
            <CardHeader title="Appointment reminders" subtitle="We’ll nudge you two weeks from today" icon={<CalendarPlus className="h-5 w-5" />} className="mb-3" />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                dispatch({ type: 'ADD_REMINDER', reminder: { title: 'Prenatal appointment', type: 'habit', time: '10:00', date: addDays(today, 14), enabled: true } });
                toast.success('Reminder added', `Prenatal appointment · ${formatDate(addDays(today, 14), 'short')}`);
              }}
            >
              Add appointment reminder
            </Button>
          </div>
        </Card>
        <Card className="card-pad border-danger/30 bg-danger-soft">
          <CardHeader title="If something feels wrong" icon={<Siren className="h-5 w-5 text-danger" />} />
          <p className="text-sm leading-relaxed text-ink-800">
            Symptoms such as heavy bleeding, severe pain, severe headache, fainting or reduced baby movements need prompt medical attention. {COPY.emergency} HealthX does not interpret emergency symptoms.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Perimenopause() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const { today } = state;
  const [kind, setKind] = useState<'hot_flash' | 'night_sweats'>('hot_flash');
  const [sev, setSev] = useState<Severity>('mild');
  const series = useMemo(() => dailySeries(state, 14), [state]);
  const flashes = lastNDays(today, 14).map((d) => ({
    label: formatDate(d, 'short'),
    flashes: state.symptomLogs.filter((l) => l.date === d && l.symptomId === 'hot_flash').length,
    sweats: state.symptomLogs.filter((l) => l.date === d && l.symptomId === 'night_sweats').length,
  }));
  // D-36: percentage definitions are placeholders until product defines them.
  const week = series.slice(-7);
  const sleepPct = Math.round((week.filter((p) => p.sleep !== null && p.sleep >= state.sleepTargetHours).length / 7) * 100);
  const energyPct = Math.round((week.reduce((a, p) => a + (p.energy ?? 0), 0) / 70) * 100);
  const moodPct = Math.round((week.filter((p) => (p.mood ?? 0) >= 4).length / 7) * 100);
  const activityPct = Math.round((week.filter((p) => p.steps >= state.stepTarget * 0.75).length / 7) * 100);

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="min-w-0 space-y-6 xl:col-span-8">
        <Card className="card-pad">
          <CardHeader title="Perimenopause wellness" subtitle="Last 7 days · definitions pending product sign-off (D-36)" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: 'Sleep', v: sleepPct, c: palette.indigo[500], t: palette.indigo[100], icon: Moon, bg: 'bg-indigo-50' },
              { l: 'Energy', v: energyPct, c: palette.peach[500], t: palette.peach[100], icon: Flame, bg: 'bg-peach-50' },
              { l: 'Mood', v: moodPct, c: palette.lavender[500], t: palette.lavender[100], icon: Smile, bg: 'bg-lavender-50' },
              { l: 'Activity', v: activityPct, c: palette.green[500], t: palette.green[100], icon: Dumbbell, bg: 'bg-green-50' },
            ].map((x) => (
              <div key={x.l} className={cn('flex flex-col items-center rounded-3xl p-4', x.bg)}>
                <ProgressRing value={x.v / 100} size={92} stroke={9} color={x.c} track={x.t}>
                  <span className="num text-lg text-ink-900">{x.v}%</span>
                </ProgressRing>
                <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-ink-700">
                  <x.icon className="h-4 w-4" /> {x.l}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="card-pad">
          <CardHeader title="Hot flashes & night sweats" subtitle="Last 14 days" />
          {flashes.some((f) => f.flashes || f.sweats) ? (
            <BarTrend
              data={flashes}
              height={220}
              stacked
              series={[
                { key: 'flashes', name: 'Hot flashes', color: palette.peach[400] },
                { key: 'sweats', name: 'Night sweats', color: palette.indigo[400] },
              ]}
            />
          ) : (
            <EmptyState compact icon={<Thermometer className="h-5 w-5" />} title="Nothing logged yet" body="Use the quick logger to record a hot flash or night sweat." />
          )}
        </Card>
      </div>
      <div className="min-w-0 space-y-6 xl:col-span-4">
        <Card className="card-pad bg-gradient-to-br from-peach-50 to-white">
          <CardHeader title="Quick log" subtitle="Takes 5 seconds" icon={<Thermometer className="h-5 w-5" />} />
          <Segmented className="w-full [&>button]:flex-1" value={kind} onChange={setKind} options={[{ value: 'hot_flash', label: 'Hot flash' }, { value: 'night_sweats', label: 'Night sweats' }]} />
          <p className="label mt-4">Intensity</p>
          <Segmented className="w-full [&>button]:flex-1" value={sev} onChange={setSev} options={[{ value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }]} />
          <Button
            className="mt-4 w-full"
            onClick={() => {
              dispatch({ type: 'LOG_SYMPTOMS', date: today, entries: [{ symptomId: kind, severity: sev }] });
              toast.success('Logged', kind === 'hot_flash' ? 'Hot flash' : 'Night sweats');
            }}
          >
            Log now
          </Button>
        </Card>
        <Card className="overflow-hidden">
          <Photo photo="herbal-tea" alt="" shape="none" className="h-44 w-full" />
          <div className="card-pad">
            <p className="font-display text-[17px] font-semibold text-ink-900">Perimenopause: noticing changes in your cycle</p>
            <p className="mt-1 text-sm text-ink-500">What to track and how to talk with your doctor.</p>
            <Link to="/app/learn/a_perimenopause" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline">
              Read article <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Menopause() {
  const mods: { icon: typeof Moon; t: string; d: string; to: string; tone: TileTone }[] = [
    { icon: Thermometer, t: 'Symptoms', d: 'Hot flashes, sleep, mood and more', to: '/app/symptoms', tone: 'peach' },
    { icon: Moon, t: 'Sleep', d: 'Routines for steadier nights', to: '/app/sleep', tone: 'indigo' },
    { icon: HeartPulse, t: 'Activity', d: 'Daily steps and movement', to: '/app/fitness', tone: 'green' },
    { icon: Dumbbell, t: 'Strength training', d: 'Strength for every stage', to: '/app/fitness/w_bone_strength', tone: 'rose' },
    { icon: Salad, t: 'Nutrition education', d: 'Balanced meals for midlife', to: '/app/learn', tone: 'butter' },
    { icon: Smile, t: 'Mood', d: 'Check-ins and reflection', to: '/app/check-in', tone: 'lavender' },
    { icon: Weight, t: 'Weight', d: 'Optional — scope pending (D-18)', to: '/app/profile', tone: 'sky' },
    { icon: Target, t: 'Wellness goals', d: 'Gentle, achievable goals', to: '/app/goals', tone: 'green' },
  ];
  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {mods.map((m) => (
            <IconTile key={m.t} to={m.to} tone={m.tone} icon={<m.icon className="h-5 w-5" />} label={m.t} hint={m.d} />
          ))}
        </div>
        <Notice tone="green" className="mt-6">
          Menopause content focuses on healthy lifestyle habits and conversations with your healthcare provider (SRS §25). {COPY.notDiagnostic}
        </Notice>
        <VideoCard video="strength" subtitle="Strength for every stage" aspect="aspect-[16/7]" className="mt-6" />
      </div>
      <Card className="self-start overflow-hidden xl:col-span-4">
        <Photo photo="strength-training" alt="" shape="none" className="h-52 w-full" />
        <div className="card-pad">
          <Badge tone="peach" icon={<Bone className="h-3 w-3" />}>
            Bone health
          </Badge>
          <p className="mt-2 font-display text-[17px] font-semibold text-ink-900">Menopause and bone health: everyday habits</p>
          <p className="mt-1 text-sm text-ink-500">Strength, balance and nutrition education for midlife and beyond.</p>
          <Link to="/app/learn/a_menopause_bones" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline">
            Read article <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
