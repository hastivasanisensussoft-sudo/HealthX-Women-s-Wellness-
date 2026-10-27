import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Apple, BookOpen, Coffee, Cookie, Droplets, Lightbulb, Moon, Plus, Salad, ShoppingBasket, Soup, Trash2, Utensils } from 'lucide-react';
import { formatDate, lastNDays, mealsOn, nutritionTotals, NUTRITION_TARGETS, palette, waterOn, type MealLog } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { BarTrend, Donut } from '@/components/charts/Charts';
import { LeafPair } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { VideoCard } from '@/components/media/Video';
import { Badge, BackendBadge, Button, Card, CardHeader, Field, Input, Modal, Notice, PageHeader, PhaseBadge, ProgressBar, SectionTitle, Segmented, Select, Skeleton, useToast } from '@/components/ui';
import { cn, formatMl, useDemoLoading } from '@/lib/utils';
import { HeroHeading, HeroPanel } from '@/user/components/wellness-ui/Hero';

type Meal = MealLog['meal'];
const MEAL_META: Record<Meal, { label: string; icon: typeof Coffee; when: string; tone: string }> = {
  breakfast: { label: 'Breakfast', icon: Coffee, when: 'Morning', tone: 'bg-butter-100 text-butter-600' },
  lunch: { label: 'Lunch', icon: Soup, when: 'Midday', tone: 'bg-green-100 text-green-700' },
  snack: { label: 'Snacks', icon: Cookie, when: 'Any time', tone: 'bg-peach-100 text-peach-600' },
  dinner: { label: 'Dinner', icon: Moon, when: 'Evening', tone: 'bg-lavender-100 text-lavender-600' },
};
const ORDER: Meal[] = ['breakfast', 'lunch', 'snack', 'dinner'];

// Demo quick-add foods (incl. Indian vegetarian staples). Real food DB is D-35 / FUT-05.
const QUICK_FOODS: Omit<MealLog, 'id' | 'date' | 'meal'>[] = [
  { name: 'Masala oats', kcal: 290, protein: 9, carbs: 45, fat: 8, fiber: 7 },
  { name: 'Idli (3) with sambar', kcal: 330, protein: 12, carbs: 60, fat: 4, fiber: 8 },
  { name: 'Moong dal chilla (2)', kcal: 280, protein: 16, carbs: 34, fat: 8, fiber: 7 },
  { name: 'Paneer bhurji & roti', kcal: 460, protein: 24, carbs: 38, fat: 22, fiber: 6 },
  { name: 'Rajma chawal', kcal: 520, protein: 18, carbs: 88, fat: 9, fiber: 15 },
  { name: 'Curd (1 bowl)', kcal: 120, protein: 7, carbs: 9, fat: 6, fiber: 0 },
  { name: 'Fruit bowl', kcal: 140, protein: 2, carbs: 34, fat: 1, fiber: 6 },
  { name: 'Grilled tofu salad', kcal: 380, protein: 24, carbs: 20, fat: 22, fiber: 8 },
];

