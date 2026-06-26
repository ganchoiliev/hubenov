import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { PackagePlus, Copy, ArrowRight } from 'lucide-react';
import { Button, Card, CardBody, Badge, Skeleton } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { DepartureCountdown } from '@/components/shared/DepartureCountdown';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useMyShipments } from '@/lib/queries';
import { isTerminal } from '@/lib/status';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const toast = useToast();
  const { profile } = useAuth();
  const { data: shipments, isLoading } = useMyShipments(profile?.id);

  const active = (shipments ?? []).filter((s) => !isTerminal(s.status));
  const delivered = (shipments ?? []).filter((s) => s.status === 'delivered').length;
  const total = (shipments ?? []).length;

  const copyCode = () => {
    if (profile?.client_code) {
      void navigator.clipboard.writeText(profile.client_code);
      toast.success(profile.client_code);
    }
  };

  return (
    <div>
      <PageHeading
        title={t('portal.welcome', { name: profile?.full_name ?? '' })}
        action={
          <Link to="/portal/new">
            <Button className="gap-2">
              <PackagePlus className="h-4 w-4" /> {t('portal.new_shipment')}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">{t('portal.your_code')}</p>
            <button onClick={copyCode} className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold text-brand-700">
              {profile?.client_code ?? '—'}
              <Copy className="h-4 w-4 text-muted-fg" />
            </button>
            <p className="mt-2 text-xs leading-relaxed text-muted-fg">
              {lang === 'bg'
                ? 'Кажете този номер по телефона — операторът веднага намира пратките ви.'
                : 'Give this number on the phone — the operator finds your shipments instantly.'}
            </p>
          </CardBody>
        </Card>
        <div className="lg:col-span-2">
          <DepartureCountdown />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard label={lang === 'bg' ? 'Активни' : 'Active'} value={active.length} />
        <StatCard label={lang === 'bg' ? 'Доставени' : 'Delivered'} value={delivered} />
        <StatCard label={lang === 'bg' ? 'Общо' : 'Total'} value={total} />
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-fg">
          {t('portal.active_shipments')} ({active.length})
        </h2>
        <Link to="/portal/shipments" className="text-xs font-semibold text-brand-700 hover:underline">
          {lang === 'bg' ? 'Виж всички' : 'View all'}
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <EmptyState
          title={t('portal.no_shipments')}
          action={
            <Link to="/portal/new">
              <Button className="gap-2">
                <PackagePlus className="h-4 w-4" /> {t('portal.new_shipment')}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {active.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link to={`/portal/shipments/${s.id}`}>
                <Card className="transition-shadow hover:shadow-lift">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-foreground">{s.public_code}</p>
                        <Badge tone="neutral">{s.direction === 'UK_BG' ? 'UK→BG' : 'BG→UK'}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-fg">
                        {s.receiver.name} · {s.receiver.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={s.status} />
                      <ArrowRight className="h-4 w-4 text-muted-fg" />
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-soft">
      <p className="font-display text-2xl font-extrabold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-fg">{label}</p>
    </div>
  );
}
