import { useMemo, useState } from 'react';
import { Activity, Archive, CalendarDays, Plus, Trash2 } from 'lucide-react';
import { addDays, COPY, diffDays, formatDate, lastNDays, SEVERITIES, SYMPTOM_CATEGORIES, symptomFrequency, type ISODate, type Severity, type SymptomCategory } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { AddCustomSymptom, SeverityList, SymptomPicker } from '@/user/components/SymptomLogger';
import { HeroPanel } from '@/user/components/cycle-ui/Hero';
import { DateQuickPick, SeverityDots } from '@/user/components/cycle-ui/Pickers';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Notice, PageHeader, Pagination, RouteTabs, Segmented, Skeleton, Textarea, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn, paginate, useDemoLoading } from '@/lib/utils';
import { SYMPTOM_TABS } from '@/user/layout/sectionTabs';

type Section = 'log' | 'history' | 'mine';

const CAT_DOT: Record<SymptomCategory, string> = {
  physical: 'bg-rose-400',
  digestive: 'bg-butter-400',
  skin: 'bg-sky-400',
  emotional: 'bg-lavender-400',
  energy: 'bg-peach-400',
  life_stage: 'bg-green-500',
};
const CAT_DISC: Record<SymptomCategory, string> = {
  physical: 'bg-rose-50 text-rose-600',
  digestive: 'bg-butter-100 text-butter-600',
  skin: 'bg-sky-50 text-sky-600',
  emotional: 'bg-lavender-50 text-lavender-600',
  energy: 'bg-peach-50 text-peach-600',
  life_stage: 'bg-green-50 text-green-700',
};

