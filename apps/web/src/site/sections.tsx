import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Asterisk, Bell, Check, ChevronRight, CircleCheck, Download, Fingerprint, HeartHandshake, Home as HomeIcon, Lock, Minus, Play, Plus, Quote, ShieldCheck, Sparkles, Stethoscope, UserCheck, Wind } from 'lucide-react';
import { COPY, type PhotoKey } from '@healthx/shared';
import { Leaf, LeafPair, LogoMark, MoodFace, SparkleShape, Squiggle } from '@/components/brand/Brand';
import { CycleRing } from '@/components/cycle/CycleRing';
import { AreaTrend } from '@/components/charts/Charts';
import { Photo, type PhotoShape } from '@/components/media/Photo';
import { AmbientVideo, VideoCard, VideoPlayerModal } from '@/components/media/Video';
import { Badge, BackendBadge, Button, ButtonLink, PhaseBadge, ProgressRing, Tabs, useToast } from '@/components/ui';
import { cn, simulate } from '@/lib/utils';
import { cv } from '@/theme/engine';
import { FAQS, HOW_STEPS, LIFE_STAGES, MODULE_GROUPS, MODULES, STORIES, TONE_ICON, TONE_PANEL, TRUST_POINTS, type ModuleGroupKey, type SiteModule } from './content';
import { ModuleVisual } from './visuals';

/* ------------------------------------------------------------------ building blocks */

export function SectionHeading({
  eyebrow,
  title,
  script,
  body,
  center = true,
  light,
  as: H = 'h2',
  className,
}: {
  eyebrow: string;
  title: string;
  script?: string;
  body?: ReactNode;
  center?: boolean;
  light?: boolean;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center', className)}>
      <p className={cn('eyebrow', light && 'text-green-200', center && 'justify-center')}>
        <SparkleShape className={cn('h-3 w-3', light ? 'text-butter-300' : 'text-green-500')} color="currentColor" />
        {eyebrow}
      </p>
      <H className={cn('mt-3 font-display font-semibold leading-[1.08] tracking-[-0.02em]', H === 'h1' ? 'text-[38px] sm:text-[52px]' : 'text-[32px] sm:text-[42px]', light ? 'text-white' : 'text-green-950')}>
        {title}
        {script && (
          <>
            {' '}
            <span className={cn('font-script text-[1.12em] font-bold tracking-normal', light ? 'text-butter-300' : 'text-green-600')}>{script}</span>
          </>
        )}
      </H>
      {body && <p className={cn('mt-4 text-[17px] leading-relaxed', light ? 'text-white/75' : 'text-ink-600')}>{body}</p>}
    </div>
  );
}

const Container = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;

export function ModuleStatus({ m, className }: { m: SiteModule; className?: string }) {
  return (
    <span className={cn('flex flex-wrap gap-1.5', className)}>
      {m.phase ? <PhaseBadge phase={m.phase} /> : <Badge tone="mint">Available</Badge>}
      {m.simulated && <BackendBadge label="Simulated" />}
    </span>
  );
}

