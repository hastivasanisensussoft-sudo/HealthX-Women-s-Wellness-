import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Clock3, Droplets, Flame, GlassWater, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { dailySeries, formatClock, formatDate, palette, WATER_PRESETS_ML, waterOn, waterStreak } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { BarTrend } from '@/components/charts/Charts';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, ProgressBar, SectionTitle, Skeleton, Switch, useToast } from '@/components/ui';
import { cn, formatMl, useDemoLoading } from '@/lib/utils';
import { HeroHeading, HeroPanel, HeroStat } from '@/user/components/wellness-ui/Hero';
import { themeColor } from '@/user/components/wellness-ui/theme';

const GLASS = 'M22 10 H170 Q176 10 175 17 L158 240 Q156 258 138 258 H54 Q36 258 34 240 L17 17 Q16 10 22 10 Z';

/** Animated glass: two drifting waves rise with today's total; ticks mark quarters of the target. */
function WaterGlass({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(1, pct));
  const level = 262 - p * 250;
  return (
    <div className="relative mx-auto h-60 w-[11.5rem] sm:h-72 sm:w-[13.5rem]" role="img" aria-label={`Glass ${Math.round(p * 100)}% full`}>
      <span aria-hidden className="absolute inset-x-6 bottom-0 h-8 rounded-full bg-sky-200/60 blur-xl" />
      <svg viewBox="0 0 192 268" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <clipPath id="hx-glass">
            <path d={GLASS} />
          </clipPath>
          <linearGradient id="hx-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={themeColor('sky-300', palette.sky[300])} />
            <stop offset="100%" stopColor={themeColor('sky-500', palette.sky[500])} />
          </linearGradient>
        </defs>
        <path d={GLASS} className="fill-white" />
        <g clipPath="url(#hx-glass)">
          <g style={{ transform: `translateY(${level}px)`, transition: 'transform 1s cubic-bezier(.2,.8,.2,1)' }}>
            <g className="animate-wave" style={{ animationDuration: '7s' }}>
              <path d="M0 10 Q 24 0 48 10 T 96 10 T 144 10 T 192 10 T 240 10 T 288 10 T 336 10 T 384 10 V 320 H 0 Z" fill="url(#hx-water)" />
            </g>
            <g className="animate-wave" style={{ animationDuration: '11s', animationDirection: 'reverse' }}>
              <path d="M0 14 Q 24 4 48 14 T 96 14 T 144 14 T 192 14 T 240 14 T 288 14 T 336 14 T 384 14 V 320 H 0 Z" className="fill-sky-200" opacity="0.45" />
            </g>
            {[30, 88, 140].map((x, i) => (
              <circle key={x} cx={x} cy={60 + i * 34} r={3 + (i % 2) * 2} className="animate-float fill-sky-50" opacity="0.6" style={{ animationDelay: `${i * 0.8}s` }} />
            ))}
          </g>
        </g>
        <path d="M32 24 L45 230" className="stroke-sky-50" strokeWidth="9" strokeLinecap="round" opacity="0.7" />
        <path d={GLASS} fill="none" className="stroke-sky-200" strokeWidth="4" />
        {[0.25, 0.5, 0.75].map((q) => (
          <line key={q} x1="160" x2="170" y1={262 - q * 250} y2={262 - q * 250} className="stroke-sky-300" strokeWidth="2.5" strokeLinecap="round" />
        ))}
      </svg>
      <div className="absolute inset-x-0 top-[34%] flex justify-center">
        <div className="flex flex-col items-center rounded-3xl bg-white/80 px-4 py-2 shadow-soft ring-1 ring-inset ring-white backdrop-blur">
          <p className="num text-[34px] leading-none text-ink-900 sm:text-[40px]">{Math.round(p * 100)}%</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">of target</p>
        </div>
      </div>
    </div>
  );
}

const TIPS = [
  { photo: 'herbal-tea' as const, title: 'Teas and infusions count', body: 'Herbal teas, milk and water infused with lemon, mint or cucumber all add to your day.' },
  { photo: 'fresh-fruit' as const, title: 'Water-rich foods help too', body: 'Fruit, cucumber, curd and soups bring extra water along with your meals.' },
];

