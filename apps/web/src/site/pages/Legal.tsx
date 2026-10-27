import { Link } from 'react-router-dom';
import { ArrowUp, FileText, FileWarning, Mail, ShieldCheck } from 'lucide-react';
import { COPY } from '@healthx/shared';
import { cn } from '@/lib/utils';
import { PageHero } from '../sections';

type Doc = 'terms' | 'privacy';

interface Section {
  h: string;
  p: string[];
}

const UPDATED = '2026-10-26';

/** DRAFT legal text — written to describe what the product actually does; must be reviewed by counsel before launch. */
const DOCS: Record<Doc, { title: string; script: string; intro: string; sections: Section[] }> = {
  terms: {
    title: 'Terms of',
    script: 'use',
    intro: 'These terms describe how you may use HealthX Women’s Wellness. They are a working draft for the product team.',
    sections: [
      { h: '1. What HealthX is', p: ['HealthX is a wellness app for tracking your cycle, symptoms, mood, energy, sleep, hydration, activity and habits, and for reading educational content.', COPY.notDiagnostic, COPY.emergency] },
      { h: '2. Estimates', p: [`${COPY.estimate} Cycle, period and fertile-window estimates are labelled with an asterisk (*).`, COPY.ovulationNotConfirmed, COPY.notContraception] },
      { h: '3. Your account', p: ['You need an account to use the app. Keep your password private and tell us if you think someone else has accessed your account. You can sign out of all devices from your profile at any time.', 'You must meet the minimum age for your country (to be confirmed per launch market).'] },
      { h: '4. Acceptable use', p: ['Don’t misuse the service — for example by trying to access other people’s data, interfering with the service, or posting unlawful or harmful content in community features.'] },
      { h: '5. Subscriptions', p: ['Core tracking is free. Premium features and trials are described on the Pricing page. Paid billing terms will be added before paid plans launch.'] },
      { h: '6. Educational content', p: ['Articles, videos and audio are reviewed by qualified reviewers before publishing, but they are general information and not a substitute for professional advice.'] },
      { h: '7. Ending your account', p: ['You can delete your account at any time in Privacy & data. Deleting your account permanently removes your wellness data (see the Privacy Policy for details and retention).'] },
      { h: '8. Changes', p: ['If these terms change materially, we will tell you in the app before the change takes effect.'] },
    ],
  },
  privacy: {
    title: 'Privacy',
    script: 'policy',
    intro: 'Your health data is personal. This draft explains what HealthX collects, why, and the controls you have.',
    sections: [
      { h: '1. What we collect', p: ['Account details: name, email address and password (stored only as a secure hash).', 'Profile details you choose to add: date of birth, country, language, timezone, height, weight, activity level and goals.', 'Wellness data you log: periods and flow, symptoms, mood, energy, stress, sleep, water, activity, workouts, meals, habits, goals, check-ins and optional fertility-awareness observations.', 'Technical data needed to run the service, such as sign-in sessions and the device type you sign in from.'] },
      { h: '2. Why we use it', p: ['To provide the app: storing what you log, calculating estimates, trends and your wellness plan, and syncing between your devices.', 'Optional uses only with your consent, which you can change at any time: reminders, anonymous product analytics (never your health values), AI personalisation and health-app integrations.'] },
      { h: '3. Who can see it', p: ['Only you can see your wellness data. HealthX staff do not see individual cycle, symptom, mood or other health records in our admin tools; support staff see only basic account details.', COPY.employerPrivacy, 'We do not sell your personal data.'] },
      { h: '4. Your rights and controls', p: ['Export: download a copy of your data from Privacy & data.', 'Delete: permanently delete your account and wellness data from Privacy & data.', 'Consent: turn optional consents on or off at any time.', 'You may have further rights under the law of your country (to be confirmed per launch market).'] },
      { h: '5. Security', p: ['Passwords are hashed, sessions expire and can be revoked, staff accounts require two-step verification, and every staff action on accounts is recorded in an audit log.'] },
      { h: '6. Retention', p: ['Retention periods for account data, deleted-account backups, support records and audit logs are still to be confirmed (placeholder — decision D-20).'] },
      { h: '7. Contact', p: ['Questions or requests about your privacy? Use the contact form and choose “Privacy”, and we will respond within the time required in your country.'] },
    ],
  },
};

const anchor = (h: string) => 'section-' + h.split('.')[0];

export default function Legal({ doc }: { doc: Doc }) {
  const d = DOCS[doc];
  const other = doc === 'terms' ? { to: '/privacy-policy', label: 'Privacy Policy', icon: ShieldCheck } : { to: '/terms', label: 'Terms of use', icon: FileText };
  return (
    <>
      <PageHero tone="forest" eyebrow="Legal" title={d.title} script={d.script} body={d.intro} />
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div role="note" className="mb-10 flex gap-3 rounded-3xl border border-butter-300 bg-butter-50 p-5 text-[15px] text-green-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-butter-300 text-green-950">
              <FileWarning className="h-5 w-5" />
            </span>
            <p className="leading-relaxed">
              <b>Draft — requires legal review before launch.</b> This text describes how the product works today so it can be reviewed by counsel. It is not yet a binding agreement. Last updated {UPDATED}.
            </p>
          </div>
          <div className="grid gap-10 lg:grid-cols-[250px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <nav aria-label="On this page" className="hidden rounded-3xl bg-cream p-5 ring-1 ring-ink-100 lg:block">
                <p className="eyebrow mb-3">On this page</p>
                <ol className="space-y-1">
                  {d.sections.map((s) => (
                    <li key={s.h}>
                      <a href={'#' + anchor(s.h)} className="block rounded-xl px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-white hover:text-green-800">
                        {s.h}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="grid gap-2 sm:grid-cols-2 lg:mt-4 lg:grid-cols-1">
                <Link to={other.to} className="flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-green-700 ring-1 ring-ink-100 hover:bg-green-50">
                  <other.icon className="h-4 w-4" /> {other.label}
                </Link>
                <Link to="/contact?topic=privacy" className="flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-green-700 ring-1 ring-ink-100 hover:bg-green-50">
                  <Mail className="h-4 w-4" /> Privacy requests
                </Link>
              </div>
            </aside>
            <article className="min-w-0 rounded-[32px] bg-white p-6 shadow-card ring-1 ring-ink-100 sm:p-10">
              <div className="divide-y divide-ink-100">
                {d.sections.map((s, i) => (
                  <section key={s.h} id={anchor(s.h)} className={cn('scroll-mt-28', i === 0 ? 'pb-8' : 'py-8')}>
                    <h2 className="font-display text-[24px] font-semibold text-green-950">{s.h}</h2>
                    <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-ink-700">
                      {s.p.map((p) => (
                        <p key={p}>{p}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-6 text-sm text-ink-500">
                <p>
                  See also:{' '}
                  <Link to={other.to} className="font-semibold text-green-700 hover:underline">
                    {other.label}
                  </Link>{' '}
                  ·{' '}
                  <Link to="/contact" className="font-semibold text-green-700 hover:underline">
                    Contact us
                  </Link>
                </p>
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 font-semibold text-green-700 hover:bg-green-50">
                  <ArrowUp className="h-4 w-4" /> Back to top
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
