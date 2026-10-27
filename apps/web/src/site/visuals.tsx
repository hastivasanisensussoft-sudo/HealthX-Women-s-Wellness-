import { BellRing, BookOpenCheck, Check, CircleCheck, Download, Droplet, EyeOff, Flame, Heart, Lock, MessageCircle, Moon, PenLine, ShieldCheck, Sparkles, Stethoscope, Trash2 } from 'lucide-react';
import { Avatar, MoodFace } from '@/components/brand/Brand';
import { CycleRing } from '@/components/cycle/CycleRing';
import { ProgressRing } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ModuleVisualKind } from './content';

const chip = 'whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 shadow-xs ring-1 ring-ink-100';
const mono = 'font-mono text-[10px] uppercase tracking-[0.14em]';

/**
 * Small sample-UI illustrations for the website's module showcase. Decorative (aria-hidden):
 * the surrounding card text describes the module. Values are sample data, estimates keep their *.
 */
export function ModuleVisual({ kind, className }: { kind: ModuleVisualKind; className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none flex select-none items-center justify-center', className)}>
      <Inner kind={kind} />
    </div>
  );
}

function Inner({ kind }: { kind: ModuleVisualKind }) {
  switch (kind) {
    case 'ring':
      return (
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-full bg-white p-1.5 shadow-card">
            <CycleRing cycleLength={29} periodLength={5} currentDay={12} fertileStart={11} fertileEnd={16} size={100} stroke={10} showLabels={false}>
              <p className="num text-[24px] leading-none text-ink-900">12</p>
              <p className={cn(mono, 'text-[8px] text-ink-400')}>day</p>
            </CycleRing>
          </div>
          <div className="space-y-1.5">
            <p className={chip}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" /> Period · days 1–5
            </p>
            <p className={chip}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full border border-dashed border-green-600 bg-green-100" /> Fertile est.*
            </p>
            <p className={chip}>Next ~Nov 13*</p>
          </div>
        </div>
      );
    case 'mood':
      return (
        <div className="w-full max-w-[260px] rounded-2xl bg-white p-3.5 shadow-card">
          <p className={cn(mono, 'text-lavender-600')}>How are you feeling?</p>
          <div className="mt-2.5 flex justify-between">
            {(['very_low', 'low', 'neutral', 'good', 'excellent'] as const).map((m) => (
              <MoodFace key={m} mood={m} size={38} ring={m === 'good'} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-ink-600">
            Energy
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-peach-100">
              <span className="block h-full w-[70%] rounded-full bg-peach-400" />
            </span>
            7/10
          </div>
        </div>
      );
    case 'checkin':
      return (
        <div className="w-full max-w-[250px] space-y-1.5">
          {[
            ['Slept', '7h 40m', 'bg-indigo-100 text-indigo-600'],
            ['Mood', 'Good', 'bg-lavender-100 text-lavender-600'],
            ['Energy', '7 / 10', 'bg-peach-100 text-peach-600'],
          ].map(([l, v, t]) => (
            <div key={l} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-xs ring-1 ring-ink-100">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', t)}>
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-[12px] font-semibold text-ink-700">{l}</span>
              <span className="ml-auto text-[12px] font-bold text-ink-900">{v}</span>
            </div>
          ))}
          <p className="pt-0.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-green-700">Done in 24 seconds</p>
        </div>
      );
    case 'stages':
      return (
        <div className="flex max-w-[270px] flex-wrap justify-center gap-1.5">
          {['Cycle', 'Fertility awareness*', 'Pregnancy', 'Perimenopause', 'Menopause'].map((s, i) => (
            <span key={s} className={cn(chip, i === 1 && 'bg-peach-50 text-peach-700 ring-peach-200')}>
              {s}
            </span>
          ))}
          <span className="mt-1 w-full rounded-xl bg-white/80 px-3 py-2 text-center text-[11px] font-medium leading-snug text-ink-600 ring-1 ring-ink-100">Observations only — never contraception</span>
        </div>
      );
    case 'steps':
      return (
        <div className="flex items-center gap-4">
          <ProgressRing value={0.78} size={104} stroke={11}>
            <p className="num text-[20px] leading-none text-ink-900">6,240</p>
            <p className={cn(mono, 'mt-0.5 text-[8.5px] text-ink-400')}>steps</p>
          </ProgressRing>
          <div className="flex h-[92px] items-end gap-1.5">
            {[40, 62, 35, 80, 55, 92, 70].map((h, i) => (
              <span key={i} className={cn('w-3 rounded-full', i === 5 ? 'bg-green-600' : 'bg-green-200')} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      );
    case 'plate':
      return (
        <div className="w-full max-w-[250px] rounded-2xl bg-white p-3.5 shadow-card">
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] font-bold text-ink-800">Today</p>
            <p className="num text-[18px] text-ink-900">
              1,480 <span className="font-sans text-[11px] font-semibold text-ink-400">kcal</span>
            </p>
          </div>
          {[
            ['Protein', 64, 'bg-peach-400'],
            ['Fibre', 72, 'bg-green-500'],
            ['Carbs', 55, 'bg-butter-400'],
          ].map(([l, v, c]) => (
            <div key={l as string} className="mt-2">
              <div className="flex justify-between text-[11px] font-semibold text-ink-500">
                <span>{l}</span>
                <span>{v}%</span>
              </div>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                <span className={cn('block h-full rounded-full', c as string)} style={{ width: `${v}%` }} />
              </span>
            </div>
          ))}
        </div>
      );
    case 'water':
      return (
        <div className="w-full max-w-[250px] rounded-2xl bg-white p-3.5 shadow-card">
          <div className="flex items-baseline justify-between">
            <p className="num text-[22px] text-ink-900">
              1.5 L <span className="font-sans text-[11px] font-semibold text-ink-400">of 2 L</span>
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
              <Flame className="h-3 w-3" /> 6 days
            </span>
          </div>
          <div className="mt-3 grid grid-cols-8 gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className={cn('flex h-8 items-end justify-center rounded-md', i < 6 ? 'bg-sky-400 text-white' : 'bg-sky-50 text-sky-300')}>
                <Droplet className="mb-1 h-3 w-3" />
              </span>
            ))}
          </div>
        </div>
      );
    case 'sleep':
      return (
        <div className="w-full max-w-[250px] rounded-2xl p-1">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-indigo-700">
              <Moon className="h-3.5 w-3.5" /> Last 7 nights
            </p>
            <p className="num text-[18px] text-ink-900">7h 12m</p>
          </div>
          <div className="relative mt-2 flex h-[86px] items-end justify-between gap-1.5 rounded-2xl bg-white px-3 pb-2 pt-3 shadow-card">
            <span className="absolute inset-x-3 top-[34%] border-t border-dashed border-indigo-300" />
            {[6.5, 7.4, 6.1, 8, 7.2, 7.8, 6.9].map((h, i) => (
              <span key={i} className="w-4 rounded-full bg-gradient-to-t from-indigo-400 to-indigo-200" style={{ height: `${(h / 9) * 100}%` }} />
            ))}
          </div>
        </div>
      );
    case 'habits':
      return (
        <div className="w-full max-w-[260px] space-y-2">
          {[
            ['Stretch', 5],
            ['Read', 4],
            ['Wind down', 6],
          ].map(([h, n]) => (
            <div key={h as string} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xs ring-1 ring-ink-100">
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-700">{h}</span>
              <span className="flex shrink-0 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i < (n as number) ? 'bg-butter-400' : 'bg-ink-100')} />
                ))}
              </span>
            </div>
          ))}
        </div>
      );
    case 'goals':
      return (
        <div className="w-full max-w-[250px] rounded-2xl bg-white p-3.5 shadow-card">
          <p className={cn(mono, 'text-green-700')}>Today’s goals</p>
          {[
            ['Walk 6,000 steps', 0.8],
            ['Drink 2 L of water', 0.6],
            ['5-minute breathing', 1],
          ].map(([g, v]) => (
            <div key={g as string} className="mt-2.5">
              <div className="flex items-center justify-between text-[11.5px] font-semibold text-ink-700">
                <span>{g}</span>
                {v === 1 ? <CircleCheck className="h-3.5 w-3.5 text-green-600" /> : <span className="text-ink-400">{Math.round((v as number) * 100)}%</span>}
              </div>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-green-100">
                <span className="block h-full rounded-full bg-green-600" style={{ width: `${(v as number) * 100}%` }} />
              </span>
            </div>
          ))}
        </div>
      );
    case 'chart':
      return (
        <div className="w-full max-w-[260px] rounded-2xl bg-white p-3.5 shadow-card">
          <svg viewBox="0 0 200 60" className="h-14 w-full">
            <path d="M0 42 C 20 40, 30 22, 50 24 S 85 12, 105 16 S 140 30, 160 36 S 185 48, 200 46 L200 60 L0 60 Z" className="fill-lavender-100" />
            <path d="M0 42 C 20 40, 30 22, 50 24 S 85 12, 105 16 S 140 30, 160 36 S 185 48, 200 46" fill="none" className="stroke-lavender-500" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className={cn(mono, 'mt-1.5 text-lavender-600')}>Observed pattern</p>
          <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-ink-700">Energy was higher on days you moved.</p>
        </div>
      );
    case 'coach':
      return (
        <div className="w-full max-w-[260px] space-y-2">
          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-green-700 px-3 py-2 text-[11.5px] font-medium text-white">Any tips for low energy before my period?</p>
          <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[11.5px] leading-snug text-ink-700 shadow-xs ring-1 ring-ink-100">
            Gentle movement, regular meals and good sleep help many people. If it worries you, a clinician can help.
          </p>
          <p className="flex items-center justify-center gap-1 text-[10px] font-semibold text-lavender-700">
            <Sparkles className="h-3 w-3" /> Simulated · general education only
          </p>
        </div>
      );
    case 'article':
      return (
        <div className="w-full max-w-[250px] overflow-hidden rounded-2xl bg-white shadow-card">
          <div className="h-12 bg-gradient-to-r from-sky-100 via-green-50 to-rose-50" />
          <div className="p-3">
            <p className="text-[12.5px] font-bold leading-snug text-ink-900">Understanding the four phases of your cycle</p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10.5px] font-bold text-green-700">
              <BookOpenCheck className="h-3 w-3" /> Medically reviewed
            </p>
          </div>
        </div>
      );
    case 'community':
      return (
        <div className="w-full max-w-[250px] rounded-2xl bg-white p-3.5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {(['avatar-1', 'avatar-2', 'avatar-3'] as const).map((a) => (
                <Avatar key={a} name="" photoKey={a} size={26} />
              ))}
            </span>
            <p className="text-[12px] font-bold text-ink-800">Cycle & mood circle</p>
          </div>
          <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] leading-snug text-ink-700">“Anyone else find walks help on heavy days?”</p>
          <p className="mt-2 flex items-center gap-3 text-[10.5px] font-semibold text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> Support
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Reply
            </span>
            <span className="ml-auto">Sample</span>
          </p>
        </div>
      );
    case 'reminders':
      return (
        <div className="w-full max-w-[260px] space-y-2">
          <div className="flex items-start gap-2.5 rounded-2xl bg-white/90 p-3 shadow-card ring-1 ring-ink-100 backdrop-blur">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white">
              <BellRing className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="flex justify-between text-[11px] font-bold text-ink-800">
                HealthX <span className="font-medium text-ink-400">now</span>
              </span>
              <span className="block text-[11.5px] leading-snug text-ink-600">Time for your daily check-in</span>
            </span>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[10.5px] font-semibold text-green-800">
            <EyeOff className="h-3 w-3" /> Discreet mode · quiet hours 22:00–07:00
          </p>
        </div>
      );
    case 'privacy':
      return (
        <div className="w-full max-w-[250px] space-y-1.5">
          {[
            [ShieldCheck, 'Health data use', 'Required'],
            [Sparkles, 'AI personalisation', 'Off'],
            [Download, 'Export my data', 'Ready'],
            [Trash2, 'Delete account', 'Anytime'],
          ].map(([I, l, v]) => {
            const Icon = I as typeof Lock;
            return (
              <div key={l as string} className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 shadow-xs ring-1 ring-ink-100">
                <Icon className="h-3.5 w-3.5 text-green-700" />
                <span className="text-[11.5px] font-semibold text-ink-700">{l as string}</span>
                <span className="ml-auto text-[10.5px] font-bold text-ink-400">{v as string}</span>
              </div>
            );
          })}
        </div>
      );
    case 'admin':
      return (
        <div className="flex w-full max-w-[280px] flex-col gap-1.5">
          {[
            ['Draft', 'Content Manager', 'bg-white text-ink-700'],
            ['Reviewed', 'Medical reviewer', 'bg-lavender-50 text-lavender-700'],
            ['Published', 'Admin', 'bg-green-700 text-white'],
          ].map(([s, r, c], i) => (
            <div key={s} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 shadow-xs ring-1 ring-ink-100', c, i === 1 && 'ml-2', i === 2 && 'ml-4')}>
              {i === 1 ? <Stethoscope className="h-3.5 w-3.5" /> : i === 2 ? <CircleCheck className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />}
              <span className="whitespace-nowrap text-[11.5px] font-bold">{s}</span>
              <span className="ml-auto truncate text-[10px] font-medium opacity-75">{r}</span>
            </div>
          ))}
        </div>
      );
  }
}
