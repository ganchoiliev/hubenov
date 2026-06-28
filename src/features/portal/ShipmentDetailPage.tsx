import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Package, Gift, FileText, Plus, Trash2, Download, AlertTriangle, Truck, ExternalLink, Save, Pencil, Hash, UserRound, Printer, Clock } from 'lucide-react';
import { Card, CardBody, Badge, Spinner, Button, Input, Switch, Field } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { OnlineBadge } from '@/components/shared/OnlineBadge';
import { useToast } from '@/components/ui/toast';
import { Timeline } from '@/components/shared/Timeline';
import { PageHeading } from '@/components/shared/common';
import { useShipment, useTrackingEvents, useCompanySettings, useCourierShipment, useSaveCourierRef, useMarkCodRemitted, useUpdateParcel, useClientCode, getClientCode } from '@/lib/queries';
import { buildLabelPdf } from '@/lib/label';
import { getPrinter } from '@/providers/print';
import { HubenovQr } from '@/components/shared/HubenovQr';
import { supabase } from '@/lib/supabase';
import { calculateQuote } from '@/lib/pricing';
import { PLACEHOLDER_RATES } from '@/lib/rates';
import { formatMoney, formatDateTime } from '@/lib/utils';
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
  // Operator-only: resolve the owning client's OT code so we can deep-link to
  // their record from the sender/receiver card.
  const { data: clientCode } = useClientCode(inOperator ? shipment?.client_id : undefined);
  const { data: settings } = useCompanySettings();
  const toast = useToast();
  const [printing, setPrinting] = useState(false);

  // Staff: print the 4×6 label PDF for this parcel (one page per box).
  const printLabel = async () => {
    if (!shipment) return;
    setPrinting(true);
    try {
      const code = clientCode ?? (await getClientCode(shipment.client_id)) ?? '—';
      const pdf = await buildLabelPdf({
        public_code: shipment.public_code,
        awb_barcode: shipment.awb_barcode,
        client_code: code,
        direction: shipment.direction,
        weight_kg: shipment.weight_kg,
        sender: shipment.sender,
        receiver: shipment.receiver,
        is_gift: shipment.is_gift,
        declared_value: shipment.declared_value,
        currency: shipment.currency,
        pieces: shipment.pieces,
        contents: shipment.contents,
        length_cm: shipment.length_cm,
        width_cm: shipment.width_cm,
        height_cm: shipment.height_cm,
      });
      const r = await getPrinter(settings?.print_method).print({ pdf, title: shipment.public_code });
      if (r.queued) toast.info(t('operator.queued_offline'));
      else if (r.ok) toast.success(t('operator.printed'));
      else toast.error(t('common.error'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPrinting(false);
    }
  };

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
          <OnlineBadge shipment={shipment} showRef />
        </div>
        <div className="flex items-center gap-2">
          {inOperator && (
            <Button size="sm" variant="outline" className="gap-1.5" loading={printing} onClick={() => void printLabel()}>
              <Printer className="h-4 w-4" /> {locale === 'en-GB' ? 'Print label' : 'Принтай етикет'}
            </Button>
          )}
          <StatusBadge status={shipment.status} />
        </div>
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
              {inOperator && (
                <Link
                  to={clientCode ? `/op/lookup?code=${encodeURIComponent(clientCode)}` : '/op/clients'}
                  className="-mb-1 flex items-center justify-between gap-2 rounded-xl border-t border-border pt-3 text-sm font-semibold text-brand transition-colors hover:text-brand-600"
                >
                  <span className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" /> {t('operator.view_client')}
                  </span>
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2.5 text-sm">
              <Row
                icon={<Clock className="h-4 w-4" />}
                label={t('common.created')}
                value={formatDateTime(shipment.created_at, locale)}
              />
              {shipment.inbound_ref && (
                <Row icon={<Hash className="h-4 w-4" />} label={t('track.inbound_no')} value={shipment.inbound_ref} />
              )}
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

      {inOperator && <EditParcelPanel shipment={shipment} />}
      <EcontPanel shipment={shipment} inOperator={inOperator} />
      {/* Box QR is a client action (print → stick on the box). Operators scan it
          in at the station, so it only clutters their view — show it client-side. */}
      {!inOperator && <HubenovQr code={shipment.public_code} />}
      {inOperator && <CustomsPanel shipment={shipment} />}
    </div>
  );
}

function EditParcelPanel({ shipment }: { shipment: Shipment }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const locale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const toast = useToast();
  const update = useUpdateParcel();
  const [open, setOpen] = useState(false);
  const [w, setW] = useState(String(shipment.weight_kg));
  const [l, setL] = useState(String(shipment.length_cm));
  const [wd, setWd] = useState(String(shipment.width_cm));
  const [h, setH] = useState(String(shipment.height_cm));
  const [dv, setDv] = useState(String(shipment.declared_value));
  const [price, setPrice] = useState(shipment.price != null ? String(shipment.price) : '');

  const L =
    lang === 'bg'
      ? {
          title: 'Редактирай пратка',
          edit: 'Редактирай',
          weight: 'Тегло (кг)',
          dims: 'Размери Д×Ш×В (см)',
          declared: 'Обявена стойност',
          price: 'Цена за доставка',
          suggested: 'Препоръчана',
          save: 'Запази',
          cancel: 'Отказ',
          saved: 'Пратката е обновена',
          note: 'Промяната обновява и свързаната неплатена фактура.',
        }
      : {
          title: 'Edit parcel',
          edit: 'Edit',
          weight: 'Weight (kg)',
          dims: 'Dimensions L×W×H (cm)',
          declared: 'Declared value',
          price: 'Delivery price',
          suggested: 'Suggested',
          save: 'Save',
          cancel: 'Cancel',
          saved: 'Parcel updated',
          note: 'This also updates the linked unpaid invoice.',
        };

  const num = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const quote = useMemo(() => {
    try {
      return calculateQuote(
        {
          direction: shipment.direction,
          weight_kg: num(w),
          length_cm: num(l),
          width_cm: num(wd),
          height_cm: num(h),
          is_gift: shipment.is_gift,
          remote_area: false,
          currency: shipment.currency,
        },
        PLACEHOLDER_RATES,
      );
    } catch {
      return null;
    }
  }, [w, l, wd, h, shipment.direction, shipment.is_gift, shipment.currency]);

  const onSave = async () => {
    try {
      await update.mutateAsync({
        id: shipment.id,
        weight_kg: num(w),
        length_cm: num(l),
        width_cm: num(wd),
        height_cm: num(h),
        declared_value: num(dv),
        price: price.trim() === '' ? null : num(price),
      });
      toast.success(L.saved);
      setOpen(false);
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Pencil className="h-4 w-4 text-muted-fg" /> {L.title}
          </h2>
          {!open && (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              {L.edit}
            </Button>
          )}
        </div>

        {open && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={L.weight} htmlFor="ep-w">
                <Input id="ep-w" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} />
              </Field>
              <Field label={L.declared} htmlFor="ep-dv">
                <Input id="ep-dv" inputMode="decimal" value={dv} onChange={(e) => setDv(e.target.value)} />
              </Field>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">{L.dims}</span>
              <div className="grid grid-cols-3 gap-2">
                <Input inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} aria-label="L" />
                <Input inputMode="decimal" value={wd} onChange={(e) => setWd(e.target.value)} aria-label="W" />
                <Input inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} aria-label="H" />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Field label={L.price} htmlFor="ep-price">
                  <Input id="ep-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                </Field>
              </div>
              {quote && (
                <button
                  type="button"
                  onClick={() => setPrice(String(quote.total))}
                  className="mb-px shrink-0 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  {L.suggested}: {formatMoney(quote.total, shipment.currency, locale)}
                </button>
              )}
            </div>

            <p className="text-xs text-muted-fg">{L.note}</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                {L.cancel}
              </Button>
              <Button size="sm" loading={update.isPending} onClick={() => void onSave()} className="gap-2">
                <Save className="h-4 w-4" /> {L.save}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function EcontPanel({ shipment, inOperator }: { shipment: Shipment; inOperator: boolean }) {
  const { i18n } = useTranslation();
  const lang: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const locale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const toast = useToast();
  const { data: courier } = useCourierShipment(shipment.id);
  const save = useSaveCourierRef();
  const markRemit = useMarkCodRemitted();
  const [ref, setRef] = useState('');
  const [cod, setCod] = useState('');

  useEffect(() => {
    setRef(courier?.carrier_ref ?? '');
    setCod(courier?.cod_amount != null ? String(courier.cod_amount) : '');
  }, [courier?.carrier_ref, courier?.cod_amount]);

  if (!inOperator && !courier?.carrier_ref) return null;

  const TRACK_URL = 'https://www.econt.com/en/services/track-shipment';
  const L =
    lang === 'bg'
      ? {
          title: 'Еконт (последна миля)',
          sub: 'Въведи номера от Еконт и сумата за наложен платеж при предаване.',
          ref: 'Номер на товарителница (Еконт)',
          cod: 'Наложен платеж',
          track: 'Проследи в Еконт',
          save: 'Запази',
          saved: 'Запазено',
          err: 'Грешка',
          remitTitle: 'Превод на COD от Еконт',
          remitAwaiting: 'очаква получаване',
          remitDone: 'получено',
          markReceived: 'Отбележи получено',
          markUndo: 'Отмени',
        }
      : {
          title: 'Econt (last mile)',
          sub: 'Enter the Econt tracking number and COD amount at handoff.',
          ref: 'Econt tracking number',
          cod: 'Cash on delivery',
          track: 'Track on Econt',
          save: 'Save',
          saved: 'Saved',
          err: 'Error',
          remitTitle: 'COD payout from Econt',
          remitAwaiting: 'awaiting receipt',
          remitDone: 'received',
          markReceived: 'Mark received',
          markUndo: 'Undo',
        };

  const onSave = async () => {
    try {
      await save.mutateAsync({
        shipment_id: shipment.id,
        carrier_ref: ref.trim() || null,
        cod_amount: cod.trim() ? Number(cod.replace(',', '.')) : null,
        cod_currency: cod.trim() ? shipment.currency : null,
      });
      toast.success(L.saved);
    } catch {
      toast.error(L.err);
    }
  };

  return (
    <Card className="mt-6">
      <CardBody className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
          <Truck className="h-4 w-4 text-brand" /> {L.title}
        </h2>

        {inOperator ? (
          <>
            <p className="text-sm text-muted-fg">{L.sub}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-fg">{L.ref}</span>
                <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="1051..." className="font-mono" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-fg">{L.cod}</span>
                <Input inputMode="decimal" value={cod} onChange={(e) => setCod(e.target.value)} placeholder="0.00" />
              </label>
            </div>
            <div className="flex items-center justify-between gap-3">
              {courier?.carrier_ref ? (
                <a href={TRACK_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand">
                  {L.track} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span />
              )}
              <Button size="sm" loading={save.isPending} onClick={() => void onSave()} className="gap-2">
                <Save className="h-4 w-4" /> {L.save}
              </Button>
            </div>

            {shipment.status === 'delivered' && courier?.cod_amount != null && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{L.remitTitle}</p>
                  <p className="text-xs text-muted-fg">
                    {formatMoney(courier.cod_amount, shipment.currency, locale)} ·{' '}
                    {courier.cod_remitted_at ? L.remitDone : L.remitAwaiting}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={courier.cod_remitted_at ? 'outline' : 'primary'}
                  loading={markRemit.isPending}
                  onClick={() => markRemit.mutate({ shipment_id: shipment.id, remitted: !courier.cod_remitted_at })}
                  className="shrink-0"
                >
                  {courier.cod_remitted_at ? L.markUndo : L.markReceived}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-fg">{L.ref}</span>
              <span className="font-mono font-semibold text-foreground">{courier?.carrier_ref}</span>
            </div>
            {courier?.cod_amount != null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-fg">{L.cod}</span>
                <span className="font-semibold text-foreground">{formatMoney(courier.cod_amount, shipment.currency, locale)}</span>
              </div>
            )}
            <a href={TRACK_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 pt-1 text-sm text-brand">
              {L.track} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </CardBody>
    </Card>
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
          qty: 'Количество',
          unit: 'Единична стойност',
          remove: 'Премахни реда',
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
          qty: 'Quantity',
          unit: 'Unit value',
          remove: 'Remove line',
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
              <Input type="number" min="1" step="1" value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) || 1 })} aria-label={L.qty} />
              <Input type="number" min="0" step="0.01" value={it.unit_value} onChange={(e) => setItem(i, { unit_value: Number(e.target.value) || 0 })} aria-label={L.unit} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} aria-label={L.remove} className="px-2">
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
              <p key={w} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
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
          {[
            [p.line1, p.line2].filter(Boolean).join(', '),
            [p.postcode, p.city].filter(Boolean).join(' '),
            p.country,
          ]
            .filter(Boolean)
            .join(', ')}
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
