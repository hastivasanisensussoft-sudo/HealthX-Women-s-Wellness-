import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarHeart,
  CalendarRange,
  Check,
  Droplet,
  HeartPulse,
  Moon,
  Pencil,
  Plus,
  Repeat,
  Smile,
  Sparkles,
  Sprout,
  Stethoscope,
  Sun,
  Timer,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  addDays,
  checkInOn,
  classifyDay,
  computeInsights,
  COPY,
  cycleStateOf,
  diffDays,
  FLOWS,
  formatDate,
  moodLabel,
  MOOD_FACTORS,
  palette,
  PHASES,
  sleepHoursOn,
  sortPeriods,
  startOfMonth,
  symptomFrequency,
  validatePeriodRange,
  waterOn,
  type CycleState,
  type CyclePhase,
  type ISODate,
  type PeriodLog,
  type PhotoKey,
  type VideoKey,
} from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { InsightCard } from '@/user/components/Cards';
import { fertileDays, ringHeadline } from '@/user/components/cycleText';
import { LogPeriodModal } from '@/user/components/LogPeriodModal';
import { LogSymptomsModal } from '@/user/components/SymptomLogger';
import { HeroPanel, HeroStat } from '@/user/components/cycle-ui/Hero';
import { CycleLengthChart, type CyclePoint } from '@/user/components/cycle-ui/CycleLengthChart';
import { PhaseTimeline } from '@/user/components/cycle-ui/PhaseTimeline';
import { FlowChip } from '@/user/components/cycle-ui/Pickers';
import { CycleCalendar } from '@/components/cycle/CycleCalendar';
import { CycleRing } from '@/components/cycle/CycleRing';
import { BarTrend, LineTrend } from '@/components/charts/Charts';
import { LeafPair, MoodFace } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  CardLink,
  ConfirmDialog,
  EmptyState,
  EstimateMarker,
  Field,
  HScroll,
  IconTile,
  Input,
  Modal,
  PageHeader,
  PhaseBadge,
  RouteTabs,
  SectionTitle,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, useDemoLoading } from '@/lib/utils';
import { CYCLE_TABS } from '@/user/layout/sectionTabs';

type View = 'tracking' | 'calendar' | 'history' | 'insights';

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  tracking: { title: 'Period tracking', subtitle: 'Log your period, see your estimated phase and manage recent periods.' },
  calendar: { title: 'Period calendar', subtitle: 'Logged days, estimated period days and the estimated fertile window — tap any day to view or edit.' },
  history: { title: 'Cycle history', subtitle: 'Your cycle lengths, period durations and every logged cycle.' },
  insights: { title: 'Cycle insights', subtitle: 'Observed patterns across your cycles — never a diagnosis.' },
};

const PHASE_ORDER: CyclePhase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];

const PHASE_STYLE: Record<CyclePhase, { icon: LucideIcon; band: string; disc: string; text: string; ring: string; dot: string; photo: PhotoKey; videos: VideoKey[] }> = {
  menstrual: { icon: Droplet, band: 'from-rose-100 to-rose-50', disc: 'bg-white text-rose-600', text: 'text-rose-700', ring: 'ring-rose-300', dot: 'bg-rose-100 text-rose-600', photo: 'period-comfort', videos: ['yoga-flow', 'sleep-winddown', 'hydration'] },
  follicular: { icon: Sprout, band: 'from-sky-100 to-sky-50', disc: 'bg-white text-sky-600', text: 'text-sky-700', ring: 'ring-sky-300', dot: 'bg-sky-100 text-sky-600', photo: 'woman-running', videos: ['walk-outdoors', 'strength', 'healthy-cooking'] },
  ovulatory: { icon: Sun, band: 'from-green-100 to-green-50', disc: 'bg-white text-green-700', text: 'text-green-800', ring: 'ring-green-400', dot: 'bg-green-100 text-green-700', photo: 'walking-outdoors', videos: ['walk-outdoors', 'hydration', 'yoga-flow'] },
  luteal: { icon: Moon, band: 'from-lavender-100 to-lavender-50', disc: 'bg-white text-lavender-600', text: 'text-lavender-700', ring: 'ring-lavender-300', dot: 'bg-lavender-100 text-lavender-600', photo: 'herbal-tea', videos: ['breathing', 'sleep-winddown', 'yoga-flow'] },
};

/** Estimated cycle-day ranges per phase (calendar maths; typical 28/5 when there is no history). */
function phaseRanges(cs: CycleState) {
  const len = cs.avgCycleLength ?? 28;
  const p = Math.min(cs.avgPeriodLength ?? 5, len);
  const fd = fertileDays(cs);
  const fs = fd.fs && fd.fs > p ? fd.fs : Math.max(p + 1, len - 18);
  const fe = fd.fe && fd.fe >= fs ? Math.min(fd.fe, len) : Math.min(len, len - 12);
  return { len, p, fs, fe, ranges: { menstrual: [1, p], follicular: [p + 1, fs - 1], ovulatory: [fs, fe], luteal: [fe + 1, len] } as Record<CyclePhase, [number, number]> };
}

const dayRange = ([a, b]: [number, number]) => (b <= a ? `Day ${a}` : `Days ${a}–${b}`);

