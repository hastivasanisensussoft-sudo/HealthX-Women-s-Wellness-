import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, CircleCheck, Clock, LifeBuoy, Mail, MessageCircleHeart, Newspaper, ShieldCheck, Siren } from 'lucide-react';
import { COPY } from '@healthx/shared';
import { Photo } from '@/components/media/Photo';
import { BackendBadge, Button, ButtonLink, Checkbox, Field, Input, Notice, Select, Textarea, useToast } from '@/components/ui';
import { isApiMode, userApi } from '@/lib/api';
import { simulate } from '@/lib/utils';
import { PageHero } from '../sections';
import { apiMessage } from '@/store/apiErrors';

/** Keys match the API's contact topics (apps/api/src/routes/public.ts). */
const TOPICS = [
  { key: 'general', label: 'General question' },
  { key: 'account', label: 'App or account support' },
  { key: 'privacy', label: 'Privacy or data request' },
  { key: 'subscription', label: 'Subscription & billing' },
  { key: 'partnership', label: 'HealthX Business, partnerships or press' },
  { key: 'feedback', label: 'Feedback' },
];

const CHANNELS = [
  { icon: LifeBuoy, t: 'App support', d: 'Help with your account, logging or the app.', v: 'support@healthx.example', tone: 'bg-green-50 text-green-700' },
  { icon: ShieldCheck, t: 'Privacy requests', d: 'You can export or delete your data yourself in Settings → Privacy & Data. For anything else, choose “Privacy or data request”.', v: 'privacy@healthx.example', tone: 'bg-lavender-50 text-lavender-600' },
  { icon: Building2, t: 'HealthX Business', d: 'Workplace wellness programmes — aggregated engagement only.', v: 'business@healthx.example', tone: 'bg-sky-50 text-sky-600' },
  { icon: Newspaper, t: 'Press', d: 'Media and partnership enquiries.', v: 'press@healthx.example', tone: 'bg-peach-50 text-peach-600' },
];

