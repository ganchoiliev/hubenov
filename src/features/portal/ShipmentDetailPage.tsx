import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Package, Gift } from 'lucide-react';
import { Card, CardBody, Badge, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/shared/Timeline';
import { PageHeading } from '@/components/shared/common';
import { useShipment, useTrackingEvents } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import type { PartySnapshot } from '@/types/domain';

export function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const qc = useQueryClient();
  const { data: shipment, isLoading } = useShipment(id);
  const { data: events } = useTrackingEvents(id);

  // Live status: subscribe to new tracking events for this shipment (§2 Realtime).
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`shipment-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracking_events', filter: `shipment_id=eq.${id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['tracking', id] });
          void qc.invalidateQueries({ queryKey: ['shipment', id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, qc]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <PageHeading
        title={t('track.not_found')}
        action={
          <Link to="/portal/shipments" className="text-sm text-brand">
            ← {t('common.back')}
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/portal/shipments"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-fg hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t('portal.my_shipments')}
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-foreground">{shipment.public_code}</h1>
          <Badge tone="neutral">{shipment.direction === 'UK_BG' ? 'UK → BG' : 'BG → UK'}</Badge>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardBody>
            <h2 className="mb-5 text-sm font-semibold text-muted-fg">{t('track.history')}</h2>
            <Timeline current={shipment.status} events={events ?? []} />
          </CardBody>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardBody className="space-y-4">
              <PartyView label={t('wizard.step_sender')} p={shipment.sender} />
              <div className="border-t border-border" />
              <PartyView label={t('wizard.step_receiver')} p={shipment.receiver} />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2.5 text-sm">
              <Row icon={<Package className="h-4 w-4" />} label={t('common.weight')} value={`${shipment.weight_kg} ${t('common.kg')}`} />
              <Row
                label={t('quote.declared_value')}
                value={formatMoney(shipment.declared_value, shipment.currency, locale)}
              />
              {shipment.price != null && (
                <Row label={t('common.price')} value={formatMoney(shipment.price, shipment.currency, locale)} />
              )}
              {shipment.is_gift && (
                <div className="flex items-center gap-2 pt-1">
                  <Gift className="h-4 w-4 text-accent" />
                  <span className="text-muted-fg">{t('services.gifts')}</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PartyView({ label, p }: { label: string; p: PartySnapshot }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{p.name}</p>
      <p className="text-sm text-muted-fg">{p.phone}</p>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-fg">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {[p.line1, p.line2].filter(Boolean).join(', ')}, {p.postcode} {p.city}, {p.country}
          {p.econt_office_code ? ` · Econt ${p.econt_office_code}` : ''}
        </span>
      </p>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-fg">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
