import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Bot, CalendarHeart, Droplets, Footprints, Lock, RotateCcw, Send, ShieldAlert, ShieldCheck, Siren, Sparkles, Stethoscope, Wind } from 'lucide-react';
import { COACH_STARTERS, COPY, simulateCoachReply, type CoachReply } from '@healthx/shared';
import { useAppState } from '@/store/AppStore';
import { Avatar } from '@/components/brand/Brand';
import { BackendBadge, Badge, Button, Card, CardHeader, IconTile, Notice, PageHeader, PhaseBadge } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Msg {
  id: number;
  role: 'user' | 'coach';
  text: string;
  reply?: CoachReply;
}

let mid = 0;
const WELCOME: Msg = {
  id: mid++,
  role: 'coach',
  text: '',
  reply: {
    kind: 'educational',
    text: "Hi! I'm your HealthX wellness coach (simulated in this demo). Ask me about sleep, movement, stress, hydration or cycle education. I can't diagnose conditions or recommend medication.",
    suggestions: COACH_STARTERS,
  },
};

const TOPICS = [
  { label: 'Sleep', hint: 'Wind-down ideas', q: 'What can I do to improve my sleep?', icon: BedDouble, tone: 'indigo' as const },
  { label: 'Movement', hint: 'Easy workouts', q: 'Give me a beginner workout.', icon: Footprints, tone: 'green' as const },
  { label: 'Stress', hint: 'Calming habits', q: 'How can I manage stress?', icon: Wind, tone: 'lavender' as const },
  { label: 'Hydration', hint: 'Drink more water', q: 'How can I drink more water?', icon: Droplets, tone: 'sky' as const },
  { label: 'Cycle', hint: 'Phase education', q: 'Tips for period cramps', icon: CalendarHeart, tone: 'rose' as const },
  { label: 'Energy', hint: 'Feeling tired?', q: 'Why might I feel tired?', icon: Sparkles, tone: 'peach' as const },
];

