import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Globe, Play, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import type { VideoKey } from '@healthx/shared';
import { LeafPair } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { VideoPlayerModal } from '@/components/media/Video';
import { Button, ButtonLink } from '@/components/ui';
import { cn } from '@/lib/utils';
import { MODULE_GROUPS, MODULES, TONE_ICON, TONE_PANEL, type SiteModule } from '../content';
import { LifeStages, ModuleStatus, Newsletter, PageHero, PrivacySection, SectionHeading } from '../sections';
import { ModuleVisual } from '../visuals';

function Points({ items, light }: { items: string[]; light?: boolean }) {
  return (
    <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
      {items.map((p) => (
        <li key={p} className={cn('flex items-start gap-2.5 text-[15px]', light ? 'text-white/90' : 'text-ink-700')}>
          <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', light ? 'bg-butter-300 text-green-950' : 'bg-green-100 text-green-700')}>
            <Check className="h-3 w-3" />
          </span>
          {p}
        </li>
      ))}
    </ul>
  );
}

/** Large photo row for the first module of each group. */
function FeatureRow({ m, flip, onVideo }: { m: SiteModule; flip?: boolean; onVideo: (v: VideoKey) => void }) {
  return (
    <article id={m.id} className="grid scroll-mt-40 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn('relative', flip && 'lg:order-2')}>
        <LeafPair className={cn('-top-8 h-36 w-36', flip ? '-right-6' : '-left-8')} />
        <Photo photo={m.photo} alt="" shape="none" position={m.position} className="relative aspect-[4/3] w-full rounded-[32px] shadow-lift" />
        <div className={cn('glass absolute -bottom-8 hidden w-[300px] rounded-3xl p-4 shadow-lift sm:block', flip ? '-left-4' : '-right-4')}>
          <ModuleVisual kind={m.visual} />
        </div>
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset', TONE_ICON[m.tone])}>
            <m.icon className="h-6 w-6" />
          </span>
          <ModuleStatus m={m} />
        </div>
        <h3 className="mt-5 font-display text-[30px] font-semibold leading-tight tracking-[-0.015em] text-green-950 sm:text-[38px]">{m.title}</h3>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-600">{m.body}</p>
        <Points items={m.points} />
        {m.video && (
          <Button variant="secondary" className="mt-6" leftIcon={<Play className="h-4 w-4 fill-current" />} onClick={() => onVideo(m.video!)}>
            Watch the video preview
          </Button>
        )}
      </div>
    </article>
  );
}

function FeatureCard({ m, onVideo, stacked }: { m: SiteModule; onVideo: (v: VideoKey) => void; stacked?: boolean }) {
  return (
    <article id={m.id} className={cn('flex min-w-0 scroll-mt-40 flex-col overflow-hidden rounded-[30px] bg-white shadow-card ring-1 ring-ink-100 sm:flex-row', stacked && 'lg:flex-col')}>
      <div className={cn('flex shrink-0 items-center justify-center bg-gradient-to-br p-6 sm:w-[42%]', stacked && 'lg:h-56 lg:w-auto', TONE_PANEL[m.tone])}>
        <ModuleVisual kind={m.visual} className="w-full py-2" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <div className="flex items-start gap-3">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset', TONE_ICON[m.tone])}>
            <m.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[20px] font-semibold leading-snug text-ink-900">{m.title}</h3>
            <ModuleStatus m={m} className="mt-1.5" />
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{m.body}</p>
        <ul className="mt-4 space-y-2">
          {m.points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-[14.5px] text-ink-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              {p}
            </li>
          ))}
        </ul>
        {m.video && (
          <button type="button" onClick={() => onVideo(m.video!)} className="mt-5 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full bg-green-50 px-4 text-sm font-semibold text-green-800 ring-1 ring-inset ring-green-200/70 transition hover:bg-green-100">
            <Play className="h-3.5 w-3.5 fill-current" /> Video preview<span className="sr-only">: {m.title}</span>
          </button>
        )}
      </div>
    </article>
  );
}

