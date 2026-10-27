import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Dumbbell, Flame, Footprints, History, Pencil, Plus, Route, Sparkles, Timer, Trash2, Wand2 } from 'lucide-react';
import { dailySeries, estimateDistanceKm, formatDate, lastNDays, palette, stepsOn, WORKOUT_CATEGORIES, workoutsOn, type Workout, type WorkoutCategory } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { LogWorkoutModal } from '@/user/components/LogWorkoutModal';
import { BarTrend } from '@/components/charts/Charts';
import { LeafPair } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  HScroll,
  Input,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  PhaseBadge,
  ProgressRing,
  SearchInput,
  SectionTitle,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, paginate, useDemoLoading } from '@/lib/utils';
import { HeroHeading, HeroPanel, HeroStat } from '@/user/components/wellness-ui/Hero';
import { themeColor } from '@/user/components/wellness-ui/theme';
import { WorkoutCard } from '@/user/components/wellness-ui/WorkoutCard';

const SORTS = { recommended: 'Recommended', short: 'Shortest first', long: 'Longest first', az: 'A–Z' } as const;
const CAT_TONE: Record<WorkoutCategory, string> = {
  strength: 'bg-peach-50 text-peach-600',
  walking: 'bg-green-50 text-green-700',
  yoga: 'bg-lavender-50 text-lavender-600',
  mobility: 'bg-sky-50 text-sky-600',
  cardio: 'bg-rose-50 text-rose-600',
  pilates: 'bg-butter-50 text-butter-600',
  stretching: 'bg-indigo-50 text-indigo-600',
  meditation: 'bg-lavender-50 text-lavender-600',
};

