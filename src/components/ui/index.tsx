/**
 * UI kit — small, composable primitives shared by every surface (§9).
 * rounded-2xl cards, subtle shadows, AA contrast, focus-visible rings.
 */
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Button ─────────────────────────────────────────────────────────────── */
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-600 shadow-soft',
  secondary: 'bg-muted text-foreground hover:bg-muted/70',
  outline: 'border border-input bg-transparent hover:bg-muted',
  ghost: 'bg-transparent hover:bg-muted',
  danger: 'bg-danger text-white hover:opacity-90',
};
const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

/* ── Card ───────────────────────────────────────────────────────────────── */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-border bg-card text-card-fg shadow-soft', className)}
      {...props}
    />
  );
}
export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pb-0', className)} {...props} />;
}

/* ── Input / Textarea / Select ──────────────────────────────────────────── */
const fieldCls =
  'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm shadow-sm ' +
  'placeholder:text-muted-fg transition-colors focus-visible:ring-2 focus-visible:ring-ring ' +
  'focus-visible:border-brand disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldCls, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldCls, 'min-h-[88px]', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldCls, 'pr-8', className)} {...props} />
  ),
);
Select.displayName = 'Select';

/* ── Switch (accessible toggle) ─────────────────────────────────────────── */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn('inline-flex items-center gap-2.5', disabled ? 'opacity-50' : 'cursor-pointer')}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          checked ? 'bg-brand' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      {label != null && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}

/* ── Field (label + error wrapper) ──────────────────────────────────────── */
export function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-fg">{hint}</p>}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────────────────────── */
type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
const TONE: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-fg',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-amber-700 dark:text-amber-300',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  accent: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
};
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Spinner / Skeleton ─────────────────────────────────────────────────── */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand', className)} />;
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}
