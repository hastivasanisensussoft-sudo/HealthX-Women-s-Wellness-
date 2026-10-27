import { forwardRef, useId, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import { palette } from '@healthx/shared';
import { cn } from '@/lib/utils';

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leftIcon?: ReactNode; rightSlot?: ReactNode };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, leftIcon, rightSlot, ...rest }, ref) {
  if (!leftIcon && !rightSlot) return <input ref={ref} className={cn('input', invalid && 'input-error', className)} aria-invalid={invalid || undefined} {...rest} />;
  return (
    <div className="relative">
      {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">{leftIcon}</span>}
      <input ref={ref} className={cn('input', leftIcon && 'pl-10', rightSlot && 'pr-11', invalid && 'input-error', className)} aria-invalid={invalid || undefined} {...rest} />
      {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn('input h-auto min-h-[96px] py-3', invalid && 'input-error', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn('input appearance-none pr-10', invalid && 'input-error', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
    </div>
  );
});

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  const auto = useId();
  const sid = id ?? auto;
  const control = (
    <button
      id={sid}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-green-700' : 'bg-ink-200',
      )}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
  if (!label) return control;
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={sid} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-500">{description}</span>}
      </label>
      {control}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-sm text-ink-700', disabled && 'cursor-not-allowed opacity-60')}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-ink-300 accent-green-700"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

const ACCENTS: Record<string, string> = {
  'accent-green-600': 'rgb(var(--c-green-600))',
  'accent-peach-500': palette.peach[500],
  'accent-lavender-500': palette.lavender[500],
  'accent-sky-500': palette.sky[500],
  'accent-rose-500': palette.rose[500],
  'accent-indigo-500': palette.indigo[500],
};

/** 1–10 rating slider (energy, stress — D-28). */
export function RatingSlider({
  value,
  onChange,
  min = 1,
  max = 10,
  label,
  accent = 'accent-green-600',
  lowLabel,
  highLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  accent?: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-semibold text-ink-700">
          {label}
        </label>
        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-sm font-bold text-ink-800">
          {value}/{max}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range w-full"
        style={{ '--c': ACCENTS[accent] ?? ACCENTS['accent-green-600'], '--p': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      />
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between text-xs text-ink-400">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-full bg-green-50 p-1 ring-1 ring-inset ring-green-100', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full font-semibold transition',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            value === o.value ? 'bg-white text-green-800 shadow-soft' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white p-1">
      <button type="button" aria-label="Decrease" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink-100 disabled:opacity-40" disabled={value <= min} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[56px] text-center text-sm font-bold text-ink-900">
        {value}
        {suffix && <span className="ml-0.5 font-medium text-ink-500">{suffix}</span>}
      </span>
      <button type="button" aria-label="Increase" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink-100 disabled:opacity-40" disabled={value >= max} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ChipToggle({ selected, onClick, children, tone = 'green', icon }: { selected: boolean; onClick: () => void; children: ReactNode; tone?: 'green' | 'rose' | 'lavender' | 'peach' | 'sky'; icon?: ReactNode }) {
  const on = {
    green: 'border-green-500 bg-green-50 text-green-800',
    rose: 'border-rose-400 bg-rose-50 text-rose-700',
    lavender: 'border-lavender-400 bg-lavender-50 text-lavender-700',
    peach: 'border-peach-400 bg-peach-50 text-peach-700',
    sky: 'border-sky-400 bg-sky-50 text-sky-700',
  }[tone];
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={cn('chip', selected ? on : 'border-ink-200 bg-white text-ink-700 hover:border-green-300 hover:bg-green-50/40')}>
      {icon}
      {children}
      {selected && !icon && <Check className="-mr-0.5 h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}