function CoachAvatar({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <span className={cn('relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-800 text-white shadow-soft', size === 'lg' ? 'h-12 w-12' : 'h-9 w-9')}>
      <Bot className={size === 'lg' ? 'h-6 w-6' : 'h-[18px] w-[18px]'} />
      {size === 'lg' && <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-300 ring-2 ring-white" />}
    </span>
  );
}

/** AI Wellness Coach (SRS §34) — SIMULATED with keyword rules; no model is called. */
export default function Coach() {
  const { profile, consents } = useAppState();
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const aiConsent = consents.find((c) => c.id === 'ai_personalization')?.granted;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return setError('Type a question first.');
    if (t.length > 500) return setError('Please keep questions under 500 characters.');
    setError(null);
    setInput('');
    setMsgs((m) => [...m, { id: mid++, role: 'user', text: t }]);
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: mid++, role: 'coach', text: '', reply: simulateCoachReply(t) }]);
      setTyping(false);
    }, 900);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const lastCoach = [...msgs].reverse().find((m) => m.role === 'coach');

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI wellness coach"
        badge={<PhaseBadge phase={2} />}
        subtitle="General wellness education — available any time."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'AI coach' }]}
        actions={
          <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setMsgs([WELCOME])}>
            New chat
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-12">
        {/* ---------- Chat ---------- */}
        <section aria-label="Chat with the coach" className="flex h-[calc(100vh-240px)] min-h-[560px] flex-col overflow-hidden rounded-[30px] bg-white shadow-card ring-1 ring-inset ring-ink-100 xl:col-span-8">
          <div className="bg-wash flex items-center gap-3 border-b border-ink-100 px-4 py-3.5 sm:px-6">
            <CoachAvatar size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] font-semibold text-ink-900">HealthX Coach</p>
              <p className="text-xs leading-snug text-ink-500">{COPY.aiDisclaimer}</p>
            </div>
            <BackendBadge label="Simulated" />
          </div>

          <div ref={scroller} className="scrollbar-thin flex-1 space-y-5 overflow-y-auto bg-canvas/60 px-4 py-6 sm:px-6" aria-live="polite">
            <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">Today</p>
            {msgs.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex animate-fade-up items-end justify-end gap-2">
                  <p className="max-w-[80%] rounded-[22px] rounded-br-md bg-green-700 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-soft">{m.text}</p>
                  <Avatar name={profile.name} photoKey={profile.avatar} size={32} />
                </div>
              ) : (
                <div key={m.id} className="flex animate-fade-up items-start gap-2.5">
                  <CoachAvatar />
                  <div className="min-w-0 max-w-[88%] sm:max-w-[80%]">
                    <div
                      className={cn(
                        'rounded-[22px] rounded-tl-md px-4 py-3 text-[15px] shadow-xs ring-1 ring-inset',
                        m.reply?.kind === 'emergency' && 'bg-danger-soft ring-danger/30',
                        m.reply?.kind === 'declined' && 'bg-lavender-50 ring-lavender-200',
                        m.reply?.kind === 'educational' && 'bg-white ring-ink-100',
                      )}
                    >
                      {m.reply?.kind === 'emergency' && (
                        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-danger">
                          <Siren className="h-4 w-4" /> Please seek help now
                        </p>
                      )}
                      {m.reply?.kind === 'declined' && (
                        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-lavender-700">
                          <Stethoscope className="h-4 w-4" /> Outside what I can help with
                        </p>
                      )}
                      <p className="leading-relaxed text-ink-800">{m.reply?.text}</p>
                      {m.reply?.bullets && (
                        <ul className="mt-2 space-y-1.5 text-ink-700">
                          {m.reply.bullets.map((b) => (
                            <li key={b} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {m.reply && m.reply.suggestions.length > 0 && m === lastCoach && !typing && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.reply.suggestions.map((s) => (
                          <button key={s} onClick={() => ask(s)} className="chip min-h-[36px] border-green-200 bg-white text-[13px] text-green-800 shadow-xs hover:border-green-400 hover:bg-green-50">
                            <Sparkles className="h-3.5 w-3.5 text-green-500" /> {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            {typing && (
              <div className="flex items-center gap-2.5" role="status" aria-label="Coach is typing">
                <CoachAvatar />
                <span className="flex gap-1 rounded-[22px] rounded-tl-md bg-white px-4 py-3.5 shadow-xs ring-1 ring-inset ring-ink-100">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-green-400" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-ink-100 bg-white p-3 sm:p-4">
            <div className={cn('flex items-center gap-2 rounded-full bg-ink-50 p-1.5 pl-5 ring-1 ring-inset transition focus-within:bg-white focus-within:ring-2 focus-within:ring-green-500/40', error ? 'ring-danger/50' : 'ring-ink-200')}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={600}
                placeholder="Ask about sleep, movement, stress, your cycle…"
                aria-label="Message the coach"
                aria-invalid={!!error || undefined}
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0" aria-label="Send" disabled={typing}>
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-1.5 flex justify-between gap-3 px-3 text-xs">
              <span role={error ? 'alert' : undefined} className="font-medium text-danger">
                {error}
              </span>
              <span className={cn('shrink-0 font-mono text-ink-400', input.length > 500 && 'font-bold text-danger')}>{input.length}/500</span>
            </div>
          </form>
        </section>

        {/* ---------- Side ---------- */}
        <div className="space-y-6 xl:col-span-4">
          <section>
            <p className="eyebrow mb-3">Start with a topic</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
              {TOPICS.map((t) => (
                <IconTile key={t.label} tone={t.tone} icon={<t.icon className="h-5 w-5" />} label={t.label} hint={t.hint} onClick={() => !typing && ask(t.q)} />
              ))}
            </div>
          </section>
          <Card className="card-pad">
            <CardHeader title="What the coach can do" icon={<ShieldAlert className="h-5 w-5" />} />
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Badge tone="green">Allowed</Badge>
                <span className="text-ink-600">General wellness education and habit ideas.</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge tone="lavender">Declines</Badge>
                <span className="text-ink-600">Diagnosis, prescription medication, contraception reliance.</span>
              </li>
              <li className="flex items-start gap-3">
                <Badge tone="danger">Redirects</Badge>
                <span className="text-ink-600">Emergencies → local emergency services, never AI interpretation.</span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-ink-400">Try: “Do I have PCOS?” or “I have chest pain” to see the safety behaviour.</p>
          </Card>
          <Notice tone={aiConsent ? 'green' : 'info'} title={aiConsent ? 'Personalisation on' : 'General answers only'} icon={aiConsent ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-sky-500" />}>
            {aiConsent ? 'The coach may use your logs to personalise answers (Phase 3).' : 'Your logs are not shared with the coach. You can change this in '}
            {!aiConsent && (
              <Link to="/app/privacy" className="font-semibold underline">
                Privacy & data
              </Link>
            )}
          </Notice>
          <Notice tone="warning" title="In an emergency">
            {COPY.emergency}
          </Notice>
        </div>
      </div>
    </div>
  );
}
