import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Package, ArrowRight, Filter, Trash2 } from 'lucide-react';
import { Button, Card, CardBody, Input, Select, Skeleton, Badge } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { useUpdateStatus, useDeleteShipment } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { STATUS_META, nextStatuses, statusLabel } from '@/lib/status';
import type { AnyStatus, Shipment } from '@/types/domain';

const ALL_STATUSES = Object.keys(STATUS_META) as AnyStatus[];

const COPY = {
  bg: {
    subtitle: 'Управление на всички пратки',
    search_placeholder: 'Търси по номер, баркод или получател…',
    filter_all: 'Всички статуси',
    none: 'Няма пратки за този филтър.',
    apply: 'Приложи',
    other: 'Друго…',
    no_next: 'Няма промяна',
    updated: 'Статусът е обновен',
    count: 'пратки',
    del: 'Изтрий пратка',
    delTitle: 'Изтриване на пратка',
    delBody: 'Пратка {code} и историята ѝ ще бъдат изтрити безвъзвратно. Свързана фактура остава (без връзка). Действието е необратимо.',
    delConfirm: 'Изтрий',
    cancel: 'Отказ',
    deleted: 'Пратката е изтрита',
    delErr: 'Неуспешно изтриване',
  },
  en: {
    subtitle: 'Manage all shipments',
    search_placeholder: 'Search by code, barcode or receiver…',
    filter_all: 'All statuses',
    none: 'No shipments match this filter.',
    apply: 'Apply',
    other: 'Other…',
    no_next: 'No change',
    updated: 'Status updated',
    count: 'shipments',
    del: 'Delete parcel',
    delTitle: 'Delete parcel',
    delBody: 'Parcel {code} and its tracking history will be permanently deleted. Any linked invoice stays (unlinked). This cannot be undone.',
    delConfirm: 'Delete',
    cancel: 'Cancel',
    deleted: 'Parcel deleted',
    delErr: 'Could not delete',
  },
} as const;

/**
 * Per-row status control. One click advances to the happy-path next status; the
 * exceptions (side states) sit in an auto-applying dropdown. Stateless re: the
 * target — it's derived from the live `shipment.status` each render, so after the
 * list refetches the control shows the *new* next step (no stale selection, no
 * manual refresh).
 */
function StatusChanger({
  shipment,
  locale,
  otherLabel,
  noNextLabel,
  errorLabel,
}: {
  shipment: Shipment;
  locale: 'bg' | 'en';
  otherLabel: string;
  noNextLabel: string;
  errorLabel: string;
}) {
  const toast = useToast();
  const update = useUpdateStatus();
  const options = nextStatuses(shipment.status);

  if (options.length === 0) {
    return <span className="text-xs text-muted-fg">{noNextLabel}</span>;
  }

  const apply = async (to: AnyStatus) => {
    try {
      await update.mutateAsync({ shipment, to, source: 'manual' });
      toast.success(`${shipment.public_code} · ${statusLabel(to, locale)}`);
    } catch {
      toast.error(errorLabel);
    }
  };

  const next = options[0]!; // safe: guarded by options.length === 0 above
  const alternatives = options.slice(1);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        loading={update.isPending}
        disabled={update.isPending}
        onClick={() => void apply(next)}
        className="shrink-0 gap-1.5"
      >
        <ArrowRight className="h-4 w-4" /> {statusLabel(next, locale)}
      </Button>
      {alternatives.length > 0 && (
        <Select
          aria-label="other status"
          value=""
          onChange={(e) => {
            const v = e.target.value as AnyStatus;
            if (v) void apply(v);
          }}
          className="h-9 w-32 py-1.5 text-xs"
          disabled={update.isPending}
        >
          <option value="">{otherLabel}</option>
          {alternatives.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, locale)}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

export function OpShipmentsPage() {
  const { t, i18n } = useTranslation();
  const locale: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const L = COPY[locale];

  const toast = useToast();
  const confirm = useConfirm();
  const del = useDeleteShipment();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AnyStatus | 'all'>('all');

  const onDelete = async (s: Shipment) => {
    const ok = await confirm({
      title: L.delTitle,
      body: L.delBody.replace('{code}', s.public_code),
      confirmLabel: L.delConfirm,
      cancelLabel: L.cancel,
      danger: true,
    });
    if (!ok) return;
    try {
      await del.mutateAsync(s.id);
      toast.success(L.deleted);
    } catch {
      toast.error(L.delErr);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['op-shipments'],
    queryFn: async (): Promise<Shipment[]> => {
      const { data: rows, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (rows ?? []) as unknown as Shipment[];
    },
  });

  const filtered = useMemo(() => {
    const shipments = data ?? [];
    const q = query.trim().toLowerCase();
    return shipments.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.public_code.toLowerCase().includes(q) ||
        s.awb_barcode.toLowerCase().includes(q) ||
        s.receiver.name.toLowerCase().includes(q)
      );
    });
  }, [data, query, statusFilter]);

  return (
    <div>
      <PageHeading title={t('operator.shipments')} subtitle={L.subtitle} />

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L.search_placeholder}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AnyStatus | 'all')}
            className="pl-9"
            aria-label={t('common.status')}
          >
            <option value="all">{L.filter_all}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s, locale)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={(data ?? []).length === 0 ? t('portal.no_shipments') : L.none}
          icon={<Package className="h-7 w-7" />}
        />
      ) : (
        <>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-fg">
            {filtered.length} {L.count}
          </p>
          <Stagger className="space-y-2">
            {filtered.map((s) => (
              <StaggerItem key={s.id}>
                <Card className="transition-shadow hover:shadow-lift">
                  <CardBody className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-4">
                    {/* Identity */}
                    <div className="flex items-center gap-2 lg:w-48 lg:shrink-0">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {s.public_code}
                      </span>
                      <Badge tone="neutral">{s.direction === 'UK_BG' ? 'UK→BG' : 'BG→UK'}</Badge>
                    </div>

                    {/* Receiver + weight */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {s.receiver.name}
                        <span className="text-muted-fg"> · {s.receiver.city}</span>
                      </p>
                      <p className="text-xs text-muted-fg">
                        {s.weight_kg} {t('common.kg')}
                      </p>
                    </div>

                    {/* Current status */}
                    <div className="flex items-center gap-2 lg:w-44 lg:shrink-0">
                      <StatusBadge status={s.status} />
                      <ArrowRight className="hidden h-3.5 w-3.5 text-muted-fg lg:block" />
                    </div>

                    {/* Manual status control */}
                    <div className="lg:shrink-0">
                      <StatusChanger
                        shipment={s}
                        locale={locale}
                        otherLabel={L.other}
                        noNextLabel={L.no_next}
                        errorLabel={t('common.error')}
                      />
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => void onDelete(s)}
                      title={L.del}
                      aria-label={L.del}
                      className="shrink-0 self-start rounded-lg p-2 text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger lg:self-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardBody>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </div>
  );
}
