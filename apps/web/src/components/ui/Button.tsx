import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'butter' | 'rose' | 'danger' | 'white' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.005em] transition duration-200 active:scale-[.97] disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
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

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-7 text-base',
  icon: 'h-11 w-11',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  leftIcon,
  rightIcon,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; leftIcon?: ReactNode; rightIcon?: ReactNode }) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-600 transition hover:bg-green-50 hover:text-green-800', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