/** Compact hero for inner public pages: wash or forest panel, breadcrumb, title, optional arch portrait with leaves. */
export function PageHero({
  eyebrow,
  title,
  script,
  body,
  image,
  imageShape = 'arch',
  position,
  tone = 'wash',
  children,
  card,
}: {
  eyebrow: string;
  title: string;
  script?: string;
  body?: ReactNode;
  image?: PhotoKey;
  imageShape?: PhotoShape;
  position?: string;
  tone?: 'wash' | 'forest';
  /** Calls to action or a search box under the text. */
  children?: ReactNode;
  /** Small floating card on the photo. */
  card?: ReactNode;
}) {
  const dark = tone === 'forest';
  return (
    <section className="px-3 pt-3 sm:px-5">
      <div className={cn('relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[34px] px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20', dark ? 'bg-forest text-white' : 'bg-wash')}>
        <Leaf className={cn('pointer-events-none absolute -bottom-16 -left-12 -z-10 h-56 w-56 -rotate-12', dark ? 'text-green-300/10' : 'text-green-200/60')} color="currentColor" vein={false} />
        <Leaf className={cn('pointer-events-none absolute -right-10 -top-12 -z-10 h-44 w-44 rotate-[100deg]', dark ? 'text-butter-300/10' : 'text-rose-200/50')} color="currentColor" vein={false} />
        <div className={cn('grid items-center gap-12', image && 'lg:grid-cols-[1.2fr_1fr]')}>
          <div className="min-w-0 animate-fade-up">
            <nav aria-label="Breadcrumb" className={cn('mb-5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em]', dark ? 'text-white/60' : 'text-ink-500')}>
              <Link to="/" className={cn('inline-flex items-center gap-1 hover:underline', dark ? 'hover:text-white' : 'hover:text-green-800')}>
                <HomeIcon className="h-3.5 w-3.5" /> Home
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className={dark ? 'text-butter-300' : 'text-green-700'}>{eyebrow}</span>
            </nav>
            <h1 className={cn('font-display text-[38px] font-semibold leading-[1.06] tracking-[-0.02em] sm:text-[54px]', dark ? 'text-white' : 'text-green-950')}>
              {title}
              {script && (
                <>
                  {' '}
                  <span className={cn('font-script text-[1.1em] font-bold tracking-normal', dark ? 'text-butter-300' : 'text-green-600')}>{script}</span>
                </>
              )}
            </h1>
            {body && <p className={cn('mt-5 max-w-xl text-[17px] leading-relaxed', dark ? 'text-white/75' : 'text-ink-600')}>{body}</p>}
            {children && <div className="mt-8">{children}</div>}
            {image && <Photo photo={image} alt="" shape="none" position={position} className="mt-8 h-44 w-full rounded-[26px] sm:h-56 lg:hidden" />}
          </div>
          {image && (
            <div className="relative mx-auto hidden w-full max-w-[360px] lg:block">
              <LeafPair className="-left-14 -top-10 h-48 w-48" />
              <Photo photo={image} alt="" shape={imageShape} priority position={position} className={cn('relative aspect-[4/5] w-full shadow-lift ring-[6px]', dark ? 'ring-white/10' : 'ring-white/80')} />
              {card && <div className="absolute -bottom-6 -left-10 animate-float">{card}</div>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ home hero */

export function Hero() {
  return (
    <section className="px-3 pt-3 sm:px-5">
      <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[34px] bg-green-950 text-white">
        <Photo photo="woman-tea" alt="" shape="none" priority kenBurns position="28% 45%" className="h-[300px] w-full -scale-x-100 sm:h-[380px] lg:!absolute lg:inset-0 lg:-z-10 lg:h-auto" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-[180px] h-[121px] bg-gradient-to-b from-transparent to-green-950 sm:top-[240px] sm:h-[141px] lg:hidden" />
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden bg-gradient-to-r from-green-950 via-green-950/75 to-green-950/0 lg:block" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 hidden h-1/3 bg-gradient-to-t from-green-950/70 to-transparent lg:block" />

        <div className="relative grid gap-10 px-6 pb-8 pt-2 sm:px-12 lg:min-h-[720px] lg:grid-cols-[1.15fr_1fr] lg:px-16 lg:pb-14 lg:pt-20">
          <div className="flex max-w-[640px] flex-col justify-center animate-fade-up">
            <p className="glass-dark inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-green-100">
              <ShieldCheck className="h-3.5 w-3.5 text-butter-300" /> Privacy-first women’s wellness
            </p>
            <h1 className="mt-6 font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[60px] lg:text-[70px]">
              Understand your cycle. <span className="text-green-300">Nurture</span> every stage of you.
            </h1>
            <p className="mt-3 font-script text-[30px] font-bold leading-none text-butter-300 sm:text-[36px]">your body, your rhythm ♡</p>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/80">
              Period tracking, daily check-ins, movement, nutrition, sleep and gentle insights in one calm place — with estimates that are clearly labelled and data that stays yours.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to="/get-the-app" variant="butter" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Start free
              </ButtonLink>
              <a href="#how" className="glass-dark inline-flex h-[52px] items-center gap-2 rounded-full px-6 font-semibold text-white transition hover:bg-white/15">
                <Play className="h-4 w-4 fill-current" /> See how it works
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
              {['Non-diagnostic', 'Every estimate marked *', 'Export or delete anytime'].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CircleCheck className="h-4 w-4 text-green-300" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-end gap-3 lg:items-end">
            <div className="glass w-full max-w-[340px] animate-float rounded-3xl p-4 text-ink-900 shadow-lift lg:mb-auto lg:mt-6">
              <div className="flex items-center gap-4">
                <CycleRing cycleLength={29} periodLength={5} currentDay={12} fertileStart={11} fertileEnd={16} size={92} stroke={10} showLabels={false}>
                  <p className="num text-[22px] leading-none">12</p>
                </CycleRing>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">Cycle day · sample</p>
                  <p className="mt-1 font-display text-[19px] font-semibold leading-tight">Fertile window est.*</p>
                  <p className="mt-1 text-[13px] text-ink-500">Next period around Nov 13*</p>
                </div>
              </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-[520px]">
              <div className="glass-dark hidden rounded-3xl p-4 sm:block">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">Designed to be</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['Private', 'Gentle', 'Non-diagnostic', 'For every age'].map((t) => (
                    <span key={t} className="rounded-full border border-white/25 px-2.5 py-1 text-xs font-semibold text-white/90">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="glass flex items-center gap-3 rounded-3xl p-4 text-ink-900">
                <MoodFace mood="good" size={46} />
                <div>
                  <p className="num text-[28px] leading-none text-green-900">&lt; 30 s</p>
                  <p className="mt-1 text-[13px] font-semibold text-ink-600">Daily check-in</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Benefit cards under the hero plus a gentle marquee of every module. */
export function TrustStrip() {
  const names = MODULES.map((m) => m.title);
  return (
    <section aria-label="Why HealthX" className="pt-6 sm:pt-8">
      <Container>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TRUST_POINTS.map((p, i) => (
            <li key={p.title} className="flex flex-col items-start gap-3 rounded-3xl bg-white p-4 shadow-card ring-1 ring-ink-100 animate-fade-up sm:flex-row sm:gap-4 sm:p-5" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-800 text-white sm:h-12 sm:w-12">
                <p.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-[16px] font-semibold leading-snug text-ink-900 sm:text-[17px]">{p.title}</span>
                <span className="mt-0.5 block text-[14px] leading-snug text-ink-500 sm:text-[14.5px]">{p.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
      <div className="relative mt-10 overflow-hidden border-y border-green-100 bg-sage py-4">
        <div className="flex w-max animate-marquee gap-8 pr-8">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-8">
              {names.map((n) => (
                <span key={n} className="inline-flex items-center gap-8 whitespace-nowrap font-display text-[19px] font-medium text-green-900">
                  {n}
                  <SparkleShape className="h-3.5 w-3.5 text-green-500" color="currentColor" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Your wellness journey starts here" — arch collage + principles (Healix / Balanza references). */
export function IntroSection() {
  const points = ['Privacy first, by design', 'Evidence-based education', 'Non-diagnostic, always', 'Personalised to your goals', 'Every estimate labelled', 'Built for every life stage'];
  return (
    <section id="about" className="scroll-mt-24 py-20 sm:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <div className="relative mx-auto h-[440px] w-full max-w-[520px] sm:h-[500px]">
          <LeafPair className="left-0 top-0 h-44 w-44" />
          <Photo photo="portrait-indian" alt="Smiling woman outdoors in an orange outfit" shape="arch" position="50% 20%" className="!absolute left-6 top-6 h-[86%] w-[60%] shadow-lift" />
          <Photo photo="fresh-fruit" alt="" shape="none" className="!absolute bottom-0 right-0 h-[48%] w-[50%] rounded-[30px] shadow-lift ring-8 ring-white" />
          <div className="absolute right-2 top-10 max-w-[180px] rotate-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-100">
            <p className="font-script text-[24px] font-bold leading-tight text-green-700">small steps, big changes</p>
            <Squiggle className="mt-1 h-3 w-24 text-rose-300" color="currentColor" />
          </div>
          <div className="absolute bottom-6 left-0 rounded-2xl bg-butter-300 px-5 py-4 shadow-card">
            <p className="num text-[34px] leading-none text-green-950">{MODULES.length}</p>
            <p className="mt-1 text-xs font-bold text-green-950/80">modules, one calm app</p>
          </div>
        </div>
        <div>
          <SectionHeading
            center={false}
            eyebrow="Why HealthX"
            title="One calm home for your"
            script="whole wellbeing"
            body="Instead of separate apps for periods, fitness, food and sleep, HealthX brings them together — and adapts to the goals you choose. It’s a wellness companion, not a diagnosis tool."
          />
          <ul className="mt-8 grid gap-3 rounded-3xl bg-sage/70 p-5 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-[15px] font-semibold text-ink-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink to="/about" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
              About HealthX
            </ButtonLink>
            <ButtonLink to="/features" size="lg" variant="outline">
              Explore features
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ modules */

function ModuleCard({ m, className }: { m: SiteModule; className?: string }) {
  return (
    <article className={cn('group relative flex min-w-0 flex-col overflow-hidden rounded-[28px] bg-white shadow-card ring-1 ring-ink-100 transition duration-300 hover:-translate-y-1 hover:shadow-lift', className)}>
      <div className={cn('relative flex h-[184px] items-center justify-center bg-gradient-to-br p-5', TONE_PANEL[m.tone])}>
        <ModuleVisual kind={m.visual} className="w-full" />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset', TONE_ICON[m.tone])}>
            <m.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[18px] font-semibold leading-snug text-ink-900">{m.title}</h3>
            <ModuleStatus m={m} className="mt-1.5" />
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{m.short}</p>
        <Link to={`/features#${m.id}`} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-green-700 hover:text-green-900">
          Learn more<span className="sr-only"> about {m.title}</span> <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

function ModuleSpotlight({ m, className }: { m: SiteModule; className?: string }) {
  return (
    <article className={cn('group relative isolate flex min-h-[400px] min-w-0 overflow-hidden rounded-[28px] bg-green-950 text-white shadow-card', className)}>
      <Photo photo={m.photo} alt="" shape="none" position={m.position} className="!absolute inset-0 -z-10" imgClassName="transition duration-700 group-hover:scale-105" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-green-950 via-green-950/70 to-green-950/10 sm:bg-gradient-to-r sm:from-green-950/95 sm:via-green-950/65" />
      <div className="flex w-full flex-col justify-end gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="max-w-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="glass-dark flex h-11 w-11 items-center justify-center rounded-2xl">
              <m.icon className="h-5 w-5" />
            </span>
            <ModuleStatus m={m} />
          </div>
          <h3 className="mt-4 font-display text-[28px] font-semibold leading-tight sm:text-[32px]">{m.title}</h3>
          <p className="mt-2 text-[15.5px] leading-relaxed text-white/80">{m.body}</p>
          <ButtonLink to={`/features#${m.id}`} variant="white" size="sm" className="mt-5" rightIcon={<ArrowUpRight className="h-4 w-4" />}>
            Explore<span className="sr-only"> {m.title}</span>
          </ButtonLink>
        </div>
        <div className="glass hidden w-[290px] shrink-0 rounded-3xl p-4 shadow-lift md:block">
          <ModuleVisual kind={m.visual} />
        </div>
      </div>
    </article>
  );
}

/** Every app module, grouped in pill tabs, with a jump list to the Features page. */
export function ModuleShowcase() {
  const [group, setGroup] = useState<ModuleGroupKey>('cycle');
  const g = MODULE_GROUPS.find((x) => x.key === group)!;
  const items = MODULES.filter((m) => m.group === group);
  const [first, ...rest] = items;
  const filler = (3 - ((rest.length + 2) % 3)) % 3;
  return (
    <section id="modules" className="scroll-mt-24 bg-cream py-20 sm:py-28">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading center={false} eyebrow={`${MODULES.length} modules · one app`} title="Everything you track," script="beautifully connected" body="Cycle, body, daily habits, insights and education — every module of the HealthX app, from the period tracker to the Web Admin." />
          <ButtonLink to="/features" variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
            All features
          </ButtonLink>
        </div>
        <Tabs className="mt-10" tabs={MODULE_GROUPS.map((x) => ({ value: x.key, label: x.label, count: MODULES.filter((m) => m.group === x.key).length }))} value={group} onChange={setGroup} />
        <div role="tabpanel" aria-label={g.label} className="mt-6">
          <p className="mb-5 text-[15px] text-ink-600">
            <b className="font-semibold text-ink-900">{g.title}.</b> {g.body}
          </p>
          <div key={group} className="grid animate-fade-up grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ModuleSpotlight m={first} className="md:col-span-2" />
            <div className="no-scrollbar -mx-4 flex min-w-0 snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:contents">
              {rest.map((m, i) => (
                <ModuleCard key={m.id} m={m} className={cn('w-[280px] shrink-0 snap-start md:w-auto', rest.length % 2 === 1 && i === rest.length - 1 && 'md:col-span-2 lg:col-span-1')} />
              ))}
            </div>
            {filler > 0 && (
              <Link
                to="/features"
                className={cn('bg-forest group relative isolate hidden flex-col justify-between overflow-hidden rounded-[28px] p-7 text-white shadow-card transition hover:-translate-y-1 lg:flex', filler === 2 && 'lg:col-span-2')}
              >
                <Leaf className="pointer-events-none absolute -right-10 -top-10 -z-10 h-48 w-48 rotate-45 text-green-300/15" color="currentColor" vein={false} />
                <Leaf className="pointer-events-none absolute -bottom-12 right-16 -z-10 h-32 w-32 -rotate-12 text-butter-300/10" color="currentColor" vein={false} />
                <LogoMark dark className="h-11 w-11" />
                <span>
                  <span className="block font-display text-[24px] font-semibold leading-tight">See every module in detail</span>
                  <span className="mt-2 block text-sm text-white/70">Screens, phases and safety notes for all {MODULES.length} modules.</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-butter-300">
                    Open features <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>
        <nav aria-label="All modules" className="mt-12 rounded-3xl bg-white/70 p-5 ring-1 ring-ink-100">
          <p className="eyebrow mb-3">Jump to a module</p>
          <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {MODULES.map((m) => (
              <li key={m.id} className="shrink-0">
                <Link to={`/features#${m.id}`} className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold text-ink-700 ring-1 ring-ink-100 transition hover:text-green-800 hover:ring-green-300">
                  <m.icon className="h-4 w-4 text-green-700" /> {m.title}
                  {m.phase && <span className="font-mono text-[10px] text-ink-400">P{m.phase}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ how it works + phone */

/** Static sample of the app's home screen inside a phone frame. */
export function PhoneMock({ className }: { className?: string }) {
  const days = [
    ['Mon', 22],
    ['Tue', 23],
    ['Wed', 24],
    ['Thu', 25],
    ['Fri', 26],
    ['Sat', 27],
    ['Sun', 28],
  ] as const;
  return (
    <div aria-hidden className={cn('relative w-[292px] select-none rounded-[46px] bg-green-950 p-2.5 shadow-lift', className)}>
      <div className="overflow-hidden rounded-[38px] bg-canvas">
        <div className="flex items-center justify-between px-6 pb-1 pt-3 font-mono text-[10px] text-ink-700">
          <span>9:41</span>
          <span className="h-4 w-16 rounded-full bg-green-950" />
          <span>100%</span>
        </div>
        <div className="bg-forest mx-2 rounded-[28px] px-4 pb-4 pt-3 text-white">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-green-200">Thursday · sample</p>
          <p className="font-display text-[17px] font-semibold">Good morning, Aisha</p>
          <div className="mt-2 flex justify-between">
            {days.map(([d, n]) => (
              <span key={d} className={cn('flex w-[30px] flex-col items-center rounded-full py-1 text-[8.5px] font-semibold', n === 25 ? 'bg-white text-green-900' : 'text-white/75')}>
                {d}
                <span className="num text-[12px]">{n}</span>
                <span className={cn('mt-0.5 h-1 w-1 rounded-full', n === 25 ? 'bg-green-600' : n >= 23 && n <= 27 ? 'bg-green-300' : 'bg-transparent')} />
              </span>
            ))}
          </div>
          <div className="mt-3 flex justify-center">
            <div className="rounded-full bg-white p-1.5">
              <CycleRing cycleLength={29} periodLength={5} currentDay={12} fertileStart={11} fertileEnd={16} size={150} stroke={13} showLabels={false}>
                <p className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-ink-400">Next period in</p>
                <p className="num text-[24px] leading-none text-ink-900">~18 days*</p>
                <p className="mt-0.5 text-[9px] font-semibold text-ink-500">Cycle day 12</p>
              </CycleRing>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 px-2 pb-2 pt-2">
          {[
            ['Mood', 'Good', 'from-lavender-50 to-lavender-100 text-lavender-700'],
            ['Water', '1.5 L', 'from-sky-50 to-sky-100 text-sky-700'],
            ['Sleep', '7h 40m', 'from-indigo-50 to-indigo-100 text-indigo-700'],
          ].map(([l, v, c]) => (
            <span key={l} className={cn('rounded-2xl bg-gradient-to-br p-2.5', c)}>
              <span className="block text-[9px] font-semibold opacity-80">{l}</span>
              <span className="block font-display text-[13px] font-semibold text-ink-900">{v}</span>
            </span>
          ))}
        </div>
        <div className="mx-2 mb-2 flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-xs">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-700">
            <Wind className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold text-ink-800">Today’s plan</span>
            <span className="block truncate text-[9px] text-ink-500">Walk 20 min · 5-min breathing</span>
          </span>
          <Check className="h-3.5 w-3.5 text-green-600" />
        </div>
        <div className="flex items-center justify-around rounded-t-[22px] bg-white px-3 pb-3 pt-2 text-ink-400">
          {['Home', 'Cycle'].map((t, i) => (
            <span key={t} className={cn('text-[8.5px] font-semibold', i === 0 && 'text-green-800')}>
              {t}
            </span>
          ))}
          <span className="-mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-green-700 text-white shadow-glow">
            <Plus className="h-4 w-4" />
          </span>
          {['Insights', 'Profile'].map((t) => (
            <span key={t} className="text-[8.5px] font-semibold">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Numbered steps (MindWell reference) beside a phone preview of the app. */
export function HowItWorks({ heading = true }: { heading?: boolean }) {
  return (
    <section id="how" className="scroll-mt-24 overflow-hidden py-20 sm:py-28">
      <Container className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          {heading && <SectionHeading center={false} eyebrow="How it works" title="Your path to feeling" script="more in tune" body="Set up in about a minute, check in in under 30 seconds, and let weekly insights show you what supports you." />}
          <ol className={cn('relative space-y-4', heading && 'mt-10')}>
            <span aria-hidden className="absolute bottom-8 left-[27px] top-8 w-px border-l-2 border-dashed border-green-200" />
            {HOW_STEPS.map((s, i) => (
              <li key={s.title} className="relative flex gap-5 rounded-3xl p-3 transition hover:bg-green-50/60">
                <span className="relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-white font-display text-[18px] font-semibold text-green-800 shadow-card ring-1 ring-green-100">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 pt-1.5">
                  <p className="flex items-center gap-2 font-display text-[19px] font-semibold text-ink-900">
                    <s.icon className="h-4 w-4 text-green-600" /> {s.title}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink to="/get-the-app" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
              Start your journey
            </ButtonLink>
            <span className="font-script text-[26px] font-bold text-green-600">about a minute to set up</span>
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-[460px] justify-center py-6">
          <span aria-hidden className="bg-wash absolute inset-x-0 bottom-0 top-10 rounded-[40px]" />
          <LeafPair className="left-0 top-0 h-40 w-40" />
          <PhoneMock className="relative" />
          <div aria-hidden className="glass absolute -left-2 top-[46%] hidden items-center gap-2 rounded-2xl p-3 shadow-lift animate-float sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Asterisk className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-ink-800">
              Estimates are
              <br />
              always marked *
            </span>
          </div>
          <div aria-hidden className="glass absolute -right-4 top-[12%] hidden items-center gap-2 rounded-2xl p-3 shadow-lift animate-float-slow sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Bell className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-ink-800">
              Reminders only
              <br />
              if you want them
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ video */

export function VideoSection({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section id="videos" className={cn('scroll-mt-24 py-20 sm:py-28', className)}>
      <Container>
        <SectionHeading eyebrow="Video previews" title="Move, breathe and rest," script="at your pace" body="Short previews of the guided routines inside the app — yoga, breathing, walking, cooking and wind-down. Every routine also comes as simple steps." />
        <div className="mt-12 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <AmbientVideo video="breathing" className="flex min-h-[420px] rounded-[34px] bg-green-950 text-white lg:min-h-[540px]">
            <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-green-950/90 via-green-950/30 to-green-950/10" />
            <span aria-hidden className="absolute left-6 top-6 flex h-28 w-28 items-center justify-center sm:left-10 sm:top-10 sm:h-36 sm:w-36">
              <span className="absolute inset-0 animate-breathe rounded-full bg-white/20 backdrop-blur-sm" />
              <span className="absolute inset-4 animate-breathe rounded-full bg-white/25 [animation-delay:400ms]" />
              <span className="relative font-script text-[24px] font-bold">breathe</span>
            </span>
            <div className="mt-auto max-w-lg p-6 sm:p-10">
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-green-900">Video preview · 5 min</span>
              <h3 className="mt-4 font-display text-[30px] font-semibold leading-tight sm:text-[36px]">Box breathing to settle</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-white/80">A simple pattern many people use to feel calmer — in for 4, hold for 4, out for 4 to 6. Stop if you feel light-headed.</p>
              <Button variant="butter" className="mt-6" leftIcon={<Play className="h-4 w-4 fill-current" />} onClick={() => setOpen(true)}>
                Play the preview
              </Button>
            </div>
          </AmbientVideo>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0">
            {(['yoga-flow', 'walk-outdoors', 'healthy-cooking', 'sleep-winddown'] as const).map((v) => (
              <div key={v} className="w-[250px] shrink-0 snap-start sm:w-auto">
                <VideoCard video={v} compact aspect="aspect-[4/5]" />
              </div>
            ))}
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-ink-400">Short preview clips (free stock footage). General wellness guidance — not medical advice.</p>
      </Container>
      <VideoPlayerModal video={open ? 'breathing' : null} onClose={() => setOpen(false)} />
    </section>
  );
}

/* ------------------------------------------------------------------ life stages */

export function LifeStages() {
  return (
    <section id="life-stages" className="scroll-mt-24 bg-cream py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow="Every stage of life" title="Wellness that grows" script="with you" body="Start where you are today. HealthX is designed to support women from their first period through menopause." />
        <ul className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {LIFE_STAGES.map((s) => (
            <li key={s.title} className="group w-[230px] shrink-0 snap-start lg:w-auto">
              <div className="relative">
                <Photo photo={s.photo} alt="" shape="arch" position="50% 25%" className="aspect-[3/4] w-full shadow-card" imgClassName="transition duration-700 group-hover:scale-105" />
                <span className="absolute bottom-3 left-3">{s.phase ? <PhaseBadge phase={s.phase} className="shadow-sm" /> : <Badge tone="green" className="shadow-sm">Available</Badge>}</span>
              </div>
              <h3 className="mt-4 font-display text-[18px] font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-500">{s.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ insights */

export function InsightsPreview() {
  const data = useMemo(
    () =>
      Array.from({ length: 29 }, (_, i) => {
        const d = i + 1;
        const base = d <= 2 ? 4.5 : d <= 5 ? 5.5 : d <= 16 ? 7.4 : d <= 25 ? 6.6 : 4.8;
        return { label: `D${d}`, energy: +(base + Math.sin(i * 1.7) * 0.4).toFixed(1) };
      }),
    [],
  );
  const items = [
    ['Observed patterns', 'For example: “Your energy ratings were higher on days when you completed activity.”'],
    ['Weekly wellness report', 'Cycle day, steps, workouts, sleep, water and mood — in one view.'],
    ['Wellness Score', 'An engagement metric across activity, sleep, water, nutrition, habits and mood — not a medical score.'],
  ];
  return (
    <section id="insights" className="scroll-mt-24 py-20 sm:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading center={false} eyebrow="Insights" title="Patterns, not" script="diagnoses" body="A rules-based insights engine looks at what you log and points out recurring patterns in plain language — and suggests talking to a professional when something may deserve a closer look." />
          <ol className="mt-8 space-y-3">
            {items.map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-3xl bg-white p-4 ring-1 ring-ink-100">
                <span className="num flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender-50 text-[15px] text-lavender-700">{i + 1}</span>
                <div>
                  <p className="font-display text-[17px] font-semibold text-ink-900">{t}</p>
                  <p className="mt-0.5 text-[15px] text-ink-500">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative isolate">
          <span aria-hidden className="bg-wash absolute -inset-4 -z-10 rounded-[40px] sm:-inset-6" />
          <div className="rounded-[32px] bg-white p-5 shadow-lift ring-1 ring-ink-100 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-[18px] font-semibold text-ink-900">Energy across your cycle</p>
                <p className="text-sm text-ink-500">Average of the last 3 cycles</p>
              </div>
              <Badge tone="lavender">Sample data</Badge>
            </div>
            <div className="mt-4">
              <AreaTrend data={data} series={[{ key: 'energy', name: 'Energy', color: cv('peach', 500) }]} height={220} yDomain={[0, 10]} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl bg-lavender-50 p-4">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-lavender-700">{COPY.observedPattern}</p>
                <p className="mt-1 font-semibold text-ink-800">You recorded lower energy in the days before your period in several recent cycles.</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-3 sm:flex-col sm:justify-center sm:gap-1.5">
                <ProgressRing value={0.84} size={76} stroke={8}>
                  <p className="num text-[22px] leading-none text-green-950">84</p>
                </ProgressRing>
                <p className="max-w-[120px] text-[11px] font-medium leading-snug text-ink-600 sm:text-center">Wellness Score — engagement metric, not a medical score</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ privacy */

export function PrivacySection() {
  const items = [
    { icon: Fingerprint, t: 'Explicit consent', d: 'You choose what’s collected. Optional features stay off until you turn them on.' },
    { icon: Lock, t: 'Protected and minimised', d: 'Health data is treated as sensitive everywhere and kept to what the app needs.' },
    { icon: Download, t: 'Export or delete anytime', d: 'Your Privacy Center lets you download your data or delete your account.' },
    { icon: UserCheck, t: 'Never shared with employers', d: `${COPY.employerPrivacy} Workplace programmes only ever see aggregated engagement.` },
  ];
  return (
    <section id="privacy" className="scroll-mt-24 px-3 py-6 sm:px-5">
      <div className="bg-forest relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[34px] px-6 py-16 text-white sm:px-12 lg:px-16 lg:py-24">
        <Leaf className="pointer-events-none absolute -right-16 -top-20 -z-10 h-72 w-72 rotate-12 text-green-300/10" color="currentColor" vein={false} />
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <SectionHeading light center={false} eyebrow="Privacy first" title="Your data." script="Your rules." body="Women’s health information is deeply personal. HealthX is built around consent, minimisation and control — from the very first screen." />
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {items.map((i) => (
                <div key={i.t} className="glass-dark flex gap-4 rounded-3xl p-5 sm:block">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-butter-300 text-green-950">
                    <i.icon className="h-5 w-5" />
                  </span>
                  <span className="block">
                    <span className="block font-display text-[17px] font-semibold sm:mt-3">{i.t}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-white/70">{i.d}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[460px]">
            <Photo photo="doctor-consult" alt="A woman talking with a healthcare professional" position="40% 50%" className="aspect-[4/5] w-full rounded-[30px] sm:aspect-[5/6]" />
            <div className="glass absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-ink-900 sm:right-auto sm:max-w-[290px]">
              <p className="flex items-center gap-2 text-sm font-bold text-green-950">
                <Stethoscope className="h-4 w-4 text-green-700" /> A companion, not a clinician
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">{COPY.concern}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ stories */

export function Stories() {
  return (
    <section id="stories" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow="Stories" title="Made for real" script="everyday lives" body="Illustrative sample stories that show how HealthX is meant to fit into different lives." />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STORIES.map((s, i) => (
            <figure key={s.name} className={cn('relative flex flex-col rounded-[30px] p-7', i === 1 ? 'bg-forest text-white' : 'bg-white shadow-card ring-1 ring-ink-100')}>
              <div className="flex items-center justify-between">
                <Quote className={cn('h-9 w-9', i === 1 ? 'text-butter-300' : 'text-green-200')} />
                <span className={cn('rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]', i === 1 ? 'bg-white/10 text-white/80' : 'bg-lavender-50 text-lavender-700')}>Illustrative sample</span>
              </div>
              <blockquote className={cn('mt-4 flex-1 text-[16.5px] leading-relaxed', i === 1 ? 'text-white/90' : 'text-ink-700')}>“{s.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <Photo photo={s.avatar} alt="" shape="circle" className="h-12 w-12 ring-2 ring-white" />
                <span>
                  <span className={cn('block font-display font-semibold', i === 1 ? 'text-white' : 'text-ink-900')}>{s.name}</span>
                  <span className={cn('block text-sm', i === 1 ? 'text-white/65' : 'text-ink-500')}>{s.context}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">Sample stories with stock photos for this demo — to be replaced with real, consented member feedback before launch. No ratings or user numbers are shown.</p>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ pricing */

export function Pricing() {
  const free = ['Period & cycle tracking', 'Symptoms, mood & daily check-in', 'Hydration, steps & workouts', 'Basic trends & weekly summary', 'Educational articles', 'Full privacy controls'];
  const premium = ['Everything in Free', 'Advanced insights & cycle history', 'AI wellness coach', 'Nutrition tracking', 'Personalised programmes', 'Advanced wellness reports'];
  return (
    <section id="pricing" className="scroll-mt-24 bg-sage/60 py-20 sm:py-28">
      <Container className="max-w-5xl">
        <SectionHeading eyebrow="Pricing" title="Start free." script="Grow at your pace." />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="flex flex-col rounded-[32px] bg-white p-8 shadow-card ring-1 ring-ink-100">
            <div className="flex items-center justify-between">
              <p className="font-display text-[20px] font-semibold text-ink-900">Free</p>
              <Badge tone="mint">Available now</Badge>
            </div>
            <p className="mt-4 font-display text-[52px] font-semibold leading-none tracking-tight text-green-950">
              ₹0<span className="ml-2 font-sans text-base font-semibold text-ink-400">/ forever</span>
            </p>
            <p className="mt-3 text-ink-500">Everything you need to understand your cycle and build healthy habits.</p>
            <ul className="mt-6 flex-1 space-y-3">
              {free.map((f) => (
                <li key={f} className="flex items-center gap-3 text-ink-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink to="/get-the-app" size="lg" className="mt-8 w-full">
              Get started free
            </ButtonLink>
          </div>
          <div className="bg-forest relative isolate flex flex-col overflow-hidden rounded-[32px] p-8 text-white shadow-lift">
            <Leaf className="pointer-events-none absolute -right-12 -top-12 -z-10 h-48 w-48 rotate-12 text-butter-300/10" color="currentColor" vein={false} />
            <div className="flex items-center justify-between">
              <p className="font-display text-[20px] font-semibold">Premium</p>
              <PhaseBadge phase={2} />
            </div>
            <p className="mt-4 font-display text-[52px] font-semibold leading-none tracking-tight">Soon</p>
            <p className="mt-3 text-white/75">Deeper insights and personal guidance. Pricing will be announced before launch.</p>
            <ul className="mt-6 flex-1 space-y-3">
              {premium.map((f) => (
                <li key={f} className="flex items-center gap-3 text-white/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-butter-300 text-green-950">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink to="/#newsletter" variant="butter" size="lg" className="mt-8 w-full">
              Notify me
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ FAQ */

/** Accordion list of question/answer pairs. */
export function FaqList({ items, defaultOpen = 0 }: { items: [string, string][]; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const id = useId();
  return (
    <div className="space-y-3">
      {items.map(([q, a], i) => {
        const on = open === i;
        return (
          <div key={q} className={cn('rounded-3xl bg-white ring-1 transition', on ? 'shadow-card ring-green-200' : 'ring-ink-100 hover:ring-green-200')}>
            <button id={`${id}-q${i}`} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5" aria-expanded={on} aria-controls={`${id}-a${i}`} onClick={() => setOpen(on ? null : i)}>
              <span className="font-display text-[17px] font-semibold text-ink-900">{q}</span>
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition', on ? 'bg-green-700 text-white' : 'bg-green-50 text-green-700')}>{on ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
            </button>
            {on && (
              <p id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`} className="animate-fade-up px-5 pb-5 text-[15.5px] leading-relaxed text-ink-600 sm:px-6 sm:pb-6">
                {a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeading center={false} eyebrow="FAQ" title="Questions," script="answered" body="The things people ask most about estimates, privacy and how HealthX works." />
          <div className="relative mt-8 overflow-hidden rounded-[30px] bg-green-950 text-white">
            <Photo photo="herbal-tea" alt="" shape="none" className="!absolute inset-0 opacity-40" />
            <div className="relative p-6">
              <p className="font-display text-[20px] font-semibold">Still curious?</p>
              <p className="mt-1 text-sm text-white/80">Browse the full help centre or send us a note.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink to="/faq" variant="butter" size="sm">
                  See all questions
                </ButtonLink>
                <ButtonLink to="/contact" variant="white" size="sm">
                  Contact us
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
        <FaqList items={FAQS} />
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ CTA band + newsletter */

export function Newsletter() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Please enter a valid email address.');
    setErr(null);
    setBusy(true);
    await simulate(true, 900);
    setBusy(false);
    setEmail('');
    toast.success('You’re on the list!', 'Demo only — no email was sent.');
  };
  return (
    <section id="newsletter" className="scroll-mt-24 px-3 pb-6 pt-6 sm:px-5">
      <div className="bg-forest relative isolate mx-auto grid max-w-[1400px] items-center gap-10 overflow-hidden rounded-[34px] px-6 py-14 text-white sm:px-12 lg:grid-cols-[auto_1.1fr_1fr] lg:px-16 lg:py-16">
        <Leaf className="pointer-events-none absolute -bottom-20 left-1/3 -z-10 h-64 w-64 -rotate-12 text-green-300/10" color="currentColor" vein={false} />
        <div className="relative hidden w-[200px] lg:block">
          <LeafPair className="-left-8 -top-6 h-32 w-32" />
          <Photo photo="portrait-curly" alt="" shape="arch" position="50% 25%" className="relative aspect-[4/5] w-full ring-[6px] ring-white/10" />
        </div>
        <div>
          <p className="eyebrow text-green-200">
            <Sparkles className="h-3.5 w-3.5 text-butter-300" /> Start today
          </p>
          <h2 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
            Feel more in tune, <span className="font-script text-[1.12em] font-bold tracking-normal text-butter-300">one day at a time</span>
          </h2>
          <p className="mt-3 max-w-md text-white/75">Free for core tracking. Set up in about a minute, and keep full control of your data.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to="/get-the-app" variant="butter" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
              Create free account
            </ButtonLink>
            <ButtonLink to="/features" variant="ghost" size="lg" className="text-white ring-1 ring-inset ring-white/25 hover:bg-white/10">
              Explore features
            </ButtonLink>
          </div>
        </div>
        <form onSubmit={submit} className="rounded-[28px] bg-white p-6 text-ink-900 shadow-lift" noValidate>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-green-700">Free guide</p>
          <h3 className="mt-1.5 font-display text-[21px] font-semibold leading-snug">Get our 7-day cycle-awareness guide in your inbox.</h3>
          <label htmlFor="nl-email" className="sr-only">
            Email address
          </label>
          <input
            id="nl-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            aria-invalid={!!err || undefined}
            aria-describedby={err ? 'nl-email-err' : undefined}
            className={cn('input mt-4 rounded-full', err && 'input-error')}
          />
          {err && (
            <p id="nl-email-err" role="alert" className="mt-2 text-sm font-medium text-danger">
              {err}
            </p>
          )}
          <Button type="submit" variant="butter" size="lg" loading={busy} className="mt-3 w-full">
            Yes, send it to me
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
            <HeartHandshake className="h-3.5 w-3.5" /> Demo only — no email is sent. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </section>
  );
}
