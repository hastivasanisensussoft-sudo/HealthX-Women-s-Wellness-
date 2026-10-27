import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BedDouble,
  Bell,
  CalendarClock,
  CalendarHeart,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  GlassWater,
  Lightbulb,
  Moon,
  Plus,
  RefreshCw,
  Salad,
  Smile,
  Sparkles,
  Stethoscope,
  Target,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import {
  classifyDay,
  COPY,
  computeInsights,
  cycleStateOf,
  dailySeries,
  formatClock,
  formatDate,
  goalProgress,
  GOALS,
  greeting,
  lastNDays,
  MOODS,
  NOTIFICATION_TYPES,
  nutritionTotals,
  NUTRITION_TARGETS,
  palette,
  PHASES,
  sleepHoursOn,
  startOfWeek,
  stepsOn,
  streak,
  symptomFrequency,
  timeAgo,
  VIDEO_LIST,
  waterOn,
  waterStreak,
  wellnessScore,
  workoutsOn,
  type CycleState,
  type ISODate,
  type LifeStageMode,
  type MoodLevel,
} from '@healthx/shared';
import { useAppState, useDispatch, useStore } from '@/store/AppStore';
import { ArticleCard, CheckInCard, InsightCard, PlanList, WellnessScoreCard } from '@/user/components/Cards';
import { fertileDays, ringHeadline } from '@/user/components/cycleText';
import { LogPeriodModal } from '@/user/components/LogPeriodModal';
import { LogWorkoutModal } from '@/user/components/LogWorkoutModal';
import { AreaTrend, BarTrend, Donut, Sparkline } from '@/components/charts/Charts';
import { Avatar, Leaf, MoodFace } from '@/components/brand/Brand';
import { CycleRing } from '@/components/cycle/CycleRing';
import { WeekStrip, type StripMark } from '@/components/cycle/WeekStrip';
import { VideoCard } from '@/components/media/Video';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  CardLink,
  CardSkeleton,
  EmptyState,
  EstimateMarker,
  HScroll,
  IconTile,
  MoreLink,
  PhaseBadge,
  ProgressBar,
  SectionTitle,
  Segmented,
  Skeleton,
  StatCard,
  useToast,
} from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, formatHours, formatMl, useDemoLoading } from '@/lib/utils';

type TrendKey = 'energy' | 'mood' | 'sleep' | 'stress';
type Rec = { id: string; icon: LucideIcon; tone: string; title: string; body: string; to: string; cta: string };

const MODE_LABEL: Record<LifeStageMode, string> = {
  cycle: 'Cycle tracking',
  pregnancy: 'Pregnancy mode',
  perimenopause: 'Perimenopause mode',
  menopause: 'Menopause mode',
};

