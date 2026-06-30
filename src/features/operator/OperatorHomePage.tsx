import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScanLine, UserSearch, PackagePlus, Truck, ArrowRight, RefreshCw, AlertCircle, AlertTriangle, BarChart3, MapPin, Check, Inbox, UserPlus, CalendarRange } from 'lucide-react';
import { Button, Card, CardBody } from '@/components/ui';
import { Stat, PageHeading } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { DepartureCountdown } from '@/components/shared/DepartureCountdown';
import { useOperatorDashboard, useCodAwaitingRemittance, useMarkCodRemitted, useWeeklyStats, useStuckShipments, useTopCities, useBookedShipments, useNewClients, useDashboardPeriod } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { statusLabel, timelineIndex } from '@/lib/status';
import { formatMoney, cn } from '@/lib/utils';
import type { AnyStatus, Currency } from '@/types/domain';

const ACTIONS = [
  { to: '/op/intake', icon: PackagePlus, key: 'operator.intake_title', descBg: 'Приеми нова пратка от клиент', descEn: 'Take a new parcel from a client' },
  { to: '/op/scan', icon: ScanLine, key: 'operator.scan_title', descBg: 'Сканирай и принтирай етикет', descEn: 'Scan and print a label' },
  { to: '/op/loads', icon: Truck, key: 'operator.loads', descBg: 'Курсове и товарене', descEn: 'Loads and loading' },
  { to: '/op/lookup', icon: UserSearch, key: 'operator.lookup_title', descBg: 'Намери клиент по ОТ номер', descEn: 'Find a client by OT code' },
];

const ROLE_BG: Record<string, string> = {
  owner: 'Собственик',
  operator: 'Оператор',
  driver: 'Шофьор',
  client: 'Клиент',
};

const HIDDEN_STATUSES = new Set(['delivered', 'cancelled', 'returned', 'draft']);

