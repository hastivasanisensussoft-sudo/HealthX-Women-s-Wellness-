import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck2, CalendarClock, CalendarDays, CalendarX, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, Send, Sparkles } from 'lucide-react';
import { formatDate, todayISO } from '@healthx/shared';
import { Badge, Button, Card, CardSkeleton, EmptyState, Field, Input, Modal, Notice, Tabs, useToast } from '@/components/ui';
import { cn, useDemoLoading } from '@/lib/utils';
import type { ContentItem } from '../adminData';
import { useAccess, useAdmin } from '../adminState';
import { AdminHeader, AdminHero, HeroStat, ReadOnlyBanner, RowActions, StatusBadge, TableShell, Th } from '../components';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');
type Ev = { c: ContentItem; kind: 'published' | 'scheduled' };
type Day = { d: string; n: number; dow: number; ev: Ev[] };

function EventPill({ e, onOpen, large }: { e: Ev; onOpen: (c: ContentItem) => void; large?: boolean }) {
  const published = e.kind === 'published';
  return (
    <button
      type="button"
      onClick={() => onOpen(e.c)}
      title={`${published ? 'Published' : 'Scheduled'}: ${e.c.title}`}
      className={cn(
        'flex w-full min-w-0 items-center gap-1 rounded-full text-left font-semibold transition',
        large ? 'min-h-[40px] px-3 py-2 text-[13px]' : 'px-2 py-1 text-[11px]',
        published ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-white text-indigo-700 ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50',
      )}
    >
      {published ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Clock3 className="h-3 w-3 shrink-0" />}
      <span className="truncate">{e.c.title}</span>
    </button>
  );
}

