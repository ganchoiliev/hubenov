import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScanLine, UserSearch, PackagePlus, Truck, ArrowRight } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { Stat, PageHeading } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { DepartureCountdown } from '@/components/shared/DepartureCountdown';
import { useOperatorDashboard } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { statusLabel, timelineIndex } from '@/lib/status';
import { formatMoney } from '@/lib/utils';
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
  const { data: dash } = useOperatorDashboard();

  const roleLabel = profile?.role ? (lang === 'bg' ? (ROLE_BG[profile.role] ?? profile.role) : profile.role) : '';

  const L =
    lang === 'bg'
      ? {
          cod: 'COD за събиране',
          codHint: 'непредадени пратки',
          due: 'Дължими (неплатени)',
          dueHint: 'издадени фактури',
          paid: 'Приход (платени)',
          paidHint: 'платени фактури',
          active: 'Активни пратки',
          today: 'Днес приети',
          delivered: 'Доставени',
          inflight: 'Пратки по статус',
          none: 'Няма активни пратки',
        }
      : {
          cod: 'COD to collect',
          codHint: 'parcels in transit',
          due: 'Outstanding (unpaid)',
          dueHint: 'issued invoices',
          paid: 'Revenue (paid)',
          paidHint: 'paid invoices',
          active: 'Active parcels',
          today: 'Received today',
          delivered: 'Delivered',
          inflight: 'Parcels by status',
          none: 'No active parcels',
        };

  const fmtRec = (rec: Record<string, number>): string => {
    const entries = Object.entries(rec).filter(([, v]) => v > 0);
    if (entries.length === 0) return formatMoney(0, 'GBP', intlLocale);
    return entries.map(([ccy, v]) => formatMoney(v, ccy as Currency, intlLocale)).join(' · ');
  };

  const activeStatuses = Object.entries(dash?.shipments.byStatus ?? {})
    .filter(([s]) => !HIDDEN_STATUSES.has(s))
    .sort((a, b) => timelineIndex(a[0] as AnyStatus) - timelineIndex(b[0] as AnyStatus));

  return (
    <div>
      <PageHeading
        title={t('operator.console')}
        subtitle={profile?.full_name ? `${profile.full_name} · ${roleLabel}` : undefined}
      />

      {/* Money */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={L.cod}
          value={dash ? formatMoney(dash.cod.outstanding, 'BGN', intlLocale) : '—'}
          hint={`${dash?.cod.count ?? 0} ${L.codHint}`}
        />
        <Stat label={L.due} value={dash ? fmtRec(dash.invoices.due) : '—'} hint={L.dueHint} />
        <Stat label={L.paid} value={dash ? fmtRec(dash.invoices.paid) : '—'} hint={L.paidHint} />
      </div>

      {/* Ops */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label={L.active} value={dash?.shipments.active ?? '—'} />
        <Stat label={L.today} value={dash?.shipments.today ?? '—'} />
        <Stat label={L.delivered} value={dash?.shipments.delivered ?? '—'} />
      </div>

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