/** Hero profile strip: who's signed in, plan, mode, focus areas and streak. */
function ProfileStrip() {
  const state = useAppState();
  const { profile } = state;
  const checkInStreak = streak(state, (d) => state.checkIns.some((c) => c.date === d));
  const focus = profile.goals.map((k) => GOALS.find((g) => g.key === k)?.label).filter((x): x is string => !!x);
  return (
    <div className="glass-dark flex items-center gap-3 rounded-3xl p-3 pr-2 sm:pr-4">
      <Avatar name={profile.name} photoKey={profile.avatar} size={46} className="ring-white/30" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate font-semibold text-white">{profile.name || 'Your profile'}</p>
          <span className={cn('hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline', profile.plan === 'premium' ? 'bg-butter-300 text-green-950' : 'bg-white/15 text-white')}>
            {profile.plan === 'premium' ? 'Premium' : 'Free plan'}
          </span>
        </div>
        <p className="truncate text-xs text-white/65">
          {MODE_LABEL[profile.mode]}
          <span className="hidden sm:inline"> · member since {formatDate(profile.memberSince, 'medium')}</span>
          {focus.length > 0 && <span className="hidden md:inline">{` · ${focus.slice(0, 2).join(', ')}${focus.length > 2 ? ` +${focus.length - 2}` : ''}`}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white/10 px-2.5 py-1.5" title={`${checkInStreak}-day check-in streak`}>
        <Flame className="h-4 w-4 text-butter-300" />
        <span className="num text-lg leading-none text-white">{checkInStreak}</span>
        <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/60 sm:inline">day streak</span>
      </div>
      <Link to="/app/profile" aria-label="Open my profile" className="shrink-0 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/** Hero cycle dial (Mira reference): a white ring on the forest panel with the next-period estimate. */
function HeroRing({ cs }: { cs: CycleState }) {
  if (!cs.hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[30px] bg-white/[0.06] p-8 text-center ring-1 ring-inset ring-white/10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-rose-500">
          <CalendarHeart className="h-7 w-7" />
        </span>
        <p className="font-display text-xl font-semibold">Start tracking your cycle</p>
        <p className="max-w-xs text-sm text-white/70">Log your last period to see estimates for your cycle day, phase and next period.</p>
      </div>
    );
  }
  const head = ringHeadline(cs);
  const { fs, fe } = fertileDays(cs);
  const phase = cs.phase ? PHASES[cs.phase] : null;
  return (
    <div className="flex flex-col items-center">
      <div className="relative rounded-full bg-white p-2.5 shadow-[0_30px_60px_-24px_rgba(0,0,0,.55)]">
        <CycleRing cycleLength={cs.avgCycleLength ?? 28} periodLength={cs.avgPeriodLength ?? 5} currentDay={cs.cycleDay} fertileStart={fs} fertileEnd={fe} size={232} stroke={17} showLabels={false}>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{head.kicker}</p>
          <p className={cn('num mt-1 leading-none text-ink-900', head.big.length > 6 ? 'text-[30px]' : 'text-[42px]')}>{head.big}</p>
          <p className={cn('mt-1.5 text-xs font-semibold', cs.inPeriod ? 'text-rose-600' : 'text-ink-500')}>{head.sub}</p>
        </CycleRing>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/15">
          {cs.isLate ? 'Period estimate has passed' : phase?.label ?? 'Cycle'}
          <EstimateMarker />
        </span>
        {cs.nextPeriodStart && !cs.isLate && <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 ring-1 ring-inset ring-white/15">Next period around {formatDate(cs.nextPeriodStart, 'short')}*</span>}
      </div>
      <Link to="/app/cycle" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-200 hover:text-white">
        Open calendar <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const state = useAppState();
  const dispatch = useDispatch();
  const { loadSampleData } = useStore();
  const toast = useToast();
  const loading = useDemoLoading(500);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [trend, setTrend] = useState<TrendKey>('energy');

  const { today, profile } = state;
  const [day, setDay] = useState<ISODate>(today);
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const ws = useMemo(() => wellnessScore(state), [state]);
  const series14 = useMemo(() => dailySeries(state, 14), [state]);
  const series7 = useMemo(() => dailySeries(state, 7), [state]);
  const insights = useMemo(() => computeInsights(state), [state]);
  const water = waterOn(state, today);
  const steps = stepsOn(state, today);
  const sleepLast = sleepHoursOn(state, today) ?? sleepHoursOn(state, lastNDays(today, 2)[0]);
  const weekWorkouts = lastNDays(today, 7).reduce((a, d) => a + workoutsOn(state, d).length, 0);
  const nut = nutritionTotals(state, today);
  const moods30 = state.checkIns.filter((c) => c.date >= lastNDays(today, 30)[0]);
  const moodCounts = MOODS.map((m) => ({ ...m, count: moods30.filter((c) => c.mood === m.key).length }));
  const topSymptoms = symptomFrequency(state, 30).slice(0, 5);
  const reminders = state.reminders.filter((r) => r.enabled).slice(0, 5);
  const articles = state.articles.filter((a) => !state.readArticles.includes(a.id)).slice(0, 6);
  const firstName = profile.name.split(' ')[0] || 'there';
  const isEmpty = state.checkIns.length === 0 && state.periods.length === 0;
  const todayCheckIn = state.checkIns.find((c) => c.date === today);

  const markOf = (d: ISODate): StripMark => {
    const k = classifyDay(d, state.periods, cs);
    return k === 'period' ? 'period' : k === 'predicted_period' ? 'predicted' : k === 'ovulation_estimate' ? 'ovulation' : k === 'fertile_estimate' ? 'fertile' : null;
  };
  const hasLogs = (d: ISODate) => state.checkIns.some((c) => c.date === d) || state.symptomLogs.some((l) => l.date === d);
  const dayCheckIn = state.checkIns.find((c) => c.date === day);

  const trendCfg: Record<TrendKey, { key: string; name: string; color: string; domain: [number, number]; unit?: string }> = {
    energy: { key: 'energy', name: 'Energy', color: palette.peach[500], domain: [0, 10], unit: '/10' },
    mood: { key: 'mood', name: 'Mood', color: palette.lavender[500], domain: [0, 5], unit: '/5' },
    sleep: { key: 'sleep', name: 'Sleep', color: palette.indigo[500], domain: [0, 10], unit: 'h' },
    stress: { key: 'stress', name: 'Stress', color: palette.rose[400], domain: [0, 10], unit: '/10' },
  };
  const t = trendCfg[trend];

  const pctOf = (v: number, target: number) => Math.min(100, Math.round((v / target) * 100));
  const weekly = series7.map((p) => ({
    label: p.label,
    water: pctOf(p.water, state.waterTargetMl),
    sleep: p.sleep === null ? null : pctOf(p.sleep, state.sleepTargetHours),
    steps: pctOf(p.steps, state.stepTarget),
  }));
  const metDays = {
    water: series7.filter((p) => p.water >= state.waterTargetMl).length,
    sleep: series7.filter((p) => p.sleep !== null && p.sleep >= state.sleepTargetHours).length,
    steps: series7.filter((p) => p.steps >= state.stepTarget).length,
  };

  // Rules-based suggestions from today's logs (not AI, not medical advice).
  const recs: Rec[] = [];
  if (!todayCheckIn) recs.push({ id: 'checkin', icon: Smile, tone: 'bg-lavender-50 text-lavender-600', title: 'Start with a quick check-in', body: 'Your plan and insights update from how you feel today.', to: '/app/check-in', cta: 'Check in' });
  if (todayCheckIn?.stress != null && todayCheckIn.stress >= 6) recs.push({ id: 'stress', icon: Wind, tone: 'bg-lavender-50 text-lavender-600', title: 'Stress is running high today', body: 'Four rounds of box breathing take about a minute.', to: '/app/stress', cta: 'Breathe' });
  if (sleepLast !== null && sleepLast < state.sleepTargetHours) recs.push({ id: 'sleep', icon: BedDouble, tone: 'bg-indigo-50 text-indigo-600', title: `${formatHours(sleepLast)} sleep — below your ${state.sleepTargetHours} h target`, body: 'A short wind-down routine tonight may help.', to: '/app/learn/a_sleep_routine', cta: 'Read' });
  if (water < state.waterTargetMl * 0.6) recs.push({ id: 'water', icon: GlassWater, tone: 'bg-sky-50 text-sky-600', title: `${formatMl(state.waterTargetMl - water)} to your water goal`, body: 'Keep a glass nearby and sip through the afternoon.', to: '/app/hydration', cta: 'Hydration' });
  if (steps < state.stepTarget * 0.5) recs.push({ id: 'steps', icon: Footprints, tone: 'bg-green-50 text-green-700', title: `${(state.stepTarget - steps).toLocaleString()} steps to go`, body: 'A 15-minute walk is an easy way to move today.', to: '/app/fitness', cta: 'Fitness' });
  if (cs.daysUntilNextPeriod !== null && cs.daysUntilNextPeriod >= 0 && cs.daysUntilNextPeriod <= 3)
    recs.push({ id: 'period', icon: CalendarHeart, tone: 'bg-rose-50 text-rose-600', title: cs.daysUntilNextPeriod === 0 ? 'Period estimated to start today*' : `Period estimated in ${cs.daysUntilNextPeriod} day${cs.daysUntilNextPeriod === 1 ? '' : 's'}*`, body: `${COPY.estimate} You may want supplies handy.`, to: '/app/cycle', cta: 'Cycle' });
  if (cs.phase) recs.push({ id: 'phase', icon: Sparkles, tone: 'bg-peach-50 text-peach-600', title: `${PHASES[cs.phase].label}*`, body: PHASES[cs.phase].tips[0], to: '/app/cycle/insights', cta: 'Cycle insights' });

  return (
    <div className="space-y-8">
      {/* ---------- Hero: greeting, week strip, quick actions | cycle dial ---------- */}
      <section className="bg-forest relative overflow-hidden rounded-[34px] p-6 text-white shadow-lift sm:p-8 xl:p-10">
        <Leaf className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rotate-12 opacity-15" color={palette.green[300]} />
        <div className="relative grid items-center gap-10 xl:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-green-200">{formatDate(today, 'long')}</p>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[42px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-2 max-w-md text-[15px] text-white/70">Here’s your day at a glance. Every estimate is marked with *.</p>

          <div className="mt-6 rounded-3xl bg-white/[0.06] p-2 ring-1 ring-inset ring-white/10">
            <WeekStrip start={startOfWeek(today)} selected={day} today={today} onSelect={setDay} markOf={markOf} hasLogs={hasLogs} tone="dark" />
          </div>
          <p className="mt-2.5 text-xs text-white/60" aria-live="polite">
            {formatDate(day, 'long')}
            {day === today ? ' · today' : ''}
            {dayCheckIn ? ` · check-in: ${MOODS.find((m) => m.key === dayCheckIn.mood)?.label ?? 'logged'}` : day <= today ? ' · no check-in' : ''}
            {markOf(day) ? ` · ${markOf(day) === 'period' ? 'period logged' : markOf(day) === 'predicted' ? 'period estimate*' : 'fertile-window estimate*'}` : ''}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="rose" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setPeriodOpen(true)}>
              Log period
            </Button>
            <ButtonLink to="/app/check-in" variant="butter" size="sm" leftIcon={<Smile className="h-4 w-4" />}>
              Check in
            </ButtonLink>
            <Button
              variant="white"
              size="sm"
              leftIcon={<GlassWater className="h-4 w-4" />}
              onClick={() => {
                dispatch({ type: 'ADD_WATER', ml: 250 });
                toast.success('+250 ml water', `${formatMl(water + 250)} of ${formatMl(state.waterTargetMl)} today`);
              }}
            >
              + 250 ml
            </Button>
            <Button variant="ghost" size="sm" className="text-white ring-1 ring-inset ring-white/25 hover:bg-white/10" leftIcon={<Dumbbell className="h-4 w-4" />} onClick={() => setWorkoutOpen(true)}>
              Log workout
            </Button>
          </div>
          <div className="mt-6">
            <ProfileStrip />
          </div>
        </div>
        {loading ? <Skeleton className="mx-auto h-[252px] w-[252px] rounded-full bg-white/10" /> : <HeroRing cs={cs} />}
        </div>
      </section>

      {isEmpty && (
        <Card className="card-pad flex flex-col items-start gap-4 border-green-200 bg-green-50 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-green-700 shadow-xs">
            <Target className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold text-green-950">Let’s set up your first week</p>
            <p className="text-sm text-ink-600">Log your period, complete a check-in and add some water — your trends and insights will appear as you go.</p>
          </div>
          <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadSampleData().catch(() => undefined)}>
            Load sample data instead
          </Button>
        </Card>
      )}

      {/* ---------- Log in a tap ---------- */}
      <section>
        <SectionTitle eyebrow="Log in a tap" title="How’s today going?" action={<MoreLink to="/app/check-in">Full check-in</MoreLink>} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <IconTile to="/app/mood" tone="lavender" icon={<Smile className="h-5 w-5" />} label="Mood" hint={todayCheckIn ? MOODS.find((m) => m.key === todayCheckIn.mood)?.label : 'How are you feeling?'} />
          <IconTile to="/app/symptoms" tone="rose" icon={<Stethoscope className="h-5 w-5" />} label="Symptoms" hint="Any symptoms today?" />
          <IconTile to="/app/hydration" tone="sky" icon={<Droplets className="h-5 w-5" />} label="Water" hint={`${formatMl(water)} of ${formatMl(state.waterTargetMl)}`} />
          <IconTile to="/app/sleep" tone="indigo" icon={<Moon className="h-5 w-5" />} label="Sleep" hint={sleepLast !== null ? `${formatHours(sleepLast)} last night` : 'Log last night'} />
          <IconTile to="/app/fitness" tone="green" icon={<Footprints className="h-5 w-5" />} label="Movement" hint={`${steps.toLocaleString()} steps`} />
          <IconTile to="/app/nutrition" tone="peach" icon={<Salad className="h-5 w-5" />} label="Meals" hint={nut.kcal ? `${nut.kcal} kcal logged` : 'Nothing logged yet'} />
        </div>
      </section>

      {/* ---------- Score · check-in · plan ---------- */}
      {loading ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <CardSkeleton lines={5} className="xl:col-span-3" />
          <CardSkeleton lines={5} className="xl:col-span-4" />
          <CardSkeleton lines={5} className="xl:col-span-5" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-3">
            <WellnessScoreCard ws={ws} />
          </div>
          <div className="xl:col-span-4">
            <CheckInCard />
          </div>
          <Card className="card-pad md:col-span-2 xl:col-span-5">
            <CardHeader
              title="Today’s plan"
              subtitle={`${state.plan.items.filter((i) => i.done).length} of ${state.plan.items.length} done`}
              action={
                <button onClick={() => dispatch({ type: 'REGENERATE_PLAN' })} className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Refresh plan">
                  <RefreshCw className="h-4 w-4" />
                </button>
              }
            />
            {state.plan.items.length ? (
              <PlanList items={state.plan.items.slice(0, 5)} onToggle={(id) => dispatch({ type: 'TOGGLE_PLAN_ITEM', id })} />
            ) : (
              <EmptyState compact icon={<Target className="h-5 w-5" />} title="No plan yet" body="Complete today’s check-in to get a gentle plan." />
            )}
            {state.plan.items.length > 5 && <MoreLink to="/app/plan">{`See all ${state.plan.items.length} tasks`}</MoreLink>}
          </Card>
        </div>
      )}

      {/* ---------- At a glance ---------- */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={2} />)
        ) : (
          <>
            <StatCard label="Steps today" value={steps.toLocaleString()} icon={<Footprints className="h-5 w-5" />} tone="green" hint={`Goal ${state.stepTarget.toLocaleString()}`}>
              <Sparkline values={series7.map((p) => p.steps)} color={palette.green[500]} />
            </StatCard>
            <StatCard
              label="Hydration"
              value={formatMl(water)}
              icon={<Droplets className="h-5 w-5" />}
              tone="sky"
              hint={waterStreak(state) > 0 ? `${waterStreak(state)}-day goal streak` : `${Math.round((water / state.waterTargetMl) * 100)}% of today’s goal`}
            >
              <div className="flex items-center gap-2">
                <ProgressBar value={water / state.waterTargetMl} color="bg-sky-500" track="bg-sky-100" label="Hydration progress" />
                <span className="whitespace-nowrap text-xs font-bold text-ink-500">{formatMl(state.waterTargetMl)}</span>
              </div>
            </StatCard>
            <StatCard label="Sleep last night" value={formatHours(sleepLast)} icon={<Moon className="h-5 w-5" />} tone="indigo" hint={`Target ${state.sleepTargetHours} h`} trend={sleepLast !== null && sleepLast < state.sleepTargetHours ? { dir: 'down', text: 'Below target' } : { dir: 'up', text: 'On target' }}>
              <Sparkline values={series7.map((p) => p.sleep)} color={palette.indigo[500]} />
            </StatCard>
            <StatCard label="Workouts this week" value={weekWorkouts} unit="sessions" icon={<Dumbbell className="h-5 w-5" />} tone="peach" hint="Goal 3 per week">
              <div className="flex gap-1.5">
                {series7.map((p) => (
                  <span key={p.date} title={p.label} className={`h-2 flex-1 rounded-full ${p.workouts ? 'bg-peach-500' : 'bg-peach-100'}`} />
                ))}
              </div>
            </StatCard>
          </>
        )}
      </div>

      {/* ---------- Trends + recommendations ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-8">
          <CardHeader
            title="Wellness trends"
            subtitle="Last 14 days · from your check-ins"
            action={
              <Segmented
                size="sm"
                value={trend}
                onChange={setTrend}
                options={[
                  { value: 'energy', label: 'Energy' },
                  { value: 'mood', label: 'Mood' },
                  { value: 'sleep', label: 'Sleep' },
                  { value: 'stress', label: 'Stress' },
                ]}
              />
            }
          />
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : series14.every((p) => p[trend] === null) ? (
            <EmptyState compact icon={<Activity className="h-5 w-5" />} title="No data yet" body="Complete a few daily check-ins to see your trends." action={<ButtonLink to="/app/check-in" size="sm">Check in</ButtonLink>} />
          ) : (
            <AreaTrend data={series14} series={[{ key: t.key, name: t.name, color: t.color }]} height={260} yDomain={t.domain} unit={t.unit} target={trend === 'sleep' ? { value: state.sleepTargetHours, label: 'Target' } : undefined} />
          )}
        </Card>
        <Card className="card-pad xl:col-span-4">
          <CardHeader title="Recommended for you" subtitle="Rules-based, from today’s logs" icon={<Lightbulb className="h-5 w-5" />} />
          {recs.length === 0 ? (
            <EmptyState compact icon={<Sparkles className="h-5 w-5" />} title="You’re all caught up" body="Nothing to nudge you about right now — nice work." />
          ) : (
            <ul className="space-y-2.5">
              {recs.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <Link to={r.to} className="group flex items-start gap-3 rounded-2xl p-3 ring-1 ring-inset ring-ink-100 transition hover:bg-green-50/50 hover:ring-green-200">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${r.tone}`}>
                      <r.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">{r.title}</span>
                      <span className="block text-xs text-ink-500">{r.body}</span>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-green-700">
                        {r.cta} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-ink-400">Suggestions are general wellness tips, not medical advice.</p>
        </Card>
      </div>

      {/* ---------- Guided sessions (video previews) ---------- */}
      <section>
        <SectionTitle eyebrow="Watch & follow along" title="Guided sessions" subtitle="Short video previews with step-by-step routines" />
        <HScroll label="Guided sessions">
          {VIDEO_LIST.map((v) => (
            <VideoCard key={v.key} video={v.key} className="w-[260px] shrink-0 sm:w-[300px]" />
          ))}
        </HScroll>
      </section>

      {/* ---------- Progress + goals ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-8">
          <CardHeader title="Weekly progress" subtitle="% of each daily target · last 7 days" action={<CardLink to="/app/insights/progress">Progress charts</CardLink>} />
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <>
              <BarTrend
                data={weekly}
                height={240}
                unit="%"
                series={[
                  { key: 'water', name: 'Water', color: palette.sky[400] },
                  { key: 'sleep', name: 'Sleep', color: palette.indigo[400] },
                  { key: 'steps', name: 'Steps', color: palette.green[500] },
                ]}
              />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Water goal', n: metDays.water, cls: 'bg-sky-50 text-sky-700' },
                  { label: 'Sleep target', n: metDays.sleep, cls: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Step goal', n: metDays.steps, cls: 'bg-green-50 text-green-800' },
                ].map((m) => (
                  <div key={m.label} className={`rounded-2xl px-2 py-2.5 ${m.cls}`}>
                    <p className="num text-lg">{m.n}/7</p>
                    <p className="text-[11px] font-semibold">{m.label} met</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card className="card-pad xl:col-span-4">
          <CardHeader title="Wellness goals" subtitle={`${state.goals.filter((g) => g.status === 'active').length} active`} action={<CardLink to="/app/goals">Goals</CardLink>} />
          {state.goals.length === 0 ? (
            <EmptyState compact icon={<Target className="h-5 w-5" />} title="No goals yet" action={<ButtonLink to="/app/goals" size="sm">Create a goal</ButtonLink>} />
          ) : (
            <ul className="space-y-4">
              {state.goals.slice(0, 4).map((g) => {
                const p = goalProgress(state, g);
                return (
                  <li key={g.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-semibold text-ink-800">{g.title}</span>
                      <span className="shrink-0 pl-2 font-mono text-xs text-ink-500">{Math.round(p.pct * 100)}%</span>
                    </div>
                    <ProgressBar value={p.pct} className="mt-1.5" height="h-2" color={p.pct >= 1 ? 'bg-green-700' : 'bg-green-400'} />
                    <p className="mt-1 text-xs text-ink-400">{p.label}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ---------- Activity · mood & symptoms · nutrition ---------- */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="card-pad">
          <CardHeader title="Activity" subtitle="Steps · last 7 days" action={<CardLink to="/app/fitness">Fitness</CardLink>} />
          <BarTrend data={series7} series={[{ key: 'steps', name: 'Steps', color: palette.green[500] }]} height={180} target={{ value: state.stepTarget, label: 'Goal' }} highlight={(d) => ((d.steps as number) >= state.stepTarget ? palette.green[600] : palette.green[200])} />
        </Card>

        <Card className="card-pad">
          <CardHeader title="Mood & symptoms" subtitle="Last 30 days" action={<CardLink to="/app/symptoms">Track</CardLink>} />
          {moods30.length === 0 ? (
            <EmptyState compact icon={<Smile className="h-5 w-5" />} title="Nothing logged" body="Your mood mix will show here." />
          ) : (
            <>
              <div className="flex items-end justify-between gap-1 rounded-2xl bg-lavender-50/60 p-3">
                {moodCounts.map((m) => (
                  <div key={m.key} className="flex flex-col items-center gap-1">
                    <span className="font-mono text-xs text-ink-700">{m.count}</span>
                    <MoodFace mood={m.key as MoodLevel} size={36} />
                  </div>
                ))}
              </div>
              <p className="mb-2 mt-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">Most logged symptoms</p>
              <div className="flex flex-wrap gap-1.5">
                {topSymptoms.length ? topSymptoms.map((s) => <Badge key={s.id} tone="rose">{s.label} · {s.count}</Badge>) : <span className="text-sm text-ink-500">None logged</span>}
              </div>
            </>
          )}
        </Card>

        <Card className="card-pad md:col-span-2 xl:col-span-1">
          <CardHeader title="Nutrition" subtitle={<span className="inline-flex items-center gap-2">Today <PhaseBadge phase={2} /></span>} action={<CardLink to="/app/nutrition">Meals</CardLink>} />
          {nut.kcal === 0 ? (
            <EmptyState compact icon={<Salad className="h-5 w-5" />} title="No meals logged" />
          ) : (
            <>
              <Donut
                height={150}
                inner={46}
                outer={66}
                data={[
                  { name: 'Protein (g)', value: nut.protein, color: palette.green[500] },
                  { name: 'Carbs (g)', value: nut.carbs, color: palette.butter[400] },
                  { name: 'Fat (g)', value: nut.fat, color: palette.peach[400] },
                ]}
              >
                <p className="num text-lg text-ink-900">{nut.kcal}</p>
                <p className="font-mono text-[10px] uppercase text-ink-400">kcal</p>
              </Donut>
              <div className="mt-2 space-y-1.5">
                {(['protein', 'fiber'] as const).map((k) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-14 font-semibold capitalize text-ink-600">{k}</span>
                    <ProgressBar value={nut[k] / NUTRITION_TARGETS[k]} height="h-1.5" />
                    <span className="w-12 text-right font-bold text-ink-700">{nut[k]} g</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ---------- Insights, reminders, activity feed ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-5">
          <CardHeader title="Insights for you" subtitle="Rules-based · observed patterns" action={<CardLink to="/app/insights/trends">All insights</CardLink>} />
          {insights.length === 0 ? (
            <EmptyState compact icon={<Activity className="h-5 w-5" />} title="Keep logging to unlock insights" body="Insights appear once there’s enough data to spot a pattern." />
          ) : (
            <div className="space-y-3">
              {insights.slice(0, 3).map((i) => (
                <InsightCard key={i.id} insight={i} locked={i.phase === 2 && profile.plan === 'free'} />
              ))}
            </div>
          )}
          <ButtonLink to="/app/insights/weekly" variant="secondary" size="sm" className="mt-4 w-full">
            View weekly report
          </ButtonLink>
        </Card>

        <Card className="card-pad xl:col-span-3">
          <CardHeader title="Reminders" subtitle={<span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Upcoming</span>} action={<CardLink to="/app/notifications">Manage</CardLink>} />
          {reminders.length === 0 ? (
            <EmptyState compact icon={<Bell className="h-5 w-5" />} title="No reminders" />
          ) : (
            <ul className="space-y-2.5">
              {reminders.map((r) => {
                const meta = NOTIFICATION_TYPES.find((n) => n.key === r.type)!;
                return (
                  <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-ink-50 p-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-green-700 shadow-xs">
                      <Icon name={meta.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-800">{r.title}</p>
                      <p className="font-mono text-[11px] text-ink-500">
                        {r.date ? formatDate(r.date, 'short') : 'Daily'} · {formatClock(r.time)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="card-pad xl:col-span-4">
          <CardHeader title="Recent activity" subtitle="Your latest logs" />
          {state.feed.length === 0 ? (
            <EmptyState compact icon={<Activity className="h-5 w-5" />} title="No activity yet" />
          ) : (
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-0.5 before:bg-green-100">
              {state.feed.slice(0, 6).map((f) => (
                <li key={f.id} className="relative flex gap-3 pl-6">
                  <span className="absolute left-0 top-1 h-4 w-4 rounded-full border-[3px] border-white bg-green-500 shadow-xs" />
                  <div>
                    <p className="text-sm font-medium text-ink-800">{f.text}</p>
                    <p className="text-xs text-ink-400">{timeAgo(f.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* ---------- Reading ---------- */}
      <section>
        <SectionTitle eyebrow="Learn" title="Reading for you" subtitle="Articles you haven’t read yet" action={<MoreLink to="/app/learn">Browse library</MoreLink>} />
        <HScroll label="Reading for you">
          {articles.map((a) => (
            <div key={a.id} className="w-[280px] shrink-0 sm:w-[320px]">
              <ArticleCard article={a} />
            </div>
          ))}
        </HScroll>
      </section>

      <LogPeriodModal open={periodOpen} onClose={() => setPeriodOpen(false)} />
      <LogWorkoutModal open={workoutOpen} onClose={() => setWorkoutOpen(false)} />
    </div>
  );
}
