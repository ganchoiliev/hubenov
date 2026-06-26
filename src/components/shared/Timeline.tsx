/**
 * Animated tracking timeline (§7, §9). Single customer-facing timeline; the
 * leg (own/econt) shows underneath each event. Works from either authenticated
 * tracking_events or the public PII-safe payload.
 */
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Circle, AlertTriangle } from 'lucide-react';
import { MAIN_TIMELINE, statusLabel, timelineIndex, isSideStatus } from '@/lib/status';
import { formatDate } from '@/lib/utils';
import type { AnyStatus } from '@/types/domain';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  status: AnyStatus;
  leg: string;
  location: string | null;
  note_bg: string | null;
  note_en: string | null;
  occurred_at: string;
}

export function Timeline({
  current,
  events,
}: {
  current: AnyStatus;
  events: TimelineEvent[];
}) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const currentIdx = timelineIndex(current);
  const side = isSideStatus(current);

  const eventByStatus = new Map<string, TimelineEvent>();
  for (const e of events) eventByStatus.set(e.status, e);

  return (
    <ol className="relative space-y-0">
      {MAIN_TIMELINE.map((status, i) => {
        const done = !side && i < currentIdx;
        const active = !side && i === currentIdx;
        const ev = eventByStatus.get(status);
        const isLast = i === MAIN_TIMELINE.length - 1;

        return (
          <motion.li
            key={status}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {!isLast && (
              <span
                className={cn(
                  'absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5',
                  done ? 'bg-brand' : 'bg-border',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                done && 'border-brand bg-brand text-brand-fg',
                active && 'border-brand bg-brand-50 text-brand-700',
                !done && !active && 'border-border bg-card text-muted-fg',
              )}
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : active ? (
                <motion.span
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="h-2.5 w-2.5 rounded-full bg-brand"
                />
              ) : (
                <Circle className="h-2.5 w-2.5" />
              )}
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  active ? 'text-brand-700' : done ? 'text-foreground' : 'text-muted-fg',
                )}
              >
                {statusLabel(status, locale)}
              </p>
              {ev && (
                <p className="mt-0.5 text-xs text-muted-fg">
                  {(locale === 'bg' ? ev.note_bg : ev.note_en) || ''}
                  {ev.location ? ` · ${ev.location}` : ''}
                  {' · '}
                  {formatDate(ev.occurred_at, locale === 'bg' ? 'bg-BG' : 'en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>
          </motion.li>
        );
      })}

      {side && (
        <li className="relative flex items-center gap-4 rounded-xl bg-danger/10 p-3">
          <AlertTriangle className="h-5 w-5 text-danger" />
          <span className="text-sm font-semibold text-danger">{statusLabel(current, locale)}</span>
        </li>
      )}
    </ol>
  );
}
