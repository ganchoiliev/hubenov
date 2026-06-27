import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PackagePlus, ArrowRight, Weight } from 'lucide-react';
import { Button, Card, CardBody, Badge, Skeleton } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { OnlineBadge } from '@/components/shared/OnlineBadge';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useAuth } from '@/lib/auth';
import { useMyShipments } from '@/lib/queries';
import { isTerminal } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { Shipment } from '@/types/domain';

type ShipmentFilter = 'all' | 'active' | 'delivered';

export function MyShipmentsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const { profile } = useAuth();
  const { data, isLoading } = useMyShipments(profile?.id);
  const [filter, setFilter] = useState<ShipmentFilter>('all');

  const L =
    locale === 'bg'
      ? { all: 'Всички', active: 'Активни', delivered: 'Доставени' }
      : { all: 'All', active: 'Active', delivered: 'Delivered' };

  const shipments = useMemo<Shipment[]>(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      all: shipments.length,
      active: shipments.filter((s) => !isTerminal(s.status)).length,
      delivered: shipments.filter((s) => s.status === 'delivered').length,
    }),
    [shipments],
  );

  const filtered = useMemo<Shipment[]>(() => {
    if (filter === 'active') return shipments.filter((s) => !isTerminal(s.status));
    if (filter === 'delivered') return shipments.filter((s) => s.status === 'delivered');
    return shipments;
  }, [shipments, filter]);

  const chips: { key: ShipmentFilter; label: string; count: number }[] = [
    { key: 'all', label: L.all, count: counts.all },
    { key: 'active', label: L.active, count: counts.active },
    { key: 'delivered', label: L.delivered, count: counts.delivered },
  ];

  const newAction = (
    <Link to="/portal/new">
      <Button className="gap-2">
        <PackagePlus className="h-4 w-4" /> {t('portal.new_shipment')}
      </Button>
    </Link>
  );

  return (
    <div>
      <PageHeading title={t('portal.my_shipments')} action={newAction} />

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            aria-pressed={filter === chip.key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              filter === chip.key
                ? 'border-brand bg-brand text-brand-fg shadow-soft'
                : 'border-border bg-card text-muted-fg hover:bg-muted',
            )}
          >
            {chip.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs font-bold',
                filter === chip.key ? 'bg-brand-fg/20 text-brand-fg' : 'bg-muted text-muted-fg',
              )}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[5.5rem] w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={t('portal.no_shipments')} action={newAction} />
      ) : (
        <Stagger className="space-y-2">
          {filtered.map((s) => (
            <StaggerItem key={s.id}>
              <Link to={`/portal/shipments/${s.id}`} className="block">
                <Card className="transition-shadow hover:shadow-lift">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-foreground">{s.public_code}</p>
                        <Badge tone="neutral">{s.direction === 'UK_BG' ? 'UK→BG' : 'BG→UK'}</Badge>
                        <OnlineBadge shipment={s} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-fg">
                        {s.receiver.name} · {s.receiver.city}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-fg">
                        <Weight className="h-3.5 w-3.5" /> {s.weight_kg} {t('common.kg')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={s.status} />
                      <ArrowRight className="h-4 w-4 text-muted-fg" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