/** Public website — product information & features (every app module). */
export default function Features() {
  const [video, setVideo] = useState<VideoKey | null>(null);
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything HealthX does,"
        script="in one calm place"
        body={`${MODULES.length} modules — cycle tracking, check-ins, movement, hydration, nutrition, sleep, insights, education and more — designed for every stage of a woman’s life, with privacy built in.`}
        image="portrait-curly"
        position="50% 20%"
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/get-the-app" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
            Start free
          </ButtonLink>
          <ButtonLink to="/pricing" size="lg" variant="outline">
            See pricing
          </ButtonLink>
        </div>
      </PageHero>

      <nav aria-label="On this page" className="sticky top-[75px] z-30 mt-6 border-y border-ink-100 bg-white/90 backdrop-blur-xl">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
          {[...MODULE_GROUPS.map((g) => ({ href: `#group-${g.key}`, label: g.label })), { href: '#life-stages', label: 'Life stages' }, { href: '#roadmap', label: 'Roadmap' }, { href: '#privacy', label: 'Privacy' }].map((l) => (
            <a key={l.href} href={l.href} className="pill-tab pill-tab-off shrink-0">
              {l.label}
            </a>
          ))}
        </div>
      </nav>

      {MODULE_GROUPS.map((g, gi) => {
        const items = MODULES.filter((m) => m.group === g.key);
        const [first, ...rest] = items;
        return (
          <section key={g.key} id={`group-${g.key}`} className={cn('scroll-mt-36 overflow-x-clip py-20 sm:py-24', gi % 2 === 1 && 'bg-cream')}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-14 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <SectionHeading center={false} eyebrow={`${String(gi + 1).padStart(2, '0')} · ${g.label}`} title={g.title} body={g.body} />
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400">
                  {items.length} module{items.length === 1 ? '' : 's'}
                </p>
              </div>
              <FeatureRow m={first} flip={gi % 2 === 1} onVideo={setVideo} />
              <div className={cn('mt-20 grid gap-5', rest.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
                {rest.map((m) => (
                  <FeatureCard key={m.id} m={m} onVideo={setVideo} stacked={rest.length === 3} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <LifeStages />

      <section id="roadmap" className="scroll-mt-36 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Platforms & roadmap" title="Available today, and" script="growing with you" body="HealthX launches with the essentials and adds deeper features in phases — so every release is careful and well tested." />
          <ol className="mt-12 grid gap-5 lg:grid-cols-3">
            {[
              { t: 'Now', s: 'Core release', tone: 'bg-forest text-white', items: ['Cycle, period & symptom tracking', 'Daily check-in, mood & energy', 'Hydration, steps & workouts', 'Goals, habits & daily plan', 'Weekly reports & insights', 'Learning library, FAQ & privacy controls'] },
              { t: 'Next', s: 'Phase 2', tone: 'bg-lavender-50 ring-1 ring-lavender-100', items: ['AI wellness coach', 'Nutrition & sleep', 'Apple Health & Health Connect', 'Achievements & advanced insights', 'Premium plans'] },
              { t: 'Later', s: 'Phase 3–4', tone: 'bg-peach-50 ring-1 ring-peach-100', items: ['Fertility awareness', 'Pregnancy, perimenopause & menopause modes', 'Wearables & AI personalisation', 'Community (Phase 4)'] },
            ].map((c, i) => (
              <li key={c.t} className={cn('rounded-[30px] p-7', c.tone)}>
                <div className="flex items-baseline justify-between">
                  <p className={cn('font-display text-[28px] font-semibold', i === 0 ? 'text-white' : 'text-ink-900')}>{c.t}</p>
                  <p className={cn('font-mono text-[11px] uppercase tracking-[0.14em]', i === 0 ? 'text-butter-300' : 'text-ink-500')}>{c.s}</p>
                </div>
                <ul className="mt-5 space-y-3">
                  {c.items.map((x) => (
                    <li key={x} className={cn('flex items-center gap-2.5 text-[15px]', i === 0 ? 'text-white/90' : 'text-ink-700')}>
                      <Sparkles className={cn('h-4 w-4 shrink-0', i === 0 ? 'text-butter-300' : 'text-green-600')} />
                      {x}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Smartphone, t: 'iPhone & Android', d: 'Native-feeling mobile apps' },
              { icon: Globe, t: 'Web dashboard', d: 'Your full history on a bigger screen' },
              { icon: ShieldCheck, t: 'Privacy first', d: 'Consent, export & delete anytime' },
            ].map((x) => (
              <div key={x.t} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-ink-100">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                  <x.icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-display text-[17px] font-semibold text-ink-900">{x.t}</p>
                  <p className="text-sm text-ink-500">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-ink-500">
            Questions?{' '}
            <Link to="/faq" className="font-semibold text-green-700 hover:underline">
              Read the FAQ
            </Link>{' '}
            or{' '}
            <Link to="/contact" className="font-semibold text-green-700 hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </section>

      <PrivacySection />
      <Newsletter />
      <VideoPlayerModal video={video} onClose={() => setVideo(null)} />
    </>
  );
}
