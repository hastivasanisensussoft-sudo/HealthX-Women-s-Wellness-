import { useMemo, useRef, useState } from 'react';
import { CalendarHeart, Droplets, Info, Minus, Plus, Save, ShieldAlert, Sprout, Thermometer, TestTube, CircleHelp, type LucideIcon } from 'lucide-react';
import { COPY, cycleStateOf, diffDays, formatDate, palette, startOfMonth, type FertilityLog, type ISODate } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { HeroPanel } from '@/user/components/cycle-ui/Hero';
import { CycleCalendar } from '@/components/cycle/CycleCalendar';
import { LineTrend } from '@/components/charts/Charts';
import { Badge, Button, Card, CardHeader, EmptyState, EstimateMarker, Input, PageHeader, PhaseBadge, Segmented, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';

const MUCUS: { key: NonNullable<FertilityLog['mucus']>; label: string; hint: string }[] = [
  { key: 'dry', label: 'Dry', hint: 'Little or none' },
  { key: 'sticky', label: 'Sticky', hint: 'Thick, tacky' },
  { key: 'creamy', label: 'Creamy', hint: 'Lotion-like' },
  { key: 'watery', label: 'Watery', hint: 'Wet, thin' },
  { key: 'egg_white', label: 'Egg-white', hint: 'Clear, stretchy' },
];

const TESTS: { key: NonNullable<FertilityLog['ovulationTest']>; icon: LucideIcon; label: string }[] = [
  { key: 'negative', icon: Minus, label: 'negative' },
  { key: 'positive', icon: Plus, label: 'positive' },
  { key: 'not_sure', icon: CircleHelp, label: 'not sure' },
];

/** Fertility awareness (SRS §20–§21) — Phase 3 preview. All observations are user-entered. */
export default function Fertility() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const { today } = state;
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState<ISODate>(today);
  const existing = state.fertility.find((f) => f.date === selected);
  const [unit, setUnit] = useState<'c' | 'f'>('c');
  const [bbt, setBbt] = useState(existing?.bbtCelsius ? String(existing.bbtCelsius) : '');
  const [mucus, setMucus] = useState<FertilityLog['mucus']>(existing?.mucus);
  const [test, setTest] = useState<FertilityLog['ovulationTest']>(existing?.ovulationTest);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const select = (d: ISODate) => {
    setSelected(d);
    setError(null);
    // Below xl the form sits under the calendar: bring it into view.
    if (window.matchMedia?.('(max-width: 1279px)').matches) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const e = state.fertility.find((f) => f.date === d);
    setBbt(e?.bbtCelsius ? String(unit === 'c' ? e.bbtCelsius : +(e.bbtCelsius * 1.8 + 32).toFixed(2)) : '');
    setMucus(e?.mucus);
    setTest(e?.ovulationTest);
  };

  const save = () => {
    if (selected > today) return setError("Observations can't be logged for future dates.");
    let c: number | undefined;
    if (bbt) {
      const v = Number(bbt);
      c = unit === 'c' ? v : (v - 32) / 1.8;
      if (!Number.isFinite(c) || c < 35 || c > 38.5) return setError(unit === 'c' ? 'Enter a temperature between 35.0 and 38.5 °C.' : 'Enter a temperature between 95.0 and 101.3 °F.');
    }
    if (!c && !mucus && !test) return setError('Add at least one observation.');
    setError(null);
    dispatch({ type: 'LOG_FERTILITY', log: { date: selected, bbtCelsius: c ? +c.toFixed(2) : undefined, mucus, ovulationTest: test } });
    toast.success('Observation saved', formatDate(selected, 'short'));
  };

  const cycleLogs = state.fertility.filter((f) => cs.currentCycleStart && f.date >= cs.currentCycleStart).sort((a, b) => (a.date < b.date ? -1 : 1));
  const bbtSeries = cycleLogs.filter((f) => f.bbtCelsius).map((f) => ({ label: `D${diffDays(cs.currentCycleStart!, f.date) + 1}`, bbt: unit === 'c' ? (f.bbtCelsius as number) : +(f.bbtCelsius! * 1.8 + 32).toFixed(2) }));
  // Round the axis to tenths so tick labels stay short (the readings themselves keep two decimals).
  const bbtValues = bbtSeries.map((p) => p.bbt);
  const bbtDomain: [number, number] = bbtValues.length ? [Math.floor(Math.min(...bbtValues) * 10) / 10 - 0.1, Math.ceil(Math.max(...bbtValues) * 10) / 10 + 0.1] : [36, 37];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fertility awareness"
        badge={<PhaseBadge phase={3} />}
        subtitle="Learn your cycle signs — basal body temperature, cervical mucus and ovulation tests."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Learn', to: '/app/learn' }, { label: 'Fertility & pregnancy', to: '/app/learn/fertility-pregnancy' }, { label: 'Fertility awareness' }]}
      />

      <HeroPanel tone="wash" label="Fertile window estimate">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="eyebrow">
              Calendar estimate <EstimateMarker />
            </p>
            <h2 className="mt-2 font-display text-[22px] font-semibold text-ink-900">Estimated fertile window</h2>
            {cs.fertileWindow ? (
              <>
                <p className="mt-3 inline-flex flex-wrap items-baseline gap-2 rounded-3xl border-2 border-dashed border-green-400 bg-white/80 px-5 py-3">
                  <span className="num text-[30px] leading-none text-green-900 sm:text-[36px]">
                    {formatDate(cs.fertileWindow.start, 'short')} – {formatDate(cs.fertileWindow.end, 'short')}*
                  </span>
                </p>
                <p className="mt-3 text-sm text-ink-600">
                  Based on an average cycle of {cs.avgCycleLength} days · confidence: <strong className="capitalize">{cs.confidence}</strong>
                  {cs.nextPeriodStart && ` · next period around ${formatDate(cs.nextPeriodStart, 'short')}*`}
                </p>
              </>
            ) : (
              <p className="mt-3 text-[15px] text-ink-600">Log at least one period to see an estimate.</p>
            )}
            <p className="mt-2 text-xs text-ink-500">{COPY.estimate}</p>
            <div role="note" className="mt-5 flex items-start gap-3 rounded-3xl bg-green-950 p-4 text-white">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-butter-300 text-green-950">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">Not contraception</p>
                <p className="text-white/80">{COPY.notContraception} Using fertility features to avoid pregnancy requires medical/legal review before launch.</p>
              </div>
            </div>
          </div>
          <div className="grid content-start gap-3">
            {[
              { icon: Sprout, title: 'Awareness, not prediction', body: COPY.fertilityAwareness, cls: 'text-green-700 bg-green-50' },
              { icon: Info, title: 'Ovulation is never confirmed', body: `${COPY.ovulationNotConfirmed} Test results and temperatures you log are shown as your own observations.`, cls: 'text-lavender-600 bg-lavender-50' },
              { icon: CalendarHeart, title: 'Your observations, your notes', body: 'Everything on this page is user-entered. HealthX does not interpret your signs or results.', cls: 'text-rose-600 bg-rose-50' },
            ].map((n) => (
              <div key={n.title} className="flex gap-3 rounded-3xl bg-white/85 p-4 shadow-soft ring-1 ring-inset ring-white backdrop-blur">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', n.cls)}>
                  <n.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 text-sm leading-relaxed">
                  <p className="font-semibold text-ink-900">{n.title}</p>
                  <p className="text-ink-600">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HeroPanel>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-7">
          <CycleCalendar month={month} onMonth={setMonth} selected={selected} onSelect={select} periods={state.periods} cs={cs} today={today} hasLogs={(d) => state.fertility.some((f) => f.date === d)} />
        </Card>
        <div ref={formRef} className="min-w-0 scroll-mt-36 xl:col-span-5">
          <Card className="overflow-hidden">
            <div className="border-b border-ink-100 bg-gradient-to-br from-green-50 to-white p-5 sm:p-6">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-green-700">{existing ? 'Editing saved observation' : 'User-entered'}</p>
              <h2 className="mt-1 font-display text-[19px] font-semibold text-ink-900">Log observations · {formatDate(selected, 'short')}</h2>
              <p className="text-sm text-ink-500">Pick a day on the calendar to log or edit it.</p>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="rounded-3xl bg-peach-50 p-4 ring-1 ring-inset ring-peach-100">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="ft-bbt" className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                    <Thermometer className="h-4 w-4 text-peach-600" /> Basal body temperature
                  </label>
                  <Segmented size="sm" value={unit} onChange={setUnit} options={[{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]} />
                </div>
                <Input id="ft-bbt" type="number" step="0.01" inputMode="decimal" placeholder={unit === 'c' ? 'e.g. 36.45' : 'e.g. 97.6'} value={bbt} onChange={(e) => setBbt(e.target.value)} aria-label="Basal body temperature" className="bg-white" />
                <p className="mt-1.5 text-xs text-ink-500">Take it at the same time each morning, before getting up.</p>
              </div>
              <div className="rounded-3xl bg-sky-50 p-4 ring-1 ring-inset ring-sky-100">
                <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                  <Droplets className="h-4 w-4 text-sky-600" /> Cervical mucus
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MUCUS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={mucus === m.key}
                      onClick={() => setMucus(mucus === m.key ? undefined : m.key)}
                      className={cn('flex min-h-[52px] flex-col items-start justify-center rounded-2xl px-3 py-2 text-left transition', mucus === m.key ? 'bg-white text-sky-700 ring-2 ring-sky-500' : 'bg-white/70 text-ink-700 ring-1 ring-inset ring-sky-100 hover:bg-white')}
                    >
                      <span className="text-sm font-semibold">{m.label}</span>
                      <span className="text-[11px] text-ink-500">{m.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <fieldset className="rounded-3xl bg-lavender-50 p-4 ring-1 ring-inset ring-lavender-100">
                <legend className="sr-only">Ovulation test</legend>
                <p aria-hidden className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                  <TestTube className="h-4 w-4 text-lavender-600" /> Ovulation test
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TESTS.map((t) => (
                    <label key={t.key} className={cn('flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold capitalize transition focus-within:ring-2 focus-within:ring-green-500', test === t.key ? 'bg-white text-lavender-700 ring-2 ring-lavender-500' : 'bg-white/70 text-ink-600 ring-1 ring-inset ring-lavender-100 hover:bg-white')}>
                      <input type="radio" name="ovtest" className="sr-only" checked={test === t.key} onChange={() => setTest(t.key)} />
                      <t.icon className="h-4 w-4" aria-hidden />
                      {t.label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-500">A test result is your own observation — it can’t confirm ovulation.</p>
              </fieldset>
              {error && (
                <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                  {error}
                </p>
              )}
              <Button className="w-full" size="lg" leftIcon={<Save className="h-4 w-4" />} onClick={save}>
                Save observation
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-7">
          <CardHeader title="Temperature this cycle" subtitle="Your logged readings" action={<Badge tone="gray">User-entered</Badge>} />
          {bbtSeries.length > 2 ? (
            <LineTrend data={bbtSeries} series={[{ key: 'bbt', name: `BBT (${unit === 'c' ? '°C' : '°F'})`, color: palette.peach[500] }]} height={240} unit={unit === 'c' ? '°C' : '°F'} yDomain={[+bbtDomain[0].toFixed(1), +bbtDomain[1].toFixed(1)]} />
          ) : (
            <EmptyState compact icon={<Thermometer className="h-5 w-5" />} title="Log a few mornings" body="Take your temperature at the same time each morning before getting up." />
          )}
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Trends describe what you logged. HealthX does not interpret temperature shifts as confirmed ovulation.
          </p>
        </Card>
        <Card className="overflow-hidden xl:col-span-5">
          <div className="p-5 sm:p-6">
            <h3 className="font-display text-[17px] font-semibold text-ink-900">Observation log</h3>
            <p className="text-sm text-ink-500">Current cycle · tap an entry to edit it</p>
          </div>
          {cycleLogs.length === 0 ? (
            <EmptyState compact icon={<TestTube className="h-5 w-5" />} title="No observations yet" body="Your entries for this cycle will appear here." />
          ) : (
            <ul className="scrollbar-thin max-h-80 space-y-2 overflow-y-auto px-5 pb-5 sm:px-6">
              {cycleLogs
                .slice()
                .reverse()
                .map((f) => (
                  <li key={f.date}>
                    <button type="button" onClick={() => select(f.date)} className={cn('flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-sm transition', f.date === selected ? 'bg-green-50 ring-1 ring-inset ring-green-200' : 'bg-ink-50/70 hover:bg-green-50/60')}>
                      <span className="font-semibold text-ink-800">
                        {formatDate(f.date, 'short')} <span className="font-mono text-xs font-normal text-ink-400">· D{diffDays(cs.currentCycleStart!, f.date) + 1}</span>
                      </span>
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {f.bbtCelsius && <Badge tone="peach">{f.bbtCelsius.toFixed(2)} °C</Badge>}
                        {f.mucus && <Badge tone="sky">{MUCUS.find((m) => m.key === f.mucus)?.label}</Badge>}
                        {f.ovulationTest && <Badge tone="lavender">Test: {f.ovulationTest.replace('_', ' ')}</Badge>}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
