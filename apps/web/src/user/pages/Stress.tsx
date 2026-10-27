import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Check, HeartHandshake, Pause, Play, RotateCcw, Waves, Wind } from 'lucide-react';
import { dailySeries, formatDate, habitDone, lastNDays, palette, type MoodLevel, type PhotoKey } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { MoodPicker } from '@/user/components/MoodPicker';
import { BreathingOrb } from '@/user/components/cycle-ui/BreathingOrb';
import { HeroPanel } from '@/user/components/cycle-ui/Hero';
import { DateQuickPick } from '@/user/components/cycle-ui/Pickers';
import { LineTrend } from '@/components/charts/Charts';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import { Button, Card, CardHeader, EmptyState, Notice, PageHeader, RatingSlider, RouteTabs, StatCard, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SYMPTOM_TABS } from '@/user/layout/sectionTabs';

const PHASES = [
  { label: 'Breathe in', scale: 1 },
  { label: 'Hold', scale: 1 },
  { label: 'Breathe out', scale: 0.62 },
  { label: 'Hold', scale: 0.62 },
];
const STEP_SECONDS = 4;
const TARGET_ROUNDS = 4;

const READS: { to: string; title: string; sub: string; photo: PhotoKey }[] = [
  { to: '/app/learn/a_stress_toolkit', title: 'A five-minute stress toolkit', sub: 'Small resets for busy days', photo: 'meditation' },
  { to: '/app/learn/a_mindfulness', title: 'Mindfulness for beginners', sub: 'Noticing, without judging', photo: 'herbal-tea' },
  { to: '/app/learn/a_sleep_routine', title: 'A wind-down routine for better sleep', sub: 'Gentle evening habits', photo: 'sleep' },
];

