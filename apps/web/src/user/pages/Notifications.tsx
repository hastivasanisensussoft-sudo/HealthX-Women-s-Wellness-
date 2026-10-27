import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, BellRing, CheckCheck, EyeOff, Inbox, Layers, Lock, Moon, Plus, Settings2, Trash2 } from 'lucide-react';
import { addDays, formatClock, formatDate, lastNDays, NOTIFICATION_TYPES, timeAgo, type AppNotification, type NotificationPrefs, type NotificationType } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Input, Modal, Notice, PageHeader, Pagination, Select, Switch, Tabs, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, paginate } from '@/lib/utils';
import { appPath } from '@/user/layout/nav';
import { RowIcon } from '@/user/components/learn-ui/ListGroup';
import { NOTIF_TONE, TONE_SOFT } from '@/user/components/learn-ui/tones';

type Tab = 'inbox' | 'reminders' | 'settings';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Lock-screen mock that previews discreet mode (A-08). */
function LockScreen({ discreet }: { discreet: boolean }) {
  return (
    <div className="bg-forest relative overflow-hidden rounded-[28px] p-4 text-white">
      <p className="text-center font-display text-[34px] font-semibold leading-none tracking-tight">9:41</p>
      <p className="mt-1 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-green-200">Lock-screen preview</p>
      <div className="glass-dark mt-4 flex items-start gap-3 rounded-2xl p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/90 text-green-800">
          <Bell className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center justify-between gap-2 text-xs font-bold">
            HealthX <span className="font-normal text-white/60">now</span>
          </p>
          <p className="text-sm">{discreet ? 'You have a new reminder from HealthX' : 'Your estimated period may begin soon.'}</p>
        </div>
      </div>
    </div>
  );
}

