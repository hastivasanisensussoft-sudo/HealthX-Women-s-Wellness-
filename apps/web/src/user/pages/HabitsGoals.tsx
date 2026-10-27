import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Check, ClipboardCheck, Dumbbell, Flame, Footprints, GlassWater, ListChecks, Moon, Pause, Play, Plus, RefreshCw, Smile, Target, Trash2, Wind, type LucideIcon } from 'lucide-react';
import { formatDate, goalProgress, habitDone, habitsDueOn, lastNDays, palette, streak, weekday, type Habit, type WellnessGoal } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { PlanList } from '@/user/components/Cards';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  IconTile,
  Input,
  Modal,
  Notice,
  PageHeader,
  PhaseBadge,
  ProgressRing,
  RouteTabs,
  SectionTitle,
  Select,
  Tooltip,
  useToast,
} from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { GOALS_TABS } from '@/user/layout/sectionTabs';
import { BadgeCard } from '@/user/components/wellness-ui/Badges';
import { HeroHeading, HeroPanel, HeroStat } from '@/user/components/wellness-ui/Hero';
import { themeColor } from '@/user/components/wellness-ui/theme';

type View = 'goals' | 'habits' | 'plan';
const VIEW_META: Record<View, { title: string; subtitle: string; eyebrow: string }> = {
  goals: { title: 'Daily goals', subtitle: 'Gentle targets for steps, water, sleep and check-ins — celebrate progress, never pressure.', eyebrow: 'Your goals' },
  habits: { title: 'Habits', subtitle: 'Small, consistent steps. Tick them off day by day and watch your streaks grow.', eyebrow: 'This week' },
  plan: { title: 'Daily wellness plan', subtitle: 'Today’s plan, generated from your check-in and goals (rules-based).', eyebrow: 'Today' },
};
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const METRICS: { key: WellnessGoal['metric']; label: string; unit: string; period: WellnessGoal['period'] }[] = [
  { key: 'steps', label: 'Steps per day', unit: 'steps', period: 'daily' },
  { key: 'water', label: 'Water per day (ml)', unit: 'ml', period: 'daily' },
  { key: 'sleep', label: 'Sleep per night (hours)', unit: 'h', period: 'daily' },
  { key: 'workouts', label: 'Workouts per week', unit: 'sessions', period: 'weekly' },
  { key: 'checkins', label: 'Check-ins per week', unit: 'check-ins', period: 'weekly' },
  { key: 'mindful', label: 'Breathing sessions per week', unit: 'sessions', period: 'weekly' },
];
const LIMITS: Record<WellnessGoal['metric'], [number, number]> = { steps: [1000, 40000], water: [500, 6000], sleep: [5, 10], workouts: [1, 14], checkins: [1, 7], mindful: [1, 14] };

const METRIC_STYLE: Record<WellnessGoal['metric'], { icon: LucideIcon; ring: string; track: string; tile: string }> = {
  steps: { icon: Footprints, ring: themeColor('green-500', palette.green[500]), track: themeColor('green-100', palette.green[100]), tile: 'bg-green-50 text-green-700' },
  water: { icon: GlassWater, ring: themeColor('sky-500', palette.sky[500]), track: themeColor('sky-100', palette.sky[100]), tile: 'bg-sky-50 text-sky-600' },
  sleep: { icon: Moon, ring: themeColor('indigo-500', palette.indigo[500]), track: themeColor('indigo-100', palette.indigo[100]), tile: 'bg-indigo-50 text-indigo-600' },
  workouts: { icon: Dumbbell, ring: themeColor('peach-500', palette.peach[500]), track: themeColor('peach-100', palette.peach[100]), tile: 'bg-peach-50 text-peach-600' },
  checkins: { icon: Smile, ring: themeColor('lavender-500', palette.lavender[500]), track: themeColor('lavender-100', palette.lavender[100]), tile: 'bg-lavender-50 text-lavender-600' },
  mindful: { icon: Wind, ring: themeColor('lavender-500', palette.lavender[500]), track: themeColor('lavender-100', palette.lavender[100]), tile: 'bg-lavender-50 text-lavender-600' },
};
const HABIT_TILE: Record<Habit['category'], string> = {
  movement: 'bg-green-50 text-green-700',
  hydration: 'bg-sky-50 text-sky-600',
  mindfulness: 'bg-lavender-50 text-lavender-600',
  nutrition: 'bg-peach-50 text-peach-600',
  sleep: 'bg-indigo-50 text-indigo-600',
};

