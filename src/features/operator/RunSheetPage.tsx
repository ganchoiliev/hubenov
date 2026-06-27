/**
 * Mobile run-sheet for a load — big tap targets to advance each parcel on the
 * road (hand to Econt / delivered / exception). Operator + driver use it.
 */
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, AlertTriangle, Check, Truck } from 'lucide-react';
import { Button, Card, CardBody, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useUpdateStatus } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { nextStatuses, statusLabel } from '@/lib/status';
import { formatDate } from '@/lib/utils';
import type { AnyStatus, Shipment } from '@/types/domain';

interface LoadRow {
  code: string;
  direction: string;
  status: string;
  scheduled_departure: string;
}

export function RunSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { i18n, t } = useTranslation();
  const lang: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const locale = lang === 'en' ? 'en-GB' : 'bg-BG';

  const L =
    lang === 'bg'
      ? { title: 'Маршрутен лист', back: 'Курсове', empty: 'Няма пратки в този курс', delivered: 'доставени', done: 'Готово' }
      : { title: 'Run-sheet', back: 'Loads', empty: 'No parcels on this load', delivered: 'delivered', done: 'Done' };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['run-sheet', id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: load }, { data: ships }] = await Promise.all([
        supabase.from('loads').select('code, direction, status, scheduled_departure').eq('id', id as string).maybeSingle(),
        supabase.from('shipments').select('*').eq('load_id', id as string).order('public_code', { ascending: true }),
      ]);
      return { load: (load as unknown as LoadRow | null) ?? null, ships: (ships ?? []) as unknown as Shipment[] };
    },
  });

  const ships = data?.ships ?? [];
  const deliveredCount = ships.filter((s) => s.status === 'delivered').length;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/op/loads" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-fg hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {L.back}
      </Link>
      <PageHeading
        title={`${L.title}${data?.load ? ` · ${data.load.code}` : ''}`}
        subtitle={
          data?.load
            ? `${data.load.direction === 'UK_BG' ? 'UK→BG' : 'BG→UK'} · ${formatDate(data.load.scheduled_departure, locale, { day: 'numeric', month: 'short' })} · ${deliveredCount}/${ships.length} ${L.delivered}`
            : undefined
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : ships.length === 0 ? (
        <EmptyState title={L.empty} icon={<Truck className="h-7 w-7" />} />
      ) : (
        <div className="space-y-2.5">
          {ships.map((s) => (
            <RunRow key={s.id} shipment={s} lang={lang} doneLabel={L.done} errLabel={t('common.error')} onChanged={() => void refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({
  shipment,
  lang,
  doneLabel,
  errLabel,
  onChanged,
}: {
  shipment: Shipment;
  lang: 'bg' | 'en';
  doneLabel: string;
  errLabel: string;
  onChanged: () => void;
}) {
  const toast = useToast();
  const update = useUpdateStatus();
  const options = nextStatuses(shipment.status);
  const next = options.find((o) => o !== 'exception' && o !== 'returned' && o !== 'cancelled') ?? options[0];
  const canException = options.includes('exception');

  const apply = async (to: AnyStatus) => {
    try {
      await update.mutateAsync({ shipment, to, source: 'manual' });
      toast.success(`${shipment.public_code} · ${statusLabel(to, lang)}`);
      onChanged();
    } catch {
      toast.error(errLabel);
    }
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-foreground">{shipment.public_code}</p>
            <p className="truncate text-sm text-muted-fg">
              {shipment.receiver.name} · {shipment.receiver.city}
            </p>
          </div>
          <StatusBadge status={shipment.status} />
        </div>

        <div className="flex gap-2">
          {next ? (
            <Button
              loading={update.isPending}
              disabled={update.isPending}
              onClick={() => void apply(next)}
              className="h-12 flex-1 gap-2 text-base"
            >
              <ArrowRight className="h-5 w-5" /> {statusLabel(next, lang)}
            </Button>
          ) : (
            <span className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-success/10 text-sm font-semibold text-success">
              <Check className="h-5 w-5" /> {doneLabel}
            </span>
          )}
          {canException && (
            <Button
              variant="outline"
              disabled={update.isPending}
              onClick={() => void apply('exception')}
              className="h-12 shrink-0 gap-1.5 px-3 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
              aria-label={statusLabel('exception', lang)}
            >
              <AlertTriangle className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
