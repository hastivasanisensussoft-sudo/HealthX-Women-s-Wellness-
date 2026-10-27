import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BatteryMedium, Battery, Smile, Sparkles } from 'lucide-react';
import { computeInsights, dailySeries, formatDate, lastNDays, MOOD_FACTORS, moodLabel, MOODS, palette, weekday, type MoodLevel } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { MoodPicker } from '@/user/components/MoodPicker';
import { InsightCard } from '@/user/components/Cards';
import { HeroPanel } from '@/user/components/cycle-ui/Hero';
import { DateQuickPick } from '@/user/components/cycle-ui/Pickers';
import { AreaTrend, BarTrend } from '@/components/charts/Charts';
import { MoodFace } from '@/components/brand/Brand';
import { VideoCard } from '@/components/media/Video';
import { Button, Card, CardHeader, CardLink, ChipToggle, EmptyState, Notice, PageHeader, RatingSlider, RouteTabs, StatCard, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { SYMPTOM_TABS } from '@/user/layout/sectionTabs';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Mood & energy tracking (SRS §16). Writes into the day's check-in. */
export default function Mood() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const { today } = state;
  const [params] = useSearchParams();
  const qd = params.get('date');
  const [date, setDate] = useState(qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) && qd <= today ? qd : today);
  const existing = state.checkIns.find((c) => c.date === date);
  const [mood, setMood] = useState<MoodLevel | null>(existing?.mood ?? null);
  const [energy, setEnergy] = useState(existing?.energy ?? 6);
  const [factors, setFactors] = useState<string[]>(existing?.moodFactors ?? []);
  const [error, setError] = useState<string | null>(null);

  const series = useMemo(() => dailySeries(state, 30), [state]);
  const last30 = state.checkIns.filter((c) => c.date >= lastNDays(today, 30)[0]);
  const dist = MOODS.map((m) => ({ ...m, count: last30.filter((c) => c.mood === m.key).length }));
  const maxDist = Math.max(1, ...dist.map((x) => x.count));
  const byWeekday = WEEKDAYS.map((label, wd) => {
    const xs = last30.filter((c) => weekday(c.date) === wd).map((c) => c.energy);
    return { label, energy: xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null };
  });
  const avg = (xs: number[]) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null);
  const thisWeek = avg(state.checkIns.filter((c) => c.date >= lastNDays(today, 7)[0]).map((c) => c.energy));
  const prevWeek = avg(state.checkIns.filter((c) => c.date >= lastNDays(today, 14)[0] && c.date < lastNDays(today, 7)[0]).map((c) => c.energy));
  const pattern = computeInsights(state).find((i) => i.ruleId === 'activity_energy' || i.ruleId === 'pre_period_energy');
  const factorCounts = MOOD_FACTORS.map((f) => ({ ...f, count: last30.filter((c) => c.moodFactors?.includes(f.key)).length }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);
  const todayCheck = state.checkIns.find((c) => c.date === today);
  const days28 = lastNDays(today, 28);
  const recentLogs = [...state.checkIns].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  const pick = (d: string) => {
    setDate(d);
    setError(null);
    const c = state.checkIns.find((x) => x.date === d);
    setMood(c?.mood ?? null);
    setEnergy(c?.energy ?? 6);
    setFactors(c?.moodFactors ?? []);
  };

  const save = () => {
    if (date > today) return setError("You can't log a future date.");
    if (!mood) return setError('Choose how you felt.');
    setError(null);
    dispatch({ type: 'SAVE_CHECKIN', checkIn: { ...(existing ?? { symptomIds: [] }), date, mood, energy, moodFactors: factors } });
    toast.success('Mood & energy saved', `${moodLabel(mood)} · energy ${energy}/10 · ${formatDate(date, 'short')}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Mood & energy"
          subtitle="How you feel and how much energy you have — patterns become clearer over a few cycles."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Symptoms & Mood', to: '/app/symptoms' }, { label: 'Mood & energy' }]}
        />
        <RouteTabs tabs={SYMPTOM_TABS} label="Symptoms & mood pages" className="mb-0" />
      </div>

      <HeroPanel tone="wash" label="Your mood lately">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center sm:h-32 sm:w-32">
              <span aria-hidden className="absolute inset-0 animate-breathe rounded-full bg-white/80 shadow-soft" />
              {todayCheck ? <MoodFace mood={todayCheck.mood} size={88} className="relative h-14 w-14 sm:h-[88px] sm:w-[88px]" /> : <Smile className="relative h-9 w-9 text-lavender-400 sm:h-12 sm:w-12" />}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-lavender-700">Today · {formatDate(today, 'medium')}</p>
              <h2 className="mt-1.5 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[34px]">{todayCheck ? `Feeling ${moodLabel(todayCheck.mood).toLowerCase()}` : 'How are you today?'}</h2>
              <p className="mt-1.5 text-[15px] text-ink-600">{todayCheck ? `Energy ${todayCheck.energy}/10${todayCheck.moodFactors?.length ? ` · ${todayCheck.moodFactors.map((k) => MOOD_FACTORS.find((f) => f.key === k)?.label ?? k).join(', ')}` : ''}` : 'Log a mood below — it only takes a moment.'}</p>
            </div>
          </div>
          <div className="rounded-3xl bg-white/85 p-3 shadow-soft ring-1 ring-inset ring-white backdrop-blur sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">Mood calendar · 4 weeks</p>
              <p className="text-xs text-ink-400">Tap a day to edit</p>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days28.map((d) => {
                const c = state.checkIns.find((x) => x.date === d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pick(d)}
                    aria-label={`Edit ${formatDate(d)}`}
                    aria-pressed={d === date}
                    className={cn('flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition', d === date ? 'bg-green-100 ring-2 ring-green-600' : 'hover:bg-green-50')}
                  >
                    {c ? <MoodFace mood={c.mood} size={26} /> : <span className="h-[26px] w-[26px] rounded-full border-2 border-dashed border-ink-200" />}
                    <span className={cn('font-mono text-[9.5px] leading-none', d === today ? 'font-medium text-green-700' : 'text-ink-400')}>{Number(d.slice(8))}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </HeroPanel>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-7">
          <div className="card-pad space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <DateQuickPick id="md-date" value={date} onChange={pick} today={today} />
              {existing && <p className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-800">Updating the check-in for {formatDate(date, 'short')}</p>}
            </div>
            <section>
              <h2 className="mb-3 font-display text-[18px] font-semibold text-ink-900">Daily mood</h2>
              <MoodPicker value={mood} onChange={(m) => (setMood(m), setError(null))} size="lg" />
            </section>
            <div className="rounded-3xl bg-peach-50 p-4 ring-1 ring-inset ring-peach-100">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-peach-700">
                <BatteryMedium className="h-4 w-4" /> {energy <= 3 ? 'Running low' : energy <= 7 ? 'Steady' : 'Full of energy'}
              </p>
              <RatingSlider label="Energy level" value={energy} onChange={setEnergy} accent="accent-peach-500" lowLabel="Drained" highLabel="Energised" />
            </div>
            <section>
              <h2 className="mb-3 font-display text-[18px] font-semibold text-ink-900">What’s affecting your mood?</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Mood factors">
                {MOOD_FACTORS.map((f) => (
                  <ChipToggle key={f.key} tone="lavender" selected={factors.includes(f.key)} onClick={() => setFactors((x) => (x.includes(f.key) ? x.filter((k) => k !== f.key) : [...x, f.key]))} icon={<Icon name={f.icon} className="h-3.5 w-3.5" />}>
                    {f.label}
                  </ChipToggle>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-400">
                Optional. Want to log stress or anxiety?{' '}
                <Link to="/app/stress" className="font-semibold text-green-700 hover:underline">
                  Stress tracking →
                </Link>
              </p>
            </section>
          </div>
          <div className="space-y-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4 sm:px-6">
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button size="lg" onClick={save} className="w-full sm:w-auto">
                Save mood & energy
              </Button>
            </div>
          </div>
        </Card>
        <div className="min-w-0 space-y-6 xl:col-span-5">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Energy · 7 days"
              value={thisWeek ?? '—'}
              unit="/10"
              icon={<Battery className="h-5 w-5" />}
              tone="peach"
              trend={thisWeek !== null && prevWeek !== null ? { dir: thisWeek >= prevWeek ? 'up' : 'down', text: `${thisWeek >= prevWeek ? '+' : ''}${(thisWeek - prevWeek).toFixed(1)} vs last week` } : undefined}
            />
            <StatCard label="Check-ins · 30 days" value={last30.length} icon={<Smile className="h-5 w-5" />} tone="lavender" />
          </div>
          <Card className="card-pad">
            <CardHeader title="Mood mix" subtitle="Last 30 days" />
            {last30.length === 0 ? (
              <EmptyState compact icon={<Smile className="h-5 w-5" />} title="No moods logged yet" />
            ) : (
              <div className="flex items-end justify-between gap-1 rounded-3xl bg-lavender-50/70 p-3">
                {dist.map((m) => (
                  <div key={m.key} className="flex flex-col items-center gap-1.5">
                    <span className="font-mono text-xs text-ink-600">{m.count}</span>
                    <div className="flex h-20 w-8 items-end overflow-hidden rounded-full bg-white">
                      <div className="w-full rounded-full bg-lavender-300 transition-[height]" style={{ height: `${(m.count / maxDist) * 100}%` }} />
                    </div>
                    <MoodFace mood={m.key} size={32} />
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="card-pad">
            <CardHeader title="What’s been affecting your mood" subtitle="Last 30 days" />
            {factorCounts.length === 0 ? (
              <p className="text-sm text-ink-500">Tag what’s affecting your mood to see what comes up most.</p>
            ) : (
              <ul className="space-y-2.5">
                {factorCounts.slice(0, 5).map((f) => (
                  <li key={f.key} className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lavender-50 text-lavender-600">
                      <Icon name={f.icon} className="h-4 w-4" />
                    </span>
                    <span className="w-20 font-semibold text-ink-800">{f.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-lavender-50">
                      <span className="block h-full rounded-full bg-lavender-400" style={{ width: `${(f.count / factorCounts[0].count) * 100}%` }} />
                    </span>
                    <span className="w-8 text-right font-mono text-xs text-ink-600">{f.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-8">
          <CardHeader title="Energy" subtitle="Last 30 days (1–10)" />
          {series.every((p) => p.energy === null) ? (
            <EmptyState compact icon={<Battery className="h-5 w-5" />} title="No energy logged yet" body="Your energy line appears after a few check-ins." />
          ) : (
            <AreaTrend data={series} series={[{ key: 'energy', name: 'Energy', color: palette.peach[500] }]} height={240} yDomain={[0, 10]} unit="/10" />
          )}
        </Card>
        <Card className="card-pad xl:col-span-4">
          <CardHeader title="Energy by weekday" subtitle="Average, last 30 days" />
          {byWeekday.every((d) => d.energy === null) ? (
            <EmptyState compact icon={<Battery className="h-5 w-5" />} title="Nothing to compare yet" body="Weekday averages need a week or two of check-ins." />
          ) : (
            <BarTrend data={byWeekday} series={[{ key: 'energy', name: 'Avg energy', color: palette.peach[400] }]} height={240} />
          )}
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-7">
          <CardHeader title="Mood history" subtitle="Your latest check-ins · tap one to edit it" action={<CardLink to="/app/insights/trends">All trends</CardLink>} />
          {recentLogs.length === 0 ? (
            <EmptyState compact icon={<Smile className="h-5 w-5" />} title="No check-ins yet" body="Your mood entries will be listed here." />
          ) : (
            <ul className="space-y-2">
              {recentLogs.map((c) => (
                <li key={c.date}>
                  <button
                    type="button"
                    aria-label={`Edit ${formatDate(c.date)} · ${moodLabel(c.mood)}, energy ${c.energy}/10`}
                    onClick={() => (pick(c.date), window.scrollTo({ top: 0, behavior: 'smooth' }))}
                    className={cn('flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition', c.date === date ? 'bg-green-50 ring-1 ring-inset ring-green-200' : 'bg-ink-50/60 hover:bg-green-50/60')}
                  >
                    <MoodFace mood={c.mood} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold text-ink-900">{moodLabel(c.mood)}</span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">{c.date === today ? 'Today' : formatDate(c.date, 'medium')}</span>
                      </span>
                      <span className="block truncate text-sm text-ink-500">
                        Energy {c.energy}/10
                        {c.moodFactors?.length ? ` · ${c.moodFactors.map((k) => MOOD_FACTORS.find((f) => f.key === k)?.label ?? k).join(', ')}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-green-700">Edit</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="min-w-0 space-y-4 xl:col-span-5">
          {pattern ? (
            <InsightCard insight={pattern} locked={pattern.phase === 2 && state.profile.plan === 'free'} />
          ) : (
            <Notice tone="green" icon={<Sparkles className="h-4 w-4 text-green-600" />} title="Patterns take time">
              Keep logging mood and energy for a few weeks to see observed patterns here.
            </Notice>
          )}
          <VideoCard video="walk-outdoors" subtitle="Many people find a short walk outside refreshing" aspect="aspect-[16/9]" />
        </div>
      </div>
    </div>
  );
}
