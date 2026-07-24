import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Package, ArrowRight, Filter, Trash2, Printer, X, Download, ListChecks, ShoppingBag, Clock, Store, AlertTriangle } from 'lucide-react';
import { Button, Card, CardBody, Input, Skeleton, Badge } from '@/components/ui';
import { Dropdown } from '@/components/ui/Dropdown';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { OnlineBadge } from '@/components/shared/OnlineBadge';
import { getParcelOrigin } from '@/lib/parcelOrigin';
import { OFFICES, officeLabel } from '@/lib/offices';
import { formatDateTime, cn } from '@/lib/utils';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { useUpdateStatus, useDeleteShipment, useLoads, useBulkAssignLoad, useBulkDeleteShipments } from '@/lib/queries';
import { buildCsv, downloadCsv } from '@/lib/csv';
import { supabase } from '@/lib/supabase';
import { OPERATOR_STATUSES, OPERATOR_SETTABLE_STATUSES, COURSE_DRIVEN, nextStatuses, statusLabel, isTerminal } from '@/lib/status';
import type { AnyStatus, Shipment } from '@/types/domain';
import { SIDE_STATUSES } from '@/types/domain';

const ALL_STATUSES = OPERATOR_STATUSES;

const COPY = {
  bg: {
    subtitle: 'Управление на всички пратки',
    search_placeholder: 'Търси по номер, баркод или получател…',
    filter_all: 'Всички статуси',
    tab_active: 'Активни',
    tab_delivered: 'Доставени',
    tab_all: 'Всички',
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
    onlineFilter: 'Онлайн пратки',
    uninvoicedFilter: 'Без фактура',
    noInvoice: 'Без фактура',
    officeAll: 'Всички офиси',
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
    tab_active: 'Active',
    tab_delivered: 'Delivered',
    tab_all: 'All',
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
    onlineFilter: 'Online parcels',
    uninvoicedFilter: 'No invoice',
    noInvoice: 'No invoice',
    officeAll: 'All offices',
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
  const confirm = useConfirm();
  // Only "Натоварена" comes solely from the course (it links a van); Тръгна/Пристигна
  // are now operator-settable, so the per-row control offers them where valid.
  const options = nextStatuses(shipment.status).filter((s) => !COURSE_DRIVEN.includes(s));

  if (options.length === 0) {
    return <span className="text-xs text-muted-fg">{noNextLabel}</span>;
  }

  const cancelCopy =
    locale === 'bg'
      ? {
          title: 'Отказване на пратка',
          body: 'Пратката ще се маркира като отказана и клиентът ще получи известие. Да продължа?',
          confirm: 'Откажи пратката',
          cancel: 'Назад',
        }
      : {
          title: 'Cancel parcel',
          body: 'The parcel will be marked cancelled and the client notified. Proceed?',
          confirm: 'Cancel parcel',
          cancel: 'Back',
        };

  const apply = async (to: AnyStatus) => {
    if (to === 'cancelled') {
      const ok = await confirm({
        title: cancelCopy.title,
        body: cancelCopy.body,
        confirmLabel: cancelCopy.confirm,
        cancelLabel: cancelCopy.cancel,
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await update.mutateAsync({ shipment, to, source: 'manual' });
      toast.success(`${shipment.public_code} · ${statusLabel(to, locale)}`);
    } catch {
      toast.error(errorLabel);
    }
  };

  // Primary button = the happy-path forward step; side-exits go in "Друго…".
  const isSide = (s: AnyStatus) => (SIDE_STATUSES as readonly string[]).includes(s);
  const next = options.find((s) => !isSide(s)) ?? null;
  const baseAlternatives = options.filter((s) => s !== next);
  // One-click cancel: always offer Отказана on an active parcel (terminal states
  // return early above). Distinct from delete — it keeps the record + notifies.
  const alternatives =
    baseAlternatives.includes('cancelled') || next === 'cancelled'
      ? baseAlternatives
      : [...baseAlternatives, 'cancelled' as AnyStatus];

  return (
    <div className="flex items-center gap-2">
      {next && (
        <Button
          size="sm"
          loading={update.isPending}
          disabled={update.isPending}
          onClick={() => void apply(next)}
          className="shrink-0 gap-1.5"
        >
          <ArrowRight className="h-4 w-4" /> {statusLabel(next, locale)}
        </Button>
      )}
      {alternatives.length > 0 && (
        <Dropdown
          ariaLabel={otherLabel}
          value=""
          placeholder={otherLabel}
          align="right"
          disabled={update.isPending}
          onChange={(v) => {
            if (v) void apply(v as AnyStatus);
          }}
          options={alternatives.map((s) => ({ value: s, label: statusLabel(s, locale) }))}
          className="h-9 w-32 text-xs"
        />
      )}
    </div>
  );
}

export function OpShipmentsPage() {
  const { t, i18n } = useTranslation();
  const locale: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const dateLocale = locale === 'en' ? 'en-GB' : 'bg-BG';
  const L = COPY[locale];

  const toast = useToast();
  const confirm = useConfirm();
  const del = useDeleteShipment();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AnyStatus | 'all'>('all');
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [view, setView] = useState<'active' | 'delivered' | 'all'>('active');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [searchParams] = useSearchParams();
  const [uninvoicedOnly, setUninvoicedOnly] = useState(searchParams.get('uninvoiced') === '1');

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

  // Which parcels carry a (non-void) invoice — powers the "без фактура" flag.
  const { data: invoicedIds } = useQuery({
    queryKey: ['invoiced-shipment-ids'],
    queryFn: async (): Promise<Set<string>> => {
      const { data: rows, error } = await supabase
        .from('invoices')
        .select('shipment_id, status')
        .not('shipment_id', 'is', null)
        .limit(5000);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of (rows ?? []) as { shipment_id: string | null; status: string }[]) {
        if (r.shipment_id && r.status !== 'void') set.add(r.shipment_id);
      }
      return set;
    },
  });
  const isUninvoiced = useCallback(
    (s: Shipment) =>
      invoicedIds != null && !invoicedIds.has(s.id) && s.status !== 'cancelled' && s.status !== 'returned',
    [invoicedIds],
  );

  const filtered = useMemo(() => {
    const shipments = data ?? [];
    const q = query.trim().toLowerCase();
    return shipments.filter((s) => {
      // Active = still in motion (not delivered/returned/cancelled); keeps the
      // default list + "select all" clear of finished parcels.
      if (view === 'active' && isTerminal(s.status)) return false;
      if (view === 'delivered' && s.status !== 'delivered') return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (officeFilter !== 'all' && s.origin_office !== officeFilter) return false;
      if (onlineOnly && !getParcelOrigin(s).isOnline) return false;
      if (uninvoicedOnly && !isUninvoiced(s)) return false;
      if (!q) return true;
      return (
        s.public_code.toLowerCase().includes(q) ||
        s.awb_barcode.toLowerCase().includes(q) ||
        (s.inbound_ref ?? '').toLowerCase().includes(q) ||
        s.receiver.name.toLowerCase().includes(q)
      );
    });
  }, [data, query, statusFilter, officeFilter, onlineOnly, uninvoicedOnly, isUninvoiced, view]);

  const viewCounts = {
    all: (data ?? []).length,
    active: (data ?? []).filter((s) => !isTerminal(s.status)).length,
    delivered: (data ?? []).filter((s) => s.status === 'delivered').length,
  };

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
      { label: 'Kind', get: (s) => s.kind },
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
          <Filter className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-fg" />
          <Dropdown
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as AnyStatus | 'all')}
            options={[
              { value: 'all', label: L.filter_all },
              ...ALL_STATUSES.map((s) => ({ value: s, label: statusLabel(s, locale) })),
            ]}
            ariaLabel={t('common.status')}
            align="right"
            className="w-full pl-9"
          />
        </div>
        <div className="relative sm:w-60">
          <Store className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-fg" />
          <Dropdown
            value={officeFilter}
            onChange={(v) => setOfficeFilter(v)}
            options={[
              { value: 'all', label: L.officeAll },
              ...OFFICES.map((o) => ({ value: o.slug, label: locale === 'bg' ? o.name_bg : o.name_en })),
            ]}
            ariaLabel={L.officeAll}
            align="right"
            className="w-full pl-9"
          />
        </div>
        <Button
          variant={onlineOnly ? 'primary' : 'outline'}
          onClick={() => setOnlineOnly((v) => !v)}
          aria-pressed={onlineOnly}
          title={L.onlineFilter}
          className="gap-2 sm:shrink-0"
        >
          <ShoppingBag className="h-4 w-4" /> {L.onlineFilter}
        </Button>
        <Button
          variant={uninvoicedOnly ? 'primary' : 'outline'}
          onClick={() => setUninvoicedOnly((v) => !v)}
          aria-pressed={uninvoicedOnly}
          title={L.uninvoicedFilter}
          className="gap-2 sm:shrink-0"
        >
          <AlertTriangle className="h-4 w-4" /> {L.uninvoicedFilter}
        </Button>
        <Button variant="outline" onClick={onExport} disabled={filtered.length === 0} className="gap-2 sm:shrink-0">
          <Download className="h-4 w-4" /> {L.exportCsv}
        </Button>
      </div>

      <div className="mb-4 inline-flex rounded-xl border border-border p-1">
        {(
          [
            { v: 'active', label: L.tab_active, n: viewCounts.active },
            { v: 'delivered', label: L.tab_delivered, n: viewCounts.delivered },
            { v: 'all', label: L.tab_all, n: viewCounts.all },
          ] as const
        ).map((tab) => (
          <button
            key={tab.v}
            type="button"
            onClick={() => setView(tab.v)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              view === tab.v ? 'bg-brand text-brand-fg' : 'text-muted-fg hover:text-foreground',
            )}
          >
            {tab.label} <span className="tabular-nums opacity-70">{tab.n}</span>
          </button>
        ))}
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
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-fg">
                          <span>
                            {s.weight_kg} {t('common.kg')}
                          </span>
                          <OnlineBadge shipment={s} />
                          {isUninvoiced(s) && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
                              title={L.noInvoice}
                            >
                              <AlertTriangle className="h-3 w-3" /> {L.noInvoice}
                            </span>
                          )}
                          {officeLabel(s.origin_office, locale) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                              <Store className="h-3 w-3" /> {officeLabel(s.origin_office, locale)}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-fg">
                          <Clock className="h-3 w-3 shrink-0" /> {formatDateTime(s.created_at, dateLocale)}
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

      {/* Bulk action bar — slides up on selection so it's clearly tied to it */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            key="bulk-bar"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-2.5 pl-3 shadow-lift backdrop-blur lg:left-[calc(16rem+1rem)]"
          >
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-sm font-bold text-white">
              <ListChecks className="h-4 w-4" />
              {selected.size} {L.selected}
            </span>
            <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden />
            <Dropdown
              value=""
              placeholder={L.addToLoad}
              ariaLabel={L.addToLoad}
              disabled={bulkAssign.isPending}
              onChange={(v) => {
                if (v) void doAssign(v);
              }}
              options={(loads.data ?? [])
                .filter((l) => l.status !== 'closed')
                .map((l) => ({ value: l.id, label: l.code }))}
              className="h-9 w-40 text-xs"
            />
            <Dropdown
              value=""
              placeholder={L.setStatus}
              ariaLabel={L.setStatus}
              onChange={(v) => {
                if (v) void doStatus(v as AnyStatus);
              }}
              options={OPERATOR_SETTABLE_STATUSES.map((s) => ({ value: s, label: statusLabel(s, locale) }))}
              className="h-9 w-40 text-xs"
            />
            <Button size="sm" variant="outline" loading={printing} onClick={() => void doPrint()} className="gap-1.5">
              <Printer className="h-4 w-4" /> {L.printLabels}
            </Button>
            <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden />
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
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:bg-muted hover:text-foreground"
              aria-label={L.clear}
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">{L.clear}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
