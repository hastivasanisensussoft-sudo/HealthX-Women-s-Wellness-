import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BatteryMedium, Brain, Check, Droplets, Flame, HeartHandshake, LineChart, Moon, Plus, Stethoscope, Timer, Wind } from 'lucide-react';
import { checkInStreak, COPY, formatDate, lastNDays, moodLabel, type MoodLevel } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { MoodPicker } from '@/user/components/MoodPicker';
import { PlanList } from '@/user/components/Cards';
import { LogSymptomsModal } from '@/user/components/SymptomLogger';
import { HeroPanel, StepSection } from '@/user/components/cycle-ui/Hero';
import { LeafPair, MoodFace } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { Badge, Button, ButtonLink, Card, CardHeader, ChipToggle, IconTile, Notice, PageHeader, ProgressBar, RatingSlider, Stepper, Textarea, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, simulate } from '@/lib/utils';

const QUICK_SYMPTOMS = ['cramps', 'headache', 'fatigue', 'bloating', 'back_pain', 'acne', 'anxiety', 'irritability'];
const SLEEP_PRESETS = [5, 6, 7, 8, 9];

/** Seconds since `since`, ticking in its own component so the whole check-in form doesn't re-render every second. */
function ElapsedChip({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(() => Math.round((Date.now() - since) / 1000));
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(t);
  }, [since]);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-ink-600 shadow-xs ring-1 ring-inset ring-ink-100" aria-live="off">
      <Timer className="h-4 w-4 text-green-600" /> {elapsed}s
    </span>
  );
}

