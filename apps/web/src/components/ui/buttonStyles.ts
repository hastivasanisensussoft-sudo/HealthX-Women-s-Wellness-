/** Button class names, shared by the Button components and plain anchors that look like buttons. */
import { cn } from '@/lib/utils';

export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'butter' | 'rose' | 'danger' | 'white' | 'dark';
export type Size = 'sm' | 'md' | 'lg' | 'icon';

export const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.005em] transition duration-200 active:scale-[.97] disabled:pointer-events-none disabled:opacity-50';

export const variants: Record<Variant, string> = {
  primary: 'bg-green-700 text-white shadow-[0_10px_24px_-12px_rgb(var(--c-green-700)/0.75)] hover:-translate-y-px hover:bg-green-800',
  secondary: 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-200/70 hover:bg-green-100',
  outline: 'border border-ink-200 bg-white text-ink-800 hover:border-green-400 hover:text-green-800',
  ghost: 'text-ink-700 hover:bg-ink-100',
  butter: 'bg-butter-300 text-green-950 shadow-[0_10px_24px_-12px_rgba(227,172,31,.9)] hover:-translate-y-px hover:bg-butter-400',
  rose: 'bg-rose-500 text-white shadow-rose hover:-translate-y-px hover:bg-rose-600',
  danger: 'bg-danger text-white hover:bg-red-700',
  white: 'bg-white text-green-900 shadow-soft hover:bg-green-50',
  dark: 'bg-green-950 text-white hover:-translate-y-px hover:bg-green-900',
};

export const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-7 text-base',
  icon: 'h-11 w-11',
};

/** Button styling for plain anchors (external or app links that a router Link can't handle). */
export const buttonClasses = (variant: Variant = 'primary', size: Size = 'md') => cn(base, variants[variant], sizes[size]);
