import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Truck, Plus, Calendar, User, Hash, X } from 'lucide-react';
import { Button, Card, CardBody, Badge, Select, Field, Skeleton } from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useLoads } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import type { Direction, LoadStatus } from '@/types/domain';

const STATUS_TONE: Record<LoadStatus, 'info' | 'warning' | 'brand' | 'neutral'> = {
  open: 'info',
  departed: 'warning',
  arrived: 'brand',
  closed: 'neutral',
};

/** Next Friday at 14:00 local time (today counts if it is Friday before 14:00). */
function nextFriday1400(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(14, 0, 0, 0);
  const FRIDAY = 5;
  let add = (FRIDAY - d.getDay() + 7) % 7;
  if (add === 0 && from.getTime() > d.getTime()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function LoadsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const L =
    locale === 'en-GB'
      ? {
          newLoad: 'New load',
          direction: 'Direction',
          create: 'Create load',
          departs: 'Departs',
          cutoff: 'Booking cutoff',
          created: 'Load created',
          empty: 'No loads scheduled yet.',
          emptyDesc: 'Create a load to start grouping shipments for the next departure.',
          status: {
            open: 'Open',
            departed: 'Departed',
            arrived: 'Arrived',
            closed: 'Closed',
          } as Record<LoadStatus, string>,
        }
      : {
          newLoad: 'Нов курс',
          direction: 'Посока',
          create: 'Създай курс',
          departs: 'Тръгва',
          cutoff: 'Краен срок за заявки',
          created: 'Курсът е създаден',
          empty: 'Все още няма планирани курсове.',
          emptyDesc: 'Създайте курс, за да групирате пратки за следващото тръгване.',
          status: {
            open: 'Отворен',
            departed: 'Тръгнал',
            arrived: 'Пристигнал',
            closed: 'Затворен',
          } as Record<LoadStatus, string>,
        };

  const toast = useToast();
  const qc = useQueryClient();
  const { data: loads, isLoading } = useLoads();

  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>('UK_BG');
  const [saving, setSaving] = useState(false);

  const dirLabel = (d: Direction) => (d === 'UK_BG' ? 'UK→BG' : 'BG→UK');

  const createLoad = async () => {
    setSaving(true);
    try {
      const departure = nextFriday1400();
      const cutoff = new Date(departure.getTime() - 24 * 60 * 60 * 1000);
      const { error } = await supabase.from('loads').insert({
        code: `LD-${ymd(departure)}`,
        direction,
        status: 'open',
        scheduled_departure: departure.toISOString(),
        booking_cutoff: cutoff.toISOString(),
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['loads'] });
      toast.success(L.created);
      setOpen(false);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title={t('operator.loads')}
        action={
          <Button className="gap-2" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {t('operator.create_load')}
          </Button>
        }
      />

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mb-6"
        >
          <Card>
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label={L.direction} htmlFor="load-direction">
                  <Select
                    id="load-direction"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as Direction)}
                  >
                    <option value="UK_BG">UK→BG</option>
                    <option value="BG_UK">BG→UK</option>
                  </Select>
                </Field>
              </div>
              <Button className="gap-2" loading={saving} onClick={() => void createLoad()}>
                <Plus className="h-4 w-4" /> {L.create}
              </Button>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (loads ?? []).length === 0 ? (
        <EmptyState
          title={L.empty}
          description={L.emptyDesc}
          icon={<Truck className="h-7 w-7" />}
          action={
            <Button className="gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {L.newLoad}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {(loads ?? []).map((load, i) => (
            <motion.div
              key={load.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.18 }}
            >
              <Link to={`/op/loads/${load.id}`}>
                <Card className="transition-shadow hover:shadow-lift">
                  <CardBody className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground">
                          <Hash className="h-3.5 w-3.5 text-muted-fg" />
                          {load.code}
                        </span>
                        <Badge tone="neutral">{dirLabel(load.direction)}</Badge>
                        <Badge tone={STATUS_TONE[load.status]}>{L.status[load.status]}</Badge>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-fg">
                        <Calendar className="h-3.5 w-3.5" />
                        {L.departs}:{' '}
                        {formatDate(load.scheduled_departure, locale, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {(load.vehicle_reg || load.driver_name) && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-fg">
                          {load.vehicle_reg && (
                            <span className="flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5" />
                              {load.vehicle_reg}
                            </span>
                          )}
                          {load.driver_name && (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              {load.driver_name}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