/** Guided 4-4-4-4 box breathing — a simple, non-clinical relaxation exercise. */
function BoxBreathing({ onComplete }: { onComplete: () => void }) {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0); // seconds elapsed
  const done = useRef(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const step = Math.floor(tick / STEP_SECONDS) % 4;
  const round = Math.floor(tick / (STEP_SECONDS * 4));
  const remaining = STEP_SECONDS - (tick % STEP_SECONDS);
  useEffect(() => {
    if (round >= TARGET_ROUNDS && !done.current) {
      done.current = true;
      setRunning(false);
      onComplete();
    }
  }, [round, onComplete]);
  const phase = PHASES[step];
  const finished = round >= TARGET_ROUNDS;
  return (
    <div className="flex flex-col items-center">
      <BreathingOrb running={running} scale={phase.scale} seconds={STEP_SECONDS} size={232}>
        <p className="font-display text-[17px] font-semibold leading-tight text-green-950" aria-live="polite">
          {running ? phase.label : finished ? 'Well done' : tick ? 'Paused' : 'Ready'}
        </p>
        {running ? <p className="num mt-0.5 text-[38px] leading-none text-green-950">{remaining}</p> : <p className="mt-1 text-xs font-semibold text-green-900/70">{finished ? 'Four calm rounds' : '4 · 4 · 4 · 4'}</p>}
      </BreathingOrb>
      <div className="mt-4 flex items-center gap-1.5" aria-label={`Round ${Math.min(round + 1, TARGET_ROUNDS)} of ${TARGET_ROUNDS}`} role="img">
        {Array.from({ length: TARGET_ROUNDS }).map((_, i) => (
          <span key={i} className={cn('h-2 rounded-full transition-all', i < round || finished ? 'w-6 bg-green-300' : i === round && (running || tick > 0) ? 'w-6 bg-white' : 'w-2 bg-white/25')} />
        ))}
      </div>
      <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/60">
        Round {Math.min(round + 1, TARGET_ROUNDS)} of {TARGET_ROUNDS}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          variant="butter"
          leftIcon={running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          onClick={() => {
            if (finished) {
              setTick(0);
              done.current = false;
            }
            setRunning((r) => !r);
          }}
        >
          {running ? 'Pause' : finished ? 'Start again' : tick ? 'Resume' : 'Start breathing'}
        </Button>
        {tick > 0 && !running && !finished && (
          <Button
            variant="ghost"
            className="text-white ring-1 ring-inset ring-white/25 hover:bg-white/10"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={() => {
              setTick(0);
              done.current = false;
            }}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

/** Stress & anxiety tracking (SRS §16 optional levels). */
export default function Stress() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const { today } = state;
  const [date, setDate] = useState(today);
  const existing = state.checkIns.find((c) => c.date === date);
  const [stress, setStress] = useState(existing?.stress ?? 4);
  const [anxiety, setAnxiety] = useState(existing?.anxiety ?? 3);
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [energy, setEnergy] = useState(6);
  const [error, setError] = useState<string | null>(null);

  const series = useMemo(() => dailySeries(state, 30).map((p) => ({ ...p, anxiety: state.checkIns.find((c) => c.date === p.date)?.anxiety ?? null })), [state]);
  const avg = (xs: (number | undefined)[]) => {
    const v = xs.filter((x): x is number => typeof x === 'number');
    return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null;
  };
  const week = avg(state.checkIns.filter((c) => c.date >= lastNDays(today, 7)[0]).map((c) => c.stress));
  const prev = avg(state.checkIns.filter((c) => c.date >= lastNDays(today, 14)[0] && c.date < lastNDays(today, 7)[0]).map((c) => c.stress));
  const breathedToday = habitDone(state, 'h_breathe', today);
  const hasAnxiety = series.some((p) => p.anxiety !== null);

  const pick = (d: string) => {
    setDate(d);
    setError(null);
    const c = state.checkIns.find((x) => x.date === d);
    setStress(c?.stress ?? 4);
    setAnxiety(c?.anxiety ?? 3);
  };

  const save = () => {
    if (date > today) return setError("You can't log a future date.");
    if (!existing && !mood) return setError('There’s no check-in for this day yet — add your mood too so we can save it.');
    setError(null);
    const base = existing ?? { date, mood: mood as MoodLevel, energy, symptomIds: [] };
    dispatch({ type: 'SAVE_CHECKIN', checkIn: { ...base, date, stress, anxiety } });
    toast.success('Stress saved', `Stress ${stress}/10 · anxiety ${anxiety}/10 · ${formatDate(date, 'short')}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Stress tracking"
          subtitle="Notice your stress and anxiety levels, and take a short reset when you need one."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Symptoms & Mood', to: '/app/symptoms' }, { label: 'Stress tracking' }]}
        />
        <RouteTabs tabs={SYMPTOM_TABS} label="Symptoms & mood pages" className="mb-0" />
      </div>

      <HeroPanel tone="forest" label="5-minute reset">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-green-200">5-minute reset</p>
            <h2 className="mt-2 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[38px]">Box breathing</h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/75">Breathe in, hold, breathe out and hold — four seconds each. Follow the circle for four rounds.</p>
            <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {PHASES.map((p, i) => (
                <li key={i} className="flex items-center gap-2 rounded-2xl bg-white/[0.07] px-3 py-2 text-sm ring-1 ring-inset ring-white/10">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 font-mono text-[11px]">{i + 1}</span>
                  {p.label} · {STEP_SECONDS}s
                </li>
              ))}
            </ol>
            <p className={cn('mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm', breathedToday ? 'bg-green-300/20 font-semibold text-green-100' : 'text-white/65')}>
              {breathedToday ? <Check className="h-4 w-4" /> : <Wind className="h-4 w-4" />}
              {breathedToday ? 'Breathing habit done today' : 'Completing 4 rounds ticks off your breathing habit.'}
            </p>
          </div>
          <BoxBreathing
            onComplete={() => {
              if (!breathedToday && state.habits.some((h) => h.id === 'h_breathe')) dispatch({ type: 'TOGGLE_HABIT', habitId: 'h_breathe', date: today });
              toast.success('Breathing complete', 'Marked “5-minute breathing” as done today.');
            }}
          />
          <div className="min-w-0 lg:col-span-2 xl:col-span-1">
            <VideoCard video="breathing" aspect="aspect-[4/3]" className="ring-1 ring-white/15" />
            <p className="mt-2 text-xs text-white/60">Prefer to follow along? Open the video preview for a guided version.</p>
          </div>
        </div>
      </HeroPanel>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-7">
          <div className="card-pad space-y-6">
            <CardHeader title="How stressed do you feel?" subtitle="Optional levels from 1 to 10 — log as often as you like." icon={<Brain className="h-5 w-5" />} className="mb-0" />
            <DateQuickPick id="st-date" value={date} onChange={pick} today={today} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-lavender-50 p-4 ring-1 ring-inset ring-lavender-100">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-lavender-700">
                  <Wind className="h-4 w-4" /> {stress <= 3 ? 'Feeling calm' : stress <= 6 ? 'A little tense' : 'Under pressure'}
                </p>
                <RatingSlider label="Stress level" value={stress} onChange={setStress} accent="accent-lavender-500" lowLabel="Calm" highLabel="Very stressed" />
              </div>
              <div className="rounded-3xl bg-sky-50 p-4 ring-1 ring-inset ring-sky-100">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-sky-700">
                  <Waves className="h-4 w-4" /> {anxiety <= 3 ? 'At ease' : anxiety <= 6 ? 'Some worry' : 'Very unsettled'}
                </p>
                <RatingSlider label="Anxiety level" value={anxiety} onChange={setAnxiety} accent="accent-sky-500" lowLabel="At ease" highLabel="Very anxious" />
              </div>
            </div>
            {!existing && (
              <div className="space-y-4 rounded-3xl border-2 border-dashed border-ink-200 p-3 sm:p-4">
                <p className="text-sm font-semibold text-ink-700">No check-in for {formatDate(date, 'short')} yet — add your mood and energy to save this day.</p>
                <MoodPicker value={mood} onChange={setMood} size="sm" />
                <RatingSlider label="Energy" value={energy} onChange={setEnergy} accent="accent-peach-500" />
              </div>
            )}
            {stress >= 8 && (
              // [ADD A-31] supportive resources for high stress (resource list per market — D-11)
              <Notice tone="safety" title="You don’t have to manage this alone" icon={<HeartHandshake className="h-4 w-4 text-lavender-600" />}>
                If stress or anxiety is affecting your daily life, consider talking to someone you trust or a mental-health professional. If you feel unsafe, contact your local emergency number.
              </Notice>
            )}
          </div>
          <div className="space-y-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4 sm:px-6">
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button size="lg" onClick={save} className="w-full sm:w-auto">
                Save stress level
              </Button>
            </div>
          </div>
        </Card>
        <div className="min-w-0 space-y-6 xl:col-span-5">
          <StatCard
            label="Average stress · 7 days"
            value={week ?? '—'}
            unit="/10"
            icon={<Brain className="h-5 w-5" />}
            tone="lavender"
            trend={week !== null && prev !== null ? { dir: week <= prev ? 'up' : 'down', text: week <= prev ? `${(prev - week).toFixed(1)} lower than last week` : `${(week - prev).toFixed(1)} higher than last week` } : undefined}
          />
          <Card className="card-pad">
            <CardHeader title="Read & relax" subtitle="Short reads for calmer days" />
            <ul className="space-y-2.5">
              {READS.map((r) => (
                <li key={r.to}>
                  <Link to={r.to} className="group flex items-center gap-3 rounded-2xl p-2 ring-1 ring-inset ring-ink-100 transition hover:bg-green-50/50 hover:ring-green-200">
                    <Photo photo={r.photo} alt="" className="h-14 w-16 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">{r.title}</span>
                      <span className="block text-xs text-ink-500">{r.sub}</span>
                    </span>
                    <ArrowRight className="mr-1 h-4 w-4 shrink-0 text-green-700 transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="card-pad">
        <CardHeader title="Stress & anxiety" subtitle={hasAnxiety ? 'Last 30 days (1–10)' : 'Last 30 days (1–10) · anxiety appears once you log it'} />
        {series.every((p) => p.stress === null) && !hasAnxiety ? (
          <EmptyState compact icon={<Brain className="h-5 w-5" />} title="No stress levels logged yet" body="Log how stressed you feel above — your 30-day line will appear here." />
        ) : (
          <LineTrend
            data={series}
            height={260}
            yDomain={[0, 10]}
            series={[
              { key: 'stress', name: 'Stress', color: palette.lavender[500] },
              ...(hasAnxiety ? [{ key: 'anxiety', name: 'Anxiety', color: palette.sky[500] }] : []),
            ]}
          />
        )}
      </Card>
    </div>
  );
}
