import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base, sizes, variants, type Size, type Variant } from './buttonStyles';

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
