import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScanLine, UserSearch, PackagePlus, Truck, ArrowRight, RefreshCw, AlertCircle, AlertTriangle, BarChart3, MapPin, Check } from 'lucide-react';
import { Button, Card, CardBody } from '@/components/ui';
import { Stat, PageHeading } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { DepartureCountdown } from '@/components/shared/DepartureCountdown';
import { useOperatorDashboard, useCodAwaitingRemittance, useMarkCodRemitted, useWeeklyStats, useStuckShipments, useTopCities } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { statusLabel, timelineIndex } from '@/lib/status';
import { formatMoney, cn } from '@/lib/utils';
import type { AnyStatus, Currency } from '@/types/domain';

const ACTIONS = [
  { to: '/op/scan', icon: ScanLine, key: 'operator.scan_title' },
  { to: '/op/lookup', icon: UserSearch, key: 'operator.lookup_title' },
  { to: '/op/intake', icon: PackagePlus, key: 'operator.intake_title' },
  { to: '/op/loads', icon: Truck, key: 'operator.loads' },
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={L.cod} value={money(dash?.cod.collecting)} hint={`${dash?.cod.collectingCount ?? 0} ${L.codHint}`} />
        <Stat label={L.codRemit} value={money(dash?.cod.awaiting)} hint={`${dash?.cod.awaitingCount ?? 0} · ${L.codRemitHint}`} />
        <Stat label={L.due} value={money(dash?.invoices.due)} hint={L.dueHint} />
        <Stat label={L.paid} value={money(dash?.invoices.paid)} hint={L.paidHint} />
      </div>

      {/* Ops */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label={L.active} value={num(dash?.shipments.active)} />
        <Stat label={L.today} value={num(dash?.shipments.today)} />
        <Stat label={L.delivered} value={num(dash?.shipments.delivered)} />
      </div>

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
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Link to="/op/invoices" className="rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted">
                <p className="font-display text-xl font-extrabold tabular-nums text-foreground">{dash?.invoices.dueCount ?? 0}</p>
                <p className="text-xs text-muted-fg">{L.unpaidInv}</p>
              </Link>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="font-display text-xl font-extrabold tabular-nums text-foreground">{dash?.cod.awaitingCount ?? 0}</p>
                <p className="text-xs text-muted-fg">{L.codRemit}</p>
              </div>
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

      {/* Quick actions */}
      <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <StaggerItem key={a.to}>
            <Link to={a.to}>
              <Card className="group h-full transition-shadow hover:shadow-lift">
                <CardBody className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <a.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{t(a.key)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-fg transition-transform group-hover:translate-x-1" />
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

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