/** Daily check-in (SRS §32) — designed to take under 30 seconds. */
export default function CheckIn() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const { today } = state;
  const existing = state.checkIns.find((c) => c.date === today);
  const [mood, setMood] = useState<MoodLevel | null>(existing?.mood ?? null);
  const [energy, setEnergy] = useState(existing?.energy ?? 6);
  const [stress, setStress] = useState(existing?.stress ?? 4);
  const [sleep, setSleep] = useState(existing?.sleepHours ?? 7);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptomIds ?? []);
  const [none, setNone] = useState(existing ? existing.symptomIds.length === 0 : false);
  const [note, setNote] = useState(existing?.note ?? '');
  const [touched, setTouched] = useState({ levels: !!existing, sleep: !!existing });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [finalTime, setFinalTime] = useState<number | null>(null);

  const recent = useMemo(() => lastNDays(today, 7).map((d) => ({ d, c: state.checkIns.find((x) => x.date === d) })), [state.checkIns, today]);
  const lowStreak = recent.slice(-3).filter((r) => r.c?.mood === 'very_low').length;
  const steps = [mood !== null, touched.levels, touched.sleep, none || symptoms.length > 0];
  const doneCount = steps.filter(Boolean).length;

  const save = async () => {
    if (!mood) return setError('Choose how you’re feeling to finish your check-in.');
    if (!none && symptoms.length === 0) return setError('Pick any symptoms, or choose “None today”.');
    setError(null);
    setBusy(true);
    await simulate(true, 450);
    dispatch({ type: 'SAVE_CHECKIN', checkIn: { ...existing, date: today, mood, energy, stress, sleepHours: sleep, symptomIds: none ? [] : symptoms, note: note || undefined } });
    if (!none && symptoms.length) dispatch({ type: 'LOG_SYMPTOMS', date: today, entries: symptoms.map((s) => ({ symptomId: s, severity: 'mild' })) });
    setBusy(false);
    setFinalTime(Math.round((Date.now() - startedAt) / 1000));
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Check-in saved', 'Your plan for today has been updated.');
  };

  if (done) {
    const streakDays = checkInStreak(state);
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <HeroPanel tone="forest" label="Check-in complete">
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <span className="flex h-14 w-14 animate-scale-in items-center justify-center rounded-full bg-white text-green-700 shadow-lift">
                <Check className="h-7 w-7" strokeWidth={3} />
              </span>
              <h1 className="mt-5 font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Thanks for checking in</h1>
              <p className="mt-2 text-[15px] text-white/75">
                Done in <strong className="text-butter-300">{finalTime}s</strong>
                {finalTime !== null && finalTime <= 30 ? ' — right on target 🎉' : ''} · {streakDays}-day check-in streak
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { k: 'Mood', v: mood ? moodLabel(mood) : '—' },
                  { k: 'Energy', v: `${energy}/10` },
                  { k: 'Stress', v: `${stress}/10` },
                  { k: 'Sleep', v: `${sleep} h` },
                  { k: 'Symptoms', v: none ? 'None' : String(symptoms.length) },
                ].map((x) => (
                  <span key={x.k} className="rounded-full bg-white/10 px-3 py-1.5 text-sm ring-1 ring-inset ring-white/15">
                    <span className="text-white/60">{x.k}</span> <strong className="font-semibold">{x.v}</strong>
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <ButtonLink to="/app" variant="butter">
                  Back to dashboard
                </ButtonLink>
                <Button variant="ghost" className="text-white ring-1 ring-inset ring-white/25 hover:bg-white/10" onClick={() => setDone(false)}>
                  Edit check-in
                </Button>
              </div>
            </div>
            {mood && (
              <div className="relative mx-auto hidden h-44 w-44 items-center justify-center sm:flex">
                <span aria-hidden className="absolute inset-0 animate-breathe rounded-full bg-white/[0.08]" />
                <span aria-hidden className="absolute inset-5 rounded-full bg-white/[0.08]" />
                <MoodFace mood={mood} size={112} className="relative drop-shadow-lg" />
              </div>
            )}
          </div>
        </HeroPanel>
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="card-pad lg:col-span-7">
            <CardHeader title="Your plan for today" subtitle="Updated from this check-in · tick things off as you go" />
            <PlanList items={state.plan.items} onToggle={(id) => dispatch({ type: 'TOGGLE_PLAN_ITEM', id })} />
          </Card>
          <div className="min-w-0 lg:col-span-5">
            <p className="eyebrow mb-3">Next, if you like</p>
            <div className="grid grid-cols-2 gap-3">
              {stress >= 6 ? (
                <IconTile tone="lavender" icon={<Wind className="h-5 w-5" />} label="Breathe" hint="A one-minute reset" to="/app/stress" />
              ) : (
                <IconTile tone="lavender" icon={<Brain className="h-5 w-5" />} label="Mood & energy" hint="See your trends" to="/app/mood" />
              )}
              <IconTile tone="sky" icon={<Droplets className="h-5 w-5" />} label="Hydration" hint="Add a glass" to="/app/hydration" />
              <IconTile tone="rose" icon={<Stethoscope className="h-5 w-5" />} label="Symptoms" hint="Add detail" to="/app/symptoms" />
              <IconTile tone="green" icon={<LineChart className="h-5 w-5" />} label="Insights" hint="Observed patterns" to="/app/insights/trends" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Daily check-in"
        subtitle="How are you feeling today? This takes about 30 seconds."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Overview', to: '/app' }, { label: 'Daily check-in' }]}
        badge={existing ? <Badge tone="green">Already checked in — editing</Badge> : undefined}
        actions={<ElapsedChip since={startedAt} />}
      />
      <div className="grid items-start gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-8">
          <div className="border-b border-ink-100 bg-wash px-5 py-4 sm:px-7">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-green-800">{formatDate(today, 'long')}</p>
              <p className="text-sm font-semibold text-ink-600" aria-live="polite">
                {doneCount} of 4 answered
              </p>
            </div>
            <ProgressBar value={doneCount / 4} className="mt-2.5" height="h-2" color="bg-green-600" track="bg-white" label="Check-in progress" />
          </div>
          <div className="space-y-6 p-5 sm:space-y-0 sm:p-7">
            <StepSection n={1} title="How are you feeling?" hint="Pick the face that fits best — there’s no wrong answer." done={steps[0]}>
              <MoodPicker value={mood} onChange={(m) => (setMood(m), error && setError(null))} size="lg" />
              {(mood === 'very_low' || lowStreak >= 2) && (
                // [ADD A-31] Supportive resources for low mood (not in SRS; list per market — D-11)
                <Notice tone="safety" className="mt-4" title="You don’t have to go through hard days alone" icon={<HeartHandshake className="h-4 w-4 text-lavender-600" />}>
                  Talking to someone you trust or a mental-health professional can help. If you feel unsafe or are thinking about harming yourself, contact your local emergency number or a crisis line right away.
                </Notice>
              )}
            </StepSection>

            <StepSection n={2} title="Energy and stress" hint="Slide to where you are right now." done={steps[1]}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-peach-50 p-4 ring-1 ring-inset ring-peach-100">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-peach-700">
                    <BatteryMedium className="h-4 w-4" /> {energy <= 3 ? 'Running low' : energy <= 7 ? 'Steady' : 'Full of energy'}
                  </p>
                  <RatingSlider label="Energy" value={energy} onChange={(v) => (setEnergy(v), setTouched((t) => ({ ...t, levels: true })))} accent="accent-peach-500" lowLabel="Drained" highLabel="Energised" />
                </div>
                <div className="rounded-3xl bg-lavender-50 p-4 ring-1 ring-inset ring-lavender-100">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-lavender-700">
                    <Wind className="h-4 w-4" /> {stress <= 3 ? 'Feeling calm' : stress <= 6 ? 'A little tense' : 'Under pressure'}
                  </p>
                  <RatingSlider label="Stress" value={stress} onChange={(v) => (setStress(v), setTouched((t) => ({ ...t, levels: true })))} accent="accent-lavender-500" lowLabel="Calm" highLabel="Very stressed" />
                </div>
              </div>
            </StepSection>

            <StepSection n={3} title="Sleep last night" hint="Self-reported hours — a rough guess is fine." done={steps[2]}>
              <div className="flex flex-col gap-3 rounded-3xl bg-indigo-50 p-4 ring-1 ring-inset ring-indigo-100 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick sleep hours">
                  {SLEEP_PRESETS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={sleep === h}
                      onClick={() => (setSleep(h), setTouched((t) => ({ ...t, sleep: true })))}
                      className={cn('inline-flex h-11 min-w-[52px] items-center justify-center rounded-full px-3 text-sm font-semibold transition', sleep === h ? 'bg-indigo-500 text-white shadow-soft' : 'bg-white text-indigo-700 ring-1 ring-inset ring-indigo-100 hover:ring-indigo-300')}
                    >
                      {h} h
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" aria-hidden />
                  <Stepper value={sleep} onChange={(v) => (setSleep(v), setTouched((t) => ({ ...t, sleep: true })))} min={0} max={16} step={0.5} suffix="h" />
                </div>
              </div>
            </StepSection>

            <StepSection n={4} title="Any symptoms?" hint="Tap all that apply, or choose “None today”." done={steps[3]}>
              <div className="flex flex-wrap gap-2">
                <ChipToggle
                  selected={none}
                  icon={<Check className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setNone(!none);
                    setSymptoms([]);
                    if (error) setError(null);
                  }}
                >
                  None today
                </ChipToggle>
                {QUICK_SYMPTOMS.map((id) => {
                  const def = state.symptomDefs.find((s) => s.id === id);
                  if (!def) return null; // the server's list decides which symptoms exist
                  const on = symptoms.includes(id);
                  return (
                    <ChipToggle
                      key={id}
                      tone="rose"
                      selected={on}
                      icon={<Icon name={def.icon} className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setNone(false);
                        setSymptoms(on ? symptoms.filter((s) => s !== id) : [...symptoms, id]);
                        if (error) setError(null);
                      }}
                    >
                      {def.label}
                    </ChipToggle>
                  );
                })}
              </div>
              <button className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-900" onClick={() => setMoreOpen(true)}>
                <Plus className="h-4 w-4" /> More symptoms & severity
              </button>
            </StepSection>

            <StepSection n={5} title="Anything on your mind?" optional done={note.trim().length > 0} last>
              <label htmlFor="ci-note" className="sr-only">
                Note
              </label>
              <Textarea id="ci-note" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} placeholder="A thought, a small win, something that helped…" className="min-h-[80px]" />
              <p className="mt-1.5 text-right font-mono text-[11px] text-ink-400">{note.length}/280</p>
            </StepSection>
          </div>
          <div className="space-y-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4 sm:px-7">
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-relaxed text-ink-400">{COPY.notDiagnostic}</p>
              <Button size="lg" onClick={save} loading={busy} className="w-full sm:w-auto">
                {existing ? 'Update check-in' : 'Save check-in'}
              </Button>
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-6 xl:col-span-4">
          <Card className="relative overflow-hidden">
            <div className="relative h-52 bg-gradient-to-br from-rose-50 via-white to-green-50">
              <LeafPair className="left-6 top-4 h-28 w-28" />
              <Photo photo="woman-tea" alt="" shape="arch" position="50% 30%" className="!absolute bottom-0 right-6 h-44 w-36 ring-4 ring-white" />
              <div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 px-3 py-2 shadow-soft backdrop-blur">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
                  <Flame className="h-3.5 w-3.5 text-peach-500" /> Streak
                </p>
                <p className="num text-2xl leading-none text-ink-900">
                  {checkInStreak(state)} <span className="text-sm font-medium text-ink-500">days</span>
                </p>
              </div>
            </div>
            <div className="card-pad">
              <CardHeader title="This week" subtitle="Your moods, day by day" className="mb-3" />
              <div className="grid grid-cols-7 gap-1">
                {recent.map(({ d, c }) => (
                  <div key={d} className="flex flex-col items-center gap-1">
                    {c ? <MoodFace mood={c.mood} size={34} /> : <span className="h-[34px] w-[34px] rounded-full border-2 border-dashed border-ink-200" />}
                    <span className={cn('text-[11px] font-semibold', d === today ? 'text-green-700' : 'text-ink-500')}>{formatDate(d, 'weekday')}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card className="card-pad">
            <CardHeader title="Why check in daily?" />
            <ul className="space-y-2.5 text-sm text-ink-600">
              {['Your check-ins power your trends, weekly report and insights.', 'Patterns across your cycle become visible after a few weeks.', 'Your plan for today adapts to your energy and stress.'].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Check className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Link to="/app/insights/trends" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline">
              See your insights <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>
      <LogSymptomsModal open={moreOpen} onClose={() => setMoreOpen(false)} date={today} />
    </div>
  );
}
