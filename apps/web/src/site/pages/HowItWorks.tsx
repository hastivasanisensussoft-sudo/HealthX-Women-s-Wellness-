import { ArrowRight, BellRing, CalendarHeart, ChartLine, Database, Droplets, Dumbbell, Flag, Moon, Smartphone, Smile, Sparkles, Sun, Target, UserPlus, Workflow } from 'lucide-react';
import { COPY } from '@healthx/shared';
import { VideoCard } from '@/components/media/Video';
import { ButtonLink, HScroll, Notice, PhaseBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { HowItWorks as HowSteps, Newsletter, PageHero, SectionHeading } from '../sections';

const JOURNEY = [
  { icon: UserPlus, t: 'Create your account', d: 'Email, Apple, Google or a magic link.', phase: false },
  { icon: Target, t: 'Choose your goals', d: 'Cycle, wellness, fitness, nutrition or a life stage.', phase: false },
  { icon: CalendarHeart, t: 'Add cycle information', d: 'Last period and typical lengths — or “not sure”.', phase: false },
  { icon: Smile, t: 'Log your first period & symptoms', d: 'Flow, symptoms and notes in a few taps.', phase: false },
  { icon: Sun, t: 'Daily wellness check-in', d: 'Mood, energy, stress and sleep in under 30 seconds.', phase: false },
  { icon: Smartphone, t: 'Connect Apple Health / Health Connect', d: 'Bring in steps, sleep and workouts automatically.', phase: true },
  { icon: Dumbbell, t: 'Track activity & sleep', d: 'Workouts, steps and bedtime routines.', phase: false },
  { icon: ChartLine, t: 'Receive weekly insights', d: 'A clear summary with observed patterns.', phase: false },
  { icon: Flag, t: 'Create & complete a wellness goal', d: 'Small, realistic goals with progress you can see.', phase: false },
];

const DAY = [
  { time: '8:00', icon: Sun, t: 'Morning check-in', d: 'Rate mood & energy, note how you slept.', tone: 'bg-butter-100 text-butter-600' },
  { time: '11:00', icon: Droplets, t: 'Hydration nudge', d: 'A gentle reminder — only if you turned it on.', tone: 'bg-sky-100 text-sky-600' },
  { time: '13:00', icon: Sparkles, t: 'Today’s plan', d: 'A short walk and a 5-minute breathing break.', tone: 'bg-green-100 text-green-700' },
  { time: '18:30', icon: Dumbbell, t: 'Workout', d: 'A 20-minute home routine from the library.', tone: 'bg-peach-100 text-peach-600' },
  { time: '22:00', icon: Moon, t: 'Wind down', d: 'Log water and symptoms, and aim for your sleep target.', tone: 'bg-indigo-100 text-indigo-600' },
];

/** Public website — How It Works. */
export default function HowItWorks() {
  return (
    <>
      <PageHero
        tone="forest"
        eyebrow="How it works"
        title="Simple daily steps,"
        script="clearer patterns"
        body="Set up in about a minute, check in in under 30 seconds, and let weekly insights show you what supports you."
        image="journaling"
        position="45% 30%"
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/signup" variant="butter" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
            Start free
          </ButtonLink>
          <a href="#journey" className="glass-dark inline-flex h-[52px] items-center rounded-full px-6 font-semibold text-white transition hover:bg-white/15">
            Your first week
          </a>
        </div>
      </PageHero>

      <HowSteps />

      <section id="journey" className="scroll-mt-24 bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Your journey" title="From sign-up to" script="steady habits" body="The path most people follow in their first weeks — at whatever pace suits you." />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {JOURNEY.map((j, i) => (
              <li key={j.t} className={cn('relative flex gap-4 overflow-hidden rounded-[28px] p-5', i === 0 ? 'bg-forest text-white' : 'bg-white shadow-card ring-1 ring-ink-100')}>
                <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', i === 0 ? 'bg-butter-300 text-green-950' : 'bg-green-50 text-green-700')}>
                  <j.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 pr-8">
                  <p className={cn('font-display text-[17px] font-semibold leading-snug', i === 0 ? 'text-white' : 'text-ink-900')}>{j.t}</p>
                  <p className={cn('mt-1 text-sm', i === 0 ? 'text-white/75' : 'text-ink-500')}>{j.d}</p>
                  {j.phase && <PhaseBadge phase={2} className="mt-2" />}
                </div>
                <span className={cn('absolute right-4 top-4 font-display text-[22px] font-semibold', i === 0 ? 'text-white/25' : 'text-green-200')}>{String(i + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="A day with HealthX" title="Fits around" script="your real life" />
          <ol className="relative mt-14 grid gap-4 md:grid-cols-5">
            <span aria-hidden className="absolute left-0 right-0 top-[27px] hidden border-t-2 border-dashed border-green-200 md:block" />
            {DAY.map((d) => (
              <li key={d.t} className="relative flex gap-4 md:block">
                <span className={cn('relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-4 ring-white', d.tone)}>
                  <d.icon className="h-6 w-6" />
                </span>
                <div className="md:mt-5">
                  <p className="font-mono text-[12px] tracking-[0.1em] text-green-700">{d.time}</p>
                  <p className="mt-1 font-display text-[18px] font-semibold text-ink-900">{d.t}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink-500">{d.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-10 flex items-center justify-center gap-2 rounded-full bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-900">
            <BellRing className="h-4 w-4 shrink-0" /> Every reminder is optional, with discreet mode and quiet hours.
          </p>
        </div>
      </section>

      <section className="px-3 sm:px-5">
        <div className="bg-forest relative isolate mx-auto grid max-w-[1400px] gap-12 overflow-hidden rounded-[34px] px-6 py-16 text-white sm:px-12 lg:grid-cols-2 lg:px-16 lg:py-20">
          <div>
            <SectionHeading light center={false} eyebrow="Estimates, explained" title="How cycle estimates" script="work" />
            <ul className="mt-8 space-y-3">
              {[
                'Estimates use the periods you log — never a fixed 28-day cycle.',
                'With little history, we use the typical lengths you entered, and say so.',
                'Every estimate is marked with an asterisk (*).',
                COPY.ovulationNotConfirmed,
                COPY.notContraception,
              ].map((x) => (
                <li key={x} className="glass-dark flex gap-3 rounded-2xl p-4 text-[15px] text-white/90">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-butter-300" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading light center={false} eyebrow="Insights, explained" title="Patterns from" script="what you log" />
            <ol className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Database, t: 'Your logs', d: 'Check-ins, cycles, water, sleep, activity.' },
                { icon: Workflow, t: 'Rules engine', d: 'Deterministic rules find repeated patterns.' },
                { icon: Sparkles, t: 'Insights', d: 'Plain-language observed patterns.' },
                { icon: ChartLine, t: 'Weekly report', d: 'Everything summarised every week.' },
              ].map((s, i) => (
                <li key={s.t} className="glass-dark rounded-2xl p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-butter-300">Step {i + 1}</p>
                  <s.icon className="mt-3 h-5 w-5 text-green-300" />
                  <p className="mt-2 font-display text-[17px] font-semibold">{s.t}</p>
                  <p className="text-sm text-white/70">{s.d}</p>
                </li>
              ))}
            </ol>
            <Notice tone="green" className="mt-5">
              {COPY.observedPattern} AI may help phrase insights in a later phase — it never does the calculations.
            </Notice>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Video previews" title="Routines you can" script="follow along" body="Each preview opens the routine as simple steps, so you can follow it even when a video can’t play." />
          <HScroll label="Routine previews" className="mt-12" itemClass="[&>*]:w-[260px] [&>*]:shrink-0 sm:[&>*]:w-[300px]">
            {(['breathing', 'yoga-flow', 'walk-outdoors', 'hydration', 'strength', 'sleep-winddown', 'healthy-cooking'] as const).map((v) => (
              <div key={v}>
                <VideoCard video={v} aspect="aspect-[4/5]" />
              </div>
            ))}
          </HScroll>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
