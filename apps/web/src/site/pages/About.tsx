import { ArrowRight, Building2, FileCheck2, HeartHandshake, PenLine, ShieldCheck, Sparkles, Stethoscope, Users } from 'lucide-react';
import type { PhotoKey } from '@healthx/shared';
import { LeafPair, MoodFace } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { Badge, ButtonLink, PhaseBadge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { PRINCIPLES } from '../content';
import { Newsletter, PageHero, SectionHeading } from '../sections';

const PEOPLE: { photo: PhotoKey; t: string; d: string }[] = [
  { photo: 'portrait-indian', t: 'Young adults', d: 'Period tracking, cycle education, mood, fitness and skin.' },
  { photo: 'woman-reading', t: 'Working professionals', d: 'Predictable planning, stress, sleep and quick routines.' },
  { photo: 'woman-tea', t: 'Family planning', d: 'Cycle signs and fertility awareness — never guaranteed predictions.' },
  { photo: 'pregnant-woman', t: 'Pregnancy wellness', d: 'Gentle education alongside your prenatal care.' },
  { photo: 'mature-woman', t: 'Perimenopause', d: 'Cycle changes, hot flushes, sleep and mood.' },
  { photo: 'senior-woman-active', t: 'Menopause', d: 'Strength, sleep and bone-health education.' },
];

const REVIEW = [
  { icon: PenLine, t: 'Content Manager', d: 'Drafts clear, friendly content' },
  { icon: Stethoscope, t: 'Medical Content Reviewer', d: 'Checks accuracy, references & safety wording' },
  { icon: ShieldCheck, t: 'Admin approval', d: 'Confirms claims and compliance' },
  { icon: FileCheck2, t: 'Published', d: 'With reviewer, date, references & version' },
];

/** Public website — About. */
export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About HealthX"
        title="Wellness that understands"
        script="every stage of you"
        body="We’re building a personalised women’s wellness platform — one calm home for your cycle, body and everyday habits, instead of a dozen separate apps."
        image="portrait-indian"
        position="50% 22%"
        card={
          <div className="glass flex items-center gap-3 rounded-2xl p-3 pr-4 shadow-lift">
            <MoodFace mood="excellent" size={42} />
            <div>
              <p className="text-sm font-bold text-ink-900">Made with care</p>
              <p className="text-xs text-ink-500">Privacy-first · non-diagnostic</p>
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/how-it-works" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
            See how it works
          </ButtonLink>
          <ButtonLink to="/features" size="lg" variant="outline">
            Explore features
          </ButtonLink>
        </div>
      </PageHero>

      <section className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading center={false} eyebrow="Our mission" title="Help women understand their patterns," script="and act with confidence" />
            <p className="mt-6 text-[17px] leading-relaxed text-ink-600">
              HealthX helps you notice your wellness patterns, build healthy habits and make better-informed decisions about when to seek professional care. We combine cycle tracking, symptoms, mood, movement, nutrition, hydration and sleep with personalised education —
              across every life stage.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-600">Our long-term vision is a personalised women’s wellness operating system: cycle, fitness and nutrition flowing into everyday wellness, supported by clear, carefully worded insights.</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ['One', 'app for cycle, body and habits'],
                ['Zero', 'diagnoses — patterns only'],
                ['Every', 'estimate marked with *'],
              ].map(([v, l]) => (
                <div key={v} className="rounded-3xl bg-sage/70 p-4">
                  <p className="num text-[26px] leading-none text-green-900">{v}</p>
                  <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink-600">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Photo photo="friends-group" alt="A group of women smiling together" position="50% 30%" className="col-span-2 aspect-[16/9] w-full rounded-[30px] shadow-lift" shape="none" />
            <Photo photo="meditation" alt="" shape="arch" className="aspect-[4/5] w-full" />
            <div className="relative">
              <Photo photo="walking-outdoors" alt="" shape="none" className="aspect-[4/5] w-full rounded-[30px]" />
              <span className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/90 p-3 text-center font-script text-[22px] font-bold leading-tight text-green-700 backdrop-blur">small steps, big changes</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="What we believe" title="Five principles that" script="guide every screen" />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className={cn('relative flex flex-col rounded-[28px] p-6', i === 2 ? 'bg-forest text-white' : 'bg-white shadow-card ring-1 ring-ink-100')}>
                <div className="flex items-center justify-between">
                  <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', i === 2 ? 'bg-butter-300 text-green-950' : 'bg-green-50 text-green-700')}>
                    <p.icon className="h-5 w-5" />
                  </span>
                  <span className={cn('font-display text-[34px] font-semibold leading-none', i === 2 ? 'text-white/20' : 'text-green-100')}>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <p className={cn('mt-5 font-display text-[19px] font-semibold', i === 2 ? 'text-white' : 'text-ink-900')}>{p.title}</p>
                <p className={cn('mt-1.5 text-[14.5px] leading-relaxed', i === 2 ? 'text-white/75' : 'text-ink-500')}>{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Who we serve" title="Made for women at" script="every stage" body="From a first period to life after menopause, HealthX adapts to where you are today." />
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PEOPLE.map((p) => (
              <li key={p.t} className="group flex items-center gap-5 rounded-[28px] bg-white p-4 shadow-card ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-lift">
                <Photo photo={p.photo} alt="" shape="arch" position="50% 25%" className="h-32 w-24 shrink-0" imgClassName="transition duration-700 group-hover:scale-105" />
                <div className="min-w-0">
                  <p className="font-display text-[18px] font-semibold text-ink-900">{p.t}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink-500">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-3 sm:px-5">
        <div className="bg-wash relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[34px] px-6 py-16 sm:px-12 lg:px-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div className="relative mx-auto hidden w-full max-w-[320px] lg:block">
              <LeafPair className="-left-10 -top-8 h-40 w-40" />
              <Photo photo="doctor-consult" alt="A healthcare professional talking with a woman" shape="arch" position="60% 40%" className="relative aspect-[4/5] w-full shadow-lift" />
            </div>
            <div>
              <SectionHeading center={false} eyebrow="Content standards" title="Every article is" script="medically reviewed" body="Educational content follows a review workflow in the HealthX Web Admin, and each published piece records its reviewer, review date, references, version and last update." />
              <ol className="mt-10 grid gap-3 sm:grid-cols-2">
                {REVIEW.map((r, i) => (
                  <li key={r.t} className="flex items-start gap-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-ink-100">
                    <span className="num flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-800 text-[15px] text-white">{i + 1}</span>
                    <div>
                      <p className="flex items-center gap-2 font-display text-[17px] font-semibold text-ink-900">
                        <r.icon className="h-4 w-4 text-green-600" /> {r.t}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-500">{r.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="The HealthX family" title="Part of a growing" script="wellness ecosystem" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Building2, t: 'HealthX Business', d: 'Workplace wellness with aggregated engagement only — never individual cycle or reproductive data.', s: 'Future' },
              { icon: Users, t: 'HealthX Family', d: 'Private profiles for the people you care about, under one plan.', s: 'Future' },
              { icon: Sparkles, t: 'HealthX AI', d: 'A wellness coach that shares education, declines diagnosis and redirects emergencies.', s: 'Phase 2' },
            ].map((x) => (
              <div key={x.t} className="group rounded-[28px] bg-white p-7 shadow-card ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-inset ring-green-100">
                    <x.icon className="h-5 w-5" />
                  </span>
                  {x.s === 'Future' ? <Badge tone="gray">Future</Badge> : <PhaseBadge phase={2} />}
                </div>
                <p className="mt-5 font-display text-[20px] font-semibold text-ink-900">{x.t}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-500">
            <HeartHandshake className="h-4 w-4 text-green-600" /> Partnerships or press? <ButtonLink to="/contact?topic=partnership" variant="ghost" size="sm" className="text-green-700">Get in touch</ButtonLink>
          </p>
        </div>
      </section>
      <Newsletter />
    </>
  );
}
