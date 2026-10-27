import { useMemo, useRef, useState } from 'react';
import { BedDouble, Clock, Moon, MoonStar, Plus, Smartphone, Star, Sunrise } from 'lucide-react';
import { addDays, clockToMinutes, dailySeries, formatClock, formatDate, palette, sleepDuration, type SleepLog } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { AreaTrend, BarTrend } from '@/components/charts/Charts';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import { BackendBadge, Button, ButtonLink, Card, CardHeader, EmptyState, Field, Input, Notice, PageHeader, Pagination, PhaseBadge, SectionTitle, Skeleton, Stepper, useToast } from '@/components/ui';
import { cn, formatHours, formatMinutes, paginate, useDemoLoading } from '@/lib/utils';
import { HeroHeading, HeroPanel, HeroStat, NightMoon } from '@/user/components/wellness-ui/Hero';
import { SleepDial } from '@/user/components/wellness-ui/SleepDial';

const BED_PRESETS = ['22:00', '22:30', '23:00', '23:30'];
const WAKE_PRESETS = ['06:00', '06:30', '07:00', '07:30'];

function QualityStars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex gap-0.5', className)} aria-label={`Quality ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((q) => (
        <Star key={q} aria-hidden className={cn('h-4 w-4', q <= value ? 'fill-butter-300 text-butter-300' : 'text-white/25')} />
      ))}
    </span>
  );
}