/** 24-hour strip with quiet hours shaded and each enabled reminder as a marker. */
function DayTimeline({ reminders, quiet }: { reminders: { id: string; title: string; time: string; type: NotificationType }[]; quiet: NotificationPrefs['quietHours'] }) {
  const pctOf = (t: string) => (toMin(t) / 1440) * 100;
  const bands: [number, number][] = [];
  if (quiet.enabled && quiet.from !== quiet.to) {
    const a = pctOf(quiet.from);
    const b = pctOf(quiet.to);
    if (a < b) bands.push([a, b]);
    else bands.push([a, 100], [0, b]);
  }
  return (
    <div>
      <div className="relative h-14 rounded-2xl bg-gradient-to-r from-indigo-50 via-butter-50 to-indigo-50 ring-1 ring-inset ring-ink-100">
        {bands.map(([a, b]) => (
          <span key={a} className="absolute inset-y-0 rounded-2xl border-x-2 border-dashed border-indigo-300 bg-indigo-100" style={{ left: `${a}%`, width: `${b - a}%` }} aria-hidden />
        ))}
        {reminders.map((r) => (
          <span
            key={r.id}
            title={`${r.title} · ${formatClock(r.time)}`}
            className={cn('absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-soft ring-2 ring-inset', TONE_SOFT[NOTIF_TONE[r.type]])}
            style={{ left: `${Math.min(97, Math.max(3, pctOf(r.time)))}%` }}
          >
            <Icon name={NOTIFICATION_TYPES.find((t) => t.key === r.type)?.icon ?? 'sparkles'} className="h-3.5 w-3.5" />
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-ink-400" aria-hidden>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

export default function Notifications() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('inbox');
  const [type, setType] = useState<NotificationType | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [prefs, setPrefs] = useState<NotificationPrefs>(state.notificationPrefs);
  const [addOpen, setAddOpen] = useState(false);
  const [r, setR] = useState({ title: '', type: 'habit' as NotificationType, time: '09:00', date: '' });
  const [rErr, setRErr] = useState<string | null>(null);
  const [delAll, setDelAll] = useState(false);
  const [perm, setPerm] = useState<string>(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));

  const list = useMemo(
    () => state.notifications.filter((n) => (type === 'all' || n.type === type) && (!unreadOnly || !n.read)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [state.notifications, type, unreadOnly],
  );
  const pg = paginate(list, page, 8);
  const meta = (t: NotificationType) => NOTIFICATION_TYPES.find((x) => x.key === t)!;
  const unread = state.notifications.filter((n) => !n.read).length;
  const saved = state.notificationPrefs;
  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved);
  const schedule = useMemo(() => [...state.reminders].sort((a, b) => toMin(a.time) - toMin(b.time)), [state.reminders]);
  // Next occurrence of each enabled reminder (daily ones that already passed today move to tomorrow).
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const tomorrow = addDays(state.today, 1);
  const next = schedule
    .filter((x) => x.enabled)
    .map((x) => ({ r: x, day: x.date ?? (toMin(x.time) >= nowMin ? state.today : tomorrow) }))
    .filter(({ r, day }) => day > state.today || (day === state.today && toMin(r.time) >= nowMin))
    .sort((p, q) => (p.day + p.r.time).localeCompare(q.day + q.r.time))[0];
  const nextDay = next ? (next.day === state.today ? 'Today' : next.day === tomorrow ? 'Tomorrow' : formatDate(next.day, 'short')) : '';
  const typesOn = NOTIFICATION_TYPES.filter((t) => saved.types[t.key]?.enabled).length;

  // Inbox grouped by day (Today / Yesterday / Earlier).
  const yesterday = lastNDays(state.today, 2)[0];
  const groups = useMemo(() => {
    const out: { label: string; items: AppNotification[] }[] = [];
    for (const n of pg.items) {
      const d = n.createdAt.slice(0, 10);
      const label = d === state.today ? 'Today' : d === yesterday ? 'Yesterday' : 'Earlier';
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(n);
      else out.push({ label, items: [n] });
    }
    return out;
  }, [pg.items, state.today, yesterday]);

  const savePrefs = () => {
    if (prefs.quietHours.enabled && prefs.quietHours.from === prefs.quietHours.to) return toast.error('Quiet hours need different start and end times.');
    dispatch({ type: 'UPDATE_NOTIFICATION_PREFS', prefs });
    toast.success('Notification settings saved');
  };

  const addReminder = () => {
    if (r.title.trim().length < 2 || r.title.trim().length > 60) return setRErr('Give your reminder a name (2–60 characters).');
    if (r.date && r.date < state.today) return setRErr('Choose today or a future date.');
    dispatch({ type: 'ADD_REMINDER', reminder: { title: r.title.trim(), type: r.type, time: r.time, date: r.date || undefined, enabled: true } });
    toast.success('Reminder added');
    setAddOpen(false);
    setR({ title: '', type: 'habit', time: '09:00', date: '' });
    setRErr(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Profile & settings"
        title="Notifications & reminders"
        subtitle="Every notification type is optional — you’re always in control."
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Profile & Settings', to: '/app/profile' }, { label: 'Notifications & reminders' }]}
        actions={
          tab === 'inbox' ? (
            <Button variant="outline" leftIcon={<CheckCheck className="h-4 w-4" />} onClick={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })} disabled={!state.notifications.some((n) => !n.read)}>
              Mark all read
            </Button>
          ) : tab === 'reminders' ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
              New reminder
            </Button>
          ) : undefined
        }
      />

      {/* ---------- Summary hero ---------- */}
      <section className="bg-forest relative mb-7 overflow-hidden rounded-[34px] p-6 text-white shadow-lift sm:p-8">
        <span aria-hidden className="leaf absolute -right-10 -top-12 h-40 w-40 bg-white/5" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="min-w-0">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-green-200">{formatDate(state.today, 'long')}</p>
            <p className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{unread ? `${unread} new update${unread === 1 ? '' : 's'}` : 'Nothing new right now'}</p>
            <p className="mt-1.5 max-w-md text-[15px] text-white/70">Gentle nudges for check-ins, water and movement — on your schedule, quiet when you need rest.</p>
            <div className="mt-5 grid max-w-md grid-cols-3 gap-2">
              {[
                { k: 'Unread', v: unread },
                { k: 'Reminders', v: state.reminders.filter((x) => x.enabled).length },
                { k: 'Types on', v: `${typesOn}/${NOTIFICATION_TYPES.length}` },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl bg-white/[0.08] p-3 ring-1 ring-inset ring-white/10">
                  <p className="num text-2xl leading-none">{s.v}</p>
                  <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-white/60 sm:text-[10px] sm:tracking-[0.12em]">{s.k}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="glass-dark flex items-center gap-3 rounded-3xl p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-green-800">
                {next ? <Icon name={meta(next.r.type).icon} className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-green-200">Next reminder</p>
                <p className="truncate font-semibold">{next ? next.r.title : 'Nothing scheduled'}</p>
              </div>
              {next && (
                <span className="shrink-0 text-right">
                  <span className="num block text-lg leading-tight">{formatClock(next.r.time)}</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">{nextDay}</span>
                </span>
              )}
            </div>
            <button type="button" onClick={() => setTab('settings')} className="glass-dark flex w-full items-center gap-3 rounded-3xl p-4 text-left transition hover:bg-white/10">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Moon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-green-200">Quiet hours</span>
                <span className="block font-semibold">{saved.quietHours.enabled ? `${formatClock(saved.quietHours.from)} – ${formatClock(saved.quietHours.to)}` : 'Off'}</span>
              </span>
              <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">{saved.discreet ? 'Discreet on' : 'Edit'}</span>
            </button>
          </div>
        </div>
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'inbox', label: 'Inbox', count: unread },
          { value: 'reminders', label: 'Reminders', count: state.reminders.length },
          { value: 'settings', label: 'Settings' },
        ]}
      />

      {tab === 'inbox' && (
        <div className="mt-6 space-y-4">
          <Card className="card-pad space-y-4">
            <div role="group" aria-label="Filter by type" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
              <TypeChip selected={type === 'all'} onClick={() => (setType('all'), setPage(1))} icon={<Layers className="h-3.5 w-3.5" />} label="All types" tone="bg-green-50 text-green-700 ring-green-100" />
              {NOTIFICATION_TYPES.map((t) => (
                <TypeChip key={t.key} selected={type === t.key} onClick={() => (setType(t.key), setPage(1))} icon={<Icon name={t.icon} className="h-3.5 w-3.5" />} label={t.label} tone={TONE_SOFT[NOTIF_TONE[t.key]]} />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
              <Switch checked={unreadOnly} onChange={(v) => (setUnreadOnly(v), setPage(1))} label="Unread only" />
              {state.notifications.length > 0 && (
                <button onClick={() => setDelAll(true)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-danger hover:bg-danger-soft">
                  <Trash2 className="h-4 w-4" /> Clear all
                </button>
              )}
            </div>
          </Card>
          <Card className="overflow-hidden">
            {pg.items.length === 0 ? (
              <EmptyState icon={<Inbox className="h-6 w-6" />} title="You’re all caught up" body="New reminders and updates will appear here." />
            ) : (
              groups.map((g) => (
                <section key={g.label} aria-label={g.label}>
                  <p className="border-b border-ink-100 bg-ink-50/60 px-5 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500 sm:px-6">{g.label}</p>
                  <ul className="divide-y divide-ink-100">
                    {g.items.map((n) => {
                      const m = meta(n.type);
                      return (
                        <li key={n.id} className={cn('relative flex items-start gap-3.5 px-5 py-4 sm:gap-4 sm:px-6', !n.read && 'bg-green-50/50')}>
                          {!n.read && <span aria-hidden className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-green-500" />}
                          <RowIcon tone={NOTIF_TONE[n.type]}>
                            <Icon name={m.icon} />
                          </RowIcon>
                          <button
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              dispatch({ type: 'MARK_NOTIFICATION_READ', id: n.id });
                              if (n.to) nav(appPath(n.to));
                            }}
                          >
                            <p className="flex items-center gap-2 font-semibold text-ink-900">
                              {n.title} {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Unread" />}
                            </p>
                            <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{n.body}</p>
                            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
                              {m.label} · {timeAgo(n.createdAt)}
                            </p>
                          </button>
                          <button aria-label="Delete notification" onClick={() => dispatch({ type: 'DELETE_NOTIFICATION', id: n.id })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-danger-soft hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
            <div className="border-t border-ink-100 p-4">
              <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="notifications" />
            </div>
          </Card>
        </div>
      )}

      {tab === 'reminders' && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <Card className="card-pad">
              <CardHeader title="Your day at a glance" subtitle="Reminders on a 24-hour line · quiet hours shaded" icon={<BellRing className="h-5 w-5" />} />
              <DayTimeline reminders={schedule.filter((x) => x.enabled && (!x.date || x.date === state.today))} quiet={saved.quietHours} />
            </Card>
            {schedule.length === 0 ? (
              <Card>
                <EmptyState icon={<BellRing className="h-6 w-6" />} title="No reminders" body="Create gentle nudges for check-ins, water or workouts." action={<Button onClick={() => setAddOpen(true)}>New reminder</Button>} />
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <ol className="divide-y divide-ink-100" aria-label="Reminder schedule">
                  {schedule.map((rm) => {
                    const m = meta(rm.type);
                    const sid = `rm-switch-${rm.id}`;
                    return (
                      <li key={rm.id} className={cn('flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6', !rm.enabled && 'bg-ink-50/50')}>
                        <span className={cn('num hidden w-[92px] shrink-0 whitespace-nowrap text-[20px] leading-none sm:block', rm.enabled ? 'text-ink-900' : 'text-ink-400')}>{formatClock(rm.time)}</span>
                        <RowIcon tone={NOTIF_TONE[rm.type]} className={cn(!rm.enabled && 'opacity-50')}>
                          <Icon name={m.icon} />
                        </RowIcon>
                        <div className="min-w-0 flex-1">
                          <p className={cn('num text-[15px] leading-tight sm:hidden', rm.enabled ? 'text-green-800' : 'text-ink-400')}>{formatClock(rm.time)}</p>
                          <p className={cn('font-semibold', rm.enabled ? 'text-ink-900' : 'text-ink-500')}>{rm.title}</p>
                          <p className="text-sm text-ink-500">
                            {rm.date ? formatDate(rm.date) : 'Every day'} · {m.label}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <label htmlFor={sid} className="sr-only">
                            {rm.title} reminder on
                          </label>
                          <Switch id={sid} checked={rm.enabled} onChange={() => dispatch({ type: 'TOGGLE_REMINDER', id: rm.id })} />
                          <button aria-label={`Delete ${rm.title}`} onClick={() => dispatch({ type: 'DELETE_REMINDER', id: rm.id })} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-400 hover:bg-danger-soft hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            )}
          </div>
          <div className="space-y-5 xl:col-span-4">
            <Card className="card-pad bg-gradient-to-br from-indigo-50 via-white to-lavender-50">
              <div className="flex items-start gap-3">
                <RowIcon tone="indigo">
                  <Moon />
                </RowIcon>
                <div className="min-w-0">
                  <p className="font-display text-[17px] font-semibold text-ink-900">Quiet hours</p>
                  <p className="text-sm text-ink-500">{saved.quietHours.enabled ? `No notifications ${formatClock(saved.quietHours.from)} – ${formatClock(saved.quietHours.to)}.` : 'Off — reminders can arrive at any time.'}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full" leftIcon={<Settings2 className="h-4 w-4" />} onClick={() => setTab('settings')}>
                Edit quiet hours
              </Button>
            </Card>
            <button type="button" onClick={() => setAddOpen(true)} className="flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-green-200 bg-green-50/50 p-5 text-left transition hover:border-green-400 hover:bg-green-50">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
                <Plus className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-[17px] font-semibold text-ink-900">Add a gentle nudge</span>
                <span className="block text-sm text-ink-500">Daily or one-off — choose a time that suits you.</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="overflow-hidden xl:col-span-7">
            <div className="card-pad pb-2 sm:pb-2">
              <CardHeader title="Notification types" subtitle="Turn each on or off and choose a time" className="mb-0" />
            </div>
            <ul className="divide-y divide-ink-100">
              {NOTIFICATION_TYPES.map((t) => {
                const p = prefs.types[t.key];
                const sid = `nt-${t.key}`;
                return (
                  <li key={t.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <RowIcon tone={NOTIF_TONE[t.key]} className={cn(!p.enabled && 'opacity-50')}>
                        <Icon name={t.icon} />
                      </RowIcon>
                      <div className="min-w-0">
                        <label htmlFor={sid} className="font-semibold text-ink-900">
                          {t.label}
                        </label>
                        <p className="text-sm text-ink-500">“{t.example}”</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 pl-[58px] sm:pl-0">
                      <Input type="time" aria-label={`${t.label} time`} value={p.time} disabled={!p.enabled} onChange={(e) => setPrefs({ ...prefs, types: { ...prefs.types, [t.key]: { ...p, time: e.target.value } } })} className="h-10 w-[150px]" />
                      <Switch id={sid} checked={p.enabled} onChange={(v) => setPrefs({ ...prefs, types: { ...prefs.types, [t.key]: { ...p, enabled: v } } })} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <div className="space-y-6 xl:col-span-5">
            <Card className="card-pad space-y-5">
              <div className="flex items-center gap-3">
                <RowIcon tone="lavender">
                  <EyeOff />
                </RowIcon>
                <p className="font-display text-[17px] font-semibold text-ink-900">Privacy on your lock screen</p>
              </div>
              <Switch checked={prefs.discreet} onChange={(v) => setPrefs({ ...prefs, discreet: v })} label="Discreet notifications" description="Show “You have a new reminder from HealthX” on your lock screen instead of details." />
              <LockScreen discreet={prefs.discreet} />
            </Card>
            <Card className="card-pad space-y-5">
              <div className="flex items-center gap-3">
                <RowIcon tone="indigo">
                  <Moon />
                </RowIcon>
                <p className="font-display text-[17px] font-semibold text-ink-900">Rest time</p>
              </div>
              <Switch checked={prefs.quietHours.enabled} onChange={(v) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, enabled: v } })} label="Quiet hours" description="No notifications during these hours." />
              {prefs.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="From" htmlFor="qh-from">
                    <Input id="qh-from" type="time" value={prefs.quietHours.from} onChange={(e) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, from: e.target.value } })} />
                  </Field>
                  <Field label="To" htmlFor="qh-to">
                    <Input id="qh-to" type="time" value={prefs.quietHours.to} onChange={(e) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, to: e.target.value } })} />
                  </Field>
                </div>
              )}
              <div className="space-y-2 border-t border-ink-100 pt-4">
                {dirty && (
                  <Badge tone="warning" className="w-fit">
                    Unsaved changes
                  </Badge>
                )}
                <Button className="w-full" onClick={savePrefs}>
                  Save settings
                </Button>
              </div>
            </Card>
            <Card className="card-pad">
              <CardHeader title="Browser permission" icon={perm === 'granted' ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />} subtitle={perm === 'granted' ? 'Allowed' : perm === 'denied' ? 'Blocked in browser settings' : perm === 'unsupported' ? 'Not supported here' : 'Not yet requested'} />
              {perm === 'denied' ? (
                <Notice tone="info">Notifications are blocked. To enable them, allow notifications for this site in your browser’s settings.</Notice>
              ) : perm !== 'granted' && perm !== 'unsupported' ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await Notification.requestPermission();
                      setPerm(res);
                    } catch {
                      setPerm('unsupported');
                    }
                  }}
                >
                  Allow notifications
                </Button>
              ) : null}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
                <Lock className="h-3.5 w-3.5" /> Push delivery requires the backend; this demo stores your preferences only.
              </p>
            </Card>
          </div>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New reminder"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addReminder}>Add reminder</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" htmlFor="rm-title" error={rErr} required>
            <Input id="rm-title" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} placeholder="e.g. Evening stretch" invalid={!!rErr} />
          </Field>
          <Field label="Type" htmlFor="rm-type">
            <Select id="rm-type" value={r.type} onChange={(e) => setR({ ...r, type: e.target.value as NotificationType })}>
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time" htmlFor="rm-time">
              <Input id="rm-time" type="time" value={r.time} onChange={(e) => setR({ ...r, time: e.target.value })} />
            </Field>
            <Field label="Date" htmlFor="rm-date" hint="Empty = daily">
              <Input id="rm-date" type="date" min={state.today} value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={delAll}
        onClose={() => setDelAll(false)}
        danger
        title="Clear all notifications?"
        body="This removes every notification from your inbox."
        confirmLabel="Clear all"
        onConfirm={() => {
          state.notifications.forEach((n) => dispatch({ type: 'DELETE_NOTIFICATION', id: n.id }));
          toast.success('Inbox cleared');
        }}
      />
    </div>
  );
}

/** Notification type filter chip with a tinted icon disc. */
function TypeChip({ selected, onClick, icon, label, tone }: { selected: boolean; onClick: () => void; icon: ReactNode; label: string; tone: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn('inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-semibold ring-1 ring-inset transition', selected ? 'bg-green-800 text-white ring-green-800' : 'bg-white text-ink-700 ring-ink-100 hover:ring-green-300')}
    >
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset', selected ? 'bg-white/15 text-white ring-white/20' : tone)}>{icon}</span>
      {label}
    </button>
  );
}