/** Public website — contact page. Messages go to the support queue in the Web Admin (offline demo: simulated). */
export default function Contact() {
  const toast = useToast();
  const [params] = useSearchParams();
  const initialTopic = TOPICS.some((t) => t.key === params.get('topic')) ? (params.get('topic') as string) : 'general';
  const [f, setF] = useState({ name: '', email: '', topic: initialTopic, message: '', agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const api = isApiMode();
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sent) return;
    doneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    doneRef.current?.focus({ preventScroll: true });
  }, [sent]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email address.';
    if (f.message.trim().length < 10) er.message = 'Tell us a little more (at least 10 characters).';
    if (f.message.length > 2000) er.message = 'Please keep your message under 2,000 characters.';
    if (!f.agree) er.agree = 'Please confirm you’ve read how we use your message.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setFormError(null);
    setBusy(true);
    try {
      if (api) {
        const r = await userApi.contact({ name: f.name.trim(), email: f.email.trim(), topic: f.topic, message: f.message.trim() });
        setReference(r.reference);
        toast.success('Message sent', 'Our team will reply by email.');
      } else {
        await simulate(true, 1000);
        setReference(null);
        toast.success('Message sent (offline demo)', 'No email was actually sent.');
      }
      setSent(true);
    } catch (err) {
      setFormError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We’d love to"
        script="hear from you"
        body="Questions, feedback, privacy requests or partnerships — send us a note and the HealthX team will reply by email."
        image="friends-group"
        position="50% 30%"
        card={
          <div className="glass flex items-center gap-3 rounded-2xl p-3 pr-4 shadow-lift">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-700 text-white">
              <MessageCircleHeart className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink-900">Replies by email</p>
              <p className="text-xs text-ink-500">From the HealthX support team</p>
            </div>
          </div>
        }
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.45fr_1fr] lg:px-8">
          <div className="min-w-0">
            <Notice tone="warning" title="Not for medical emergencies" icon={<Siren className="h-4 w-4 text-warning" />} className="mb-6">
              {COPY.emergency} This form isn’t monitored for urgent health issues and our team can’t give medical advice.
            </Notice>
            {sent ? (
              <div ref={doneRef} tabIndex={-1} className="bg-wash relative overflow-hidden rounded-[30px] p-8 text-center outline-none ring-1 ring-green-100 sm:p-12" role="status">
                <span className="mx-auto flex h-20 w-20 animate-scale-in items-center justify-center rounded-full bg-green-700 text-white shadow-glow">
                  <CircleCheck className="h-10 w-10" />
                </span>
                <p className="mt-5 font-display text-[28px] font-semibold text-green-950">Thanks, {f.name.split(' ')[0]}!</p>
                <p className="mx-auto mt-2 max-w-md text-ink-600">
                  We’ve received your message about “{TOPICS.find((t) => t.key === f.topic)?.label}”.{' '}
                  {reference ? (
                    <>
                      Your reference is <b className="font-mono text-green-900">{reference}</b>.
                    </>
                  ) : (
                    'This is the offline demo, so nothing was sent.'
                  )}
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSent(false);
                      setReference(null);
                      setF({ name: '', email: '', topic: 'general', message: '', agree: false });
                    }}
                  >
                    Send another message
                  </Button>
                  <ButtonLink to="/faq" variant="secondary">
                    Browse the FAQ
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-5 rounded-[30px] bg-white p-6 shadow-card ring-1 ring-ink-100 sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 pb-5">
                  <div>
                    <p className="eyebrow">Support request</p>
                    <h2 className="mt-1 font-display text-[24px] font-semibold text-ink-900">Send us a message</h2>
                  </div>
                  {api ? <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">Goes to the HealthX support team</span> : <BackendBadge label="Offline demo — not sent" />}
                </div>
                {formError && (
                  <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                    {formError}
                  </p>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" htmlFor="ct-name" error={errors.name} required>
                    <Input id="ct-name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} />
                  </Field>
                  <Field label="Email" htmlFor="ct-email" error={errors.email} required>
                    <Input id="ct-email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={!!errors.email} />
                  </Field>
                </div>
                <Field label="Topic" htmlFor="ct-topic">
                  <Select id="ct-topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>
                    {TOPICS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {f.topic === 'privacy' && (
                  <Notice tone="info">
                    To export or delete your data right away, log in and open{' '}
                    <Link to="/app/privacy" className="font-semibold underline">
                      Privacy &amp; data controls
                    </Link>
                    . We can’t act on account data from this form until we’ve confirmed it’s really you.
                  </Notice>
                )}
                <Field label="Message" htmlFor="ct-msg" error={errors.message} hint={`${f.message.length}/2000 · Please don’t include health details.`} required>
                  <Textarea id="ct-msg" rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} invalid={!!errors.message} />
                </Field>
                <div className="rounded-2xl bg-ink-50 p-4">
                  <Checkbox checked={f.agree} onChange={(v) => setF({ ...f, agree: v })} label="I understand my name, email and message are used only to respond to this request." />
                  {errors.agree && <p className="mt-1.5 text-sm font-medium text-danger">{errors.agree}</p>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-ink-400">{api ? 'Sent securely to the HealthX support team.' : 'Offline demo — the form validates, but nothing leaves your browser.'}</span>
                  <Button type="submit" size="lg" loading={busy}>
                    Send message
                  </Button>
                </div>
              </form>
            )}
          </div>
          <aside className="space-y-4">
            <div className="relative isolate overflow-hidden rounded-[30px] bg-green-950 text-white">
              <Photo photo="herbal-tea" alt="" shape="none" className="!absolute inset-0 -z-10 opacity-45" />
              <div className="p-6">
                <p className="eyebrow text-green-200">
                  <Clock className="h-3.5 w-3.5" /> Before you write
                </p>
                <p className="mt-2 font-display text-[20px] font-semibold leading-snug">Many answers are already in the help centre.</p>
                <ButtonLink to="/faq" variant="butter" size="sm" className="mt-4">
                  Search the FAQ
                </ButtonLink>
              </div>
            </div>
            {CHANNELS.map((c) => (
              <div key={c.t} className="flex gap-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-ink-100">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${c.tone}`}>
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[17px] font-semibold text-ink-900">{c.t}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{c.d}</p>
                  <p className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-semibold text-green-700">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> {c.v}
                  </p>
                </div>
              </div>
            ))}
            <p className="px-2 text-xs text-ink-400">Placeholder addresses for the demo (example domain).</p>
          </aside>
        </div>
      </section>
    </>
  );
}
