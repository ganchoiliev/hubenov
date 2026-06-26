/** Small shared display helpers used across surfaces. */
import type { ReactNode } from 'react';
import { m as motion } from 'framer-motion';
import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-fg">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-fg">
        {icon ?? <PackageOpen className="h-7 w-7" />}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-fg">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Section({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('container py-16 md:py-24', className)}>{children}</section>;
}

/** Full-bleed photo hero with dark scrim + readable white text. Background image
 *  degrades to a gradient if the file isn't present yet. */
export function ImageHero({
  image,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  image: string;
  eyebrow?: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950"
        style={{ backgroundImage: `url('${image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/55 via-slate-950/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-background to-transparent" />
      <div className="container py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl rounded-3xl bg-slate-950/55 p-6 ring-1 ring-white/10 backdrop-blur-md sm:p-8"
        >
          {eyebrow && <div className="mb-4">{eyebrow}</div>}
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-5xl">
            {title}
          </h1>
          {subtitle && <p className="mt-4 text-lg text-white/85">{subtitle}</p>}
          {children}
        </motion.div>
      </div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-fg">{hint}</p>}
    </div>
  );
}