export function OperatorHomePage() {
  const { t, i18n } = useTranslation();
  const lang: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const intlLocale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const { profile } = useAuth();
  const { data: dash, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useOperatorDashboard();
  const { data: awaiting } = useCodAwaitingRemittance();
  const markRemit = useMarkCodRemitted();
  const { data: weekly } = useWeeklyStats();
  const { data: stuck } = useStuckShipments();
  const { data: cities } = useTopCities();
  const { data: booked } = useBookedShipments();
  const { data: newClients } = useNewClients();

  // Period summary (date-range scoped).
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'custom'>('7d');
  const [cFrom, setCFrom] = useState('');
  const [cTo, setCTo] = useState('');
  const [fromISO, toISO] = useMemo<[string, string]>(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 60_000).toISOString();
    if (range === 'today') {
      const f = new Date();
      f.setHours(0, 0, 0, 0);
      return [f.toISOString(), end];
    }
    if (range === '30d') return [new Date(now.getTime() - 30 * 86400000).toISOString(), end];
    if (range === 'custom') {
      const f = cFrom ? new Date(`${cFrom}T00:00:00`).toISOString() : new Date(now.getTime() - 7 * 86400000).toISOString();
      const t = cTo ? new Date(`${cTo}T23:59:59`).toISOString() : end;
      return [f, t];
    }
    return [new Date(now.getTime() - 7 * 86400000).toISOString(), end];
  }, [range, cFrom, cTo]);
  const { data: period } = useDashboardPeriod(fromISO, toISO);

  const roleLabel = profile?.role ? (lang === 'bg' ? (ROLE_BG[profile.role] ?? profile.role) : profile.role) : '';

  const L =
    lang === 'bg'
      ? {
          cod: 'COD за събиране',
          codHint: 'пратки в транзит',
          codRemit: 'COD при Еконт',
          codRemitHint: 'доставени, очакват превод',
          due: 'Дължими (неплатени)',
          dueHint: 'издадени фактури',
          paid: 'Приход (платени)',
          paidHint: 'платени фактури',
          active: 'Активни пратки',
          today: 'Днес приети',
          delivered: 'Доставени',
          inflight: 'Пратки по статус',
          none: 'Няма активни пратки',
          reconTitle: 'COD за получаване от Еконт',
          reconNone: 'Няма суми за получаване',
          received: 'Получено',
          updated: 'Обновено',
          refresh: 'Обнови',
          loadErr: 'Грешка при зареждане на данните',
          retry: 'Опитай пак',
          weekTitle: 'Пратки по седмици',
          attnTitle: 'За внимание',
          attnNone: 'Всичко е наред — няма забавени пратки',
          unpaidInv: 'Неплатени фактури',
          daysSuffix: 'д',
          citiesTitle: 'Топ дестинации',
          periodTitle: 'Справка за период',
          r_today: 'Днес',
          r_7d: '7 дни',
          r_30d: '30 дни',
          r_custom: 'Период',
          p_received: 'Приети',
          p_delivered: 'Доставени',
          p_invoiced: 'Издадени',
          p_revenue: 'Платени',
          newTitle: 'Нови заявки',
          bookedReq: 'Заявени пратки',
          bookedNone: 'Няма нови заявки',
          newClientsLbl: 'Нови клиенти (7 дни)',
          newClientsNone: 'Няма нови клиенти',
          incomingTag: 'Входяща',
          recip: 'Получател',
        }
      : {
          cod: 'COD to collect',
          codHint: 'parcels in transit',
          codRemit: 'COD held by Econt',
          codRemitHint: 'delivered, awaiting payout',
          due: 'Outstanding (unpaid)',
          dueHint: 'issued invoices',
          paid: 'Revenue (paid)',
          paidHint: 'paid invoices',
          active: 'Active parcels',
          today: 'Received today',
          delivered: 'Delivered',
          inflight: 'Parcels by status',
          none: 'No active parcels',
          reconTitle: 'COD awaiting payout from Econt',
          reconNone: 'Nothing awaiting payout',
          received: 'Received',
          updated: 'Updated',
          refresh: 'Refresh',
          loadErr: 'Could not load dashboard data',
          retry: 'Retry',
          weekTitle: 'Parcels by week',
          attnTitle: 'Needs attention',
          attnNone: 'All clear — no delayed parcels',
          unpaidInv: 'Unpaid invoices',
          daysSuffix: 'd',
          citiesTitle: 'Top destinations',
          periodTitle: 'Period summary',
          r_today: 'Today',
          r_7d: '7 days',
          r_30d: '30 days',
          r_custom: 'Custom',
          p_received: 'Received',
          p_delivered: 'Delivered',
          p_invoiced: 'Invoiced',
          p_revenue: 'Paid',
          newTitle: 'New requests',
          bookedReq: 'Booked parcels',
          bookedNone: 'No new requests',
          newClientsLbl: 'New clients (7d)',
          newClientsNone: 'No new clients',
          incomingTag: 'Incoming',
          recip: 'Recipient',
        };

  const fmtRec = (rec: Record<string, number>): string => {
    const entries = Object.entries(rec).filter(([, v]) => v > 0);
    if (entries.length === 0) return formatMoney(0, 'GBP', intlLocale);
    return entries.map(([ccy, v]) => formatMoney(v, ccy as Currency, intlLocale)).join(' · ');
  };

  const sk = <span className="inline-block h-7 w-24 max-w-full animate-pulse rounded bg-muted align-middle" />;
  const money = (rec: Record<string, number> | undefined) => (isLoading ? sk : isError ? '—' : fmtRec(rec ?? {}));
  const num = (n: number | undefined) => (isLoading ? sk : isError ? '—' : (n ?? 0));

  const activeStatuses = Object.entries(dash?.shipments.byStatus ?? {})
    .filter(([s]) => !HIDDEN_STATUSES.has(s))
    .sort((a, b) => timelineIndex(a[0] as AnyStatus) - timelineIndex(b[0] as AnyStatus));

  const weekMax = Math.max(1, ...(weekly ?? []).map((w) => w.parcels));
  const cityMax = Math.max(1, ...(cities ?? []).map((c) => c.parcels));

  return (
    <div>
      <PageHeading
        title={t('operator.console')}
        subtitle={profile?.full_name ? `${profile.full_name} · ${roleLabel}` : undefined}
      />

      {/* Freshness */}
      <div className="mb-3 flex items-center justify-end gap-2 text-xs text-muted-fg">
        {dataUpdatedAt && !isError ? (
          <span>
            {L.updated}{' '}
            {new Date(dataUpdatedAt).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
        <button
          onClick={() => void refetch()}
          className="rounded-md p-1 hover:bg-muted hover:text-foreground"
          aria-label={L.refresh}
          title={L.refresh}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        </button>
      </div>

      {/* Quick actions — big, friendly: the daily tasks, first thing the owner sees */}
      <Stagger className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <StaggerItem key={a.to}>
            <Link to={a.to}>
              <Card className="group h-full border-brand/20 transition-shadow hover:shadow-lift">
                <CardBody className="flex flex-col gap-3 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <a.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="flex items-center gap-1 font-display text-base font-bold text-foreground">
                      {t(a.key)}
                      <ArrowRight className="h-4 w-4 text-muted-fg transition-transform group-hover:translate-x-1" />
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-fg">
                      {lang === 'bg' ? a.descBg : a.descEn}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      {isError && (
        <Card className="mb-4 border-red-300 bg-red-50">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-red-700">
              <AlertCircle className="h-4 w-4" /> {L.loadErr}
            </span>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              {L.retry}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Money */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label={L.due} value={money(dash?.invoices.due)} hint={L.dueHint} />
        <Stat label={L.paid} value={money(dash?.invoices.paid)} hint={L.paidHint} />
      </div>

      {/* Ops */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label={L.active} value={num(dash?.shipments.active)} />
        <Stat label={L.today} value={num(dash?.shipments.today)} />
        <Stat label={L.delivered} value={num(dash?.shipments.delivered)} />
      </div>

      {/* Period summary (date-range scoped) */}
      <Card className="mt-4">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-muted-fg">
              <CalendarRange className="h-4 w-4" /> {L.periodTitle}
            </p>
            <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
              {([['today', L.r_today], ['7d', L.r_7d], ['30d', L.r_30d], ['custom', L.r_custom]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setRange(k)}
                  className={cn(
                    'rounded-md px-3 py-1 font-medium transition-colors',
                    range === k ? 'bg-brand text-brand-fg' : 'text-muted-fg hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {range === 'custom' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="date"
                value={cFrom}
                onChange={(e) => setCFrom(e.target.value)}
                className="rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm text-foreground"
              />
              <input
                type="date"
                value={cTo}
                onChange={(e) => setCTo(e.target.value)}
                className="rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm text-foreground"
              />
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={L.p_received} value={period?.parcels ?? 0} />
            <Stat label={L.p_delivered} value={period?.delivered ?? 0} />
            <Stat label={L.p_invoiced} value={fmtRec(period?.invoiced ?? {})} />
            <Stat label={L.p_revenue} value={fmtRec(period?.paid ?? {})} />
          </div>
        </CardBody>
      </Card>

      {/* New requests — client-registered parcels + new client accounts (awareness) */}
      {((booked && booked.length > 0) || (newClients && newClients.length > 0)) && (
        <Card className="mt-4 border-brand/30 bg-brand-50/30">
          <CardBody>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Inbox className="h-4 w-4 text-brand-700" /> {L.newTitle}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Booked parcels awaiting intake */}
              <div>
                <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-fg">
                  <span>{L.bookedReq}</span>
                  <span className="rounded-full bg-card px-2 py-0.5 tabular-nums">{booked?.length ?? 0}</span>
                </p>
                {booked && booked.length > 0 ? (
                  <div className="space-y-1.5">
                    {booked.slice(0, 5).map((b) => (
                      <Link
                        key={b.id}
                        to={`/op/shipments/${b.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-baseline gap-2">
                            <span className="font-mono font-semibold text-foreground">{b.public_code}</span>
                            <span className="truncate text-foreground">{b.client_name || b.receiver_name || '—'}</span>
                            {b.client_code && (
                              <span className="shrink-0 font-mono text-xs text-muted-fg">{b.client_code}</span>
                            )}
                          </span>
                          {(b.receiver_name || b.receiver_city) && (
                            <span className="truncate text-xs text-muted-fg">
                              {L.recip}: {[b.receiver_name, b.receiver_city].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                        {b.inbound_ref ? (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">{L.incomingTag}</span>
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-fg" />
                        )}
                      </Link>
                    ))}
                    {booked.length > 5 && (
                      <Link to="/op/shipments" className="block px-1 pt-1 text-xs font-medium text-brand-700 hover:underline">
                        +{booked.length - 5} →
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-fg">{L.bookedNone}</p>
                )}
              </div>

              {/* New client accounts */}
              <div>
                <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-fg">
                  <span>{L.newClientsLbl}</span>
                  <span className="rounded-full bg-card px-2 py-0.5 tabular-nums">{newClients?.length ?? 0}</span>
                </p>
                {newClients && newClients.length > 0 ? (
                  <div className="space-y-1.5">
                    {newClients.slice(0, 5).map((c) => (
                      <Link
                        key={c.id}
                        to="/op/clients"
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <UserPlus className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                          <span className="truncate text-foreground">{c.full_name || c.client_code}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-muted-fg">{c.client_code}</span>
                      </Link>
                    ))}
                    {newClients.length > 5 && (
                      <Link to="/op/clients" className="block px-1 pt-1 text-xs font-medium text-brand-700 hover:underline">
                        +{newClients.length - 5} →
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-fg">{L.newClientsNone}</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Weekly volume + needs attention */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-fg">
              <BarChart3 className="h-4 w-4" /> {L.weekTitle}
            </p>
            <div className="flex h-44 items-end gap-2">
              {(weekly ?? []).map((w) => (
                <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-semibold tabular-nums text-foreground">{w.parcels || ''}</span>
                  <div
                    className="w-full rounded-t-md bg-brand"
                    style={{ height: `${(w.parcels / weekMax) * 100}%`, minHeight: w.parcels > 0 ? '6px' : '2px' }}
                  />
                  <span className="text-[10px] text-muted-fg">{w.label}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-fg">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> {L.attnTitle}
            </p>
            <div className="mb-3">
              <Link to="/op/invoices" className="block rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted">
                <p className="font-display text-xl font-extrabold tabular-nums text-foreground">{dash?.invoices.dueCount ?? 0}</p>
                <p className="text-xs text-muted-fg">{L.unpaidInv}</p>
              </Link>
            </div>
            {stuck && stuck.length > 0 ? (
              <div className="space-y-1.5">
                {stuck.map((s) => (
                  <Link
                    key={s.id}
                    to={`/op/shipments/${s.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="truncate font-mono font-semibold text-foreground">{s.public_code}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-fg">{statusLabel(s.status as AnyStatus, lang)}</span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                        {s.days}
                        {L.daysSuffix}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-fg">{L.attnNone}</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Top destination cities */}
      {cities && cities.length > 0 && (
        <Card className="mt-4">
          <CardBody>
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-fg">
              <MapPin className="h-4 w-4" /> {L.citiesTitle}
            </p>
            <div className="space-y-2.5">
              {cities.map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm text-foreground">{c.city}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(c.parcels / cityMax) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{c.parcels}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* COD awaiting payout — reconciliation */}
      {awaiting && awaiting.length > 0 && (
        <Card className="mt-4">
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{L.reconTitle}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-fg">
                {awaiting.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {awaiting.slice(0, 8).map((r) => (
                <div
                  key={r.shipment_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <Link to={`/op/shipments/${r.shipment_id}`} className="font-mono font-semibold text-brand-700 hover:underline">
                      {r.public_code}
                    </Link>
                    {r.receiver_name && <span className="truncate text-muted-fg">{r.receiver_name}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(r.cod_amount, r.cod_currency as Currency, intlLocale)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      loading={markRemit.isPending && markRemit.variables?.shipment_id === r.shipment_id}
                      onClick={() => markRemit.mutate({ shipment_id: r.shipment_id, remitted: true })}
                    >
                      <Check className="h-3.5 w-3.5" /> {L.received}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Next departure + status breakdown */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DepartureCountdown />
        </div>
        <Card>
          <CardBody>
            <p className="mb-3 text-sm font-semibold text-muted-fg">{L.inflight}</p>
            {activeStatuses.length === 0 ? (
              <p className="text-sm text-muted-fg">{L.none}</p>
            ) : (
              <div className="space-y-2">
                {activeStatuses.map(([s, n]) => (
                  <div key={s} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{statusLabel(s as AnyStatus, lang)}</span>
                    <span className="font-semibold tabular-nums text-foreground">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
