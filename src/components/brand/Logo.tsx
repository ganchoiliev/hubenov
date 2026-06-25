import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-display font-extrabold', className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill="hsl(var(--brand))" />
        <path
          d="M14 24l18-9 18 9v16l-18 9-18-9V24z"
          fill="#fff"
          fillOpacity="0.08"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M14 24l18 9 18-9M32 33v16" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="32" cy="15" r="3.5" fill="hsl(var(--accent))" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block text-base tracking-tight text-foreground">{t('brand.name')}</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-fg">
            UK ⇄ BG
          </span>
        </span>
      )}
    </span>
  );
}