export default function Cycle({ view = 'tracking' }: { view?: View }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const loading = useDemoLoading(400);
  const { today, periods } = state;
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const cycleInsights = useMemo(() => computeInsights(state).filter((i) => i.category === 'cycle'), [state]);
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState<ISODate>(today);
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState<ISODate | undefined>();
  const [symOpen, setSymOpen] = useState(false);
  const [edit, setEdit] = useState<PeriodLog | null>(null);
  const [del, setDel] = useState<PeriodLog | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstSelect = useRef(true);

  const phase = cs.phase ? PHASES[cs.phase] : null;
  const selPeriod = periods.find((p) => selected >= p.start && selected <= (p.end ?? today));
  const selSymptoms = state.symptomLogs.filter((l) => l.date === selected);
  const selCheck = checkInOn(state, selected);
  const hasLogs = (d: ISODate) => state.symptomLogs.some((l) => l.date === d) || state.checkIns.some((c) => c.date === d);
  const todayPeriod = periods.find((p) => today >= p.start && today <= (p.end ?? today));
  const todayCheck = checkInOn(state, today);
  const todaySymptoms = state.symptomLogs.filter((l) => l.date === today).length;

  const history = useMemo(
    () =>
      cs.cycles
        .slice()
        .reverse()
        .map((c) => ({ ...c, period: periods.find((p) => p.id === c.periodId) })),
    [cs.cycles, periods],
  );
  const lengthData = cs.cycles
    .filter((c) => c.length)
    .map((c) => ({ label: formatDate(c.start, 'short'), length: c.length as number, period: c.periodLength ?? 0 }));
  const avg = cs.avgCycleLength ?? 0;
  const irregularOf = (len: number | null) => !!(avg && len && Math.abs(len - avg) > 4);
  const irregularCount = history.filter((c) => irregularOf(c.length)).length;
  const lengthPoints: CyclePoint[] = cs.cycles
    .filter((c) => c.length)
    .map((c) => ({ key: c.periodId, label: formatDate(c.start, 'short'), range: `${formatDate(c.start, 'short')}${c.end ? ` – ${formatDate(c.end, 'short')}` : ''}`, length: c.length as number, irregular: irregularOf(c.length) }));

  // Observed pattern: average energy by cycle day across logged cycles (§17 — not a diagnosis)
  const energyByDay = useMemo(() => {
    const buckets = new Map<number, number[]>();
    state.checkIns.forEach((c) => {
      const cyc = cs.cycles.find((x) => c.date >= x.start && (x.end === null || c.date <= x.end));
      if (!cyc) return;
      const day = diffDays(cyc.start, c.date) + 1;
      if (day > 35) return;
      buckets.set(day, [...(buckets.get(day) ?? []), c.energy]);
    });
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, xs]) => ({ label: `D${day}`, energy: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) }));
  }, [state.checkIns, cs.cycles]);
  const freq = symptomFrequency(state, 180).slice(0, 8);

  const openLog = (d?: ISODate) => {
    setLogDate(d);
    setLogOpen(true);
  };

  // On phones and tablets the day panel sits below the calendar: bring it into view when a day is tapped.
  useEffect(() => {
    if (firstSelect.current) {
      firstSelect.current = false;
      return;
    }
    if (view === 'calendar' && window.matchMedia?.('(max-width: 1279px)').matches) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected, view]);

  const { fs, fe } = fertileDays(cs);
  const head = ringHeadline(cs);
  const pr = phaseRanges(cs);
  const selKind = classifyDay(selected, periods, cs);
  const selCycle = cs.cycles.find((c) => selected >= c.start && (c.end === null || selected <= c.end));
  const selCycleDay = selCycle ? diffDays(selCycle.start, selected) + 1 : null;
  const curDay = cs.currentCycleStart && selected >= cs.currentCycleStart ? diffDays(cs.currentCycleStart, selected) + 1 : null;
  const timelineDay = curDay !== null && curDay <= (cs.avgCycleLength ?? 28) ? curDay : null;

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title={VIEW_META[view].title}
          subtitle={VIEW_META[view].subtitle}
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Cycle & Period', to: '/app/cycle' }, { label: VIEW_META[view].title }]}
          actions={
            <Button variant="rose" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openLog(undefined)}>
              Log period
            </Button>
          }
        />
        <RouteTabs tabs={CYCLE_TABS} label="Cycle pages" className="mb-0" />
      </div>

      {/* =================== Tracking =================== */}
      {view === 'tracking' && (
        <>
          <HeroPanel tone="forest" label="Your cycle today">
            {!cs.hasData ? (
              <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-green-200">Let’s get started</p>
                  <h2 className="mt-2 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[38px]">Start tracking your cycle</h2>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">Log your last period to see estimates for your cycle day, phase and next period. Every estimate is marked with *.</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button variant="rose" leftIcon={<Droplet className="h-4 w-4" />} onClick={() => openLog(undefined)}>
                      Log a period
                    </Button>
                    <ButtonLink to="/app/learn/a_cycle_phases" variant="ghost" className="text-white ring-1 ring-inset ring-white/25 hover:bg-white/10" leftIcon={<BookOpen className="h-4 w-4" />}>
                      How cycles work
                    </ButtonLink>
                  </div>
                </div>
                <div className="relative mx-auto h-[250px] w-[200px] sm:h-[280px] sm:w-[220px]">
                  <LeafPair className="-left-8 -top-6 h-32 w-32" />
                  <Photo photo="period-comfort" alt="A hot-water bottle on a soft blanket" shape="arch" className="relative h-full w-full ring-4 ring-white/15" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-green-200">
                      {formatDate(today, 'long')}
                      {cs.cycleDay ? ` · cycle day ${cs.cycleDay}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{cs.inPeriod ? `Period day ${cs.periodDay}` : cs.isLate ? 'Period estimate has passed' : phase?.label ?? 'Your cycle'}</h2>
                      {!cs.inPeriod && !cs.isLate && phase && <EstimateMarker />}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {phase && !cs.isLate && cs.inPeriod && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/15">
                          {phase.label}
                          <EstimateMarker />
                        </span>
                      )}
                      {cs.nextPeriodStart && !cs.isLate && <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/85 ring-1 ring-inset ring-white/15">Next period around {formatDate(cs.nextPeriodStart, 'short')}*</span>}
                      {cs.fertileWindow && !cs.inPeriod && !cs.isLate && (
                        <span className="rounded-full border border-dashed border-green-300/70 px-3 py-1.5 text-sm text-white/85">
                          Fertile window estimate* {formatDate(cs.fertileWindow.start, 'short')}–{formatDate(cs.fertileWindow.end, 'short')}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">{cs.isLate ? `Cycles naturally vary. ${COPY.estimate} ${COPY.concern}` : phase?.description}</p>
                    <div className="mt-5 rounded-3xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
                      <PhaseTimeline dark cycleLength={cs.avgCycleLength ?? 28} periodLength={cs.avgPeriodLength ?? 5} currentDay={cs.cycleDay} fertileStart={fs} fertileEnd={fe} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button variant="rose" size="sm" leftIcon={<Droplet className="h-4 w-4" />} onClick={() => openLog(undefined)}>
                        {cs.inPeriod ? 'Update or end period' : 'Log period start'}
                      </Button>
                      <Button variant="white" size="sm" leftIcon={<Stethoscope className="h-4 w-4" />} onClick={() => (setSelected(today), setSymOpen(true))}>
                        Log today’s symptoms
                      </Button>
                      <ButtonLink to="/app/cycle/calendar" variant="ghost" size="sm" className="text-white ring-1 ring-inset ring-white/25 hover:bg-white/10" leftIcon={<CalendarDays className="h-4 w-4" />}>
                        Open period calendar
                      </ButtonLink>
                    </div>
                  </div>
                  {loading ? (
                    <Skeleton className="order-first mx-auto h-[256px] w-[256px] rounded-full bg-white/10 lg:order-none" />
                  ) : (
                    <div className="order-first mx-auto rounded-full bg-white p-2.5 shadow-lift lg:order-none">
                      <CycleRing cycleLength={cs.avgCycleLength ?? 28} periodLength={cs.avgPeriodLength ?? 5} currentDay={cs.cycleDay} fertileStart={fs} fertileEnd={fe} size={236} stroke={17} showLabels={false}>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{head.kicker}</p>
                        <p className={cn('num mt-1 leading-none text-ink-900', head.big.length > 6 ? 'text-[30px]' : 'text-[42px]')}>{head.big}</p>
                        <p className={cn('mt-1.5 text-xs font-semibold', cs.inPeriod ? 'text-rose-600' : 'text-ink-500')}>{head.sub}</p>
                      </CycleRing>
                    </div>
                  )}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <HeroStat dark label="Next period*" value={cs.isLate ? `+${cs.daysLate}d` : cs.daysUntilNextPeriod !== null ? `~${cs.daysUntilNextPeriod}d` : '—'} hint={cs.isLate ? 'later than estimated' : cs.nextPeriodStart ? `around ${formatDate(cs.nextPeriodStart, 'short')}` : 'log more cycles'} icon={<CalendarHeart className="h-4 w-4" />} />
                  <HeroStat dark label="Average cycle" value={cs.avgCycleLength ? `${cs.avgCycleLength}d` : '—'} hint={cs.lengthSource === 'history' ? 'your average' : cs.lengthSource === 'profile' ? 'you entered' : 'log more cycles'} icon={<Repeat className="h-4 w-4" />} />
                  <HeroStat dark label="Average period" value={cs.avgPeriodLength ? `${cs.avgPeriodLength}d` : '—'} hint={`${periods.length} logged`} icon={<Droplet className="h-4 w-4" />} />
                  <HeroStat dark label="Confidence" value={<span className="capitalize">{cs.confidence}</span>} hint={`${cs.completedCycles} complete cycle${cs.completedCycles === 1 ? '' : 's'}`} icon={<Sparkles className="h-4 w-4" />} />
                </div>
              </>
            )}
          </HeroPanel>

          <section>
            <SectionTitle eyebrow="Log in a tap" title="Today’s cycle log" action={<CardLink to="/app/cycle/history">Full history</CardLink>} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <IconTile tone="rose" icon={<Droplet className="h-5 w-5" />} label={cs.inPeriod ? 'Period' : 'Period start'} hint={cs.inPeriod ? 'Update or end it' : 'Log when it starts'} onClick={() => openLog(undefined)} />
              <IconTile tone="peach" icon={<Stethoscope className="h-5 w-5" />} label="Symptoms" hint={todaySymptoms ? `${todaySymptoms} logged today` : 'Any symptoms today?'} onClick={() => (setSelected(today), setSymOpen(true))} />
              <IconTile tone="lavender" icon={<Smile className="h-5 w-5" />} label="Mood & energy" hint={todayCheck ? `${moodLabel(todayCheck.mood)} · energy ${todayCheck.energy}/10` : 'How are you feeling?'} to="/app/mood" />
              <IconTile tone="sky" icon={<CalendarRange className="h-5 w-5" />} label="Calendar" hint="Days, estimates* and logs" to="/app/cycle/calendar" />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-12">
            <Card className="relative overflow-hidden xl:col-span-7">
              {cs.phase && phase ? (
                <div className="grid sm:grid-cols-[minmax(0,1fr)_200px]">
                  <div className={cn('card-pad bg-gradient-to-br', PHASE_STYLE[cs.phase].band)}>
                    <p className={cn('flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em]', PHASE_STYLE[cs.phase].text)}>
                      About this phase <EstimateMarker />
                    </p>
                    <h3 className="mt-2 font-display text-[22px] font-semibold leading-tight text-ink-900">{phase.label}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{phase.description}</p>
                    <ul className="mt-4 grid gap-2">
                      {phase.tips.map((t) => (
                        <li key={t} className="flex items-center gap-2.5 rounded-2xl bg-white/80 px-3 py-2 text-sm font-medium text-ink-800 ring-1 ring-inset ring-white">
                          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', PHASE_STYLE[cs.phase!].dot)}>
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          {t}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs leading-relaxed text-ink-500">
                      {COPY.estimate} {COPY.ovulationNotConfirmed}
                    </p>
                    <Link to="/app/learn/a_cycle_phases" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline">
                      <BookOpen className="h-4 w-4" /> Read: The four cycle phases, explained simply
                    </Link>
                  </div>
                  <div className="relative hidden sm:block">
                    <Photo photo={PHASE_STYLE[cs.phase].photo} alt="" shape="none" className="!absolute inset-0" />
                  </div>
                </div>
              ) : (
                <div className="card-pad">
                  <CardHeader title={<span className="flex items-center gap-2">About this phase <EstimateMarker /></span>} subtitle="Log a period to see your estimated phase" />
                  <EmptyState compact icon={<CalendarDays className="h-5 w-5" />} title="No phase estimate yet" body={cs.isLate ? 'Your estimated period date has passed. Log your period when it starts.' : 'Log a period to begin.'} />
                </div>
              )}
            </Card>

            <div className="min-w-0 space-y-6 xl:col-span-5">
              {todayPeriod && (
                <Card className="card-pad">
                  <CardHeader title="Today’s flow" subtitle={`Period day ${diffDays(todayPeriod.start, today) + 1} · tap to update`} icon={<Droplet className="h-5 w-5 text-rose-500" />} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {FLOWS.map((f) => (
                      <FlowChip
                        key={f.key}
                        compact
                        flow={f.key}
                        label={f.label}
                        drops={f.drops}
                        selected={todayPeriod.flowByDay[today] === f.key}
                        onClick={() => {
                          dispatch({ type: 'SET_FLOW', date: today, flow: f.key });
                          toast.success('Flow updated', f.label);
                        }}
                      />
                    ))}
                  </div>
                  {todayPeriod.end === null && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => {
                        dispatch({ type: 'END_PERIOD', id: todayPeriod.id, date: today });
                        toast.success('Period marked as ended');
                      }}
                    >
                      My period ended today
                    </Button>
                  )}
                </Card>
              )}
              <Card className="card-pad">
                <CardHeader title="Recent periods" subtitle={periods.length ? `${periods.length} logged · newest first` : 'Nothing logged yet'} action={<CardLink to="/app/cycle/history">Full history</CardLink>} />
                {history.length === 0 ? (
                  <EmptyState compact icon={<Droplet className="h-5 w-5" />} title="No periods logged yet" body="Log your first period to start getting estimates." />
                ) : (
                  <ul className="space-y-3">
                    {history.slice(0, 4).map((c) => {
                      const total = c.length ?? Math.max(cs.cycleDay ?? 1, c.periodLength ?? 1);
                      return (
                        <li key={c.periodId} className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                            <span className="font-mono text-[9.5px] uppercase leading-none">{formatDate(c.start, 'short').split(' ')[0]}</span>
                            <span className="num text-[17px] leading-tight">{Number(c.start.slice(8))}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-900">
                              {c.periodLength ? `${c.periodLength}-day period` : c.period?.end === null ? 'Ongoing period' : 'Period'}
                              <span className="font-normal text-ink-500">{c.length ? ` · ${c.length}-day cycle` : ' · current cycle'}</span>
                            </p>
                            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                              <span className="h-full bg-rose-400" style={{ width: `${Math.min(100, ((c.periodLength ?? 1) / total) * 100)}%` }} />
                              <span className={cn('h-full flex-1', c.length ? (irregularOf(c.length) ? 'bg-lavender-300' : 'bg-green-300') : 'bg-green-100')} />
                            </div>
                          </div>
                          {c.period && (
                            <button aria-label="Edit period" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-800" onClick={() => setEdit(c.period ?? null)}>
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          {cs.phase && (
            <section>
              <SectionTitle eyebrow="Feel-good routines" title={`Ideas for your ${PHASES[cs.phase].short.toLowerCase()} days`} subtitle="Short video previews — go at your own pace and do what feels right for your body." />
              <HScroll label="Routines for this phase">
                {PHASE_STYLE[cs.phase].videos.map((v) => (
                  <VideoCard key={v} video={v} className="w-[260px] shrink-0 sm:w-[300px]" />
                ))}
              </HScroll>
            </section>
          )}
        </>
      )}

      {/* =================== Calendar =================== */}
      {view === 'calendar' && (
        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="min-w-0 space-y-4 xl:col-span-8">
            <div className="flex flex-wrap gap-2">
              {cs.nextPeriodStart && !cs.isLate && (
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 shadow-xs ring-1 ring-inset ring-rose-100">
                  <span className="h-3 w-3 rounded-full border-2 border-dashed border-rose-400" /> Next period around {formatDate(cs.nextPeriodStart, 'short')}*
                </span>
              )}
              {cs.fertileWindow && (
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 shadow-xs ring-1 ring-inset ring-green-100">
                  <span className="h-3 w-5 rounded-full bg-green-100 ring-1 ring-green-300" /> Fertile window estimate* {formatDate(cs.fertileWindow.start, 'short')}–{formatDate(cs.fertileWindow.end, 'short')}
                </span>
              )}
              {cs.avgCycleLength && (
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 shadow-xs ring-1 ring-inset ring-ink-100">
                  <Repeat className="h-3.5 w-3.5 text-green-700" /> {cs.avgCycleLength}-day average cycle
                </span>
              )}
            </div>
            <Card className="card-pad">
              {loading ? <Skeleton className="h-[460px] w-full" /> : <CycleCalendar month={month} onMonth={setMonth} selected={selected} onSelect={setSelected} periods={periods} cs={cs} today={today} hasLogs={hasLogs} />}
            </Card>
          </div>

          <div ref={panelRef} className="scroll-mt-36 xl:sticky xl:top-24 xl:col-span-4">
            <Card className="overflow-hidden" aria-live="polite">
              <div
                className={cn(
                  'relative overflow-hidden bg-gradient-to-br p-5 sm:p-6',
                  selKind === 'period' ? 'from-rose-100 to-rose-50' : selKind === 'predicted_period' ? 'from-rose-50 to-white' : selKind === 'fertile_estimate' || selKind === 'ovulation_estimate' ? 'from-green-100 to-green-50' : 'from-green-50 to-white',
                )}
              >
                <span aria-hidden className="leaf absolute -right-4 -top-4 h-20 w-20 bg-white/60" />
                <div className="relative flex items-end gap-4">
                  <p className="num text-[56px] leading-[0.85] text-ink-900">{Number(selected.slice(8))}</p>
                  <div className="min-w-0 pb-1">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">{selected === today ? 'Today' : selected > today ? 'Future date' : `${diffDays(selected, today)} days ago`}</p>
                    <h2 className="truncate font-display text-lg font-semibold text-ink-900">{formatDate(selected, 'long').replace(/, \d{4}$/, '')}</h2>
                  </div>
                </div>
                <div className="relative mt-3 flex flex-wrap gap-1.5">
                  {selKind === 'period' && selPeriod && <Badge tone="rose" icon={<Droplet className="h-3 w-3 fill-current" />}>Period day {diffDays(selPeriod.start, selected) + 1}</Badge>}
                  {selKind === 'predicted_period' && <span className="rounded-full border border-dashed border-rose-400 bg-white px-2.5 py-0.5 text-xs font-semibold text-rose-700">Predicted period*</span>}
                  {selKind === 'fertile_estimate' && <span className="rounded-full border border-dashed border-green-500 bg-white px-2.5 py-0.5 text-xs font-semibold text-green-800">Fertile window estimate*</span>}
                  {selKind === 'ovulation_estimate' && <span className="rounded-full border border-dashed border-green-600 bg-white px-2.5 py-0.5 text-xs font-semibold text-green-800">Ovulation estimate* · not confirmed</span>}
                  {selCycleDay && selected <= today && <Badge tone="gray">Cycle day {selCycleDay}</Badge>}
                </div>
              </div>

              <div className="card-pad space-y-5">
                {selected > today ? (
                  <EmptyState
                    compact
                    icon={<CalendarDays className="h-5 w-5" />}
                    title="Nothing to log yet"
                    body={selKind === 'none' ? 'You can only log days that have happened. Dashed days are estimates.' : `${COPY.estimate} You can only log days that have happened.`}
                  />
                ) : (
                  <>
                    {selPeriod ? (
                      <div>
                        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">Flow</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                          {FLOWS.map((f) => (
                            <FlowChip
                              key={f.key}
                              compact
                              flow={f.key}
                              label={f.label}
                              drops={f.drops}
                              selected={selPeriod.flowByDay[selected] === f.key}
                              onClick={() => {
                                dispatch({ type: 'SET_FLOW', date: selected, flow: f.key });
                                toast.success('Flow updated', f.label);
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(selPeriod)}>
                            Edit
                          </Button>
                          {selPeriod.end === null && (
                            <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'END_PERIOD', id: selPeriod.id, date: selected })}>
                              End on this day
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Button variant="rose" className="w-full" leftIcon={<Droplet className="h-4 w-4" />} onClick={() => openLog(selected)}>
                        Log a period starting this day
                      </Button>
                    )}

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">Symptoms</p>
                        <button className="rounded-full px-2 py-1 text-sm font-semibold text-green-700 hover:bg-green-50" onClick={() => setSymOpen(true)}>
                          {selSymptoms.length ? 'Edit' : 'Add'}
                        </button>
                      </div>
                      {selSymptoms.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selSymptoms.map((l) => {
                            const def = state.symptomDefs.find((s) => s.id === l.symptomId);
                            return (
                              <Badge key={l.id} tone="rose" icon={<Icon name={def?.icon ?? 'sparkles'} className="h-3 w-3" />}>
                                {def?.label ?? l.symptomId} · {l.severity}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-ink-500">No symptoms logged.</p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">Check-in</p>
                      {selCheck ? (
                        <div className="flex items-center gap-3 rounded-2xl bg-lavender-50/70 p-3">
                          <MoodFace mood={selCheck.mood} size={44} />
                          <div className="min-w-0 flex-1 text-sm">
                            <p className="font-semibold text-ink-800">{moodLabel(selCheck.mood)}</p>
                            <p className="text-ink-500">
                              Energy {selCheck.energy}/10{selCheck.stress != null && ` · Stress ${selCheck.stress}/10`}
                              {selCheck.sleepHours != null && ` · Sleep ${selCheck.sleepHours}h`}
                            </p>
                            {!!selCheck.moodFactors?.length && <p className="mt-1 text-xs text-ink-400">Affected by: {selCheck.moodFactors.map((k) => MOOD_FACTORS.find((f) => f.key === k)?.label ?? k).join(', ')}</p>}
                          </div>
                          <Link to={`/app/mood?date=${selected}`} className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-green-700 hover:bg-white">
                            Edit
                          </Link>
                        </div>
                      ) : (
                        <p className="text-sm text-ink-500">
                          No check-in.{' '}
                          <Link to={selected === today ? '/app/check-in' : `/app/mood?date=${selected}`} className="font-semibold text-green-700 hover:underline">
                            {selected === today ? 'Check in now' : 'Log mood for this day'}
                          </Link>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-sky-50 p-3 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-sky-700">Water</p>
                        <p className="num mt-0.5 text-lg text-ink-900">{(waterOn(state, selected) / 1000).toFixed(1)} L</p>
                      </div>
                      <div className="rounded-2xl bg-indigo-50 p-3 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-indigo-700">Sleep</p>
                        <p className="num mt-0.5 text-lg text-ink-900">{sleepHoursOn(state, selected) != null ? `${sleepHoursOn(state, selected)} h` : '—'}</p>
                      </div>
                    </div>
                    {selCheck?.note && (
                      <div className="rounded-2xl border border-ink-100 p-3 text-sm">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Note</p>
                        <p className="mt-1 text-ink-700">{selCheck.note}</p>
                      </div>
                    )}
                  </>
                )}
                {timelineDay !== null && (
                  <div className="rounded-2xl bg-ink-50/70 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Where this day sits in your cycle*</p>
                    <PhaseTimeline className="mt-1" cycleLength={cs.avgCycleLength ?? 28} periodLength={cs.avgPeriodLength ?? 5} currentDay={timelineDay} fertileStart={fs} fertileEnd={fe} />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =================== History =================== */}
      {view === 'history' && (
        <>
          <HeroPanel tone="wash" label="Cycle summary">
            <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <div className="min-w-0">
                <p className="eyebrow">Your rhythm</p>
                <h2 className="mt-2 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[38px]">{avg ? `${avg}-day average cycle` : 'Building your history'}</h2>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-600">
                  {!avg
                    ? 'Log at least two periods to see cycle lengths.'
                    : cs.completedCycles === 0
                      ? 'Based on the cycle length you entered. Log at least two periods to see your own average.'
                      : `Estimates use your last ${Math.min(6, cs.completedCycles)} complete cycle${Math.min(6, cs.completedCycles) === 1 ? '' : 's'}. Bars in lavender differ from your average by more than 4 days.`}
                </p>
                {cs.spread !== null && (
                  <span className={cn('mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold', cs.isRegular ? 'bg-green-100 text-green-800' : 'bg-lavender-100 text-lavender-700')}>
                    {cs.isRegular ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {cs.isRegular ? 'Fairly consistent lately' : 'Varies more lately · observed pattern'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <HeroStat label="Average period" value={cs.avgPeriodLength ? `${cs.avgPeriodLength} days` : '—'} icon={<Droplet className="h-4 w-4 text-rose-500" />} hint="from your logs" />
                <HeroStat label="Cycles logged" value={history.length} icon={<CalendarHeart className="h-4 w-4" />} hint={`${cs.completedCycles} complete`} />
                <HeroStat label="Variation" value={cs.spread !== null ? `${cs.spread} days` : '—'} icon={<Timer className="h-4 w-4 text-lavender-600" />} hint="shortest vs longest" className="col-span-2 sm:col-span-1" />
              </div>
            </div>
          </HeroPanel>

          <div className="grid gap-6 xl:grid-cols-12">
            <Card className="card-pad xl:col-span-7">
              <CardHeader title="Logged cycles" subtitle="Edit or delete a period — estimates update instantly." action={lengthPoints.length > 0 ? <Badge tone={irregularCount ? 'lavender' : 'gray'}>{irregularCount ? `${irregularCount} outside your usual range` : 'All within your usual range'}</Badge> : undefined} />
              {history.length === 0 ? (
                <EmptyState icon={<Droplet className="h-6 w-6" />} title="No periods logged yet" body="Log your first period to start building your cycle history." action={<Button variant="rose" onClick={() => openLog(undefined)}>Log a period</Button>} />
              ) : (
                <>
                  <ul className="space-y-4">
                    {history.map((c) => {
                      const maxLen = Math.max(40, ...history.map((h) => h.length ?? 0), cs.cycleDay ?? 0);
                      const len = c.length ?? cs.cycleDay ?? c.periodLength ?? 1;
                      const irr = irregularOf(c.length);
                      const flows = Object.values(c.period?.flowByDay ?? {});
                      const heaviest = FLOWS.slice()
                        .reverse()
                        .find((f) => flows.includes(f.key));
                      const diff = c.length && avg ? c.length - avg : 0;
                      return (
                        <li key={c.periodId} className={cn('rounded-3xl p-3 sm:p-4', irr ? 'bg-lavender-50/70 ring-1 ring-inset ring-lavender-100' : 'bg-ink-50/60')}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink-900">
                                {formatDate(c.start)}
                                {c.length ? <span className={cn('num text-[17px]', irr ? 'text-lavender-700' : 'text-green-800')}>· {c.length}-day cycle</span> : <Badge tone="green">In progress · day {cs.cycleDay}</Badge>}
                              </p>
                              <p className="mt-0.5 text-sm text-ink-500">
                                {c.periodLength ? `${c.periodLength}-day period` : c.period?.end === null ? 'Ongoing period' : '—'}
                                {heaviest ? ` · heaviest flow ${heaviest.label.toLowerCase()}` : ''}
                              </p>
                            </div>
                            <div className="-mr-1 -mt-1 flex shrink-0 items-center">
                              {c.period && (
                                <>
                                  <button aria-label="Edit period" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-white hover:text-ink-800" onClick={() => setEdit(c.period ?? null)}>
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button aria-label="Delete period" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-danger-soft hover:text-danger" onClick={() => setDel(c.period ?? null)}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="relative mt-3 h-7 rounded-full bg-white ring-1 ring-inset ring-ink-100" aria-hidden>
                            <div className="absolute inset-y-1 left-1 flex overflow-hidden rounded-full" style={{ width: `calc(${(len / maxLen) * 100}% - 8px)` }}>
                              <span className="flex h-full items-center justify-center bg-rose-400 text-white" style={{ width: `${Math.min(100, ((c.periodLength ?? (c.period?.end === null ? Math.max(1, cs.periodDay ?? 1) : 1)) / len) * 100)}%` }}>
                                <Droplet className="h-3 w-3 fill-current" />
                              </span>
                              <span className={cn('h-full flex-1', !c.length ? 'border-2 border-l-0 border-dashed border-green-300 bg-green-50' : irr ? 'bg-lavender-300' : 'bg-green-300')} />
                            </div>
                            {avg > 0 && <span className="absolute -inset-y-1 w-0 border-l-2 border-dashed border-ink-300" style={{ left: `${(avg / maxLen) * 100}%` }} />}
                          </div>
                          {irr && (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-lavender-700">
                              <Sparkles className="h-3.5 w-3.5" /> Observed pattern · {Math.abs(diff)} days {diff > 0 ? 'longer' : 'shorter'} than your average
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-600">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-full bg-rose-400" /> Period</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-full bg-green-300" /> Cycle</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-full bg-lavender-300" /> Differs from average</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-full border-2 border-dashed border-green-300" /> Current cycle</span>
                    {avg > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0 border-l-2 border-dashed border-ink-300" /> Your average</span>}
                  </div>
                </>
              )}
            </Card>

            <div className="min-w-0 space-y-6 xl:col-span-5">
              <Card className="card-pad">
                <CardHeader title="Cycle length" subtitle={avg ? `Your average: ${avg} days${lengthPoints.length ? ' · hover or tab through the dots' : ''}` : 'Log at least two periods to see cycle lengths'} />
                {loading ? (
                  <Skeleton className="h-[240px] w-full" />
                ) : lengthPoints.length && avg ? (
                  <>
                    <CycleLengthChart points={lengthPoints} avg={avg} />
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-600">
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="h-3 w-5 rounded-md bg-green-50 ring-1 ring-inset ring-green-100" /> Your usual range: {avg - 4}–{avg + 4} days (average {avg})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-lavender-500" /> Differs from your usual range · observed pattern
                      </span>
                    </div>
                  </>
                ) : (
                  <EmptyState compact icon={<CalendarDays className="h-5 w-5" />} title="Not enough data" body="Log at least two periods to see how your cycle lengths compare." />
                )}
                {cs.spread !== null && (
                  <div className={cn('mt-4 flex gap-3 rounded-2xl p-4 text-sm', cs.isRegular ? 'bg-green-50 text-green-900' : 'bg-lavender-50 text-ink-800')}>
                    <Sparkles className={cn('mt-0.5 h-4 w-4 shrink-0', cs.isRegular ? 'text-green-600' : 'text-lavender-600')} />
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        Variation: {cs.spread} days between shortest and longest recent cycle <PhaseBadge phase={2} />
                      </p>
                      <p className="mt-1">{cs.isRegular ? 'Your recent cycle lengths have been fairly consistent.' : `${COPY.irregular} ${COPY.concern}`}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">{COPY.observedPattern}</p>
                    </div>
                  </div>
                )}
              </Card>
              <Card className="card-pad">
                <CardHeader title="Period duration" subtitle={cs.avgPeriodLength ? `Average ${cs.avgPeriodLength} days` : undefined} />
                {loading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : lengthData.length ? (
                  <BarTrend data={lengthData} series={[{ key: 'period', name: 'Period (days)', color: palette.rose[400] }]} height={200} />
                ) : (
                  <EmptyState compact icon={<Droplet className="h-5 w-5" />} title="Not enough data" />
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* =================== Insights =================== */}
      {view === 'insights' && (
        <>
          <section>
            <SectionTitle eyebrow="Your four phases" title="Where you are in your cycle*" subtitle={cs.hasData ? `Day ranges are estimates from your ${pr.len}-day average cycle.` : 'Shown for a typical 28-day cycle until you log a period.'} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {PHASE_ORDER.map((k) => {
                const ph = PHASES[k];
                const st = PHASE_STYLE[k];
                const here = cs.phase === k;
                return (
                  <article key={k} className={cn('relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-inset', here ? `ring-2 ${st.ring}` : 'ring-ink-100')}>
                    <div className={cn('relative bg-gradient-to-br p-4', st.band, k === 'ovulatory' && 'border-b-2 border-dashed border-green-300')}>
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn('flex h-11 w-11 items-center justify-center rounded-full shadow-soft', st.disc)}>
                          <st.icon className="h-5 w-5" />
                        </span>
                        {here && <span className="rounded-full bg-green-800 px-2.5 py-1 text-[11px] font-semibold text-white">You’re here*</span>}
                      </div>
                      <p className={cn('mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em]', st.text)}>
                        {dayRange(pr.ranges[k])}
                        {k !== 'menstrual' ? '*' : ''}
                      </p>
                      <h3 className="mt-0.5 font-display text-[18px] font-semibold leading-snug text-ink-900">{ph.label}</h3>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-sm leading-relaxed text-ink-600">{ph.description}</p>
                      <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">Gentle tips</p>
                      <ul className="space-y-1.5">
                        {ph.tips.map((t) => (
                          <li key={t} className="flex items-start gap-2 text-sm text-ink-800">
                            <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', st.dot)}>
                              <Check className="h-3 w-3" />
                            </span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-400">
              * {COPY.estimate} {COPY.ovulationNotConfirmed} {COPY.notContraception}
            </p>
          </section>

          <Card className="card-pad">
            <CardHeader title="Your cycle patterns" subtitle="Rules-based observations from your logs (advanced patterns are Phase 2)" icon={<Sparkles className="h-5 w-5" />} />
            {cycleInsights.length === 0 ? (
              <EmptyState compact icon={<CalendarDays className="h-5 w-5" />} title="No cycle patterns yet" body="Patterns appear after a few complete cycles of logging." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {cycleInsights.map((i) => (
                  <InsightCard key={i.id} insight={i} locked={i.phase === 2 && state.profile.plan === 'free'} />
                ))}
              </div>
            )}
            {cs.spread !== null && (
              <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
                Recent cycle variation: <strong>{cs.spread} days</strong> between your shortest and longest cycle · {cs.isRegular ? 'fairly consistent' : COPY.irregular} <span className="text-ink-400">({COPY.concern})</span>
              </p>
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-12">
            <Card className="card-pad xl:col-span-7">
              <CardHeader title="Energy by cycle day" subtitle="Average of your check-ins across logged cycles" action={<Badge tone="lavender">Observed pattern</Badge>} />
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : energyByDay.length > 5 ? (
                <LineTrend data={energyByDay} series={[{ key: 'energy', name: 'Avg energy', color: palette.peach[500] }]} height={300} yDomain={[0, 10]} unit="/10" />
              ) : (
                <EmptyState compact icon={<CalendarDays className="h-5 w-5" />} title="Keep checking in" body="We need a few cycles of check-ins to show this." />
              )}
              <p className="mt-3 text-xs text-ink-400">{COPY.observedPattern} Patterns describe what you logged; they don’t explain why.</p>
            </Card>
            <Card className="card-pad xl:col-span-5">
              <CardHeader title="Most logged symptoms" subtitle="Last 6 months" action={<CardLink to="/app/symptoms">Track</CardLink>} />
              {freq.length ? (
                <ul className="space-y-2.5">
                  {freq.map((f) => {
                    const def = state.symptomDefs.find((s) => s.id === f.id);
                    return (
                      <li key={f.id} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                          <Icon name={def?.icon ?? 'sparkles'} className="h-4 w-4" />
                        </span>
                        <span className="w-28 shrink-0 truncate text-sm font-semibold text-ink-800 sm:w-32">{f.label}</span>
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-rose-50">
                          <span className="block h-full rounded-full bg-rose-300" style={{ width: `${(f.count / freq[0].count) * 100}%` }} />
                        </span>
                        <span className="w-8 text-right font-mono text-xs text-ink-600">{f.count}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState compact icon={<Droplet className="h-5 w-5" />} title="No symptoms logged" />
              )}
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="grid sm:grid-cols-[240px_minmax(0,1fr)]">
              <div className="relative h-44 sm:h-auto">
                <Photo photo="woman-reading" alt="" shape="none" className="!absolute inset-0" />
              </div>
              <div className="card-pad flex flex-col justify-center">
                <p className="eyebrow">Learn</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-ink-900">The four cycle phases, explained simply</h3>
                <p className="mt-1 text-sm text-ink-500">What changes across a cycle, what many people notice, and why your own pattern matters most.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink to="/app/learn/a_cycle_phases" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Read the article
                  </ButtonLink>
                  <ButtonLink to="/app/coach" size="sm" variant="outline" leftIcon={<HeartPulse className="h-4 w-4" />}>
                    Ask the coach
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      <LogPeriodModal open={logOpen} onClose={() => setLogOpen(false)} defaultDate={logDate} />
      <LogSymptomsModal open={symOpen} onClose={() => setSymOpen(false)} date={selected > today ? today : selected} />
      <EditPeriodModal period={edit} onClose={() => setEdit(null)} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="Delete this period?"
        confirmLabel="Delete"
        body={del ? `The period starting ${formatDate(del.start)} will be removed and your cycle estimates recalculated.` : ''}
        onConfirm={() => {
          if (del) {
            dispatch({ type: 'DELETE_PERIOD', id: del.id });
            toast.success('Period deleted', 'Estimates recalculated.');
          }
        }}
      />
    </div>
  );
}

function EditPeriodModal({ period, onClose }: { period: PeriodLog | null; onClose: () => void }) {
  const { today, periods } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  if (period && period.id !== prevId) {
    setPrevId(period.id);
    setStart(period.start);
    setEnd(period.end ?? '');
    setNotes(period.notes ?? '');
    setError(null);
  }
  if (!period && prevId) setPrevId(null);

  const save = () => {
    if (!period) return;
    const err = validatePeriodRange(start, end || null, sortPeriods(periods), today, period.id);
    if (err) return setError(err);
    dispatch({ type: 'UPDATE_PERIOD', id: period.id, start, end: end || null, notes: notes || undefined });
    toast.success('Period updated', 'Estimates recalculated.');
    onClose();
  };
  const days = start ? diffDays(start, end || addDays(start, 0)) + 1 : null;

  return (
    <Modal
      open={!!period}
      onClose={onClose}
      title="Edit period"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-500 shadow-xs">
            <Droplet className="h-5 w-5 fill-current" />
          </span>
          <p className="text-sm text-ink-700">
            {start ? formatDate(start, 'medium') : 'Choose a start'}
            {end ? ` → ${formatDate(end, 'medium')}` : ' · ongoing'}
            {days && days > 0 ? <span className="font-semibold text-rose-700">{` · ${days} day${days === 1 ? '' : 's'}`}</span> : null}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" htmlFor="ep-start">
            <Input id="ep-start" type="date" max={today} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End" htmlFor="ep-end" hint="Empty = ongoing">
            <Input id="ep-end" type="date" max={today} min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="ep-notes">
          <Textarea id="ep-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