export default function Fitness() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const loading = useDemoLoading();
  const { today, workouts, sessions } = state;
  const [cat, setCat] = useState<WorkoutCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('all');
  const [sort, setSort] = useState<keyof typeof SORTS>('recommended');
  const [page, setPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [logOpen, setLogOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [stepsVal, setStepsVal] = useState(String(stepsOn(state, today)));
  const [stepsErr, setStepsErr] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  // §27 personalised workout builder
  const [goal, setGoal] = useState('strength');
  const [lvl, setLvl] = useState('beginner');
  const [dur, setDur] = useState('20');
  const [equip, setEquip] = useState('none');
  const [loc, setLoc] = useState('home');
  const [generated, setGenerated] = useState<Workout | null>(null);

  const series = useMemo(() => dailySeries(state, 14), [state]);
  const week = lastNDays(today, 7);
  const weekSessions = week.flatMap((d) => workoutsOn(state, d));
  const weekMinutes = weekSessions.reduce((a, s) => a + s.durationMin, 0);
  const stepsToday = stepsOn(state, today);
  const weekSteps = week.reduce((a, d) => a + stepsOn(state, d), 0);

  const filtered = useMemo(() => {
    let xs = workouts.filter((w) => (cat === 'all' || w.category === cat) && (level === 'all' || w.level === level) && `${w.title} ${w.description}`.toLowerCase().includes(q.toLowerCase()));
    if (sort === 'short') xs = [...xs].sort((a, b) => a.durationMin - b.durationMin);
    if (sort === 'long') xs = [...xs].sort((a, b) => b.durationMin - a.durationMin);
    if (sort === 'az') xs = [...xs].sort((a, b) => a.title.localeCompare(b.title));
    return xs;
  }, [workouts, cat, level, q, sort]);
  const pg = paginate(filtered, page, 6);
  const history = sessions.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const hpg = paginate(history, histPage, 6);

  const generate = () => {
    // Deterministic rules (no AI): match category, level and equipment, then nearest duration.
    const target = Number(dur);
    const pool = workouts.filter((w) => w.category !== 'meditation' && (goal === 'any' || w.category === goal || (goal === 'strength' && w.category === 'pilates')));
    const scored = (pool.length ? pool : workouts)
      .map((w) => ({ w, score: Math.abs(w.durationMin - target) + (w.level === lvl ? 0 : 15) + (w.equipment === equip || equip === 'any' ? 0 : 10) + (w.location === loc ? 0 : 6) }))
      .sort((a, b) => a.score - b.score);
    setGenerated(scored[0]?.w ?? null);
  };

  const pickCategory = (c: WorkoutCategory | 'all') => {
    setCat(c);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fitness & activity"
        subtitle="Move in ways that feel good. Every bit of movement counts."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Daily Wellness', to: '/app/hydration' }, { label: 'Fitness & workouts' }]}
        actions={
          <>
            <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setStepsOpen(true)}>
              Update steps
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLogOpen(true)}>
              Log workout
            </Button>
          </>
        }
      />

      {/* ---------- Hero: today's movement ---------- */}
      <HeroPanel tone="forest" label="Today’s movement">
        <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="mx-auto shrink-0 rounded-full bg-white/[0.06] p-2 ring-1 ring-inset ring-white/10 sm:mx-0">
                <ProgressRing value={stepsToday / state.stepTarget} size={168} stroke={14} color={themeColor('green-300', palette.green[300])} track="rgba(255,255,255,.12)">
                  <Footprints className="h-5 w-5 text-green-200" />
                  <p className="num mt-1 text-[30px] leading-none text-white">{stepsToday.toLocaleString()}</p>
                  <p className="mt-1 text-[11px] font-semibold text-white/70">of {state.stepTarget.toLocaleString()} steps</p>
                </ProgressRing>
              </div>
              <div className="min-w-0">
                <HeroHeading
                  dark
                  eyebrow={`Today · ${formatDate(today, 'medium')}`}
                  title={stepsToday >= state.stepTarget ? 'Step goal reached!' : `${(state.stepTarget - stepsToday).toLocaleString()} steps to go`}
                  sub="Entered manually — a short walk after a meal is an easy way to add more."
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="butter" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setStepsOpen(true)}>
                    Add steps manually
                  </Button>
                  <Link to="/app/integrations" title="Connect Apple Health / Health Connect to sync steps automatically" className="inline-flex min-h-[36px] items-center gap-2 rounded-full px-3.5 py-1 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/10">
                    Sync steps automatically <PhaseBadge phase={2} />
                  </Link>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <HeroStat dark label="Distance*" value={estimateDistanceKm(stepsToday).toFixed(1)} unit="km" hint="Estimate" />
              <HeroStat dark label="Active today" value={series[series.length - 1]?.activeMin ?? 0} unit="min" />
              <HeroStat dark label="Workouts · 7d" value={weekSessions.length} unit={weekSessions.length === 1 ? 'session' : 'sessions'} />
              <HeroStat dark label="Active · 7d" value={weekMinutes} unit="min" hint={`${weekSteps.toLocaleString()} steps`} />
            </div>
            <p className="mt-3 text-[11px] text-white/60">*Distance is an estimate based on an average stride.</p>
          </div>
          <div className="relative mx-auto hidden w-full max-w-[320px] xl:block">
            <LeafPair className="-left-8 -top-6 h-36 w-36" />
            <Photo photo="senior-woman-active" alt="Women exercising together outdoors in a park" shape="arch" className="relative h-[340px] w-full ring-4 ring-white/10" position="30% 40%" priority />
            <div className="glass absolute -bottom-3 -left-6 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-lift">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-peach-100 text-peach-600">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Weekly steps</p>
                <p className="num text-base text-ink-900">{weekSteps.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </HeroPanel>

      {/* ---------- Video previews ---------- */}
      <section>
        <SectionTitle eyebrow="Watch & follow along" title="Move with a video" subtitle="Short previews with step-by-step routines you can do at your own pace" />
        <HScroll label="Movement videos">
          {(['yoga-flow', 'strength', 'walk-outdoors'] as const).map((v) => (
            <VideoCard key={v} video={v} className="!w-[272px] shrink-0 sm:!w-[340px]" aspect="aspect-[16/10]" />
          ))}
        </HScroll>
      </section>

      {/* ---------- Steps + builder ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-7">
          <CardHeader
            title="Steps"
            subtitle="Today and the last 14 days"
            icon={<Footprints className="h-5 w-5" />}
            action={
              <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setStepsOpen(true)}>
                Add steps manually
              </Button>
            }
          />
          {loading ? (
            <Skeleton className="h-[240px] w-full rounded-2xl" />
          ) : (
            <BarTrend data={series} series={[{ key: 'steps', name: 'Steps', color: palette.green[500] }]} height={240} target={{ value: state.stepTarget, label: 'Goal' }} highlight={(d) => ((d.steps as number) >= state.stepTarget ? palette.green[600] : palette.green[200])} />
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Week average', v: Math.round(weekSteps / 7).toLocaleString() },
              { l: 'Goal days · 14d', v: `${series.filter((p) => p.steps >= state.stepTarget).length}` },
              { l: 'Best day', v: Math.max(0, ...series.map((p) => p.steps)).toLocaleString() },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl bg-green-50 px-2 py-2.5">
                <p className="num text-lg text-ink-900">{x.v}</p>
                <p className="text-[11px] font-semibold text-green-700">{x.l}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="card-pad relative overflow-hidden xl:col-span-5">
          <span aria-hidden className="leaf absolute -right-8 -top-8 h-28 w-28 bg-lavender-50" />
          <CardHeader className="relative" title={<span className="flex items-center gap-2">Build my workout <PhaseBadge phase={2} /></span>} subtitle="Personalised from your preferences (SRS §27)" icon={<Wand2 className="h-5 w-5" />} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Goal" htmlFor="pw-goal">
              <Select id="pw-goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="yoga">Yoga</option>
                <option value="mobility">Mobility</option>
                <option value="walking">Walking</option>
                <option value="any">Surprise me</option>
              </Select>
            </Field>
            <Field label="Fitness level" htmlFor="pw-lvl">
              <Select id="pw-lvl" value={lvl} onChange={(e) => setLvl(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </Field>
            <Field label="Duration" htmlFor="pw-dur">
              <Select id="pw-dur" value={dur} onChange={(e) => setDur(e.target.value)}>
                {[10, 15, 20, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Equipment" htmlFor="pw-eq">
              <Select id="pw-eq" value={equip} onChange={(e) => setEquip(e.target.value)}>
                <option value="none">None</option>
                <option value="mat">Mat</option>
                <option value="dumbbells">Dumbbells</option>
                <option value="band">Resistance band</option>
                <option value="any">Any</option>
              </Select>
            </Field>
            <Field label="Location" htmlFor="pw-loc" className="col-span-2">
              <Select id="pw-loc" value={loc} onChange={(e) => setLoc(e.target.value)}>
                <option value="home">Home</option>
                <option value="gym">Gym</option>
                <option value="outdoors">Outdoors</option>
              </Select>
            </Field>
          </div>
          <Button className="mt-4 w-full" leftIcon={<Sparkles className="h-4 w-4" />} onClick={generate}>
            Generate workout
          </Button>
          {generated && (
            <div className="mt-4 animate-fade-up overflow-hidden rounded-3xl bg-green-50 ring-1 ring-inset ring-green-200">
              <div className="flex items-center gap-3 p-4 pb-2">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', CAT_TONE[generated.category])}>
                  <Icon name={WORKOUT_CATEGORIES.find((c) => c.key === generated.category)?.icon ?? 'sparkles'} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-green-700">Suggested for you</p>
                  <p className="truncate font-display text-[16px] font-semibold text-ink-900">{generated.title}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-white px-2.5 py-1 font-mono text-[11px] text-green-800">{generated.durationMin} min</span>
              </div>
              <ol className="space-y-1.5 px-4 pb-3 text-sm text-ink-600">
                {generated.exercises.slice(0, 4).map((e, i) => (
                  <li key={e.name} className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[10.5px] text-green-800 ring-1 ring-green-200">{i + 1}</span>
                    <span>
                      <strong className="font-semibold text-ink-800">{e.name}</strong> — {e.detail}
                    </span>
                  </li>
                ))}
              </ol>
              <Link to={`/app/fitness/${generated.id}`} className="flex items-center justify-between border-t border-green-200 bg-white/60 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-white">
                Open full workout <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      <Notice tone="safety">Workouts are general wellness guidance. We never prescribe exercise based on assumed hormonal states — listen to your body and stop if anything hurts.</Notice>

      {/* ---------- Library ---------- */}
      <section>
        <SectionTitle
          eyebrow="Library"
          title="Workout library"
          subtitle={`${filtered.length} workout${filtered.length === 1 ? '' : 's'}`}
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <SearchInput
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                placeholder="Search workouts"
                className="sm:w-60"
              />
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Select aria-label="Level" value={level} onChange={(e) => (setLevel(e.target.value), setPage(1))}>
                  <option value="all">All levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
                <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>
                  {Object.entries(SORTS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          }
        />
        <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
          <button type="button" aria-pressed={cat === 'all'} onClick={() => pickCategory('all')} className={cn('pill-tab', cat === 'all' ? 'pill-tab-on' : 'pill-tab-off')}>
            All
          </button>
          {WORKOUT_CATEGORIES.map((c) => (
            <button key={c.key} type="button" aria-pressed={cat === c.key} onClick={() => pickCategory(c.key)} className={cn('pill-tab pl-1.5', cat === c.key ? 'pill-tab-on' : 'pill-tab-off')}>
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', cat === c.key ? 'bg-white/15 text-white' : CAT_TONE[c.key])}>
                <Icon name={c.icon} className="h-3.5 w-3.5" />
              </span>
              {c.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl bg-white ring-1 ring-inset ring-ink-100">
                <Skeleton className="h-44 rounded-none" />
                <div className="space-y-2 p-5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : pg.items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Dumbbell className="h-6 w-6" />}
              title="No workouts match"
              body="Try a different category or clear your search."
              action={
                <Button variant="outline" size="sm" onClick={() => (setQ(''), setCat('all'), setLevel('all'))}>
                  Clear filters
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {pg.items.map((w) => (
              <WorkoutCard key={w.id} w={w} />
            ))}
          </div>
        )}
        <div className="mt-5">
          <Pagination page={pg.page} pages={pg.pages} onChange={setPage} />
        </div>
      </section>

      {/* ---------- History ---------- */}
      <Card className="card-pad">
        <CardHeader title="Workout history" subtitle={`${history.length} sessions logged`} icon={<History className="h-5 w-5" />} />
        {history.length === 0 ? (
          <EmptyState icon={<Dumbbell className="h-6 w-6" />} title="No workouts yet" body="Start one from the library or log one you did elsewhere." action={<Button size="sm" onClick={() => setLogOpen(true)}>Log a workout</Button>} />
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {hpg.items.map((s) => {
              const c = WORKOUT_CATEGORIES.find((x) => x.key === s.category)!;
              return (
                <li key={s.id} className="flex min-w-0 items-center gap-3 rounded-2xl p-3 ring-1 ring-inset ring-ink-100">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', CAT_TONE[s.category])}>
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{s.title}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-500">
                      <span>{formatDate(s.date)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" /> {s.durationMin} min
                      </span>
                      <span className="hidden sm:inline">{c.label}</span>
                    </p>
                  </div>
                  <Badge tone={s.status === 'completed' ? 'green' : 'gray'}>{s.status}</Badge>
                  <button aria-label="Delete session" onClick={() => setDelId(s.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {history.length > 0 && (
          <div className="mt-4 border-t border-ink-100 pt-4">
            <Pagination page={hpg.page} pages={hpg.pages} onChange={setHistPage} total={hpg.total} label="sessions" />
          </div>
        )}
        <Link to="/app/insights/progress" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-900">
          <Route className="h-4 w-4" /> See your weekly progress charts
        </Link>
      </Card>

      <LogWorkoutModal open={logOpen} onClose={() => setLogOpen(false)} />
      <Modal
        open={stepsOpen}
        onClose={() => setStepsOpen(false)}
        title="Update today’s steps"
        description="Manual entry for now — Apple Health / Health Connect sync arrives in Phase 2."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStepsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const v = Number(stepsVal);
                if (!Number.isInteger(v) || v < 0 || v > 100000) return setStepsErr('Enter a whole number between 0 and 100,000.');
                dispatch({ type: 'SET_STEPS', date: today, steps: v });
                setStepsErr(null);
                setStepsOpen(false);
                toast.success('Steps updated', `${v.toLocaleString()} steps today`);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Steps" htmlFor="st-val" error={stepsErr}>
          <Input id="st-val" type="number" inputMode="numeric" value={stepsVal} onChange={(e) => setStepsVal(e.target.value)} invalid={!!stepsErr} leftIcon={<Footprints className="h-4 w-4" />} />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1000, 2500, 5000].map((n) => (
            <button key={n} type="button" onClick={() => setStepsVal(String((Number(stepsVal) || 0) + n))} className="chip border-green-200 bg-green-50 text-green-800 hover:bg-green-100">
              +{n.toLocaleString()}
            </button>
          ))}
        </div>
      </Modal>
      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        danger
        title="Delete this workout?"
        body="It will be removed from your history and weekly totals."
        confirmLabel="Delete"
        onConfirm={() => {
          if (delId) dispatch({ type: 'DELETE_WORKOUT', id: delId });
          toast.success('Workout deleted');
        }}
      />
    </div>
  );
}