/** Month grid of published (filled) and scheduled (outlined) content — mockup "Publishing Calendar". Busy days sit on mint range bands. */
function MonthCalendar({ content, onOpen }: { content: ContentItem[]; onOpen: (c: ContentItem) => void }) {
  const today = todayISO();
  const thisMonth = { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 };
  const [ym, setYm] = useState(thisMonth);
  const first = new Date(ym.y, ym.m, 1);
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const label = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const iso = (d: number) => `${ym.y}-${pad(ym.m + 1)}-${pad(d)}`;
  const events = (d: string): Ev[] => [
    ...content.filter((c) => c.status === 'published' && c.publishedDate === d).map((c) => ({ c, kind: 'published' as const })),
    ...content.filter((c) => c.status === 'scheduled' && c.scheduledFor?.slice(0, 10) === d).map((c) => ({ c, kind: 'scheduled' as const })),
  ];
  const shift = (delta: number) => setYm(({ y, m }) => ({ y: m + delta < 0 ? y - 1 : m + delta > 11 ? y + 1 : y, m: (m + delta + 12) % 12 }));
  const lead = first.getDay();
  const days: Day[] = Array.from({ length: daysInMonth }, (_, i) => ({ d: iso(i + 1), n: i + 1, dow: (lead + i) % 7, ev: events(iso(i + 1)) }));
  const total = days.reduce((a, x) => a + x.ev.length, 0);
  const published = days.reduce((a, x) => a + x.ev.filter((e) => e.kind === 'published').length, 0);
  const isThisMonth = ym.y === thisMonth.y && ym.m === thisMonth.m;
  const busy = (i: number) => i >= 0 && i < days.length && days[i].ev.length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 bg-gradient-to-r from-green-50 via-white to-indigo-50/60 px-4 py-4 sm:px-6">
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-green-700 shadow-soft sm:flex">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-700 shadow-xs ring-1 ring-ink-100 transition hover:text-green-800 hover:ring-green-300">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[150px] text-center font-display text-[20px] font-semibold tracking-[-0.01em] text-ink-900" aria-live="polite">
            {label}
          </h2>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-700 shadow-xs ring-1 ring-ink-100 transition hover:text-green-800 hover:ring-green-300">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button size="sm" variant={isThisMonth ? 'secondary' : 'outline'} onClick={() => setYm(thisMonth)}>
          Today
        </Button>
        <span className="flex w-full flex-wrap items-center gap-2 text-xs font-semibold text-ink-600 lg:ml-auto lg:w-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-ink-100">
            <span className="h-2.5 w-2.5 rounded-full bg-green-700" /> Published
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-ink-100">
            <span className="h-2.5 w-2.5 rounded-full bg-white ring-2 ring-inset ring-indigo-400" /> Scheduled
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-ink-100">
            <span className="h-2.5 w-4 rounded-full bg-green-100" /> Publishing days
          </span>
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-400">
            {published} live · {total - published} queued
          </span>
        </span>
      </div>

      <div className="p-3 sm:p-5">
        {/* Desktop/tablet month grid */}
        <div className="hidden grid-cols-7 gap-y-1.5 sm:grid" aria-label={`Publishing calendar, ${label}`}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={cn('pb-2 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]', i === 0 || i === 6 ? 'text-rose-500' : 'text-ink-400')}>
              {d}
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={`lead-${i}`} aria-hidden className="px-0.5">
              <div className="h-full min-h-[96px] rounded-2xl border border-dashed border-ink-100" />
            </div>
          ))}
          {days.map(({ d, n, dow, ev }, i) => {
            const on = ev.length > 0;
            const startBand = on && (dow === 0 || !busy(i - 1));
            const endBand = on && (dow === 6 || !busy(i + 1));
            const isToday = d === today;
            const weekend = dow === 0 || dow === 6;
            return (
              <div key={d} aria-label={`${formatDate(d)}: ${ev.length} item${ev.length === 1 ? '' : 's'}`} className="relative min-h-[104px]">
                {on && <span aria-hidden className={cn('absolute inset-y-0 bg-green-100/70', startBand ? 'left-0.5 rounded-l-2xl' : 'left-0', endBand ? 'right-0.5 rounded-r-2xl' : 'right-0')} />}
                <div
                  className={cn(
                    'relative mx-0.5 flex h-full flex-col rounded-2xl p-1.5',
                    !on && (weekend ? 'bg-ink-50/70 ring-1 ring-inset ring-ink-100/70' : 'bg-white ring-1 ring-inset ring-ink-100'),
                    isToday && 'ring-2 ring-inset ring-green-700',
                  )}
                >
                  <span className="flex items-center justify-between gap-1 px-0.5">
                    <span className={cn('num flex h-6 min-w-6 items-center justify-center rounded-full text-[12.5px]', isToday ? 'bg-green-700 px-1 text-white' : on ? 'text-green-900' : 'text-ink-500')}>{n}</span>
                    {isToday && <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-green-700">Today</span>}
                  </span>
                  <div className="mt-1 space-y-1">
                    {ev.slice(0, 3).map((e) => (
                      <EventPill key={e.c.id + e.kind} e={e} onOpen={onOpen} />
                    ))}
                    {ev.length > 3 && <span className="block px-1 text-[10.5px] font-semibold text-green-800">+{ev.length - 3} more</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Phone agenda (same events, one row per publishing day) */}
        <ol className="space-y-2 sm:hidden" aria-label={`Agenda, ${label}`}>
          {days
            .filter((x) => x.ev.length > 0)
            .map(({ d, n, dow, ev }) => (
              <li key={d} className={cn('flex gap-3 rounded-2xl p-2.5', d === today ? 'bg-green-50 ring-2 ring-inset ring-green-700' : 'bg-green-50/70')}>
                <span className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white py-1.5 shadow-xs">
                  <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-400">{WEEKDAYS[dow]}</span>
                  <span className="num text-[20px] leading-none text-ink-900">{n}</span>
                </span>
                <span className="min-w-0 flex-1 space-y-1.5">
                  {ev.map((e) => (
                    <EventPill key={e.c.id + e.kind} e={e} onOpen={onOpen} large />
                  ))}
                </span>
              </li>
            ))}
        </ol>
        {total === 0 && (
          <div className="mt-3 flex flex-col items-center gap-1 rounded-2xl bg-ink-50/70 px-4 py-5 text-center">
            <CalendarDays className="h-5 w-5 text-green-700" />
            <p className="text-sm text-ink-500">Nothing published or scheduled in {label}.</p>
          </div>
        )}
      </div>
    </Card>
  );
}

type Tab = 'ready' | 'scheduled' | 'recent';

/** Publishing calendar: month view, scheduled posts, items ready to publish, and what went live recently (§39 "Schedule content"). */
export default function Schedule() {
  const { state, dispatch, audit } = useAdmin();
  const { can } = useAccess();
  const toast = useToast();
  const nav = useNavigate();
  const loading = useDemoLoading(350);
  const canPublish = can('publish_content');
  const [scheduling, setScheduling] = useState<ContentItem | null>(null);
  const [at, setAt] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const me = state.session!;

  const scheduled = state.content.filter((c) => c.status === 'scheduled').sort((a, b) => ((a.scheduledFor ?? '') < (b.scheduledFor ?? '') ? -1 : 1));
  const ready = state.content.filter((c) => c.status === 'approved');
  const recent = state.content
    .filter((c) => c.status === 'published' && c.publishedDate)
    .sort((a, b) => ((a.publishedDate ?? '') < (b.publishedDate ?? '') ? 1 : -1))
    .slice(0, 6);
  const month = todayISO().slice(0, 7);
  const liveThisMonth = state.content.filter((c) => c.status === 'published' && c.publishedDate?.startsWith(month)).length;
  const next = scheduled[0];
  const [tab, setTab] = useState<Tab>(() => (ready.length ? 'ready' : scheduled.length ? 'scheduled' : 'recent'));

  /** Resolves to null when the server refuses the step (the store shows why). */
  const commit = (c: ContentItem, patch: Partial<ContentItem>, action: string, auditAction: string, note?: string) => {
    const result = dispatch({
      type: 'UPSERT_CONTENT',
      item: { ...c, ...patch, updatedDate: todayISO(), history: [...c.history, { at: new Date().toISOString(), actor: me.name, role: me.role, action, note, version: c.version }] },
    });
    audit(auditAction, c.title, note);
    return result;
  };

  const publishNow = (c: ContentItem) => {
    if (!c.medicalReviewer || !c.reviewDate || !c.references.length) {
      toast.error('Can’t publish yet', 'A medical reviewer, review date and references are required (§40).');
      return;
    }
    void commit(c, { status: 'published', publishedDate: todayISO(), scheduledFor: null }, 'Published', 'content.publish').then((ok) => ok && toast.success('Published', c.title));
  };

  const confirmSchedule = () => {
    if (!scheduling) return;
    if (!at) return setErr('Choose a date and time.');
    if (new Date(at).getTime() <= Date.now() + 5 * 60_000) return setErr('Schedule at least 5 minutes in the future.');
    const title = scheduling.title;
    void commit(scheduling, { status: 'scheduled', scheduledFor: at }, 'Scheduled publication', 'content.schedule', at.replace('T', ' ')).then((ok) => {
      if (!ok) return;
      toast.success('Scheduled', `${title} goes live ${at.replace('T', ' ')}.`);
      setScheduling(null);
    });
  };

  const actionsFor = (c: ContentItem) => [
    { label: 'Open in editor', icon: ExternalLink, onSelect: () => nav(`/admin/content/${c.id}`) },
    canPublish && { label: 'Publish now', icon: Send, onSelect: () => publishNow(c) },
    canPublish &&
      c.status === 'approved' && {
        label: 'Schedule…',
        icon: CalendarClock,
        onSelect: () => {
          setScheduling(c);
          setAt('');
          setErr(null);
        },
      },
    canPublish &&
      c.status === 'scheduled' && {
        label: 'Cancel schedule',
        icon: CalendarX,
        danger: true,
        onSelect: () => {
          void commit(c, { status: 'approved', scheduledFor: null }, 'Cancelled schedule', 'content.unschedule').then((ok) => ok && toast.success('Schedule cancelled', c.title));
        },
      },
  ];

  const renderTable = (items: ContentItem[], empty: string, when: (c: ContentItem) => string) =>
    items.length === 0 ? (
      <EmptyState compact icon={<CalendarCheck2 className="h-5 w-5" />} title={empty} className="py-10" />
    ) : (
      <TableShell minWidth={720}>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Type</Th>
            <Th>When</Th>
            <Th>Status</Th>
            <Th className="w-12">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="max-w-[320px] px-4 py-3">
                <span className="block truncate font-semibold text-ink-900">{c.title}</span>
                <span className="block text-xs text-ink-500">
                  by {c.author} · reviewed by {c.medicalReviewer || '—'}
                </span>
              </td>
              <td className="px-4 py-3 capitalize text-ink-600">{c.type === 'faq' ? 'FAQ' : c.type}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 font-mono text-[11.5px] text-ink-700 ring-1 ring-inset ring-ink-100">
                  <Clock3 className="h-3.5 w-3.5 text-green-700" />
                  {when(c)}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-2 py-3">
                <RowActions label={c.title} actions={c.status === 'published' ? [{ label: 'Open in editor', icon: ExternalLink, onSelect: () => nav(`/admin/content/${c.id}`) }] : actionsFor(c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    );

  const panels: Record<Tab, { title: string; subtitle: string; body: () => ReactNode }> = {
    ready: {
      title: 'Ready to publish',
      subtitle: 'Medically reviewed and compliance-approved (§40).',
      body: () => renderTable(ready, 'No approved content waiting.', (c) => `Approved ${formatDate(c.updatedDate)}`),
    },
    scheduled: {
      title: 'Scheduled',
      subtitle: 'Goes live automatically at the time shown (your local time).',
      body: () => renderTable(scheduled, 'Nothing scheduled — schedule approved content below.', (c) => (c.scheduledFor ? c.scheduledFor.replace('T', ' ') : '—')),
    },
    recent: {
      title: 'Recently published',
      subtitle: 'The latest items that went live in the app.',
      body: () => (recent.length === 0 ? <EmptyState icon={<Send className="h-6 w-6" />} title="Nothing published yet" compact className="py-10" /> : renderTable(recent, '', (c) => formatDate(c.publishedDate!))),
    },
  };
  const panel = panels[tab];

  return (
    <>
      <AdminHeader title="Publishing calendar" subtitle="What went live, what’s scheduled, and approved content waiting to publish (§39 “Schedule content”)." badge={<Badge tone="indigo">{scheduled.length} scheduled</Badge>} />
      {!canPublish && <ReadOnlyBanner>Read-only: publishing and scheduling need the Content Manager or Admin role.</ReadOnlyBanner>}

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton lines={4} className="rounded-[34px]" />
          <CardSkeleton lines={6} />
          <CardSkeleton lines={5} />
        </div>
      ) : (
        <div className="space-y-8">
          <AdminHero
            className="mb-0"
            eyebrow={`Publishing pipeline · ${formatDate(todayISO(), 'month')}`}
            title={next?.scheduledFor ? `Next go-live · ${formatDate(next.scheduledFor.slice(0, 10))}, ${next.scheduledFor.slice(11, 16)}` : ready.length ? `${ready.length} approved item${ready.length === 1 ? '' : 's'} ready to schedule` : 'Nothing queued right now'}
            aside={
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <HeroStat label="Scheduled" value={scheduled.length} hint="queued" icon={<Clock3 className="h-3.5 w-3.5" />} />
                <HeroStat label="Ready" value={ready.length} hint="approved" icon={<Sparkles className="h-3.5 w-3.5" />} />
                <HeroStat label="Live this month" value={liveThisMonth} hint="in the app" icon={<CheckCircle2 className="h-3.5 w-3.5" />} className="col-span-2 sm:col-span-1" />
              </div>
            }
          >
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-green-50/80">
              {next ? <>“{next.title}” is the next scheduled post. </> : null}
              Only content that passed medical and compliance review (§40) can be scheduled or published.
            </p>
            {canPublish && ready.length > 0 && (
              <Button variant="butter" size="sm" className="mt-5" leftIcon={<CalendarClock className="h-4 w-4" />} onClick={() => (setTab('ready'), document.getElementById('publish-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}>
                Schedule approved content
              </Button>
            )}
          </AdminHero>

          <MonthCalendar content={state.content} onOpen={(c) => nav(`/admin/content/${c.id}`)} />

          <section id="publish-queue" className="scroll-mt-28">
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              className="mb-4"
              tabs={[
                { value: 'ready', label: 'Ready to publish', count: ready.length },
                { value: 'scheduled', label: 'Scheduled', count: scheduled.length },
                { value: 'recent', label: 'Recently published', count: recent.length },
              ]}
            />
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-ink-100 px-5 py-4">
                <div>
                  <p className="font-display text-[17px] font-semibold text-ink-900">{panel.title}</p>
                  <p className="text-sm text-ink-500">{panel.subtitle}</p>
                </div>
              </div>
              {panel.body()}
            </Card>
          </section>
          <Notice tone="info">A background job publishes scheduled items at their time (simulated in this demo).</Notice>
        </div>
      )}

      <Modal
        open={!!scheduling}
        onClose={() => setScheduling(null)}
        size="sm"
        title="Schedule publication"
        description={scheduling?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduling(null)}>
              Cancel
            </Button>
            <Button onClick={confirmSchedule}>Schedule</Button>
          </>
        }
      >
        <Field label="Publish at" required htmlFor="sch-at" error={err} hint="Your local time.">
          <Input id="sch-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} invalid={!!err} />
        </Field>
      </Modal>
    </>
  );
}
