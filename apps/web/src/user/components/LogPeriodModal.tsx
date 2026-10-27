import { useEffect, useState, type ReactNode } from 'react';
import { CalendarClock, CalendarHeart, Droplet } from 'lucide-react';
import { addDays, diffDays, FLOWS, formatDate, PERIOD_SYMPTOM_IDS, validatePeriodRange, type Flow } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { Button, ChipToggle, Field, Input, Modal, Notice, Textarea, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { FlowChip } from './cycle-ui/Pickers';

function ModeCard({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: ReactNode; title: string; sub: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn('flex min-h-[64px] items-center gap-3 rounded-2xl p-3 text-left transition', on ? 'bg-rose-50 ring-2 ring-rose-400' : 'bg-white ring-1 ring-inset ring-ink-200 hover:ring-rose-200')}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', on ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-500')}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-xs text-ink-500">{sub}</span>
      </span>
    </button>
  );
}

const pill = (on: boolean) => cn('inline-flex h-10 items-center rounded-full px-3.5 text-sm font-semibold transition', on ? 'bg-rose-500 text-white shadow-rose' : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-rose-300');

/** Period logging (SRS §13): start, flow, period symptoms, notes. */
export function LogPeriodModal({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate?: string }) {
  const { today, periods, symptomDefs } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const ongoing = periods.find((p) => p.end === null);
  const [mode, setMode] = useState<'start' | 'past'>('start');
  const [start, setStart] = useState(defaultDate ?? today);
  const [end, setEnd] = useState('');
  const [flow, setFlow] = useState<Flow>('medium');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(defaultDate && defaultDate !== today ? 'past' : 'start');
      setStart(defaultDate ?? today);
      setEnd(defaultDate ? addDays(defaultDate, 4) <= today ? addDays(defaultDate, 4) : '' : '');
      setFlow('medium');
      setSymptoms([]);
      setNotes('');
      setError(null);
    }
  }, [open, defaultDate, today]);

  const save = () => {
    const s = mode === 'start' ? today : start;
    const e = mode === 'start' ? null : end || null;
    const err = validatePeriodRange(s, e, periods, today);
    if (err) return setError(err);
    if (notes.length > 500) return setError('Notes can be up to 500 characters.');
    if (mode === 'start') dispatch({ type: 'START_PERIOD', date: s, flow });
    else dispatch({ type: 'ADD_PERIOD', start: s, end: e, flow, notes: notes || undefined });
    if (symptoms.length) dispatch({ type: 'LOG_SYMPTOMS', date: s, entries: symptoms.map((id) => ({ symptomId: id, severity: 'moderate' })) });
    toast.success('Period logged', 'Your cycle estimates have been updated.');
    onClose();
  };

  const startChips = [1, 2, 3, 7].map((n) => ({ d: addDays(today, -n), label: n === 1 ? 'Yesterday' : n === 7 ? 'A week ago' : `${n} days ago` }));
  const lengthChips = [3, 4, 5, 6, 7].filter((n) => addDays(start, n - 1) <= today);
  const curLen = end && end >= start ? diffDays(start, end) + 1 : null;
  const summary = mode === 'start' ? `Day 1 · ${formatDate(today, 'long')}` : `${formatDate(start, 'medium')}${end ? ` → ${formatDate(end, 'medium')}` : ' · still going'}${curLen ? ` · ${curLen} day${curLen === 1 ? '' : 's'}` : ''}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log your period"
      description="Flow and symptoms are optional — log what’s helpful."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="rose" onClick={save} leftIcon={<Droplet className="h-4 w-4" />}>
            Save period
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 via-rose-50 to-white p-4 ring-1 ring-inset ring-rose-100">
          <span aria-hidden className="leaf absolute -right-3 -top-3 h-16 w-16 bg-white/70" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-rose-700">{mode === 'start' ? 'Starting today' : 'Past period'}</p>
          <p className="relative mt-1 font-display text-lg font-semibold text-ink-900" aria-live="polite">
            {summary}
          </p>
          <p className="relative mt-0.5 text-xs text-ink-500">Your estimates* update as soon as you save.</p>
        </div>

        {ongoing && (
          <Notice tone="info" title="Period in progress">
            Started {formatDate(ongoing.start, 'medium')}.{' '}
            <button
              className="font-semibold underline"
              onClick={() => {
                dispatch({ type: 'END_PERIOD', id: ongoing.id, date: today });
                toast.success('Period marked as ended');
                onClose();
              }}
            >
              End it today
            </button>
          </Notice>
        )}

        <div role="radiogroup" aria-label="When did it start?" className="grid gap-2 sm:grid-cols-2">
          <ModeCard on={mode === 'start'} onClick={() => setMode('start')} icon={<CalendarHeart className="h-5 w-5" />} title="Started today" sub={formatDate(today, 'long')} />
          <ModeCard on={mode === 'past'} onClick={() => setMode('past')} icon={<CalendarClock className="h-5 w-5" />} title="Log a past period" sub="Pick the start and end days" />
        </div>

        {mode === 'past' && (
          <div className="space-y-4 rounded-3xl bg-ink-50/70 p-4">
            <div>
              <p className="label">When did it start?</p>
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {startChips.map((c) => (
                  <button key={c.d} type="button" aria-pressed={start === c.d} onClick={() => (setStart(c.d), setEnd(addDays(c.d, 4) <= today ? addDays(c.d, 4) : ''))} className={pill(start === c.d)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {lengthChips.length > 0 && (
              <div>
                <p className="label">How long did it last?</p>
                <div className="flex flex-wrap gap-1.5">
                  {lengthChips.map((n) => (
                    <button key={n} type="button" aria-pressed={curLen === n} onClick={() => setEnd(addDays(start, n - 1))} className={pill(curLen === n)}>
                      {n} days
                    </button>
                  ))}
                  <button type="button" aria-pressed={!end} onClick={() => setEnd('')} className={pill(!end)}>
                    Still going
                  </button>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date" htmlFor="lp-start" required>
                <Input id="lp-start" type="date" max={today} value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="End date" htmlFor="lp-end" hint="Leave empty if it’s still going">
                <Input id="lp-end" type="date" max={today} min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        <div>
          <p className="label">Flow</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {FLOWS.map((f) => (
              <FlowChip key={f.key} flow={f.key} label={f.label} drops={f.drops} selected={flow === f.key} onClick={() => setFlow(f.key)} />
            ))}
          </div>
        </div>
        <div>
          <p className="label">
            Symptoms <span className="font-normal text-ink-400">(optional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PERIOD_SYMPTOM_IDS.map((id) => {
              const def = symptomDefs.find((s) => s.id === id);
              if (!def) return null;
              const on = symptoms.includes(id);
              return (
                <ChipToggle key={id} tone="rose" selected={on} onClick={() => setSymptoms(on ? symptoms.filter((x) => x !== id) : [...symptoms, id])} icon={<Icon name={def.icon} className="h-3.5 w-3.5" />}>
                  {def.label}
                </ChipToggle>
              );
            })}
          </div>
        </div>
        {mode === 'past' && (
          <Field label="Notes" htmlFor="lp-notes" hint={`${notes.length}/500`}>
            <Textarea id="lp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you’d like to remember…" />
          </Field>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
