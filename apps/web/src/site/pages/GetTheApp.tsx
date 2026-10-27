import { Apple, BellRing, BookOpen, CalendarHeart, Check, Droplets, HeartPulse, LockKeyhole, ShieldCheck, Smartphone, Sparkles, UserCog } from 'lucide-react';
import { Badge, ButtonLink, Card } from '@/components/ui';
import { HowItWorks, PageHero, PhoneMock, PrivacySection, SectionHeading } from '../sections';

const IN_THE_APP = [
  { icon: CalendarHeart, title: 'Cycle & period', body: 'Log periods, flow and symptoms. Predictions are always labelled estimates.' },
  { icon: HeartPulse, title: 'Daily check-in', body: 'Mood, energy, stress and sleep in under 30 seconds, then a gentle plan for the day.' },
  { icon: Droplets, title: 'Everyday wellness', body: 'Water, steps, workouts, meals and sleep in one calm place.' },
  { icon: Sparkles, title: 'Insights & reports', body: 'Observed patterns and a weekly summary — never a diagnosis.' },
  { icon: BookOpen, title: 'Learn', body: 'Articles and short guided videos reviewed by medical content reviewers.' },
  { icon: BellRing, title: 'Reminders', body: 'Only the ones you choose, with discreet lock-screen wording.' },
];

const PLATFORMS = [
  { icon: Apple, name: 'iPhone', detail: 'iOS app' },
  { icon: Smartphone, name: 'Android', detail: 'Android app' },
];

/** Public website — where people get HealthX. Tracking happens in the mobile app; the web is for staff (Web Admin). */
export default function GetTheApp() {
  return (
    <>
      <PageHero
        eyebrow="Get the app"
        title="HealthX lives"
        script="on your phone."
        body="Your cycle, check-ins and everyday wellness are tracked in the HealthX app for iPhone and Android — private by design, with every estimate clearly marked."
        image="portrait-curly"
        imageShape="arch"
        position="50% 22%"
        card={
          <div className="glass rounded-2xl p-4 shadow-lift">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">Daily check-in</p>
            <p className="num mt-1 text-[30px] leading-none text-green-950">&lt; 30 s</p>
            <p className="mt-1 text-xs font-semibold text-ink-500">Mood, energy, sleep</p>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <span key={p.name} className="inline-flex min-h-[52px] items-center gap-3 rounded-2xl bg-green-950 px-5 text-white">
              <p.icon className="h-5 w-5 text-butter-300" />
              <span className="text-left leading-tight">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{p.detail}</span>
                <span className="block text-[15px] font-semibold">HealthX for {p.name}</span>
              </span>
            </span>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 text-sm text-ink-500">
          <Badge tone="butter">Store listings coming soon</Badge>
          <span>This is a development build — the app isn’t in the App Store or Google Play yet.</span>
        </p>
      </PageHero>

      <section className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <SectionHeading center={false} eyebrow="In the app" title="Everything you track," script="in one place." body="The full HealthX experience is in the mobile app. Your account works on any phone you sign in on." />
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {IN_THE_APP.map((f) => (
                <Card key={f.title} className="card-pad flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-display text-[17px] font-semibold text-ink-900">{f.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-600">{f.body}</span>
                  </span>
                </Card>
              ))}
            </div>
          </div>
          <PhoneMock className="mx-auto hidden lg:block" />
        </div>
      </section>

      <HowItWorks />
      <PrivacySection />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <Card className="card-pad">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-700">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-[22px] font-semibold text-ink-900">Opened a link from an email?</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              {['Password-reset and email-confirmation links open on this website and finish there.', 'Magic sign-in links hand you over to the HealthX app.', 'Then carry on in the app — your data is just as you left it.'].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" /> {t}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="card-pad">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-lavender-50 text-lavender-700">
              <UserCog className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-[22px] font-semibold text-ink-900">HealthX staff</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">Content Managers, Medical Content Reviewers and Admins work in the Web Admin, with two-step verification.</p>
            <ButtonLink to="/admin/login" variant="outline" className="mt-5" leftIcon={<ShieldCheck className="h-4 w-4" />}>
              Staff sign-in
            </ButtonLink>
          </Card>
        </div>
      </section>
    </>
  );
}