const EMPTY_FORM = { name: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' };
const mealForNow = (): Meal => {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
};

export default function Nutrition() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const loading = useDemoLoading(450);
  const { today } = state;
  const [date, setDate] = useState(today);
  const [open, setOpen] = useState(false);
  const [meal, setMeal] = useState<Meal>('breakfast');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totals = nutritionTotals(state, date);
  const meals = mealsOn(state, date);
  const water = waterOn(state, date);
  const week = useMemo(() => lastNDays(today, 7).map((d) => ({ label: formatDate(d, 'weekday'), kcal: nutritionTotals(state, d).kcal, protein: nutritionTotals(state, d).protein })), [state, today]);
  const mealsLogged = ORDER.filter((m) => meals.some((x) => x.meal === m)).length;

  const openAdd = (m: Meal, prefill?: (typeof QUICK_FOODS)[number]) => {
    setMeal(m);
    setForm(prefill ? { name: prefill.name, kcal: String(prefill.kcal), protein: String(prefill.protein), carbs: String(prefill.carbs), fat: String(prefill.fat), fiber: String(prefill.fiber) } : EMPTY_FORM);
    setErrors({});
    setOpen(true);
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Enter a food or meal name.';
    const nums = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const;
    nums.forEach((k) => {
      const v = Number(form[k] || 0);
      if (!Number.isFinite(v) || v < 0) e[k] = 'Must be 0 or more';
      if (k === 'kcal' && (v <= 0 || v > 3000)) e[k] = 'Enter 1–3,000 kcal';
      if (k !== 'kcal' && v > 300) e[k] = 'Too high';
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    dispatch({ type: 'ADD_MEAL', meal: { date, meal, name: form.name.trim(), kcal: +form.kcal, protein: +(form.protein || 0), carbs: +(form.carbs || 0), fat: +(form.fat || 0), fiber: +(form.fiber || 0) } });
    toast.success('Meal added', form.name.trim());
    setOpen(false);
  };

  const macro = (label: string, key: keyof typeof NUTRITION_TARGETS, color: string, unit = 'g') => (
    <div key={key}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-semibold text-ink-700">
          <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
          {label}
        </span>
        <span className="font-bold tabular-nums text-ink-900">
          {totals[key]}
          <span className="font-medium text-ink-400">
            {' '}
            / {NUTRITION_TARGETS[key]} {unit}
          </span>
        </span>
      </div>
      <ProgressBar value={totals[key] / NUTRITION_TARGETS[key]} className="mt-1.5" color={color} track="bg-white ring-1 ring-inset ring-ink-100" label={`${label} against reference`} />
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nutrition"
        badge={<PhaseBadge phase={2} />}
        subtitle="Balanced, flexible eating — including vegetarian and Indian meals."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Daily Wellness', to: '/app/hydration' }, { label: 'Nutrition' }]}
        actions={
          <>
            <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value || today)} aria-label="Date" className="w-44" />
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openAdd('lunch')}>
              Add meal
            </Button>
          </>
        }
      />

      {/* ---------- Hero: today's plate ---------- */}
      <HeroPanel tone="peach" label="Today’s plate">
        <div className="grid items-center gap-8 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_240px]">
          <div className="mx-auto w-full max-w-[240px]">
            {loading ? (
              <Skeleton className="mx-auto h-[220px] w-[220px] rounded-full" />
            ) : totals.kcal === 0 ? (
              <div className="relative mx-auto flex h-[220px] w-[220px] flex-col items-center justify-center rounded-full border-[14px] border-dashed border-peach-100 bg-white text-center">
                <Salad className="h-8 w-8 text-peach-500" />
                <p className="mt-2 font-display text-[15px] font-semibold text-ink-900">Nothing logged</p>
                <p className="px-6 text-xs text-ink-500">Add your first meal for this day.</p>
              </div>
            ) : (
              <Donut
                height={220}
                inner={74}
                outer={102}
                data={[
                  { name: 'Protein (g)', value: totals.protein, color: palette.green[500] },
                  { name: 'Carbs (g)', value: totals.carbs, color: palette.butter[400] },
                  { name: 'Fat (g)', value: totals.fat, color: palette.peach[400] },
                ]}
              >
                <p className="num text-[34px] leading-none text-ink-900">{totals.kcal}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">of ~{NUTRITION_TARGETS.kcal} kcal</p>
              </Donut>
            )}
            <div className="mt-2 flex justify-center gap-3 text-xs font-semibold text-ink-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Protein
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-butter-400" />
                Carbs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-peach-400" />
                Fat
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <HeroHeading
              eyebrow={date === today ? `Today · ${formatDate(date, 'medium')}` : formatDate(date, 'long')}
              eyebrowClass="text-peach-700"
              title={
                <>
                  {totals.kcal.toLocaleString()} <span className="text-[20px] font-medium text-ink-400 sm:text-[24px]">kcal logged</span>
                </>
              }
              sub={meals.length ? `${meals.length} item${meals.length === 1 ? '' : 's'} across ${mealsLogged} of 4 meals` : 'Log a meal to see your macros against general reference values.'}
            />
            <div className="mt-5 grid gap-3.5 sm:grid-cols-2 sm:gap-x-6">
              {macro('Protein', 'protein', 'bg-green-500')}
              {macro('Carbohydrates', 'carbs', 'bg-butter-400')}
              {macro('Fat', 'fat', 'bg-peach-400')}
              {macro('Fibre', 'fiber', 'bg-lavender-400')}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-ink-700">
                    <Droplets className="h-4 w-4 text-sky-500" /> Water
                  </span>
                  <Link to="/app/hydration" className="font-bold text-ink-900 hover:text-green-700">
                    {formatMl(water)} <span className="font-medium text-ink-400">/ {formatMl(state.waterTargetMl)}</span>
                  </Link>
                </div>
                <ProgressBar value={water / state.waterTargetMl} className="mt-1.5" color="bg-sky-500" track="bg-white ring-1 ring-inset ring-ink-100" label="Water against target" />
              </div>
            </div>
          </div>
          <div className="relative mx-auto hidden w-full max-w-[240px] xl:block">
            <LeafPair className="-right-6 -top-6 h-32 w-32" />
            <Photo photo="nutrition-bowl" alt="A colourful bowl of vegetables and grains" shape="arch" className="relative h-[280px] w-full shadow-lift" priority />
          </div>
        </div>
      </HeroPanel>

      <Notice tone="safety">Reference values are general guides, not personalised targets. HealthX does not give individual medical or dietary treatment advice — a registered dietitian can help with that.</Notice>

      {/* ---------- Meal timeline + week ---------- */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="card-pad xl:col-span-8">
          <CardHeader title="Meal timeline" subtitle={formatDate(date, 'long')} icon={<Utensils className="h-5 w-5" />} />
          <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-0.5 before:bg-ink-100 sm:before:left-[21px]">
            {ORDER.map((m) => {
              const items = meals.filter((x) => x.meal === m);
              const M = MEAL_META[m];
              const kcal = items.reduce((a, x) => a + x.kcal, 0);
              return (
                <li key={m} className="relative flex gap-3 sm:gap-4">
                  <span className={cn('relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white sm:h-11 sm:w-11', M.tone)}>
                    <M.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                  </span>
                  <div className="min-w-0 flex-1 rounded-3xl bg-ink-50/60 p-3 ring-1 ring-inset ring-ink-100 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">{M.when}</p>
                        <h3 className="font-display text-[17px] font-semibold text-ink-900">
                          {M.label}
                          <span className="ml-2 text-sm font-medium text-ink-500">{items.length ? `${kcal} kcal` : 'Nothing logged'}</span>
                        </h3>
                      </div>
                      <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openAdd(m)} aria-label={`Add to ${M.label.toLowerCase()}`}>
                        Add
                      </Button>
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-2 text-sm text-ink-500">No {M.label.toLowerCase()} logged for this day.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {items.map((x) => (
                          <li key={x.id} className="rounded-2xl bg-white py-2 pl-3 pr-1.5 shadow-xs">
                            <div className="flex items-center justify-between gap-2">
                              <p className="min-w-0 font-semibold leading-snug text-ink-800">{x.name}</p>
                              <div className="flex shrink-0 items-center gap-0.5">
                                <Badge tone="butter">{x.kcal} kcal</Badge>
                                <button aria-label="Remove meal" onClick={() => dispatch({ type: 'REMOVE_MEAL', id: x.id })} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-400 hover:bg-danger-soft hover:text-danger">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="mb-1 flex flex-wrap gap-1.5 pr-1.5 text-[11px] font-semibold">
                              <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">P {x.protein}g</span>
                              <span className="rounded-full bg-butter-50 px-2 py-0.5 text-butter-600">C {x.carbs}g</span>
                              <span className="rounded-full bg-peach-50 px-2 py-0.5 text-peach-700">F {x.fat}g</span>
                              <span className="rounded-full bg-lavender-50 px-2 py-0.5 text-lavender-700">Fibre {x.fiber}g</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="space-y-6 xl:col-span-4">
          <Card className="card-pad">
            <CardHeader title="This week" subtitle="Calories per day" />
            {loading ? <Skeleton className="h-[220px] w-full rounded-2xl" /> : <BarTrend data={week} series={[{ key: 'kcal', name: 'kcal', color: palette.butter[400] }]} height={220} />}
          </Card>
          <Card className="card-pad">
            <CardHeader title="Quick ideas" subtitle="Tap to add — you can edit before saving" icon={<Lightbulb className="h-5 w-5" />} />
            <div className="flex flex-wrap gap-2">
              {QUICK_FOODS.map((f) => (
                <button key={f.name} type="button" onClick={() => openAdd(mealForNow(), f)} className="chip border-peach-100 bg-peach-50/60 text-ink-700 hover:border-peach-300 hover:bg-peach-50">
                  {f.name}
                  <span className="font-mono text-[11px] text-peach-700">{f.kcal}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-400">Sample values for common dishes; portions vary.</p>
          </Card>
        </div>
      </div>

      {/* ---------- Cook + roadmap ---------- */}
      <section>
        <SectionTitle eyebrow="Cook & plan" title="Simple, balanced meals" subtitle="A video preview to try tonight, and what’s coming to nutrition later" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <VideoCard video="healthy-cooking" aspect="aspect-[16/10]" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Utensils, t: 'Meal planning', d: 'Weekly plans built around your preferences.' },
              { icon: BookOpen, t: 'Recipes', d: 'Simple, balanced recipes — many vegetarian.' },
              { icon: ShoppingBasket, t: 'Grocery lists', d: 'Auto-generated from your plan.' },
              { icon: Apple, t: 'Indian food database', d: 'Accurate values for regional dishes.' },
            ].map((x) => (
              <div key={x.t} className="rounded-3xl border border-dashed border-ink-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <x.icon className="h-5 w-5" />
                  </span>
                  <Badge tone="gray">Future</Badge>
                </div>
                <p className="mt-3 font-display text-[16px] font-semibold text-ink-900">{x.t}</p>
                <p className="mt-1 text-sm text-ink-500">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-400">Future nutrition features from the HealthX roadmap (SRS §28).</p>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add to your log"
        description={`For ${formatDate(date, 'long')}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Add meal</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Segmented className="w-full flex-wrap [&>button]:flex-1" value={meal} onChange={setMeal} options={ORDER.map((m) => ({ value: m, label: MEAL_META[m].label }))} />
          <div>
            <p className="label">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_FOODS.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setForm({ name: f.name, kcal: String(f.kcal), protein: String(f.protein), carbs: String(f.carbs), fat: String(f.fat), fiber: String(f.fiber) })}
                  aria-pressed={form.name === f.name}
                  className={cn('chip', form.name === f.name ? 'border-green-600 bg-green-50 text-green-800' : 'border-ink-200 bg-white text-ink-700 hover:border-green-400')}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <Field label="Food or meal" htmlFor="nm-name" error={errors.name} required>
            <Input id="nm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
              <Field key={k} label={k === 'kcal' ? 'Calories' : `${k[0].toUpperCase()}${k.slice(1)} (g)`} htmlFor={`nm-${k}`} error={errors[k]}>
                <Input id={`nm-${k}`} type="number" min={0} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} invalid={!!errors[k]} />
              </Field>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <Select aria-label="Data source" className="h-9 w-auto text-xs" defaultValue="manual">
              <option value="manual">Manual entry</option>
              <option value="db" disabled>
                Food database (coming later)
              </option>
            </Select>
            <BackendBadge label="Food DB requires backend" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
