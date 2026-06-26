/** Next-Friday departure countdown + booking cut-off (§7). */
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { Truck, Clock } from 'lucide-react';
import { useDepartureCountdown } from '@/hooks/useCountdown';
import { formatDate } from '@/lib/utils';

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.span
        key={value}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="font-display text-3xl font-extrabold tabular-nums text-foreground md:text-4xl"
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-fg">{label}</span>
    </div>
  );
}

export function DepartureCountdown() {
  const { t, i18n } = useTranslation();
  const { countdown, departure, bookingOpen, bookingCutoff } = useDepartureCountdown();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';

  return (
    <div className="rounded-2xl border border-brand/20 bg-brand-50/60 p-5 shadow-soft dark:bg-brand-50/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
        <Truck className="h-4.5 w-4.5" />
        {t('home.next_departure')}
        <span className="ml-auto text-xs font-medium text-muted-fg">
          {formatDate(departure, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Cell value={countdown.days} label={t('home.days')} />
        <span className="text-2xl font-bold text-muted-fg">:</span>
        <Cell value={countdown.hours} label={t('home.hours')} />
        <span className="text-2xl font-bold text-muted-fg">:</span>
        <Cell value={countdown.minutes} label={t('home.minutes')} />
        <span className="text-2xl font-bold text-muted-fg">:</span>
        <Cell value={countdown.seconds} label={t('home.seconds')} />
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-brand/15 pt-3 text-xs text-muted-fg">
        <Clock className="h-3.5 w-3.5" />
        {t('home.booking_until')}:{' '}
        <span className={bookingOpen ? 'font-semibold text-foreground' : 'font-semibold text-danger'}>
          {formatDate(bookingCutoff, locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