/** Symptom tracking (SRS §14 flexible framework, §15 custom symptoms). */
export default function Symptoms() {
  const state = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const loading = useDemoLoading();
  const { today } = state;
  const [section, setSection] = useState<Section>('log');
  const [date, setDate] = useState(today);
  const [sel, setSel] = useState<Record<string, Severity>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<SymptomCategory | 'all'>('all');
  const [page, setPage] = useState(1);
  const [delId, setDelId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const defs = useMemo(() => new Map(state.symptomDefs.map((d) => [d.id, d])), [state.symptomDefs]);
  const freq = useMemo(() => symptomFrequency(state, 90).slice(0, 6), [state]);
  const week = useMemo(
    () =>
      lastNDays(today, 7).map((d) => ({
        date: d,
        label: formatDate(d, 'weekday'),
        count: state.symptomLogs.filter((l) => l.date === d).length,
      })),
    [state.symptomLogs, today],
  );
  const maxWeek = Math.max(1, ...week.map((w) => w.count));
  const days14 = lastNDays(today, 14);
  const logsOn = (d: ISODate) => state.symptomLogs.filter((l) => l.date === d);
  const todayCount = logsOn(today).length;
  const dateLogs = logsOn(date);

  const save = () => {
    if (date > today) return setError("You can't log symptoms for a future date.");
    const entries = Object.entries(sel).map(([symptomId, severity]) => ({ symptomId, severity }));
    if (!entries.length) return setError('Choose at least one symptom.');
    if (notes.length > 300) return setError('Notes can be up to 300 characters.');
    setError(null);
    dispatch({ type: 'LOG_SYMPTOMS', date, entries, notes: notes || undefined });
    toast.success('Symptoms saved', `${entries.length} for ${formatDate(date, 'short')}`);
    setSel({});
    setNotes('');
  };

  const logs = useMemo(
    () =>
      state.symptomLogs
        .filter((l) => cat === 'all' || defs.get(l.symptomId)?.category === cat)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((l) => ({ ...l, def: defs.get(l.symptomId) })),
    [state.symptomLogs, defs, cat],
  );
  const pg = paginate(logs, page, 10);
  const groups = pg.items.reduce<{ date: ISODate; items: typeof pg.items }[]>((acc, l) => {
    const g = acc.find((x) => x.date === l.date);
    if (g) g.items.push(l);
    else acc.push({ date: l.date, items: [l] });
    return acc;
  }, []);
  const customs = state.symptomDefs.filter((s) => s.custom);
  const n = Object.keys(sel).length;

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Symptom tracking"
          subtitle="Log what you notice — physical, digestive, skin, emotional and your own custom symptoms."
          breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Symptoms & Mood', to: '/app/symptoms' }, { label: 'Symptom tracking' }]}
        />
        <RouteTabs tabs={SYMPTOM_TABS} label="Symptoms & mood pages" className="mb-0" />
      </div>

      <HeroPanel tone="blush" label="Your last two weeks">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="min-w-0">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-rose-700">Today · {formatDate(today, 'medium')}</p>
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[36px]">{todayCount ? `${todayCount} symptom${todayCount === 1 ? '' : 's'} logged today` : 'How’s your body feeling?'}</h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-600">Tap a day to log or review it. Patterns become clearer over a few cycles.</p>
            {freq.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="self-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">Most often</span>
                {freq.slice(0, 3).map((f) => (
                  <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 shadow-xs">
                    <Icon name={defs.get(f.id)?.icon ?? 'sparkles'} className="h-3.5 w-3.5 text-rose-500" /> {f.label} · {f.count}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-3xl bg-white/85 p-3 shadow-soft ring-1 ring-inset ring-white backdrop-blur sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">Last 14 days</p>
              <p className="text-xs text-ink-400">Dots = symptoms logged</p>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {days14.map((d) => {
                const ls = logsOn(d);
                const isSel = section === 'log' && d === date;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={isSel}
                    aria-label={`${formatDate(d, 'long')}: ${ls.length ? `${ls.length} symptom${ls.length === 1 ? '' : 's'} logged` : 'nothing logged'}`}
                    onClick={() => (setDate(d), setSection('log'), setError(null))}
                    className={cn('flex min-h-[64px] flex-col items-center justify-start gap-1 rounded-2xl px-0.5 py-2 transition', isSel ? 'bg-green-800 text-white shadow-soft' : 'hover:bg-green-50')}
                  >
                    <span className={cn('font-mono text-[9.5px] uppercase tracking-[0.08em]', isSel ? 'text-white/75' : 'text-ink-400')}>{formatDate(d, 'weekday').slice(0, 2)}</span>
                    <span className={cn('num text-[16px] leading-none', !isSel && (d === today ? 'text-green-700 underline decoration-2 underline-offset-4' : 'text-ink-800'))}>{Number(d.slice(8))}</span>
                    <span className="flex h-2 items-center gap-[3px]" aria-hidden>
                      {ls.slice(0, 3).map((l) => {
                        const c = defs.get(l.symptomId)?.category;
                        return <span key={l.id} className={cn('h-1.5 w-1.5 rounded-full', isSel ? 'bg-white' : c ? CAT_DOT[c] : 'bg-ink-300')} />;
                      })}
                      {ls.length > 3 && <span className={cn('text-[9px] font-bold leading-none', isSel ? 'text-white' : 'text-ink-500')}>+</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-ink-100 pt-2">
              {SYMPTOM_CATEGORIES.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500">
                  <span className={cn('h-1.5 w-1.5 rounded-full', CAT_DOT[c.key])} /> {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </HeroPanel>

      <Segmented
        className="w-full sm:w-auto [&>button]:min-h-[44px] [&>button]:flex-auto [&>button]:px-2.5 [&>button]:text-[13px] [&>button]:leading-tight sm:[&>button]:text-sm sm:[&>button]:flex-none sm:[&>button]:whitespace-nowrap sm:[&>button]:px-5"
        value={section}
        onChange={setSection}
        options={[
          { value: 'log', label: 'Log symptoms' },
          { value: 'history', label: `History (${state.symptomLogs.length})` },
          { value: 'mine', label: `My symptoms (${customs.length})` },
        ]}
      />

      {section === 'log' && (
        <div className="grid items-start gap-6 xl:grid-cols-12">
          <Card className="overflow-hidden xl:col-span-8">
            <div className="card-pad space-y-6">
              <DateQuickPick id="sy-date" value={date} onChange={(d) => (setDate(d), setError(null))} today={today} />
              {dateLogs.length > 0 && (
                <div className="rounded-2xl bg-ink-50/70 p-3">
                  <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">Already logged for {diffDays(date, today) === 0 ? 'today' : formatDate(date, 'short')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dateLogs.map((l) => (
                      <Badge key={l.id} tone="gray" icon={<Icon name={defs.get(l.symptomId)?.icon ?? 'sparkles'} className="h-3 w-3" />}>
                        {defs.get(l.symptomId)?.label ?? 'Archived symptom'} · {l.severity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="label">What are you noticing?</p>
                <SymptomPicker value={sel} onChange={(v) => (setSel(v), setError(null))} />
              </div>
              <SeverityList value={sel} onChange={setSel} />
              <Field label="Notes (optional)" htmlFor="sy-notes" hint={`${notes.length}/300`}>
                <Textarea id="sy-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything that might help you spot a pattern later…" />
              </Field>
            </div>
            <div className="space-y-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4 sm:px-6">
              {error && (
                <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                  {error}
                </p>
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-500">{n ? `${n} selected for ${formatDate(date, 'short')}` : 'Nothing selected yet'}</p>
                <Button size="lg" onClick={save} className="w-full sm:w-auto">
                  Save symptoms
                </Button>
              </div>
            </div>
          </Card>
          <div className="min-w-0 space-y-6 xl:col-span-4">
            <Card className="card-pad">
              <CardHeader title="Most logged symptoms" subtitle="Last 90 days" />
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : freq.length ? (
                <ul className="space-y-2.5">
                  {freq.map((f) => {
                    const def = defs.get(f.id);
                    return (
                      <li key={f.id} className="flex items-center gap-3">
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', def ? CAT_DISC[def.category] : 'bg-ink-100 text-ink-500')}>
                          <Icon name={def?.icon ?? 'sparkles'} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between text-sm">
                            <span className="truncate font-semibold text-ink-800">{f.label}</span>
                            <span className="font-mono text-xs text-ink-500">{f.count}×</span>
                          </span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                            <span className={cn('block h-full rounded-full', def ? CAT_DOT[def.category] : 'bg-ink-300')} style={{ width: `${(f.count / freq[0].count) * 100}%` }} />
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState compact icon={<Activity className="h-5 w-5" />} title="No symptoms yet" body="What you log will be summarised here." />
              )}
            </Card>
            <Card className="card-pad">
              <CardHeader title="This week" subtitle="Symptom entries per day" />
              <div className="flex items-end justify-between gap-2" role="img" aria-label={`Symptom entries, last 7 days: ${week.map((w) => `${w.label} ${w.count}`).join(', ')}`}>
                {week.map((w) => (
                  <div key={w.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono text-[11px] text-ink-500">{w.count}</span>
                    <span className="flex h-24 w-full max-w-[30px] items-end overflow-hidden rounded-full bg-rose-50">
                      <span className={cn('w-full rounded-full transition-[height] duration-500', w.date === today ? 'bg-rose-400' : 'bg-rose-200')} style={{ height: `${(w.count / maxWeek) * 100}%` }} />
                    </span>
                    <span className={cn('text-[11px] font-semibold', w.date === today ? 'text-rose-700' : 'text-ink-500')}>{w.label}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Notice tone="safety" title="Listen to your body">
              {COPY.concern} {COPY.emergency}
            </Notice>
          </div>
        </div>
      )}

      {section === 'history' && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-[19px] font-semibold text-ink-900">Symptom history</h2>
                <p className="text-sm text-ink-500">{logs.length} entries</p>
              </div>
            </div>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
              {[{ key: 'all' as const, label: 'All' }, ...SYMPTOM_CATEGORIES].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={cat === c.key}
                  onClick={() => (setCat(c.key), setPage(1))}
                  className={cn('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition', cat === c.key ? 'bg-green-800 text-white' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:ring-green-300')}
                >
                  {c.key !== 'all' && <span className={cn('h-2 w-2 rounded-full', CAT_DOT[c.key])} aria-hidden />}
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="space-y-2 px-6 pb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : pg.items.length === 0 ? (
            <EmptyState icon={<Activity className="h-6 w-6" />} title="No symptoms in this category" body="Try another filter or log a symptom." action={<Button size="sm" variant="outline" onClick={() => setSection('log')}>Log symptoms</Button>} />
          ) : (
            <div className="space-y-5 px-5 pb-2 sm:px-6">
              {groups.map((g) => (
                <section key={g.date}>
                  <h3 className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(g.date, 'long')}
                    {g.date === today ? ' · today' : g.date === addDays(today, -1) ? ' · yesterday' : ''}
                  </h3>
                  <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-inset ring-ink-100">
                    {g.items.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', l.def ? CAT_DISC[l.def.category] : 'bg-ink-100 text-ink-500')}>
                          <Icon name={l.def?.icon ?? 'sparkles'} className="h-[18px] w-[18px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                            {l.def?.label ?? 'Archived symptom'}
                            <Badge tone={l.severity === 'severe' ? 'rose' : l.severity === 'moderate' ? 'peach' : 'gray'} icon={<SeverityDots severity={l.severity} />}>
                              {SEVERITIES.find((s) => s.key === l.severity)?.label ?? l.severity}
                            </Badge>
                          </p>
                          {l.notes && <p className="truncate text-sm text-ink-500">{l.notes}</p>}
                        </div>
                        <button aria-label="Delete entry" onClick={() => setDelId(l.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-danger-soft hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-ink-100 p-4">
            <Pagination page={pg.page} pages={pg.pages} onChange={setPage} total={pg.total} label="entries" />
          </div>
        </Card>
      )}

      {section === 'mine' && (
        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="min-w-0 space-y-6 xl:col-span-7">
            <AddCustomSymptom />
            <Card className="card-pad">
              <CardHeader title="Your custom symptoms" subtitle="Track anything specific to you (SRS §15)" icon={<Plus className="h-5 w-5" />} />
              {customs.length === 0 ? (
                <EmptyState compact icon={<Plus className="h-5 w-5" />} title="No custom symptoms" body="Create one above — e.g. “Migraine”." />
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {customs.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-ink-50/70 p-2.5">
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', CAT_DISC[s.category])}>
                        <Icon name={s.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink-800">{s.label}</span>
                        <span className="block text-xs capitalize text-ink-500">
                          {s.category.replace('_', ' ')}
                          {s.defaultSeverity ? ` · usually ${s.defaultSeverity}` : ''}
                        </span>
                      </span>
                      <button onClick={() => setArchiveId(s.id)} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-ink-600 hover:bg-white">
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card className="card-pad xl:col-span-5">
            <CardHeader title="Symptom catalogue" subtitle="Built-in symptoms by category (SRS §14). New items can be added by the HealthX team without an app update." />
            <div className="space-y-4">
              {SYMPTOM_CATEGORIES.map((c) => (
                <div key={c.key}>
                  <p className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500">
                    <span className={cn('h-2 w-2 rounded-full', CAT_DOT[c.key])} /> {c.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {state.symptomDefs
                      .filter((s) => s.category === c.key && !s.custom)
                      .map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-[13px] font-medium text-ink-700 ring-1 ring-inset ring-ink-100">
                          <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', CAT_DISC[c.key])}>
                            <Icon name={s.icon} className="h-3 w-3" />
                          </span>
                          {s.label}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        danger
        title="Delete this entry?"
        body="This symptom entry will be removed from your history."
        confirmLabel="Delete"
        onConfirm={() => {
          if (delId) dispatch({ type: 'REMOVE_SYMPTOM_LOG', id: delId });
          toast.success('Entry deleted');
        }}
      />
      <ConfirmDialog
        open={!!archiveId}
        onClose={() => setArchiveId(null)}
        title="Archive custom symptom?"
        body="It will no longer appear in pickers. Past entries stay in your history."
        confirmLabel="Archive"
        onConfirm={() => {
          if (archiveId) dispatch({ type: 'ARCHIVE_CUSTOM_SYMPTOM', id: archiveId });
          toast.success('Symptom archived');
        }}
      />
    </div>
  );
}