/** Goals & Habits group (SRS §34–§36) — one component, three routed views. */
export default function HabitsGoals({ view = 'goals' }: { view?: View }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const { today } = state;
  const [habitOpen, setHabitOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [delHabit, setDelHabit] = useState<Habit | null>(null);
  const [delGoal, setDelGoal] = useState<WellnessGoal | null>(null);
  const [h, setH] = useState({ title: '', category: 'movement' as Habit['category'], days: [] as number[] });
  const [g, setG] = useState({ title: '', metric: 'steps' as WellnessGoal['metric'], target: '8000' });
  const [err, setErr] = useState<Record<string, string>>({});
  const week = lastNDays(today, 7);
  const month = lastNDays(today, 28);

  const saveHabit = () => {
    if (h.title.trim().length < 3 || h.title.trim().length > 50) return setErr({ habit: 'Use 3–50 characters.' });
    const icon = { hydration: 'glass-water', movement: 'footprints', mindfulness: 'wind', nutrition: 'apple', sleep: 'moon' }[h.category];
    dispatch({ type: 'ADD_HABIT', habit: { title: h.title.trim(), category: h.category, icon, days: h.days } });
    toast.success('Habit added', h.title.trim());
    setHabitOpen(false);
    setH({ title: '', category: 'movement', days: [] });
    setErr({});
  };

  const saveGoal = () => {
    const m = METRICS.find((x) => x.key === g.metric)!;
    const v = Number(g.target);
    const [min, max] = LIMITS[g.metric];
    const e: Record<string, string> = {};
    if (!Number.isFinite(v) || v < min || v > max) e.target = `Choose a target between ${min.toLocaleString()} and ${max.toLocaleString()}.`;
    if (g.title && g.title.length > 60) e.title = 'Keep it under 60 characters.';
    setErr(e);
    if (Object.keys(e).length) return;
    const title = g.title.trim() || `${m.label.split(' per ')[0]}: ${v.toLocaleString()} ${m.unit} ${m.period === 'daily' ? 'a day' : 'a week'}`;
    dispatch({ type: 'ADD_GOAL', goal: { title, metric: g.metric, target: v, unit: m.unit, period: m.period } });
    toast.success('Goal created', title);
    setGoalOpen(false);
    setG({ title: '', metric: 'steps', target: '8000' });
  };

  // Summary figures for the heroes
  const activeGoals = state.goals.filter((x) => x.status === 'active');
  const avgGoal = activeGoals.length ? activeGoals.reduce((a, x) => a + Math.min(1, goalProgress(state, x).pct), 0) / activeGoals.length : 0;
  const dueToday = habitsDueOn(state, today);
  const doneToday = dueToday.filter((x) => habitDone(state, x.id, today)).length;
  const dueWeek = week.flatMap((d) => habitsDueOn(state, d).map((x) => habitDone(state, x.id, d)));
  const weekPct = dueWeek.length ? Math.round((dueWeek.filter(Boolean).length / dueWeek.length) * 100) : null;
  const bestStreak = state.habits.reduce((a, x) => Math.max(a, streak(state, (d) => habitDone(state, x.id, d))), 0);
  const planDone = state.plan.items.filter((i) => i.done).length;

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title={VIEW_META[view].title}
          subtitle={VIEW_META[view].subtitle}
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Goals & Habits', to: '/app/goals' }, { label: VIEW_META[view].title }]}
          actions={
            view === 'plan' ? (
              <ButtonLink to="/app/check-in" variant="outline">
                Update today’s check-in
              </ButtonLink>
            ) : view === 'habits' ? (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setHabitOpen(true)}>
                New habit
              </Button>
            ) : (
              <Button leftIcon={<Target className="h-4 w-4" />} onClick={() => setGoalOpen(true)}>
                New goal
              </Button>
            )
          }
        />
        <RouteTabs tabs={GOALS_TABS} label="Goals & habits pages" className="!mb-0" />
      </div>

      {/* ================= PLAN ================= */}
      {view === 'plan' && (
        <>
          <HeroPanel tone="forest" label="Plan progress">
            <div className="flex flex-col items-center gap-8 md:flex-row">
              <div className="shrink-0 rounded-full bg-white/[0.06] p-2 ring-1 ring-inset ring-white/10">
                <ProgressRing value={planDone / Math.max(1, state.plan.items.length)} size={176} stroke={15} color={themeColor('green-300', palette.green[300])} track="rgba(255,255,255,.12)">
                  <p className="num text-[42px] leading-none text-white">
                    {planDone}/{state.plan.items.length}
                  </p>
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70">done today</p>
                </ProgressRing>
              </div>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <HeroHeading
                  dark
                  eyebrow={`${VIEW_META.plan.eyebrow} · ${formatDate(today, 'medium')}`}
                  title={planDone === state.plan.items.length && state.plan.items.length > 0 ? 'All done — lovely work!' : 'Small steps for today'}
                  sub="Your plan updates after each daily check-in. AI-personalised plans arrive in a later phase."
                />
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <ButtonLink to="/app/goals" size="sm" variant="butter" leftIcon={<Target className="h-4 w-4" />}>
                    Review my goals
                  </ButtonLink>
                  <PhaseBadge phase={2} />
                </div>
              </div>
            </div>
          </HeroPanel>

          <div className="grid gap-6 xl:grid-cols-12">
            <Card className="card-pad xl:col-span-7">
              <CardHeader
                title="Today’s wellness plan"
                subtitle="Generated from your check-in and goals (rules-based)"
                icon={<ClipboardCheck className="h-5 w-5" />}
                action={
                  <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => dispatch({ type: 'REGENERATE_PLAN' })}>
                    Refresh
                  </Button>
                }
              />
              {state.plan.items.length ? (
                <PlanList items={state.plan.items} onToggle={(id) => dispatch({ type: 'TOGGLE_PLAN_ITEM', id })} />
              ) : (
                <EmptyState icon={<Target className="h-6 w-6" />} title="No plan yet" body="Complete today’s check-in to get a gentle plan." action={<ButtonLink to="/app/check-in" size="sm">Check in</ButtonLink>} />
              )}
            </Card>
            <div className="space-y-6 xl:col-span-5">
              <Card className="card-pad">
                <CardHeader title="How your plan is made" icon={<ListChecks className="h-5 w-5" />} />
                <ol className="space-y-3">
                  {[
                    { t: 'Your check-in', d: 'Mood, energy, stress and sleep from today.' },
                    { t: 'Your goals & habits', d: 'What you’ve chosen to focus on.' },
                    { t: 'A gentle plan', d: 'Simple rules pick a few realistic tasks — no AI, no pressure.' },
                  ].map((s, i) => (
                    <li key={s.t} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 font-mono text-sm text-green-800">{i + 1}</span>
                      <div>
                        <p className="font-semibold text-ink-900">{s.t}</p>
                        <p className="text-sm text-ink-500">{s.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <IconTile to="/app/hydration" tone="sky" icon={<GlassWater className="h-5 w-5" />} label="Water" hint="Log a glass" />
                <IconTile to="/app/fitness" tone="green" icon={<Footprints className="h-5 w-5" />} label="Move" hint="Workouts & steps" />
                <IconTile to="/app/stress" tone="lavender" icon={<Wind className="h-5 w-5" />} label="Breathe" hint="One-minute reset" />
                <IconTile to="/app/sleep" tone="indigo" icon={<Moon className="h-5 w-5" />} label="Sleep" hint="Log last night" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= HABITS ================= */}
      {view === 'habits' && (
        <>
          <HeroPanel tone="wash" label="Habit summary">
            <div className="grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <HeroHeading eyebrow={`${VIEW_META.habits.eyebrow} · ${formatDate(week[0], 'short')} – ${formatDate(today, 'short')}`} title={dueToday.length ? `${doneToday} of ${dueToday.length} done today` : 'Nothing due today'} sub="Tick a circle to mark a day done. Missed a day? That’s okay — streaks are encouragement, not a test." />
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <HeroStat dense label="Today" value={`${doneToday}/${dueToday.length}`} icon={<Check className="h-4 w-4" />} />
                <HeroStat dense label="This week" value={weekPct ?? '—'} unit={weekPct !== null ? '%' : undefined} icon={<CalendarCheck className="h-4 w-4" />} />
                <HeroStat dense label="Best streak" value={bestStreak} unit={bestStreak === 1 ? 'day' : 'days'} icon={<Flame className="h-4 w-4 text-peach-500" />} />
              </div>
            </div>
          </HeroPanel>

          {state.habits.length === 0 ? (
            <Card>
              <EmptyState icon={<Flame className="h-6 w-6" />} title="No habits yet" body="Start with one tiny habit — like a glass of water with breakfast." action={<Button onClick={() => setHabitOpen(true)}>Add a habit</Button>} />
            </Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {state.habits.map((hb) => {
                const s = streak(state, (d) => habitDone(state, hb.id, d));
                const dueMonth = month.filter((d) => hb.days.length === 0 || hb.days.includes(weekday(d)));
                const doneMonth = dueMonth.filter((d) => habitDone(state, hb.id, d)).length;
                return (
                  <Card key={hb.id} className="card-pad">
                    <div className="flex items-start gap-3">
                      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', HABIT_TILE[hb.category])}>
                        <Icon name={hb.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-[17px] font-semibold leading-snug text-ink-900">{hb.title}</h3>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
                          <span className="capitalize">
                            {hb.days.length ? hb.days.map((x) => DAY_LABELS[x]).join(' ') : 'Every day'} · {hb.category}
                          </span>
                          <Badge tone={s ? 'peach' : 'gray'} icon={<Flame className="h-3 w-3" />}>
                            {s} day{s === 1 ? '' : 's'}
                          </Badge>
                        </p>
                      </div>
                      <button aria-label="Delete habit" onClick={() => setDelHabit(hb)} className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-danger-soft hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-7 gap-0.5 sm:gap-1.5">
                      {week.map((d) => {
                        const due = hb.days.length === 0 || hb.days.includes(weekday(d));
                        const done = habitDone(state, hb.id, d);
                        return (
                          <div key={d} className="flex flex-col items-center gap-1">
                            <span className={cn('font-mono text-[10.5px] uppercase', d === today ? 'font-medium text-green-700' : 'text-ink-400')}>{formatDate(d, 'weekday').slice(0, 2)}</span>
                            <button
                              disabled={!due}
                              aria-label={`${hb.title} on ${formatDate(d)}: ${done ? 'done' : 'not done'}`}
                              aria-pressed={due ? done : undefined}
                              onClick={() => dispatch({ type: 'TOGGLE_HABIT', habitId: hb.id, date: d })}
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-full border-2 transition sm:h-11 sm:w-11',
                                !due && 'cursor-default border-transparent bg-ink-50 text-ink-300',
                                due && done && 'border-green-600 bg-green-600 text-white shadow-soft',
                                due && !done && 'border-ink-200 bg-white hover:border-green-400 hover:bg-green-50',
                                d === today && due && !done && 'border-green-400 border-dashed',
                              )}
                            >
                              {done && due ? <Check className="h-5 w-5" /> : !due ? <span className="h-1 w-1 rounded-full bg-ink-300" /> : null}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink-50/70 p-3">
                      <div className="grid flex-1 grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px]" aria-hidden>
                        {month.map((d) => {
                          const due = hb.days.length === 0 || hb.days.includes(weekday(d));
                          const done = habitDone(state, hb.id, d);
                          return <span key={d} title={formatDate(d, 'short')} className={cn('aspect-square rounded-[3px]', !due ? 'bg-transparent' : done ? 'bg-green-500' : 'bg-ink-200/70')} />;
                        })}
                      </div>
                      <p className="shrink-0 text-xs font-semibold text-ink-500">
                        <span className="num text-sm text-ink-900">{doneMonth}</span>/{dueMonth.length} · 4 wks
                      </p>
                    </div>
                  </Card>
                );
              })}
              <button type="button" onClick={() => setHabitOpen(true)} className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-200 bg-green-50/40 p-6 text-green-800 transition hover:border-green-400 hover:bg-green-50">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-soft">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="font-display text-[16px] font-semibold">Add another habit</span>
                <span className="text-sm text-ink-500">Keep it tiny and specific.</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ================= GOALS ================= */}
      {view === 'goals' && (
        <>
          <HeroPanel tone="wash" label="Goal summary">
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <ProgressRing value={avgGoal} size={150} stroke={14} color={themeColor('green-600', palette.green[600])} track={themeColor('white', '#FFFFFF')}>
                <p className="num text-[36px] leading-none text-ink-900">{Math.round(avgGoal * 100)}%</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">avg progress</p>
              </ProgressRing>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <HeroHeading
                  eyebrow={VIEW_META.goals.eyebrow}
                  title={`${activeGoals.length} active · ${state.goals.filter((x) => x.status === 'completed').length} completed`}
                  sub="Daily goals reset each day and weekly goals every Monday. Pause any goal whenever life gets busy."
                />
                <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                  {activeGoals.slice(0, 4).map((x) => {
                    const M = METRIC_STYLE[x.metric];
                    return (
                      <span key={x.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-xs">
                        <M.icon className="h-3.5 w-3.5" /> {Math.round(Math.min(1, goalProgress(state, x).pct) * 100)}% · {x.title.length > 26 ? `${x.title.slice(0, 24)}…` : x.title}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </HeroPanel>

          {state.goals.length === 0 ? (
            <Card>
              <EmptyState icon={<Target className="h-6 w-6" />} title="No goals yet" body="Create a gentle goal — steps, water, sleep or check-ins." action={<Button onClick={() => setGoalOpen(true)}>Create a goal</Button>} />
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {state.goals.map((goal) => {
                const p = goalProgress(state, goal);
                const M = METRIC_STYLE[goal.metric];
                return (
                  <Card key={goal.id} className={cn('card-pad flex flex-col', goal.status === 'paused' && 'bg-ink-50/60')}>
                    <div className="flex items-start justify-between gap-3">
                      <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', M.tile)}>
                        <M.icon className="h-5 w-5" />
                      </span>
                      <Badge tone={goal.status === 'completed' ? 'green' : goal.status === 'paused' ? 'gray' : 'mint'} className="capitalize">
                        {goal.status}
                      </Badge>
                    </div>
                    <div className={cn('mt-4 flex items-center gap-4', goal.status === 'paused' && 'opacity-70')}>
                      <ProgressRing value={p.pct} size={92} stroke={10} color={goal.status === 'completed' ? themeColor('green-700', palette.green[700]) : M.ring} track={M.track}>
                        <span className="num text-[20px] text-ink-900">{Math.round(p.pct * 100)}%</span>
                      </ProgressRing>
                      <div className="min-w-0">
                        <h3 className="font-display text-[17px] font-semibold leading-snug text-ink-900">{goal.title}</h3>
                        <p className="mt-0.5 text-sm text-ink-500">{p.label}</p>
                      </div>
                    </div>
                    <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
                      {goal.period === 'daily' ? 'Resets daily' : 'Resets every Monday'} · since {formatDate(goal.createdAt, 'short')}
                    </p>
                    <div className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-4">
                      {goal.status !== 'completed' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Check className="h-4 w-4" />}
                          onClick={() => {
                            dispatch({ type: 'UPDATE_GOAL', id: goal.id, patch: { status: 'completed' } });
                            toast.success('Goal completed 🎉', goal.title);
                          }}
                        >
                          Mark complete
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                          <Check className="h-4 w-4" /> Completed — nice work!
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1">
                        {goal.status === 'active' && (
                          <Tooltip content="Pause goal">
                            <IconButton title="" label="Pause" className="h-10 w-10" onClick={() => dispatch({ type: 'UPDATE_GOAL', id: goal.id, patch: { status: 'paused' } })}>
                              <Pause className="h-4 w-4" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {goal.status === 'paused' && (
                          <Tooltip content="Resume goal">
                            <IconButton title="" label="Resume" className="h-10 w-10 text-green-700" onClick={() => dispatch({ type: 'UPDATE_GOAL', id: goal.id, patch: { status: 'active' } })}>
                              <Play className="h-4 w-4" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip content="Delete goal">
                          <IconButton title="" label="Delete" className="h-10 w-10 hover:bg-danger-soft hover:text-danger" onClick={() => setDelGoal(goal)}>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <section>
            <SectionTitle eyebrow="Celebrate" title="Badges" subtitle={`${state.badges.filter((b) => b.earnedAt).length} of ${state.badges.length} earned`} action={<Link to="/app/achievements" className="text-sm font-semibold text-green-700 hover:text-green-900">All achievements →</Link>} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {state.badges.map((b, i) => (
                <BadgeCard key={b.id} badge={b} index={i} layout="row" />
              ))}
            </div>
            <Notice tone="green" className="mt-6">
              Badges celebrate everyday wellness habits. We intentionally never gamify periods, fertility or other sensitive health events.
            </Notice>
          </section>
        </>
      )}

      <Modal
        open={habitOpen}
        onClose={() => setHabitOpen(false)}
        title="New habit"
        description="Small and specific works best — e.g. “Stretch for 5 minutes after waking”."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHabitOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveHabit}>Add habit</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Habit" htmlFor="hb-title" error={err.habit} required>
            <Input id="hb-title" value={h.title} onChange={(e) => setH({ ...h, title: e.target.value })} placeholder="e.g. Morning stretch" invalid={!!err.habit} />
          </Field>
          <Field label="Category" htmlFor="hb-cat">
            <Select id="hb-cat" value={h.category} onChange={(e) => setH({ ...h, category: e.target.value as Habit['category'] })}>
              <option value="movement">Movement</option>
              <option value="hydration">Hydration</option>
              <option value="mindfulness">Mindfulness</option>
              <option value="nutrition">Nutrition</option>
              <option value="sleep">Sleep</option>
            </Select>
          </Field>
          <div>
            <p className="label">Days (none = every day)</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((l, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={h.days.includes(i)}
                  aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}
                  onClick={() => setH({ ...h, days: h.days.includes(i) ? h.days.filter((x) => x !== i) : [...h.days, i] })}
                  className={cn('h-10 w-10 rounded-full text-sm font-bold transition', h.days.includes(i) ? 'bg-green-700 text-white' : 'bg-ink-100 text-ink-600 hover:bg-green-100')}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="New wellness goal"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGoalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveGoal}>Create goal</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="What do you want to track?" htmlFor="gl-metric">
            <Select
              id="gl-metric"
              value={g.metric}
              onChange={(e) => {
                const m = e.target.value as WellnessGoal['metric'];
                setG({ ...g, metric: m, target: String({ steps: 8000, water: 2400, sleep: 7.5, workouts: 3, checkins: 6, mindful: 3 }[m]) });
              }}
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target" htmlFor="gl-target" error={err.target} required>
            <Input id="gl-target" type="number" value={g.target} onChange={(e) => setG({ ...g, target: e.target.value })} invalid={!!err.target} />
          </Field>
          <Field label="Name (optional)" htmlFor="gl-title" error={err.title}>
            <Input id="gl-title" value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} placeholder="We’ll name it for you" />
          </Field>
          <p className="text-xs text-ink-400">Goals focus on everyday habits. Reproductive or medical outcomes aren’t available as goals.</p>
        </div>
      </Modal>

      <ConfirmDialog open={!!delHabit} onClose={() => setDelHabit(null)} danger title="Delete habit?" body={`“${delHabit?.title}” and its history will be removed.`} confirmLabel="Delete" onConfirm={() => delHabit && dispatch({ type: 'DELETE_HABIT', id: delHabit.id })} />
      <ConfirmDialog open={!!delGoal} onClose={() => setDelGoal(null)} danger title="Delete goal?" body={`“${delGoal?.title}” will be removed.`} confirmLabel="Delete" onConfirm={() => delGoal && dispatch({ type: 'DELETE_GOAL', id: delGoal.id })} />
    </div>
  );
}
