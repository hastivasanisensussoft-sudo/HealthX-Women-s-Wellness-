import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Flame, ListOrdered, Pause, Play, Square } from 'lucide-react';
import { addDays, WORKOUT_CATEGORIES } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import { Button, Card, CardHeader, EmptyState, Field, Input, Modal, Notice, PhaseBadge, ProgressBar, SectionTitle, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { workoutPhoto, workoutVideo } from '@/user/components/wellness-ui/media';
import { LevelMeter, WorkoutCard } from '@/user/components/wellness-ui/WorkoutCard';

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function WorkoutDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { workouts, today } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const w = workouts.find((x) => x.id === id);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState(0);
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedDate, setSchedDate] = useState(addDays(today, 1));
  const [schedTime, setSchedTime] = useState('07:00');
  const [schedErr, setSchedErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  if (!w) {
    return (
      <div>
        <h1 className="sr-only">Workout not found</h1>
        <Card>
          <EmptyState icon={<Flame className="h-6 w-6" />} title="Workout not found" body="It may have been removed from the library." action={<Button onClick={() => nav('/app/fitness')}>Back to fitness</Button>} />
        </Card>
      </div>
    );
  }
  const cat = WORKOUT_CATEGORIES.find((c) => c.key === w.category)!;
  const related = workouts.filter((x) => x.category === w.category && x.id !== w.id).slice(0, 3);

  const finish = (completed: boolean) => {
    setRunning(false);
    setActive(false);
    const minutes = Math.max(1, Math.round(seconds / 60));
    // Abandoned sessions are recorded but never counted as completed (MVP-13).
    dispatch({ type: 'LOG_WORKOUT', session: { workoutId: w.id, title: w.title, category: w.category, durationMin: completed ? Math.max(minutes, 1) : minutes, date: today, status: completed ? 'completed' : 'abandoned' } });
    if (completed) toast.success('Workout complete! 💪', `${w.title} · ${fmt(seconds)}`);
    else toast.info('Session ended early', 'Saved as not completed — that’s okay.');
    setSeconds(0);
    setStep(0);
  };

  return (
    <div className="space-y-8">
      <div>
        <button onClick={() => nav('/app/fitness')} className="mb-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink-600 shadow-xs ring-1 ring-inset ring-ink-100 transition hover:text-green-700">
          <ArrowLeft className="h-4 w-4" /> Fitness
        </button>

        {/* ---------- Photo hero ---------- */}
        <section className="relative isolate overflow-hidden rounded-[34px] shadow-lift">
          <Photo photo={workoutPhoto(w)} alt="" shape="none" className="!absolute inset-0 -z-10 h-full w-full" kenBurns priority position="50% 35%" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-green-950/90 via-green-950/45 to-green-950/10" />
          <div className="flex min-h-[340px] flex-col justify-end p-6 sm:min-h-[400px] sm:p-10">
            <span className="glass inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-green-900">
              <Icon name={cat.icon} className="h-3.5 w-3.5" /> {cat.label}
            </span>
            <h1 className="mt-3 max-w-3xl font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[44px]">{w.title}</h1>
            <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-white/85">{w.description}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-white">
              <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
                <Clock className="h-4 w-4" /> {w.durationMin} min
              </span>
              <span className="glass-dark inline-flex items-center gap-2 rounded-full px-3 py-1.5 capitalize">
                <LevelMeter level={w.level} dark /> {w.level}
              </span>
              <span className="glass-dark rounded-full px-3 py-1.5 capitalize">{w.equipment === 'none' ? 'No equipment' : w.equipment}</span>
              <span className="glass-dark rounded-full px-3 py-1.5 capitalize">{w.location}</span>
              <span className="glass-dark rounded-full px-3 py-1.5">~{w.kcalEstimate} kcal (rough estimate)</span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:grid-rows-[auto_1fr]">
        {/* ---------- Timer (first on phones) ---------- */}
        <section aria-label="Workout timer" className={cn('relative self-start overflow-hidden rounded-[30px] p-6 text-center shadow-lift xl:col-span-4 xl:col-start-9 xl:row-start-1', active ? 'bg-forest text-white' : 'bg-white ring-1 ring-inset ring-ink-100')}>
          <p className={cn('font-mono text-[11px] uppercase tracking-[0.16em]', active ? 'text-green-200' : 'text-ink-400')}>{active ? (running ? 'In progress' : 'Paused') : 'Ready when you are'}</p>
          <p className={cn('num mt-2 text-[64px] leading-none', active ? 'text-white' : 'text-ink-900')} aria-live="polite">
            {fmt(seconds)}
          </p>
          {active && <p className="mt-2 text-sm font-semibold text-green-100">Now: {w.exercises[step].name}</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {!active ? (
              <Button
                size="lg"
                leftIcon={<Play className="h-5 w-5" />}
                onClick={() => {
                  setActive(true);
                  setRunning(true);
                }}
              >
                Start workout
              </Button>
            ) : (
              <>
                <Button variant="white" size="icon" aria-label="Previous exercise" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="butter" leftIcon={running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} onClick={() => setRunning((r) => !r)}>
                  {running ? 'Pause' : 'Resume'}
                </Button>
                {step < w.exercises.length - 1 ? (
                  <Button variant="white" size="icon" aria-label="Next exercise" onClick={() => setStep((s) => s + 1)}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button variant="white" leftIcon={<Check className="h-4 w-4" />} onClick={() => finish(true)}>
                    Complete
                  </Button>
                )}
              </>
            )}
          </div>
          {active && (
            <button onClick={() => finish(false)} className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white">
              <Square className="h-3.5 w-3.5" /> End early
            </button>
          )}
        </section>

        {/* ---------- Steps ---------- */}
        <Card className="card-pad xl:col-span-8 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <CardHeader title="Exercises" subtitle={`${w.exercises.length} steps`} icon={<ListOrdered className="h-5 w-5" />} action={active ? <span className="font-mono text-xs text-green-700">Step {step + 1} of {w.exercises.length}</span> : undefined} />
          {active && <ProgressBar value={(step + 1) / w.exercises.length} className="mb-4" label="Workout progress" />}
          <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[26px] before:top-6 before:w-0.5 before:bg-green-100">
            {w.exercises.map((e, i) => {
              const done = active && i < step;
              const now = active && i === step;
              return (
                <li key={e.name} className={cn('relative flex items-start gap-4 rounded-3xl p-3 transition', now ? 'bg-green-50 shadow-card ring-2 ring-inset ring-green-400' : done ? 'opacity-60' : 'hover:bg-ink-50/70')} aria-current={now ? 'step' : undefined}>
                  <span className={cn('relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-mono text-sm font-medium ring-4 ring-white', done ? 'bg-green-600 text-white' : now ? 'bg-green-700 text-white' : 'bg-green-100 text-green-800')}>
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-display text-[16px] font-semibold text-ink-900">{e.name}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{e.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* ---------- Video · schedule · safety ---------- */}
        <div className="space-y-6 self-start xl:col-span-4 xl:col-start-9 xl:row-start-2">
          <VideoCard video={workoutVideo(w)} subtitle="Related video preview" aspect="aspect-[16/10]" />

          <Card className="card-pad">
            <CardHeader title={<span className="flex items-center gap-2">Schedule it <PhaseBadge phase={2} /></span>} subtitle="Get a “Your scheduled workout is ready” reminder" icon={<CalendarPlus className="h-5 w-5" />} />
            <Button variant="outline" className="w-full" leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => setSchedOpen(true)}>
              Add to my schedule
            </Button>
          </Card>
          <Notice tone="safety">Stop if you feel pain, dizziness or unwell. If you have a health condition or are pregnant, check with a qualified professional first.</Notice>
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <SectionTitle eyebrow="Keep going" title={`More ${cat.label.toLowerCase()} workouts`} />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((r) => (
              <WorkoutCard key={r.id} w={r} />
            ))}
          </div>
        </section>
      )}

      <Modal
        open={schedOpen}
        onClose={() => setSchedOpen(false)}
        title="Schedule workout"
        description={w.title}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSchedOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (schedDate < today) return setSchedErr('Choose today or a future date.');
                dispatch({ type: 'ADD_REMINDER', reminder: { title: w.title, type: 'workout', time: schedTime, date: schedDate, enabled: true } });
                setSchedErr(null);
                setSchedOpen(false);
                toast.success('Workout scheduled', 'We’ll remind you (demo — no push sent).');
              }}
            >
              Schedule
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="sc-date" error={schedErr}>
            <Input id="sc-date" type="date" min={today} value={schedDate} onChange={(e) => setSchedDate(e.target.value)} invalid={!!schedErr} />
          </Field>
          <Field label="Time" htmlFor="sc-time">
            <Input id="sc-time" type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
