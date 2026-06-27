import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Package, ArrowRight, Filter, Trash2, Printer, X, Download } from 'lucide-react';
import { Button, Card, CardBody, Input, Select, Skeleton, Badge } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { useUpdateStatus, useDeleteShipment, useLoads, useBulkAssignLoad, useBulkDeleteShipments } from '@/lib/queries';
import { buildCsv, downloadCsv } from '@/lib/csv';
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
    selected: 'избрани',
    exportCsv: 'Експорт CSV',
    selectAll: 'Избери всички',
    addToLoad: 'Добави в курс…',
    setStatus: 'Промени статус…',
    printLabels: 'Етикети',
    deleteSel: 'Изтрий',
    clear: 'Изчисти',
    assigned: 'Добавени в курса: {n}',
    statusBody: 'Промяна на статус на {n} пратки на „{s}"?',
    statusApplied: 'Обновени: {n}',
    bulkDelTitle: 'Изтриване на пратки',
    bulkDelBody: 'Ще се изтрият {n} пратки безвъзвратно. Действието не може да се отмени.',
    deletedN: 'Изтрити: {n}',
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
    selected: 'selected',
    exportCsv: 'Export CSV',
    selectAll: 'Select all',
    addToLoad: 'Add to load…',
    setStatus: 'Set status…',
    printLabels: 'Labels',
    deleteSel: 'Delete',
    clear: 'Clear',
    assigned: 'Added to load: {n}',
    statusBody: 'Set status of {n} parcel(s) to “{s}”?',
    statusApplied: 'Updated: {n}',
    bulkDelTitle: 'Delete parcels',
    bulkDelBody: '{n} parcel(s) will be permanently deleted. This cannot be undone.',
    deletedN: 'Deleted: {n}',
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
          aria-label={otherLabel}
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

  // ── Bulk selection (van prep) ──────────────────────────────────────────────
  const loads = useLoads();
  const bulkAssign = useBulkAssignLoad();
  const bulkDelete = useBulkDeleteShipments();
  const bulkStatus = useUpdateStatus();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSel = () => setSelected(new Set());

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

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (filtered.every((s) => prev.has(s.id))) filtered.forEach((s) => next.delete(s.id));
      else filtered.forEach((s) => next.add(s.id));
      return next;
    });
  const selectedShipments = () => (data ?? []).filter((s) => selected.has(s.id));

  const doAssign = async (loadId: string) => {
    const ids = [...selected];
    if (!ids.length || !loadId) return;
    try {
      await bulkAssign.mutateAsync({ ids, loadId });
      toast.success(L.assigned.replace('{n}', String(ids.length)));
      clearSel();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const doStatus = async (to: AnyStatus) => {
    const ships = selectedShipments();
    if (!ships.length) return;
    const ok = await confirm({
      title: L.setStatus,
      body: L.statusBody.replace('{n}', String(ships.length)).replace('{s}', statusLabel(to, locale)),
      confirmLabel: L.apply,
      cancelLabel: L.cancel,
    });
    if (!ok) return;
    let okCount = 0;
    for (const s of ships) {
      try {
        await bulkStatus.mutateAsync({ shipment: s, to, source: 'manual' });
        okCount++;
      } catch {
        /* skip parcels whose state changed underneath us */
      }
    }
    toast.success(L.statusApplied.replace('{n}', String(okCount)));
    clearSel();
  };

  const doPrint = async () => {
    const ships = selectedShipments();
    if (!ships.length) return;
    setPrinting(true);
    try {
      const ids = [...new Set(ships.map((s) => s.client_id))];
      const { data: profs } = await supabase.from('profiles').select('id, client_code').in('id', ids);
      const map = Object.fromEntries(((profs ?? []) as { id: string; client_code: string }[]).map((p) => [p.id, p.client_code]));
      const { buildLabelsPack, downloadBytes } = await import('@/lib/dispatchPack');
      downloadBytes(await buildLabelsPack(ships, map), `labels-${ships.length}.pdf`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPrinting(false);
    }
  };

  const doDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirm({
      title: L.bulkDelTitle,
      body: L.bulkDelBody.replace('{n}', String(ids.length)),
      confirmLabel: L.delConfirm,
      cancelLabel: L.cancel,
      danger: true,
    });
    if (!ok) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast.success(L.deletedN.replace('{n}', String(ids.length)));
      clearSel();
    } catch {
      toast.error(L.delErr);
    }
  };

  const onExport = () => {
    const csv = buildCsv(filtered, [
      { label: 'Code', get: (s) => s.public_code },
      { label: 'Direction', get: (s) => s.direction },
      { label: 'Status', get: (s) => s.status },
      { label: 'Receiver', get: (s) => s.receiver.name },
      { label: 'City', get: (s) => s.receiver.city },
      { label: 'Weight kg', get: (s) => s.weight_kg },
      { label: 'Price', get: (s) => s.price ?? '' },
      { label: 'Currency', get: (s) => s.currency },
      { label: 'Created', get: (s) => s.created_at.slice(0, 10) },
    ]);
    downloadCsv(`shipments-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

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
        <Button variant="outline" onClick={onExport} disabled={filtered.length === 0} className="gap-2 sm:shrink-0">
          <Download className="h-4 w-4" /> {L.exportCsv}
        </Button>
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
          <div className="mb-3 flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-border accent-brand"
              aria-label={L.selectAll}
            />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-fg">
              {filtered.length} {L.count}
            </span>
          </div>
          <Stagger className="space-y-2">
            {filtered.map((s) => (
              <StaggerItem key={s.id}>
                <Card className={`transition-shadow hover:shadow-lift ${selected.has(s.id) ? 'ring-2 ring-brand/40' : ''}`}>
                  <CardBody className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-4">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="h-4 w-4 shrink-0 self-start rounded border-border accent-brand lg:self-auto"
                      aria-label={`select ${s.public_code}`}
                    />
                    {/* Info area → open the parcel detail (track + edit there) */}
                    <Link
                      to={`/op/shipments/${s.id}`}
                      className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4"
                    >
                      {/* Identity */}
                      <div className="flex items-center gap-2 lg:w-48 lg:shrink-0">
                        <span className="font-mono text-sm font-semibold text-foreground">{s.public_code}</span>
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
                    </Link>

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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-lift lg:left-[calc(16rem+1rem)]">
          <span className="px-1 text-sm font-semibold text-foreground">
            {selected.size} {L.selected}
          </span>
          <Select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) void doAssign(v);
            }}
            className="h-9 w-40 text-xs"
            aria-label={L.addToLoad}
            disabled={bulkAssign.isPending}
          >
            <option value="">{L.addToLoad}</option>
            {(loads.data ?? [])
              .filter((l) => l.status !== 'closed')
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code}
                </option>
              ))}
          </Select>
          <Select
            value=""
            onChange={(e) => {
              const v = e.target.value as AnyStatus | '';
              if (v) void doStatus(v);
            }}
            className="h-9 w-40 text-xs"
            aria-label={L.setStatus}
          >
            <option value="">{L.setStatus}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s, locale)}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" loading={printing} onClick={() => void doPrint()} className="gap-1.5">
            <Printer className="h-4 w-4" /> {L.printLabels}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void doDelete()}
            className="gap-1.5 text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" /> {L.deleteSel}
          </Button>
          <button
            onClick={clearSel}
            className="ml-auto rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-muted hover:text-foreground"
            aria-label={L.clear}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
