import { useEffect, useState } from 'react';
import { BatteryMedium, Brain, Check, ChevronDown, HeartPulse, Plus, Sparkle, Thermometer, Utensils, type LucideIcon } from 'lucide-react';
import { CUSTOM_SYMPTOM_ICONS, formatDate, SEVERITIES, SYMPTOM_CATEGORIES, type ISODate, type Severity, type SymptomCategory } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { Button, Field, Input, Modal, Segmented, Textarea, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { DateQuickPick, SeverityDots } from './cycle-ui/Pickers';

type Selection = Record<string, Severity>;

const CAT_STYLE: Record<SymptomCategory, { icon: LucideIcon; panel: string; disc: string; on: string; head: string }> = {
  physical: { icon: HeartPulse, panel: 'bg-rose-50/70 ring-rose-100', disc: 'bg-rose-100 text-rose-600', on: 'border-rose-400 bg-rose-100/80 text-rose-700', head: 'text-rose-700' },
  digestive: { icon: Utensils, panel: 'bg-butter-50 ring-butter-100', disc: 'bg-butter-100 text-butter-600', on: 'border-butter-400 bg-butter-100 text-green-950', head: 'text-green-900' },
  skin: { icon: Sparkle, panel: 'bg-sky-50/80 ring-sky-100', disc: 'bg-sky-100 text-sky-600', on: 'border-sky-400 bg-sky-100/80 text-sky-700', head: 'text-sky-700' },
  emotional: { icon: Brain, panel: 'bg-lavender-50 ring-lavender-100', disc: 'bg-lavender-100 text-lavender-600', on: 'border-lavender-400 bg-lavender-100/80 text-lavender-700', head: 'text-lavender-700' },
  energy: { icon: BatteryMedium, panel: 'bg-peach-50 ring-peach-100', disc: 'bg-peach-100 text-peach-600', on: 'border-peach-400 bg-peach-100/80 text-peach-700', head: 'text-peach-700' },
  life_stage: { icon: Thermometer, panel: 'bg-green-50 ring-green-100', disc: 'bg-green-100 text-green-700', on: 'border-green-500 bg-green-100 text-green-800', head: 'text-green-800' },
};

/** Flexible symptom framework (SRS §14) incl. custom symptoms (§15): Myflo-style chip grids by category. */
export function SymptomPicker({ value, onChange, categories }: { value: Selection; onChange: (v: Selection) => void; categories?: SymptomCategory[] }) {
  const { symptomDefs } = useAppState();
  const groups = SYMPTOM_CATEGORIES.filter((c) => !categories || categories.includes(c.key))
    .map((cat) => ({ cat, items: symptomDefs.filter((s) => s.category === cat.key) }))
    .filter((g) => g.items.length > 0);
  // Big categories take a full row; if the half-width panels don't pair up, the last one widens too.
  const wide = groups.map((g) => g.items.length > 5);
  const halves = groups.map((_, i) => i).filter((i) => !wide[i]);
  if (halves.length % 2 === 1) wide[halves[halves.length - 1]] = true;
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      {groups.map(({ cat, items }, gi) => {
        const st = CAT_STYLE[cat.key];
        const count = items.filter((s) => s.id in value).length;
        return (
          <div key={cat.key} className={cn('rounded-3xl p-3.5 ring-1 ring-inset', st.panel, wide[gi] && 'sm:col-span-2')}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-xs', st.head)}>
                <st.icon className="h-3.5 w-3.5" />
              </span>
              <p className={cn('font-mono text-[11px] font-medium uppercase tracking-[0.14em]', st.head)}>{cat.label}</p>
              {count > 0 && <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink-700 shadow-xs">{count} selected</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((s) => {
                const on = s.id in value;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = { ...value };
                      if (on) delete next[s.id];
                      else next[s.id] = s.defaultSeverity ?? 'mild';
                      onChange(next);
                    }}
                    className={cn('inline-flex min-h-[44px] items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-semibold transition', on ? st.on : 'border-white bg-white text-ink-700 shadow-xs hover:border-ink-200')}
                  >
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', on ? 'bg-white' : st.disc)}>
                      {on ? <Check className="h-4 w-4" aria-hidden /> : <Icon name={s.icon} className="h-4 w-4" />}
                    </span>
                    {s.label}
                    {s.custom && <span className="rounded-full bg-ink-900/5 px-1.5 text-[10px] font-bold uppercase tracking-wide opacity-70">custom</span>}
                    {on && <SeverityDots severity={value[s.id]} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** "How strong is it?" — one row per selected symptom. */
export function SeverityList({ value, onChange }: { value: Selection; onChange: (v: Selection) => void }) {
  const { symptomDefs } = useAppState();
  const ids = Object.keys(value);
  if (!ids.length) return null;
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-inset ring-ink-100">
      <p className="eyebrow mb-3">How strong is it?</p>
      <ul className="space-y-2.5">
        {ids.map((id) => {
          const def = symptomDefs.find((s) => s.id === id);
          const label = def?.label ?? 'Symptom';
          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ink-50/70 py-2 pl-2 pr-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', def ? CAT_STYLE[def.category].disc : 'bg-ink-100 text-ink-500')}>
                  <Icon name={def?.icon ?? 'sparkles'} className="h-4 w-4" />
                </span>
                <span className="truncate text-sm font-semibold text-ink-800">{label}</span>
                <SeverityDots severity={value[id]} />
              </span>
              <div role="group" aria-label={`${label} severity`}>
                <Segmented size="sm" value={value[id]} onChange={(sev) => onChange({ ...value, [id]: sev })} options={SEVERITIES.map((s) => ({ value: s.key, label: s.label }))} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AddCustomSymptom({ onAdded }: { onAdded?: (id: string) => void }) {
  const { symptomDefs } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<SymptomCategory>('physical');
  const [severity, setSeverity] = useState<Severity>('moderate');
  const [icon, setIcon] = useState(CUSTOM_SYMPTOM_ICONS[0]);
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const name = label.trim();
    if (name.length < 2 || name.length > 40) return setError('Use 2–40 characters.');
    if (symptomDefs.some((s) => s.label.toLowerCase() === name.toLowerCase())) return setError('That symptom already exists.');
    dispatch({ type: 'ADD_CUSTOM_SYMPTOM', label: name, category, icon, defaultSeverity: severity });
    setLabel('');
    setError(null);
    toast.success('Custom symptom created', `${name} will appear in your symptom list from now on.`);
    onAdded?.(name);
  };
  const st = CAT_STYLE[category];
  const stepLabel = (n: number, text: string) => (
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-800">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white font-mono text-[11px] text-green-800 ring-1 ring-green-200">{n}</span>
      {text}
    </p>
  );
  return (
    <div className="space-y-5 rounded-3xl border-2 border-dashed border-green-200 bg-green-50/40 p-4 sm:p-5">
      <div>
        <p className="eyebrow">Custom symptom</p>
        <p className="mt-1 font-display text-lg font-semibold text-ink-900">Track something specific to you</p>
      </div>
      <div>
        {stepLabel(1, 'Name it')}
        <Input value={label} onChange={(e) => (setLabel(e.target.value), error && setError(null))} placeholder="Symptom name, e.g. Migraine" invalid={!!error} aria-label="Custom symptom name" maxLength={40} onKeyDown={(e) => e.key === 'Enter' && add()} />
        {error ? (
          <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
            {error}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-ink-400">{label.trim().length}/40 characters</p>
        )}
      </div>
      <div>
        {stepLabel(2, 'Choose a category')}
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
          {SYMPTOM_CATEGORIES.map((c) => {
            const on = category === c.key;
            const cs = CAT_STYLE[c.key];
            return (
              <button key={c.key} type="button" aria-pressed={on} onClick={() => setCategory(c.key)} className={cn('chip min-h-[40px]', on ? cs.on : 'border-ink-200 bg-white text-ink-700 hover:border-green-300')}>
                <cs.icon className="h-3.5 w-3.5" aria-hidden />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          {stepLabel(3, 'Usual severity')}
          <Segmented size="sm" value={severity} onChange={setSeverity} options={SEVERITIES.map((x) => ({ value: x.key, label: x.label }))} />
        </div>
        <div>
          {stepLabel(4, 'Pick an icon')}
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
            {CUSTOM_SYMPTOM_ICONS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={icon === k}
                aria-label={k.replace('-', ' ')}
                onClick={() => setIcon(k)}
                className={cn('flex h-11 w-11 items-center justify-center rounded-full transition', icon === k ? 'bg-green-700 text-white ring-4 ring-green-100' : 'bg-white text-green-800 ring-1 ring-inset ring-green-100 hover:bg-green-100')}
              >
                <Icon name={k} className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-inset ring-green-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">Preview</span>
          <span className={cn('inline-flex min-w-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold', st.on)}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
              <Icon name={icon} className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">{label.trim() || 'Your symptom'}</span>
            <SeverityDots severity={severity} />
          </span>
        </div>
        <Button size="sm" onClick={add} leftIcon={<Plus className="h-4 w-4" />} className="h-10 shrink-0">
          Create symptom
        </Button>
      </div>
    </div>
  );
}

export function LogSymptomsModal({ open, onClose, date }: { open: boolean; onClose: () => void; date: ISODate }) {
  const { today, symptomLogs } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const [sel, setSel] = useState<Selection>({});
  const [notes, setNotes] = useState('');
  const [d, setD] = useState(date);
  const [customOpen, setCustomOpen] = useState(false);
  useEffect(() => {
    if (open) {
      const existing: Selection = {};
      symptomLogs.filter((l) => l.date === date).forEach((l) => (existing[l.symptomId] = l.severity));
      setSel(existing);
      setNotes('');
      setD(date);
      setCustomOpen(false);
    }
  }, [open, date, symptomLogs]);
  const save = () => {
    if (d > today) return toast.error("Symptoms can't be logged in the future.");
    const entries = Object.entries(sel).map(([symptomId, severity]) => ({ symptomId, severity }));
    if (!entries.length) return toast.error('Choose at least one symptom.');
    dispatch({ type: 'LOG_SYMPTOMS', date: d, entries, notes: notes || undefined });
    toast.success('Symptoms saved', `${entries.length} for ${formatDate(d, 'short')}`);
    onClose();
  };
  const n = Object.keys(sel).length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log symptoms"
      description="Choose what you’re noticing and how strong it feels."
      size="lg"
      footer={
        <>
          <span className="mr-auto self-center text-sm text-ink-500">{n ? `${n} selected` : 'Nothing selected yet'}</span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save symptoms</Button>
        </>
      }
    >
      <div className="space-y-5">
        <DateQuickPick id="ls-date" value={d} onChange={setD} today={today} />
        <SymptomPicker value={sel} onChange={setSel} />
        <SeverityList value={sel} onChange={setSel} />
        <div>
          <button type="button" aria-expanded={customOpen} onClick={() => setCustomOpen((o) => !o)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-1 text-sm font-semibold text-green-700 hover:text-green-900">
            <Plus className="h-4 w-4" /> Add a custom symptom
            <ChevronDown className={cn('h-4 w-4 transition', customOpen && 'rotate-180')} />
          </button>
          {customOpen && (
            <div className="mt-2">
              <AddCustomSymptom />
            </div>
          )}
        </div>
        <Field label="Notes (optional)" htmlFor="ls-notes">
          <Textarea id="ls-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="min-h-[72px]" placeholder="Anything that might help you spot a pattern later…" />
        </Field>
      </div>
    </Modal>
  );
}