export default function Hydration() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const loading = useDemoLoading(400);
  const { today, waterTargetMl } = state;
  const total = waterOn(state, today);
  const entries = state.water.filter((w) => w.date === today).sort((a, b) => (a.time < b.time ? 1 : -1));
  const series = useMemo(() => dailySeries(state, 14).map((p) => ({ ...p, litres: +(p.water / 1000).toFixed(2) })), [state]);
  const met = series.slice(0, -1).filter((p) => p.water >= waterTargetMl).length;
  const goalStreak = waterStreak(state);
  const average = Math.round(series.reduce((a, p) => a + p.water, 0) / series.length);
  const [custom, setCustom] = useState('');
  const [customErr, setCustomErr] = useState<string | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const [target, setTarget] = useState(String(waterTargetMl));
  const [targetErr, setTargetErr] = useState<string | null>(null);

  const add = (ml: number) => {
    dispatch({ type: 'ADD_WATER', ml });
    const next = total + ml;
    if (total < waterTargetMl && next >= waterTargetMl) toast.success('Goal reached! 🎉', `You’ve had ${formatMl(next)} today.`);
    else toast.success(`+${ml} ml`, `${formatMl(next)} of ${formatMl(waterTargetMl)}`);
  };

  const addCustom = () => {
    const v = Number(custom);
    if (!Number.isFinite(v) || v < 50 || v > 2000) return setCustomErr('Enter an amount between 50 and 2,000 ml.');
    setCustomErr(null);
    setCustom('');
    add(Math.round(v));
  };

  const undo = () => {
    const last = entries[0];
    if (!last) return;
    dispatch({ type: 'REMOVE_WATER', id: last.id });
    toast.info('Removed last entry', `${last.ml} ml at ${formatClock(last.time)}`);
  };

  const left = Math.max(0, waterTargetMl - total);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hydration"
        subtitle="Small sips add up. Set a target that feels realistic for you."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Daily Wellness', to: '/app/hydration' }, { label: 'Hydration' }]}
        actions={
          <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setTargetOpen(true)}>
            Daily target: {formatMl(waterTargetMl)}
          </Button>
        }
      />

      {/* ---------- Hero: glass · quick add · streak ---------- */}
      <HeroPanel tone="sky" label="Today’s water">
        <div className="grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_240px]">
          <WaterGlass pct={total / waterTargetMl} />
          <div className="min-w-0">
            <HeroHeading
              eyebrow={`Today · ${formatDate(today, 'medium')}`}
              eyebrowClass="text-sky-700"
              title={
                <>
                  {formatMl(total)} <span className="text-[20px] font-medium text-ink-400 sm:text-[24px]">of {formatMl(waterTargetMl)}</span>
                </>
              }
              sub={total >= waterTargetMl ? 'Goal reached — lovely work! Anything extra is a bonus.' : `${formatMl(left)} to go. Keep a glass nearby and sip through the day.`}
            />
            <ProgressBar value={total / waterTargetMl} className="mt-4" height="h-3" color="bg-gradient-to-r from-sky-300 to-sky-500" track="bg-white ring-1 ring-inset ring-sky-100" label="Hydration progress" />

            <p className="mb-2 mt-6 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">Quick add</p>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {WATER_PRESETS_ML.map((ml, i) => (
                <button
                  key={ml}
                  onClick={() => add(ml)}
                  className="group flex flex-col items-center gap-1 rounded-3xl bg-white px-1 py-3 text-sky-700 shadow-soft ring-1 ring-inset ring-sky-100 transition hover:-translate-y-0.5 hover:ring-sky-300 active:scale-95"
                >
                  <span className="flex h-9 items-end">
                    <GlassWater className="text-sky-500 transition group-hover:scale-110" style={{ width: 16 + i * 3, height: 16 + i * 3 }} />
                  </span>
                  <span className="num text-[17px] leading-none text-ink-900">+{ml}</span>
                  <span className="text-[11px] font-semibold text-ink-500">ml</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
              <div className="col-span-2 min-w-0 sm:flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Custom ml"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  invalid={!!customErr}
                  aria-label="Custom amount in ml"
                  aria-describedby={customErr ? 'hx-custom-err' : undefined}
                  className="bg-white"
                />
              </div>
              <Button onClick={addCustom} leftIcon={<Plus className="h-4 w-4" />} className="h-12">
                Add
              </Button>
              <Button variant="white" onClick={undo} disabled={!entries.length} leftIcon={<Undo2 className="h-4 w-4" />} className="h-12 ring-1 ring-inset ring-sky-100">
                Undo
              </Button>
            </div>
            {customErr && (
              <p id="hx-custom-err" role="alert" className="mt-1.5 text-sm font-medium text-danger">
                {customErr}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:col-span-2 xl:col-span-1 xl:grid-cols-1">
            <HeroStat dense label="Goal streak" value={goalStreak} unit={goalStreak === 1 ? 'day' : 'days'} icon={<Flame className="h-4 w-4 text-peach-500" />} hint={goalStreak > 0 ? 'Days in a row at target' : 'Reach today’s target to start one'} />
            <HeroStat dense label="Goal met" value={`${met}/13`} icon={<Droplets className="h-4 w-4 text-sky-500" />} hint="Previous 13 days" />
            <HeroStat dense label="Daily average" value={formatMl(average)} icon={<GlassWater className="h-4 w-4" />} hint="Last 14 days" />
          </div>
        </div>
      </HeroPanel>

      {/* ---------- Trend + today's log ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-8">
          <CardHeader
            title="Last 14 days"
            subtitle="Litres per day"
            action={
              <div className="flex items-center gap-3 text-xs font-semibold text-ink-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Goal met
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-200" /> Below goal
                </span>
              </div>
            }
          />
          {loading ? (
            <Skeleton className="h-[240px] w-full rounded-2xl" />
          ) : (
            <BarTrend data={series} series={[{ key: 'litres', name: 'Water (L)', color: palette.sky[400] }]} height={240} unit="L" target={{ value: waterTargetMl / 1000, label: 'Target' }} highlight={(d) => ((d.water as number) >= waterTargetMl ? palette.sky[500] : palette.sky[200])} />
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Best day', v: formatMl(Math.max(0, ...series.map((p) => p.water))) },
              { l: 'Days at target', v: `${series.filter((p) => p.water >= waterTargetMl).length}/14` },
              { l: 'Drinks today', v: String(entries.length) },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl bg-sky-50/80 px-2 py-2.5">
                <p className="num text-lg text-ink-900">{x.v}</p>
                <p className="text-[11px] font-semibold text-sky-700">{x.l}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="card-pad flex flex-col xl:col-span-4">
          <CardHeader title="Today’s log" subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`} icon={<Clock3 className="h-5 w-5" />} />
          {entries.length === 0 ? (
            <EmptyState compact icon={<Droplets className="h-5 w-5" />} title="No water logged today" body="Tap a glass above to add your first drink." className="flex-1" />
          ) : (
            <ul className="scrollbar-thin relative -mr-2 max-h-[300px] flex-1 space-y-2 overflow-y-auto pr-2">
              {entries.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 rounded-2xl bg-sky-50/60 p-2.5 pl-3 ring-1 ring-inset ring-sky-100">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sky-500 shadow-xs">
                      <GlassWater className="h-4 w-4" />
                    </span>
                    <span className="num text-[16px] text-ink-900">{w.ml} ml</span>
                    <Badge tone="gray" className="bg-white ring-1 ring-inset ring-ink-100">
                      {formatClock(w.time)}
                    </Badge>
                  </span>
                  <button aria-label="Delete entry" onClick={() => dispatch({ type: 'REMOVE_WATER', id: w.id })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 transition hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-green-50 px-4 py-3 ring-1 ring-inset ring-green-100">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-green-700 shadow-xs">
              <BellRing className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <Switch
                checked={state.notificationPrefs.types.hydration.enabled}
                onChange={(v) => {
                  dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs: { ...state.notificationPrefs, types: { ...state.notificationPrefs.types, hydration: { ...state.notificationPrefs.types.hydration, enabled: v } } } });
                  toast.success(v ? 'Hydration reminders on' : 'Hydration reminders off');
                }}
                label="Hydration reminders"
                description={
                  <>
                    Gentle nudges during the day ·{' '}
                    <Link to="/app/notifications" className="font-semibold text-green-700 hover:underline">
                      Edit times
                    </Link>
                  </>
                }
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ---------- Video + tips ---------- */}
      <section>
        <SectionTitle eyebrow="Watch & sip" title="Make water easier" subtitle="A short video preview and two everyday ideas" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <VideoCard video="hydration" className="h-full md:col-span-2 xl:col-span-1" aspect="aspect-[16/10] xl:aspect-auto xl:h-full xl:min-h-[300px]" />
          {TIPS.map((t, i) => (
            <article key={t.title} className="overflow-hidden rounded-3xl bg-white shadow-xs ring-1 ring-inset ring-ink-100">
              <Photo photo={t.photo} alt="" shape="none" className="h-40 w-full" />
              <div className="p-5">
                <p className={cn('font-mono text-[10.5px] uppercase tracking-[0.14em]', i === 0 ? 'text-green-700' : 'text-peach-600')}>Idea {i + 1}</p>
                <p className="mt-1 font-display text-[17px] font-semibold text-ink-900">{t.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{t.body}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">How much water you need varies with climate, activity and health. These are general wellness ideas, not medical advice.</p>
      </section>

      <Modal
        open={targetOpen}
        onClose={() => setTargetOpen(false)}
        title="Daily water target"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTargetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const v = Number(target);
                if (!Number.isFinite(v) || v < 500 || v > 6000) return setTargetErr('Choose a target between 500 and 6,000 ml.');
                dispatch({ type: 'SET_WATER_TARGET', ml: Math.round(v) });
                setTargetErr(null);
                setTargetOpen(false);
                toast.success('Target updated', formatMl(Math.round(v)));
              }}
            >
              Save target
            </Button>
          </>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {[1800, 2000, 2400, 2800].map((ml) => (
            <button key={ml} type="button" onClick={() => setTarget(String(ml))} aria-pressed={target === String(ml)} className={cn('chip', target === String(ml) ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-ink-200 bg-white text-ink-700 hover:border-sky-300')}>
              {formatMl(ml)}
            </button>
          ))}
        </div>
        <Field label="Target (ml)" htmlFor="wt" error={targetErr} hint="Needs vary with climate, activity and more. This is a personal goal, not medical advice.">
          <Input id="wt" type="number" value={target} onChange={(e) => setTarget(e.target.value)} invalid={!!targetErr} />
        </Field>
      </Modal>
    </div>
  );
}
