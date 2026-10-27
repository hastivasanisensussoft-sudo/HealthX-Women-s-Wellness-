import { useEffect, useState } from 'react';
import { WORKOUT_CATEGORIES, type WorkoutCategory } from '@healthx/shared';
import { useAppState, useDispatch } from '@/store/AppStore';
import { Button, Field, Input, Modal, Stepper, useToast } from '@/components/ui';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';

const QUICK_MIN = [15, 30, 45, 60];

/** Log a workout done outside the app (SRS §26). */
export function LogWorkoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { today } = useAppState();
  const dispatch = useDispatch();
  const toast = useToast();
  const [category, setCategory] = useState<WorkoutCategory>('walking');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCategory('walking');
      setTitle('');
      setDuration(30);
      setDate(today);
      setError(null);
    }
  }, [open, today]);

  const save = () => {
    if (!date) return setError('Choose the day you worked out.');
    if (date > today) return setError("A workout can't be logged in the future.");
    if (duration < 1 || duration > 300) return setError('Duration must be between 1 and 300 minutes.');
    const label = WORKOUT_CATEGORIES.find((c) => c.key === category)!.label;
    dispatch({ type: 'LOG_WORKOUT', session: { title: title.trim() || label, category, durationMin: duration, date, status: 'completed' } });
    toast.success('Workout logged', `${title.trim() || label} · ${duration} min`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a workout"
      description="Add movement you did outside the app — every bit counts."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save workout</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p id="lw-cat-label" className="label">
            Type
          </p>
          <div role="radiogroup" aria-labelledby="lw-cat-label" className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {WORKOUT_CATEGORIES.map((c) => {
              const on = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCategory(c.key)}
                  className={cn('flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2 text-center text-[12px] font-semibold ring-1 ring-inset transition sm:text-[13px]', on ? 'bg-green-700 text-white ring-green-700' : 'bg-white text-ink-700 ring-ink-200 hover:bg-green-50 hover:ring-green-300')}
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', on ? 'bg-white/15' : 'bg-green-50 text-green-700')}>
                    <Icon name={c.icon} className="h-4 w-4" />
                  </span>
                  <span className="max-w-full truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Name (optional)" htmlFor="lw-title">
          <Input id="lw-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Evening yoga class" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Duration</p>
            <Stepper value={duration} onChange={setDuration} min={5} max={300} step={5} suffix="min" />
          </div>
          <Field label="Date" htmlFor="lw-date">
            <Input id="lw-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="-mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">Quick</span>
          {QUICK_MIN.map((m) => (
            <button key={m} type="button" aria-pressed={duration === m} onClick={() => setDuration(m)} className={cn('chip min-h-[36px] px-3 py-1 text-xs', duration === m ? 'border-green-500 bg-green-50 text-green-800' : 'border-ink-200 bg-white text-ink-600 hover:border-green-300')}>
              {m} min
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
