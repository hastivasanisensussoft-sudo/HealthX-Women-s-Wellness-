import { ArrowRight, Building2, Check, CreditCard, Minus, Users } from 'lucide-react';
import { Badge, ButtonLink } from '@/components/ui';
import { FaqList, Newsletter, PageHero, Pricing as PricingCards, SectionHeading } from '../sections';

const ROWS: [string, boolean, boolean][] = [
  ['Period & cycle tracking with labelled estimates', true, true],
  ['Symptoms, mood & daily check-in', true, true],
  ['Hydration, steps & workout logging', true, true],
  ['Basic trends & weekly summary', true, true],
  ['Educational article library', true, true],
  ['Privacy center: export & delete anytime', true, true],
  ['Advanced insights & cycle correlations', false, true],
  ['Advanced cycle history', false, true],
  ['AI wellness coach', false, true],
  ['Nutrition tracking', false, true],
  ['Personalised programmes', false, true],
  ['Advanced wellness reports', false, true],
];

const BILLING_FAQ: [string, string][] = [
  ['Is the free plan really free?', 'Yes. Core cycle, symptom and wellness tracking stay free — there’s no trial clock on them.'],
  ['When does Premium launch?', 'Premium features are planned for the next phase. Pricing will be announced before launch.'],
  ['How will billing work?', 'Subscriptions on mobile are expected to be handled through the App Store and Google Play. You’d manage or cancel them there.'],
  ['What happens to my data if I downgrade?', 'You keep all of your data. Premium views simply lock until you upgrade again.'],
];

const Mark = ({ on, label }: { on: boolean; label: string }) =>
  on ? (
    <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700">
      <Check className="h-4 w-4" aria-label={`Included in ${label}`} />
    </span>
  ) : (
    <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-ink-400">
      <Minus className="h-4 w-4" aria-label={`Not included in ${label}`} />
    </span>
  );

/** Public website — pricing. */
export default function Pricing() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Start free."
        script="Grow at your pace."
        body="Everything you need to understand your cycle and build healthy habits is free. Premium adds deeper insights and personal guidance."
        image="woman-reading"
        imageShape="arch"
        position="40% 50%"
        card={
          <div className="glass rounded-2xl p-4 shadow-lift">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">Free plan</p>
            <p className="num mt-1 text-[30px] leading-none text-green-950">₹0</p>
            <p className="mt-1 text-xs font-semibold text-ink-500">Core tracking, forever</p>
          </div>
        }
      >
        <ButtonLink to="/get-the-app" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
          Get the free app
        </ButtonLink>
      </PageHero>
      <PricingCards />

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Side by side" title="Compare plans" />
          <div className="mt-10 overflow-x-auto rounded-[30px] bg-white shadow-card ring-1 ring-ink-100">
            <table className="w-full min-w-[520px] text-[15px]">
              <caption className="sr-only">Features included in the Free and Premium plans</caption>
              <thead>
                <tr className="bg-sage/70 text-left">
                  <th scope="col" className="px-6 py-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-green-800">
                    Feature
                  </th>
                  <th scope="col" className="w-32 px-6 py-4 text-center font-display text-[16px] font-semibold text-ink-900">
                    Free
                  </th>
                  <th scope="col" className="w-32 bg-green-800 px-6 py-4 text-center font-display text-[16px] font-semibold text-white">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ROWS.map(([f, a, b]) => (
                  <tr key={f} className="transition hover:bg-green-50/40">
                    <th scope="row" className="px-6 py-3.5 text-left font-medium text-ink-800">
                      {f}
                    </th>
                    <td className="px-6 py-3.5 text-center">
                      <Mark on={a} label="Free" />
                    </td>
                    <td className="bg-green-50/50 px-6 py-3.5 text-center">
                      <Mark on={b} label="Premium" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div id="business" className="mt-12 grid scroll-mt-24 gap-5 md:grid-cols-2">
            {[
              { icon: Users, t: 'Family', d: 'Multiple private profiles under one plan. Each person’s health data stays theirs.', tone: 'bg-lavender-50 text-lavender-600' },
              { icon: Building2, t: 'HealthX Business', d: 'Workplace wellness with aggregated engagement only — employers never receive individual cycle or reproductive-health data.', tone: 'bg-green-50 text-green-700' },
            ].map((x) => (
              <div key={x.t} className="rounded-[28px] bg-white p-7 shadow-card ring-1 ring-ink-100">
                <div className="flex items-center justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${x.tone}`}>
                    <x.icon className="h-6 w-6" />
                  </span>
                  <Badge tone="gray">Future</Badge>
                </div>
                <p className="mt-5 font-display text-[20px] font-semibold text-ink-900">{x.t}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:px-8">
          <div>
            <SectionHeading center={false} eyebrow="Billing" title="Billing questions" body="Straight answers about plans, billing and your data." />
            <div className="mt-6 flex items-start gap-3 rounded-3xl bg-white p-5 ring-1 ring-ink-100">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
              <p className="text-sm leading-relaxed text-ink-600">No payment details are collected in this demo. Paid plans arrive with Phase 2.</p>
            </div>
          </div>
          <FaqList items={BILLING_FAQ} />
        </div>
      </section>
      <Newsletter />
    </>
  );
}
