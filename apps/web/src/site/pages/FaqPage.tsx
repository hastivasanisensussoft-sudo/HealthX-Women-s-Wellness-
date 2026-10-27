import { useMemo, useState } from 'react';
import { BookOpen, CalendarHeart, CircleHelp, Flower2, Lock, MessageCircle, UserRound, type LucideIcon } from 'lucide-react';
import { COPY } from '@healthx/shared';
import { LeafPair } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { ButtonLink, EmptyState, SearchInput } from '@/components/ui';
import { cn } from '@/lib/utils';
import { FaqList, PageHero } from '../sections';

const GROUP_ICON: Record<string, LucideIcon> = { all: BookOpen, general: CircleHelp, cycle: CalendarHeart, privacy: Lock, account: UserRound, stages: Flower2 };

const GROUPS: { key: string; label: string; items: [string, string][] }[] = [
  {
    key: 'general',
    label: 'General',
    items: [
      ['What is HealthX Women’s Wellness?', 'A personalised wellness app that brings cycle tracking, daily check-ins, movement, hydration, nutrition, sleep, insights and education together in one place.'],
      ['Is HealthX a medical app?', `No. ${COPY.notDiagnostic}`],
      ['Who is it for?', 'Women at every stage — from teens and young adults to working professionals, people planning a family, and those in perimenopause or menopause.'],
      ['Which devices are supported?', 'iPhone and Android apps, plus a web dashboard.'],
    ],
  },
  {
    key: 'cycle',
    label: 'Cycle & estimates',
    items: [
      ['How are period predictions made?', `From the periods you log (or the typical lengths you enter). ${COPY.estimate} HealthX never assumes a 28-day cycle.`],
      ['My cycle is irregular — will it still work?', 'Yes. Estimates become less certain and are labelled that way. HealthX can also show when your recent cycle lengths vary more than before — without diagnosing anything.'],
      ['Can HealthX tell me when I ovulate?', `${COPY.ovulationNotConfirmed} Fertility-awareness features show estimates and your own observations only.`],
      ['Can I use HealthX for contraception?', `${COPY.notContraception} Please talk to a qualified healthcare professional about contraception.`],
    ],
  },
  {
    key: 'privacy',
    label: 'Privacy & data',
    items: [
      ['Who can see my data?', `Only you. ${COPY.employerPrivacy}`],
      ['Can I export or delete my data?', 'Yes — anytime from Settings → Privacy & Data. Deleting your account erases your data.'],
      ['Do you use AI on my data?', 'The AI coach (coming in a later phase) only uses your logs if you turn on AI personalisation. You can withdraw that consent anytime.'],
      ['Are notifications private?', 'You choose which notifications you get, and a discreet mode hides details on your lock screen.'],
    ],
  },
  {
    key: 'account',
    label: 'Account & billing',
    items: [
      ['How do I sign up?', 'With email and password, Apple, Google or a magic link sent to your email.'],
      ['Is there a free plan?', 'Yes — core tracking is free. Premium (coming later) adds advanced insights, the AI coach, nutrition and more.'],
      ['How do I cancel Premium?', 'Through the App Store or Google Play subscription settings on your device.'],
    ],
  },
  {
    key: 'stages',
    label: 'Life stages',
    items: [
      ['Does HealthX support pregnancy?', `A pregnancy wellness mode is planned. ${COPY.pregnancy}`],
      ['What about perimenopause and menopause?', 'Dedicated modes for symptoms like hot flashes and night sweats, sleep, mood, strength and bone-health education are on the roadmap.'],
    ],
  },
];

/** Public website — FAQ with search and categories. */
export default function FaqPage() {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const filtered = useMemo(
    () =>
      GROUPS.filter((g) => group === 'all' || g.key === group)
        .map((g) => ({ ...g, items: g.items.filter(([qq, a]) => `${qq} ${a}`.toLowerCase().includes(q.toLowerCase())) }))
        .filter((g) => g.items.length),
    [q, group],
  );
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);
  const cats = [{ key: 'all', label: 'All questions', n: total }, ...GROUPS.map((g) => ({ key: g.key, label: g.label, n: g.items.length }))];
  return (
    <>
      <PageHero eyebrow="Help centre" title="Questions," script="answered" body="Everything you might want to know about HealthX, your data, estimates and plans." image="herbal-tea" imageShape="arch">
        <div className="max-w-xl rounded-full bg-white p-1.5 shadow-lift ring-1 ring-ink-100">
          <SearchInput value={q} onChange={setQ} placeholder="Search questions" className="[&_input]:border-0 [&_input]:shadow-none" />
        </div>
        <p className="mt-3 text-sm text-ink-500">
          {total} answers about cycles, estimates, privacy, accounts and life stages.
        </p>
      </PageHero>
      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
          <nav aria-label="Question topics" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow mb-3 hidden lg:flex">Topics</p>
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              {cats.map((c) => {
                const Icon = GROUP_ICON[c.key] ?? CircleHelp;
                const on = group === c.key;
                return (
                  <li key={c.key} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setGroup(c.key)}
                      className={cn('flex min-h-[44px] w-full items-center gap-3 rounded-full px-4 text-left text-sm font-semibold transition lg:rounded-2xl', on ? 'bg-green-800 text-white shadow-soft' : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:text-green-800 hover:ring-green-300')}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', on ? 'text-butter-300' : 'text-green-700')} />
                      <span className="flex-1 whitespace-nowrap">{c.label}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', on ? 'bg-white/15 text-white' : 'bg-ink-100 text-ink-500')}>{c.n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="relative mt-8 hidden lg:block">
              <LeafPair className="-left-4 -top-6 h-24 w-24" />
              <Photo photo="woman-reading" alt="" shape="arch" position="22% 50%" className="relative aspect-[4/5] w-full" />
            </div>
          </nav>
          <div className="min-w-0">
            <div className="space-y-12" aria-live="polite">
              {filtered.length === 0 ? (
                <div className="rounded-[30px] bg-white ring-1 ring-ink-100">
                  <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="No matching questions" body="Try different words, or ask us directly." action={<ButtonLink to="/contact" size="sm">Contact us</ButtonLink>} />
                </div>
              ) : (
                filtered.map((g) => {
                  const Icon = GROUP_ICON[g.key] ?? CircleHelp;
                  return (
                    <div key={g.key}>
                      <h2 className="mb-5 flex items-center gap-3 font-display text-[24px] font-semibold text-green-950">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                          <Icon className="h-5 w-5" />
                        </span>
                        {g.label}
                      </h2>
                      <FaqList items={g.items} defaultOpen={q ? 0 : null} />
                    </div>
                  );
                })
              )}
            </div>
            <div className="bg-forest relative isolate mt-14 overflow-hidden rounded-[30px] p-8 text-white sm:p-10">
              <p className="font-display text-[26px] font-semibold">Still have a question?</p>
              <p className="mt-2 max-w-md text-white/75">Our team is happy to help. For anything urgent about your health, please contact a medical professional.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink to="/contact" variant="butter">
                  Contact us
                </ButtonLink>
                <ButtonLink to="/features" variant="ghost" className="text-white ring-1 ring-inset ring-white/25 hover:bg-white/10">
                  Explore features
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