/** Where each recent bedtime falls between 8 pm and 2 am, with the average and spread. */
function BedtimeStrip({ logs }: { logs: SleepLog[] }) {
  const LO = 120;
  const HI = 480;
  const pts = logs.map((l) => ({ date: l.date, t: l.bedtime, v: (clockToMinutes(l.bedtime) - 18 * 60 + 1440) % 1440 })).filter((p) => Number.isFinite(p.v));
  if (!pts.length) return null;
  const avg = pts.reduce((a, p) => a + p.v, 0) / pts.length;
  const spread = Math.max(...pts.map((p) => p.v)) - Math.min(...pts.map((p) => p.v));
  const toClock = (v: number) => {
    const m = (Math.round(v) + 18 * 60) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  const pos = (v: number) => `${((Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO)) * 100}%`;
  return (
    <div className="mt-5 rounded-2xl bg-indigo-50/60 p-4 ring-1 ring-inset ring-indigo-100">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-ink-800">Bedtime consistency</p>
        <p className="text-xs text-ink-500">
          Avg {formatClock(toClock(avg))} · spread {formatMinutes(spread)} · last {pts.length} nights
        </p>
      </div>
      <div className="relative mx-2 mt-4 h-8" role="img" aria-label={`Bedtimes for the last ${pts.length} nights, about ${formatMinutes(spread)} apart, averaging ${formatClock(toClock(avg))}`}>
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white ring-1 ring-inset ring-indigo-100" />
        <span className="absolute top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full bg-indigo-300" style={{ left: pos(avg) }} />
        {pts.map((p) => (
          <span key={p.date} title={`${formatDate(p.date, 'short')} · ${formatClock(p.t)}`} className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/80 ring-2 ring-white" style={{ left: pos(p.v) }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-400">
        <span>8 pm</span>
        <span>10 pm</span>
        <span>12 am</span>
        <span>2 am</span>
      </div>
    </div>
  );
}

/** Sleep (SRS §30) — Phase 2 module; MVP captures sleep hours in the daily check-in (D-05). */
export default function Sleep() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const loading = useDemoLoading(450);
  const { today, sleepTargetHours } = state;
  const [date, setDate] = useState(today);
  const [bedtime, setBedtime] = useState('22:45');
  const [wake, setWake] = useState('06:45');
  const [quality, setQuality] = useState<SleepLog['quality']>(4);
  const [wakings, setWakings] = useState(1);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const duration = sleepDuration(bedtime, wake);
  const series = useMemo(() => dailySeries(state, 14), [state]);
  const week = series.slice(-7);
  const logs = useMemo(() => state.sleep.slice().sort((a, b) => (a.date < b.date ? 1 : -1)), [state.sleep]);
  const last = logs[0];
  const recent = logs.slice(0, 7);
  const avg = recent.length ? recent.reduce((a, l) => a + l.durationMin, 0) / recent.length / 60 : null;
  const avgQuality = recent.length ? recent.reduce((a, l) => a + l.quality, 0) / recent.length : null;
  const avgWakings = recent.length ? recent.reduce((a, l) => a + l.wakings, 0) / recent.length : null;
  const pg = paginate(logs, page, 7);
  const apple = state.connections.find((c) => c.id === 'apple_health');

  const save = () => {
    if (date > today) return setError("You can't log sleep for a future date.");
    if (!Number.isFinite(duration) || duration < 30 || duration > 16 * 60) return setError('Please check your bedtime and wake time (30 min – 16 h).');
    setError(null);
    dispatch({ type: 'LOG_SLEEP', log: { date, bedtime, wake, durationMin: duration, quality, wakings, source: 'manual' } });
    toast.success('Sleep logged', `${formatMinutes(duration)} on ${formatDate(date, 'short')}`);
  };

  const goToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('sl-date')?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sleep"
        badge={<PhaseBadge phase={2} />}
        subtitle="Track bedtime, wake time, quality and night waking. Consistent sleep supports your overall wellbeing."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Daily Wellness', to: '/app/hydration' }, { label: 'Sleep' }]}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={goToForm}>
            Log last night
          </Button>
        }
      />

      {/* ---------- Night-sky hero ---------- */}
      <HeroPanel tone="night" leaf={false} moon={false} label="Last night’s sleep">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:items-end">
          <div className="relative min-w-0">
            <NightMoon className="absolute -top-1 right-0 h-16 w-16 sm:h-20 sm:w-20" />
            {last ? (
              <>
                <HeroHeading
                  dark
                  eyebrowClass="text-indigo-200"
                  eyebrow={`Last night · ${formatDate(last.date, 'medium')}`}
                  title={<span className="num text-[44px] sm:text-[56px]">{formatMinutes(last.durationMin)}</span>}
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <MoonStar className="h-4 w-4 text-indigo-200" /> {formatClock(last.bedtime)} → {formatClock(last.wake)}
                  </span>
                  <QualityStars value={last.quality} />
                  <span>
                    Woke {last.wakings} time{last.wakings === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/15">
                  {last.durationMin / 60 >= sleepTargetHours ? `At or above your ${sleepTargetHours} h target` : `${formatMinutes(Math.round(sleepTargetHours * 60 - last.durationMin))} under your ${sleepTargetHours} h target`}
                </p>
              </>
            ) : (
              <HeroHeading dark eyebrowClass="text-indigo-200" eyebrow="Last night" title="No sleep logged yet" sub="Log your bedtime and wake time to start seeing your sleep pattern." />
            )}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <HeroStat dark dense label="7-day avg" value={formatHours(avg ? +avg.toFixed(1) : null)} hint={avg !== null ? (avg >= sleepTargetHours ? 'On target' : 'Below target') : 'No logs yet'} />
              <HeroStat dark dense label="Quality" value={avgQuality ? avgQuality.toFixed(1) : '—'} unit="/ 5" hint="7-night avg" />
              <HeroStat dark dense label="Waking" value={avgWakings !== null ? avgWakings.toFixed(1) : '—'} hint="avg / night" />
            </div>
          </div>
          <div className="min-w-0 rounded-3xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-indigo-100/80">This week · hours</p>
              <p className="text-xs font-semibold text-white/70">Target {sleepTargetHours} h</p>
            </div>
            {loading ? (
              <Skeleton className="h-[190px] w-full rounded-2xl bg-white/10" />
            ) : (
              <BarTrend tone="dark" data={week} series={[{ key: 'sleep', name: 'Sleep', color: palette.indigo[300] }]} height={190} unit="h" target={{ value: sleepTargetHours, label: 'Target' }} highlight={(d) => (d.sleep !== null && (d.sleep as number) >= sleepTargetHours ? palette.lavender[300] : palette.indigo[300])} />
            )}
          </div>
        </div>
      </HeroPanel>

      {/* ---------- Log + 14-night trend ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <div ref={formRef} className="scroll-mt-24 xl:col-span-5">
        <Card className="card-pad h-full">
          <CardHeader title="Log sleep" subtitle="For the morning you woke up" icon={<BedDouble className="h-5 w-5" />} />
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start xl:flex-col xl:items-center 2xl:flex-row 2xl:items-start">
            <SleepDial bedtime={bedtime} wake={wake} size={224} />
            <div className="w-full min-w-0 flex-1 space-y-4">
              <Field label="Date (morning)" htmlFor="sl-date">
                <Input id="sl-date" type="date" max={today} min={addDays(today, -30)} value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bedtime" htmlFor="sl-bed">
                  <Input id="sl-bed" type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
                </Field>
                <Field label="Wake time" htmlFor="sl-wake">
                  <Input id="sl-wake" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {[
              { label: 'Quick bedtime', presets: BED_PRESETS, value: bedtime, set: setBedtime, on: 'border-indigo-300 bg-indigo-50 text-indigo-700', hover: 'hover:border-indigo-200' },
              { label: 'Quick wake time', presets: WAKE_PRESETS, value: wake, set: setWake, on: 'border-butter-400 bg-butter-50 text-green-900', hover: 'hover:border-butter-300' },
            ].map((g) => (
              <div key={g.label}>
                <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">{g.label}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {g.presets.map((t) => (
                    <button key={t} type="button" aria-pressed={g.value === t} onClick={() => g.set(t)} className={cn('chip min-h-[36px] justify-center px-1 py-1 text-xs', g.value === t ? g.on : cn('border-ink-200 bg-white text-ink-600', g.hover))}>
                      {formatClock(t)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700">
            <Sunrise className="h-4 w-4" /> Duration: {Number.isFinite(duration) ? formatMinutes(duration) : '—'}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Sleep quality</p>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as const).map((q) => (
                  <button key={q} type="button" aria-label={`Quality ${q} of 5`} aria-pressed={quality === q} onClick={() => setQuality(q)} className="rounded-full p-1 transition hover:bg-butter-50">
                    <Star className={cn('h-7 w-7 transition', q <= quality ? 'fill-butter-300 text-butter-400' : 'text-ink-200')} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Times you woke up</p>
              <Stepper value={wakings} onChange={setWakings} min={0} max={15} />
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-2xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <Button className="mt-5 w-full" onClick={save}>
            Save sleep
          </Button>
        </Card>
        </div>

        <Card className="card-pad xl:col-span-7">
          <CardHeader
            title="Sleep duration"
            subtitle="Last 14 nights"
            action={
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink-500">Target</span>
                <Stepper value={sleepTargetHours} onChange={(h) => dispatch({ type: 'SET_SLEEP_TARGET', hours: h })} min={5} max={10} step={0.5} suffix="h" />
              </div>
            }
          />
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          ) : (
            <AreaTrend data={series} series={[{ key: 'sleep', name: 'Sleep', color: palette.indigo[500] }]} height={300} unit="h" yDomain={[0, 10]} target={{ value: sleepTargetHours, label: 'Target' }} />
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Nights logged', v: `${series.filter((p) => p.sleep !== null).length}/14` },
              { l: 'At target', v: `${series.filter((p) => p.sleep !== null && p.sleep >= sleepTargetHours).length}` },
              { l: 'Longest', v: formatHours(Math.max(0, ...series.map((p) => p.sleep ?? 0)) || null) },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl bg-indigo-50/70 px-2 py-2.5">
                <p className="num text-lg text-ink-900">{x.v}</p>
                <p className="text-[11px] font-semibold text-indigo-700">{x.l}</p>
              </div>
            ))}
          </div>
          <BedtimeStrip logs={recent} />
        </Card>
      </div>

      {/* ---------- History + sync ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-8">
          <CardHeader title="Sleep history" subtitle={`${logs.length} nights logged`} icon={<Moon className="h-5 w-5" />} />
          {logs.length === 0 ? (
            <EmptyState icon={<Moon className="h-6 w-6" />} title="No sleep logged yet" body="Your nights will appear here once you log them." action={<Button size="sm" onClick={goToForm}>Log last night</Button>} />
          ) : (
            <>
              <ul className="space-y-2">
                {pg.items.map((l) => {
                  const onTarget = l.durationMin / 60 >= sleepTargetHours;
                  return (
                    <li key={l.date} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-3 ring-1 ring-inset ring-ink-100 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">{formatDate(l.date, 'short')}</p>
                        <p className="text-xs text-ink-500">
                          {formatClock(l.bedtime)} → {formatClock(l.wake)}
                        </p>
                      </div>
                      <div className="order-3 col-span-2 flex items-center gap-3 sm:order-none sm:col-span-1">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-indigo-50" aria-hidden>
                          <div className={cn('h-full rounded-full', onTarget ? 'bg-indigo-500' : 'bg-indigo-300')} style={{ width: `${Math.min(100, (l.durationMin / 600) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-ink-500">
                          {l.wakings} waking{l.wakings === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', onTarget ? 'bg-indigo-100 text-indigo-700' : 'bg-peach-100 text-peach-700')}>{formatMinutes(l.durationMin)}</span>
                        <span className="text-xs tracking-[0.1em] text-butter-500" aria-label={`Quality ${l.quality} of 5`}>
                          {'★'.repeat(l.quality)}
                          <span className="text-ink-200">{'★'.repeat(5 - l.quality)}</span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 border-t border-ink-100 pt-4">
                <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="nights" />
              </div>
            </>
          )}
        </Card>
        <Card className="card-pad flex flex-col xl:col-span-4">
          <CardHeader title="Sync from your phone" subtitle="Apple Health · Health Connect · wearables" icon={<Smartphone className="h-5 w-5" />} />
          <p className="text-sm leading-relaxed text-ink-600">Import sleep automatically instead of logging it by hand. Only the data types you allow are read.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PhaseBadge phase={2} />
            <BackendBadge />
          </div>
          <Notice tone="info" className="mt-4">
            {apple?.connected ? 'Apple Health is connected (simulated).' : 'Not connected.'} Manage connections in Privacy & data.
          </Notice>
          <ButtonLink to="/app/privacy" variant="outline" size="sm" className="mt-4 self-start">
            Manage integrations
          </ButtonLink>
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-indigo-50/70 p-3">
            <Clock className="h-5 w-5 shrink-0 text-indigo-600" />
            <p className="text-xs leading-relaxed text-ink-600">A steady bedtime and wake time — even on weekends — is one of the simplest sleep habits to try.</p>
          </div>
        </Card>
      </div>

      {/* ---------- Wind down ---------- */}
      <section>
        <SectionTitle eyebrow="Before bed" title="Wind down gently" subtitle="A guided routine and two calm ideas for the last hour of your day" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <VideoCard video="sleep-winddown" aspect="aspect-[16/10] xl:aspect-auto xl:h-full xl:min-h-[300px]" className="h-full md:col-span-2 xl:col-span-1" />
          {[
            { photo: 'woman-reading' as const, t: 'Swap the scroll for a few pages', d: 'Dim the lights and read something calm on paper for ten minutes.' },
            { photo: 'cozy-comfort' as const, t: 'A warm, caffeine-free drink', d: 'Warm milk or a herbal infusion can be a cosy cue that the day is done.' },
          ].map((x) => (
            <article key={x.t} className="overflow-hidden rounded-3xl bg-white shadow-xs ring-1 ring-inset ring-ink-100">
              <Photo photo={x.photo} alt="" shape="none" className="h-44 w-full" />
              <div className="p-5">
                <p className="font-display text-[17px] font-semibold text-ink-900">{x.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{x.d}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">General wellness ideas, not medical advice. If poor sleep is affecting your days, consider speaking with a healthcare professional.</p>
      </section>
    </div>
  );
}
