import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Package, Gift, FileText, Plus, Trash2, Download, AlertTriangle } from 'lucide-react';
import { Card, CardBody, Badge, Spinner, Button, Input, Switch } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/shared/Timeline';
import { PageHeading } from '@/components/shared/common';
import { useShipment, useTrackingEvents, useCompanySettings } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/utils';
import { assessCustoms } from '@/lib/customs';
import type { PartySnapshot, Shipment, CustomsItem, Currency } from '@/types/domain';

export function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  // Scope-aware: this page is mounted under BOTH /portal (client) and /op
  // (operator). Keep the back-link in the same scope so staff don't fall into
  // the client portal with no way back.
  const { pathname } = useLocation();
  const inOperator = pathname.startsWith('/op');
  const listPath = inOperator ? '/op/shipments' : '/portal/shipments';
  const listLabel = inOperator ? t('operator.shipments') : t('portal.my_shipments');
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
          <Link to={listPath} className="text-sm text-brand">
            ← {t('common.back')}
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={listPath}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-fg hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {listLabel}
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

      {inOperator && <CustomsPanel shipment={shipment} />}
    </div>
  );
}

const WARN_BG: Record<string, string> = {
  'EORI required for commercial consignment': 'Нужен е EORI за търговска пратка',
  'HS code missing on one or more commercial items': 'Липсва HS код на една или повече стоки',
  'Gift above relief ceiling — treated as commercial': 'Подаръкът надвишава прага — третира се като търговска',
};

function CustomsPanel({ shipment }: { shipment: Shipment }) {
  const { i18n } = useTranslation();
  const lang: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const locale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const { data: settings } = useCompanySettings();

  const parcelLabel = (() => {
    const map: Record<string, { bg: string; en: string }> = {
      parcel: { bg: 'Колет', en: 'Parcel' },
      document: { bg: 'Документи', en: 'Documents' },
      pallet: { bg: 'Палет', en: 'Pallet' },
      food: { bg: 'Хранителни продукти', en: 'Food' },
      other: { bg: 'Стоки', en: 'Goods' },
    };
    const m = map[shipment.parcel_type] ?? map.other!;
    return lang === 'bg' ? m.bg : m.en;
  })();

  const [items, setItems] = useState<CustomsItem[]>([
    { description: parcelLabel, hs_code: '', qty: 1, unit_value: shipment.declared_value },
  ]);
  const [isGift, setIsGift] = useState(shipment.is_gift);
  const [eori, setEori] = useState('');
  const [busy, setBusy] = useState(false);
  const currency = shipment.currency as Currency;

  useEffect(() => {
    if (settings?.eori) setEori((e) => e || settings.eori || '');
  }, [settings]);

  const assessment = useMemo(
    () => assessCustoms(items, isGift, currency, eori || null),
    [items, isGift, currency, eori],
  );

  const L =
    lang === 'bg'
      ? {
          title: 'Митническа фактура',
          sub: 'Документ за митница. Данните идват от пратката — редактирай при нужда.',
          desc: 'Описание на стоката',
          hs: 'HS код',
          add: 'Добави ред',
          gift: 'Подарък / лична пратка',
          total: 'Общо',
          giftRelief: 'Освободен (подарък)',
          download: 'Свали документа',
        }
      : {
          title: 'Customs invoice',
          sub: 'Customs document. Pre-filled from the shipment — edit as needed.',
          desc: 'Goods description',
          hs: 'HS code',
          add: 'Add line',
          gift: 'Gift / personal',
          total: 'Total',
          giftRelief: 'Relieved (gift)',
          download: 'Download document',
        };

  const setItem = (i: number, patch: Partial<CustomsItem>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems((arr) => [...arr, { description: '', hs_code: '', qty: 1, unit_value: 0 }]);
  const removeItem = (i: number) =>
    setItems((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));

  const generate = async () => {
    setBusy(true);
    try {
      const { downloadCustomsPdf } = await import('@/lib/customsDoc');
      await downloadCustomsPdf({
        ref: shipment.public_code,
        dateISO: new Date().toISOString(),
        isGift,
        giftReliefApplied: assessment.gift_relief_applied,
        eori: eori || null,
        exporter: shipment.sender,
        consignee: shipment.receiver,
        items,
        total: assessment.total_value,
        currency,
        weightKg: shipment.weight_kg,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardBody className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
            <FileText className="h-4 w-4 text-brand" /> {L.title}
          </h2>
          <p className="mt-1 text-sm text-muted-fg">{L.sub}</p>
        </div>

        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_64px_104px_auto]">
              <Input placeholder={L.desc} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
              <Input placeholder={L.hs} value={it.hs_code ?? ''} onChange={(e) => setItem(i, { hs_code: e.target.value })} className="font-mono" />
              <Input type="number" min="1" step="1" value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) || 1 })} aria-label="qty" />
              <Input type="number" min="0" step="0.01" value={it.unit_value} onChange={(e) => setItem(i, { unit_value: Number(e.target.value) || 0 })} aria-label="unit value" />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} aria-label="remove" className="px-2">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addItem}>
            <Plus className="h-4 w-4" /> {L.add}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-fg">EORI</span>
            <Input value={eori} onChange={(e) => setEori(e.target.value)} placeholder="GB123456789000" className="font-mono" />
          </label>
          <div className="flex items-end">
            <Switch checked={isGift} onChange={setIsGift} label={L.gift} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-fg">{L.total}:</span>
            <span className="font-semibold text-foreground">{formatMoney(assessment.total_value, currency, locale)}</span>
            {assessment.gift_relief_applied && <Badge tone="success">{L.giftRelief}</Badge>}
          </div>
          <Button type="button" className="gap-2" loading={busy} onClick={() => void generate()}>
            <Download className="h-4 w-4" /> {L.download}
          </Button>
        </div>

        {assessment.warnings.length > 0 && (
          <div className="space-y-1">
            {assessment.warnings.map((w) => (
              <p key={w} className="flex items-center gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {lang === 'bg' ? WARN_BG[w] ?? w : w}
              </p>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
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
