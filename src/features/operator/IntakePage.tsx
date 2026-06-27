import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useForm,
  type SubmitHandler,
  type UseFormRegister,
  type FieldErrors,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { m as motion } from 'framer-motion';
import {
  UserSearch,
  UserPlus,
  CheckCircle2,
  PackagePlus,
  ScanLine,
  ArrowRight,
  Copy,
  Search,
} from 'lucide-react';
import { Button, Card, CardBody, Input, Select, Field, Badge, Spinner } from '@/components/ui';
import { PageHeading } from '@/components/shared/common';
import { EcontOfficePicker } from '@/components/shared/EcontOfficePicker';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useClients, useCreateInvoice, useCompanySettings, getClientCode } from '@/lib/queries';
import { transliterate } from '@/lib/translit';
import { buildLabelPdf } from '@/lib/label';
import { getPrinter } from '@/providers/print';
import { supabase } from '@/lib/supabase';
import { shipmentInputSchema, type ShipmentInput } from '@/schemas';
import type { Shipment, Country, Direction, ParcelType, Currency } from '@/types/domain';

interface ResolvedClient {
  id: string;
  full_name: string;
  client_code: string;
}

const PARCEL_TYPES: ParcelType[] = ['parcel', 'document', 'pallet', 'food', 'other'];
const CURRENCIES: Currency[] = ['GBP', 'EUR', 'BGN'];

/** Country pairing follows the chosen direction (UK_BG → sender GB / receiver BG). */
function countriesFor(direction: Direction): { sender: Country; receiver: Country } {
  return direction === 'UK_BG'
    ? { sender: 'GB', receiver: 'BG' }
    : { sender: 'BG', receiver: 'GB' };
}

export function IntakePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const toast = useToast();
  const { profile } = useAuth();
  const operatorId = profile?.id ?? null;

  const L =
    locale === 'bg'
      ? {
          client_code: 'ОТ номер на клиент',
          client_code_hint: 'Въведете и натиснете Enter, за да заредите клиента.',
          search_client: 'Търси клиент по име или телефон…',
          no_matches: 'Няма съвпадения',
          or: 'или',
          resolving: 'Търсене на клиент…',
          resolved: 'Клиент зареден',
          direction: 'Посока',
          parcel_type: 'Тип пратка',
          is_gift: 'Подарък / лична пратка',
          sender: 'Подател',
          receiver: 'Получател',
          parcel: 'Колет',
          weight_kg: 'Тегло (кг)',
          length_cm: 'Дължина (см)',
          width_cm: 'Ширина (см)',
          height_cm: 'Височина (см)',
          price: 'Цена за доставка',
          price_hint: 'Сумата, която таксувате клиента — създава фактура автоматично.',
          invoice_created: 'Фактура е създадена:',
          declared_value: 'Декларирана стойност',
          declared_hint: 'Стойност на стоката за митница/застраховка — не е цената за доставка.',
          currency: 'Валута',
          line1: 'Адрес',
          econt_office: 'Офис на Еконт (по избор)',
          need_client: 'Заредете клиент, за да създадете пратка.',
          new_client: 'Нов клиент (без профил)',
          new_client_hint: 'Няма такъв клиент? Създайте го — веднага получава ОТ номер за проследяване.',
          email_label: 'Имейл (по избор)',
          create_client: 'Създай клиент',
          created_title: 'Пратката е създадена',
          created_code: 'Номер на пратката',
          to_scan: 'Към сканиране и печат',
          copy: 'Копирай',
          copied: 'Копирано',
          parcel_types: {
            parcel: 'Колет',
            document: 'Документ',
            pallet: 'Палет',
            food: 'Храна',
            other: 'Друго',
          } as Record<ParcelType, string>,
        }
      : {
          client_code: 'Client OT code',
          client_code_hint: 'Type and press Enter to load the client.',
          search_client: 'Search client by name or phone…',
          no_matches: 'No matches',
          or: 'or',
          resolving: 'Resolving client…',
          resolved: 'Client loaded',
          direction: 'Direction',
          parcel_type: 'Parcel type',
          is_gift: 'Gift / personal parcel',
          sender: 'Sender',
          receiver: 'Receiver',
          parcel: 'Parcel',
          weight_kg: 'Weight (kg)',
          length_cm: 'Length (cm)',
          width_cm: 'Width (cm)',
          height_cm: 'Height (cm)',
          price: 'Delivery price',
          price_hint: 'What you charge the customer — creates an invoice automatically.',
          invoice_created: 'Invoice created:',
          declared_value: 'Declared value',
          declared_hint: 'Value of the goods for customs/insurance — not the delivery price.',
          currency: 'Currency',
          line1: 'Address',
          econt_office: 'Econt office (optional)',
          need_client: 'Resolve a client to create a shipment.',
          new_client: 'New client (no account)',
          new_client_hint: 'No such client? Create them — they get an OT number for tracking instantly.',
          email_label: 'Email (optional)',
          create_client: 'Create client',
          created_title: 'Shipment created',
          created_code: 'Shipment code',
          to_scan: 'To scan & print',
          copy: 'Copy',
          copied: 'Copied',
          parcel_types: {
            parcel: 'Parcel',
            document: 'Document',
            pallet: 'Pallet',
            food: 'Food',
            other: 'Other',
          } as Record<ParcelType, string>,
        };

  /* ── Client resolution ─────────────────────────────────────────────────── */
  const [codeInput, setCodeInput] = useState('');
  const [client, setClient] = useState<ResolvedClient | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const lastResolved = useRef<string>('');
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });
  const [creatingClient, setCreatingClient] = useState(false);

  // Search clients by name/phone — no OT number needed.
  const { data: allClients } = useClients();
  const createInvoice = useCreateInvoice();
  const [clientSearch, setClientSearch] = useState('');
  const clientMatches = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return [];
    return (allClients ?? [])
      .filter((c) =>
        [c.full_name, transliterate(c.full_name), c.client_code, c.phone ?? '', c.email ?? ''].some((h) =>
          h.toLowerCase().includes(q),
        ),
      )
      .slice(0, 6);
  }, [allClients, clientSearch]);
  const pickClient = (c: { id: string; full_name: string; client_code: string }) => {
    setClient({ id: c.id, full_name: c.full_name, client_code: c.client_code });
    setNotFound(false);
    setClientSearch('');
    setCodeInput(c.client_code);
    lastResolved.current = c.client_code;
  };

  const resolveClient = async (override?: string) => {
    const code = (override ?? codeInput).trim().toUpperCase();
    if (!code || code === lastResolved.current) return;
    lastResolved.current = code;
    setResolving(true);
    setNotFound(false);
    setClient(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,client_code')
        .eq('client_code', code)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setClient(data as ResolvedClient);
      } else {
        setNotFound(true);
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setResolving(false);
    }
  };

  // Create a walk-in client (no login account yet) — instant OT number.
  const createWalkIn = async () => {
    if (!newClient.name.trim() || !newClient.phone.trim()) {
      toast.error(t('common.error'));
      return;
    }
    setCreatingClient(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        // `as never`: generated types predate nullable user_id + client_code
        // default (migration 0009). Regenerate later with `npm run db:types`.
        .insert({
          role: 'client',
          full_name: newClient.name.trim(),
          phone: newClient.phone.trim(),
          email: newClient.email.trim() || null,
          preferred_locale: 'bg',
        } as never)
        .select('id,full_name,client_code')
        .single();
      if (error) throw error;
      setClient(data as ResolvedClient);
      setNotFound(false);
      setNewClient({ name: '', phone: '', email: '' });
      toast.success((data as ResolvedClient).client_code);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setCreatingClient(false);
    }
  };

  const onCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void resolveClient();
    }
  };

  // Deep-link: /op/intake?code=HB-XXXX (e.g. "New shipment" from a client record).
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const c = searchParams.get('code');
    if (!c) return;
    const v = c.trim().toUpperCase();
    setCodeInput(v);
    void resolveClient(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Deep-link from the Inbound scan: remember the external ref + prefill receiver.
  useEffect(() => {
    const inb = searchParams.get('inbound');
    if (!inb) return;
    setInboundRef(inb.toUpperCase());
    autoPrintRef.current = searchParams.get('autoprint') === '1';
    const fields: Array<[string, 'receiver.name' | 'receiver.phone' | 'receiver.line1' | 'receiver.city' | 'receiver.postcode']> = [
      ['rname', 'receiver.name'],
      ['rphone', 'receiver.phone'],
      ['raddr', 'receiver.line1'],
      ['rcity', 'receiver.city'],
      ['rpost', 'receiver.postcode'],
    ];
    for (const [q, field] of fields) {
      const val = searchParams.get(q);
      if (val) setValue(field, val);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* ── Shipment form ─────────────────────────────────────────────────────── */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShipmentInput>({
    resolver: zodResolver(shipmentInputSchema),
    defaultValues: {
      direction: 'UK_BG',
      parcel_type: 'parcel',
      is_gift: false,
      currency: 'GBP',
      sender: { name: '', phone: '', line1: '', city: '', postcode: '', country: 'GB' },
      receiver: {
        name: '',
        phone: '',
        line1: '',
        city: '',
        postcode: '',
        country: 'BG',
        econt_office_code: '',
      },
    },
  });

  const direction = watch('direction');

  // Keep party countries consistent with the chosen direction.
  useEffect(() => {
    const { sender, receiver } = countriesFor(direction);
    setValue('sender.country', sender);
    setValue('receiver.country', receiver);
  }, [direction, setValue]);

  // Prefill the sender from the loaded/created client (they're the account holder).
  useEffect(() => {
    if (client) setValue('sender.name', client.full_name);
  }, [client, setValue]);

  const { data: settings } = useCompanySettings();
  const [inboundRef, setInboundRef] = useState<string | null>(null);
  const autoPrintRef = useRef(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  // Bring the green "created" panel into view (the Create button sits far down
  // the form, so the confirmation would otherwise appear off-screen).
  useEffect(() => {
    if (createdCode) successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [createdCode]);

  const copyCreated = () => {
    if (!createdCode) return;
    void navigator.clipboard.writeText(createdCode);
    setCopied(true);
    toast.success(createdCode);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const onSubmit: SubmitHandler<ShipmentInput> = async (data) => {
    if (!client || !operatorId) return;
    try {
      const { sender, receiver } = countriesFor(data.direction);
      const { data: row, error } = await supabase
        .from('shipments')
        .insert({
          direction: data.direction,
          parcel_type: data.parcel_type,
          is_gift: data.is_gift,
          sender: { ...data.sender, country: sender },
          receiver: {
            ...data.receiver,
            country: receiver,
            econt_office_code: data.receiver.econt_office_code || null,
          },
          weight_kg: data.weight_kg,
          length_cm: data.length_cm,
          width_cm: data.width_cm,
          height_cm: data.height_cm,
          declared_value: data.declared_value,
          price: data.price ?? null,
          currency: data.currency,
          notes: data.notes ?? null,
          client_id: client.id,
          created_by: operatorId,
          status: 'collected_uk',
          inbound_ref: inboundRef,
        } as never)
        .select('*')
        .single();
      if (error) throw error;
      const created = row as unknown as Shipment;
      setCreatedCode(created.public_code);
      toast.success(t('wizard.created'));

      // Auto-create the invoice from the delivery price (charge → invoice).
      // Best-effort: a failure here must not undo the created shipment.
      if (data.price && data.price > 0) {
        try {
          const inv = await createInvoice.mutateAsync({
            client_id: client.id,
            amount: data.price,
            currency: data.currency,
            shipment_id: created.id,
          });
          toast.success(`${L.invoice_created} ${inv.number}`);
        } catch {
          /* shipment already created; operator can invoice manually */
        }
      }

      // Inbound auto-print: drop our label straight out of the printer.
      if (autoPrintRef.current) {
        try {
          const clientCode = (await getClientCode(client.id)) ?? '—';
          const pdf = await buildLabelPdf({
            public_code: created.public_code,
            awb_barcode: created.awb_barcode,
            client_code: clientCode,
            direction: created.direction,
            weight_kg: created.weight_kg,
            sender: created.sender,
            receiver: created.receiver,
            is_gift: created.is_gift,
            declared_value: created.declared_value,
            currency: created.currency,
          });
          await getPrinter(settings?.print_method).print({ pdf, title: created.public_code });
        } catch {
          /* operator can reprint from the shipment */
        }
      }
      autoPrintRef.current = false;
      setInboundRef(null);
      reset();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const canSubmit = !!client && !!operatorId;
  const num = { valueAsNumber: true } as const;

  const partyLabels: PartyLabels = {
    name: t('wizard.name'),
    phone: t('wizard.phone'),
    line1: L.line1,
    city: t('wizard.city'),
    postcode: t('wizard.postcode'),
    econt_office: L.econt_office,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading title={t('operator.intake_title')} />

      {inboundRef && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
          <ScanLine className="h-4 w-4 shrink-0" />
          <span>
            {locale === 'bg' ? 'Входяща пратка · реф.' : 'Inbound parcel · ref'}{' '}
            <span className="font-mono font-semibold">{inboundRef}</span>
            {' · '}
            {locale === 'bg' ? 'етикетът ще се отпечата автоматично' : 'label auto-prints on save'}
          </span>
        </div>
      )}

      {/* Step 1 — resolve client by OT code */}
      <Card>
        <CardBody className="space-y-4">
          <Field label={L.client_code} hint={!client ? L.client_code_hint : undefined} htmlFor="ot-code">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="ot-code"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setNotFound(false);
                }}
                onKeyDown={onCodeKeyDown}
                onBlur={() => void resolveClient()}
                placeholder={t('operator.lookup_placeholder')}
                className="flex-1 font-mono uppercase"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                loading={resolving}
                onClick={() => void resolveClient()}
              >
                <UserSearch className="h-4 w-4" /> {t('operator.lookup_button')}
              </Button>
            </div>
          </Field>

          {resolving && (
            <div className="flex items-center gap-2 text-sm text-muted-fg">
              <Spinner className="h-4 w-4" /> {L.resolving}
            </div>
          )}

          {client && !resolving && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3"
            >
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-semibold text-foreground">{client.full_name}</span>
              <Badge tone="brand">{client.client_code}</Badge>
              <span className="text-xs text-muted-fg">{L.resolved}</span>
            </motion.div>
          )}

          {!client && !resolving && (
            <div className="space-y-4">
              {/* Search by name / phone — no OT number needed */}
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wide text-muted-fg">{L.or}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
                  <Input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder={L.search_client}
                    className="pl-9"
                  />
                </div>
                {clientSearch.trim() && (
                  <div className="mt-2 space-y-1">
                    {clientMatches.length === 0 ? (
                      <p className="px-1 text-xs text-muted-fg">{L.no_matches}</p>
                    ) : (
                      clientMatches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickClient(c)}
                          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:bg-muted"
                        >
                          <span className="text-sm font-medium text-foreground">{c.full_name || '—'}</span>
                          <span className="font-mono text-xs text-muted-fg">{c.client_code}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* New walk-in client */}
              <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
                {notFound && <p className="text-sm font-medium text-danger">{t('operator.lookup_not_found')}</p>}
                <p className="text-sm font-semibold text-foreground">{L.new_client}</p>
                <p className="text-xs text-muted-fg">{L.new_client_hint}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    placeholder={t('wizard.name')}
                    value={newClient.name}
                    onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))}
                  />
                  <Input
                    placeholder={t('wizard.phone')}
                    value={newClient.phone}
                    onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))}
                  />
                  <Input
                    placeholder={L.email_label}
                    value={newClient.email}
                    onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
                <Button type="button" className="gap-2" loading={creatingClient} onClick={() => void createWalkIn()}>
                  <UserPlus className="h-4 w-4" /> {L.create_client}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Step 2 — success panel */}
      {createdCode && (
        <motion.div
          ref={successRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-5"
        >
          <Card className="border-success/40 bg-success/5">
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> {L.created_title}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-fg">
                  {L.created_code}
                </p>
                <button
                  type="button"
                  onClick={copyCreated}
                  className="mt-1 flex items-center gap-2 font-mono text-2xl font-extrabold text-brand-700"
                >
                  {createdCode}
                  <Copy className="h-4 w-4 text-muted-fg" />
                  {copied && <span className="text-xs font-medium text-success">{L.copied}</span>}
                </button>
              </div>
              <Link to="/op/scan">
                <Button className="gap-2">
                  <ScanLine className="h-4 w-4" /> {L.to_scan} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Step 3 — shipment form */}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-5 space-y-5">
        <Card>
          <CardBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.direction} error={errors.direction?.message} htmlFor="direction">
                <Select id="direction" {...register('direction')}>
                  <option value="UK_BG">{t('services.uk_bg')}</option>
                  <option value="BG_UK">{t('services.bg_uk')}</option>
                </Select>
              </Field>
              <Field label={L.parcel_type} error={errors.parcel_type?.message} htmlFor="parcel_type">
                <Select id="parcel_type" {...register('parcel_type')}>
                  {PARCEL_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {L.parcel_types[p]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                {...register('is_gift')}
                className="h-4 w-4 rounded border-input text-brand focus-visible:ring-2 focus-visible:ring-ring"
              />
              {L.is_gift}
            </label>
          </CardBody>
        </Card>

        {/* Sender */}
        <PartyFields
          prefix="sender"
          title={L.sender}
          register={register}
          errors={errors}
          labels={partyLabels}
          withOffice={false}
        />

        {/* Receiver */}
        <PartyFields
          prefix="receiver"
          title={L.receiver}
          register={register}
          errors={errors}
          labels={partyLabels}
          withOffice={false}
        />

        {/* Econt office (optional) — searchable by city/postcode, Cyrillic + Latin */}
        <Card>
          <CardBody className="space-y-3">
            <h3 className="font-display text-sm font-bold text-foreground">{L.econt_office}</h3>
            <EcontOfficePicker
              selected={watch('receiver.econt_office_code') || null}
              onPick={(o) => {
                setValue('receiver.econt_office_code', o.code);
                if (!(watch('receiver.city') ?? '').trim()) setValue('receiver.city', o.city);
              }}
              onClear={() => setValue('receiver.econt_office_code', '')}
            />
          </CardBody>
        </Card>

        {/* Pre-register an inbound parcel (Amazon/courier) — its barcode will match on arrival */}
        <Card>
          <CardBody className="space-y-2">
            <label htmlFor="inbound-ref" className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <ScanLine className="h-4 w-4 text-muted-fg" />
              {locale === 'bg'
                ? 'Входящ номер (Amazon/куриер) — по избор'
                : 'Incoming tracking № (Amazon/courier) — optional'}
            </label>
            <Input
              id="inbound-ref"
              value={inboundRef ?? ''}
              onChange={(e) => setInboundRef(e.target.value.toUpperCase() || null)}
              placeholder={locale === 'bg' ? 'напр. TBA123… / товарителница' : 'e.g. TBA123… / waybill'}
              className="font-mono"
            />
            <p className="text-xs text-muted-fg">
              {locale === 'bg'
                ? 'Сканирането на този баркод при пристигане ще намери пратката и ще отпечата етикета.'
                : 'Scanning this barcode on arrival will find the parcel and auto-print its label.'}
            </p>
          </CardBody>
        </Card>

        {/* Parcel measurements */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-display text-sm font-bold text-foreground">{L.parcel}</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label={L.weight_kg} error={errors.weight_kg?.message} htmlFor="weight_kg">
                <Input id="weight_kg" type="number" step="0.01" min="0" {...register('weight_kg', num)} />
              </Field>
              <Field label={L.length_cm} error={errors.length_cm?.message} htmlFor="length_cm">
                <Input id="length_cm" type="number" step="0.1" min="0" {...register('length_cm', num)} />
              </Field>
              <Field label={L.width_cm} error={errors.width_cm?.message} htmlFor="width_cm">
                <Input id="width_cm" type="number" step="0.1" min="0" {...register('width_cm', num)} />
              </Field>
              <Field label={L.height_cm} error={errors.height_cm?.message} htmlFor="height_cm">
                <Input id="height_cm" type="number" step="0.1" min="0" {...register('height_cm', num)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={L.price} hint={L.price_hint} error={errors.price?.message} htmlFor="price">
                <Input id="price" type="number" step="0.01" min="0" {...register('price', num)} />
              </Field>
              <Field
                label={L.declared_value}
                hint={L.declared_hint}
                error={errors.declared_value?.message}
                htmlFor="declared_value"
              >
                <Input
                  id="declared_value"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('declared_value', num)}
                />
              </Field>
              <Field label={L.currency} error={errors.currency?.message} htmlFor="currency">
                <Select id="currency" {...register('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        {!canSubmit && <p className="text-sm text-muted-fg">{L.need_client}</p>}

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="gap-2" loading={isSubmitting} disabled={!canSubmit}>
            <PackagePlus className="h-4 w-4" /> {t('wizard.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ── Party (sender/receiver) sub-form ──────────────────────────────────────── */
type PartyPrefix = 'sender' | 'receiver';

interface PartyLabels {
  name: string;
  phone: string;
  line1: string;
  city: string;
  postcode: string;
  econt_office: string;
}

function PartyFields({
  prefix,
  title,
  register,
  errors,
  labels,
  withOffice,
}: {
  prefix: PartyPrefix;
  title: string;
  register: UseFormRegister<ShipmentInput>;
  errors: FieldErrors<ShipmentInput>;
  labels: PartyLabels;
  withOffice: boolean;
}) {
  const e = errors[prefix];
  const wizardName = (id: string) => `${prefix}-${id}`;
  return (
    <Card>
      <CardBody className="space-y-4">
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.name} error={e?.name?.message} htmlFor={wizardName('name')}>
            <Input id={wizardName('name')} autoComplete="hb-no-name" {...register(`${prefix}.name`)} />
          </Field>
          <Field label={labels.phone} error={e?.phone?.message} htmlFor={wizardName('phone')}>
            <Input id={wizardName('phone')} autoComplete="hb-no-tel" {...register(`${prefix}.phone`)} />
          </Field>
        </div>
        <Field label={labels.line1} error={e?.line1?.message} htmlFor={wizardName('line1')}>
          <Input id={wizardName('line1')} autoComplete="hb-no-addr" {...register(`${prefix}.line1`)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.city} error={e?.city?.message} htmlFor={wizardName('city')}>
            <Input id={wizardName('city')} autoComplete="hb-no-city" {...register(`${prefix}.city`)} />
          </Field>
          <Field label={labels.postcode} error={e?.postcode?.message} htmlFor={wizardName('postcode')}>
            <Input id={wizardName('postcode')} autoComplete="hb-no-zip" {...register(`${prefix}.postcode`)} />
          </Field>
        </div>
        {withOffice && (
          <Field label={labels.econt_office} htmlFor={wizardName('econt')}>
            <Input
              id={wizardName('econt')}
              autoComplete="off"
              className="font-mono"
              {...register('receiver.econt_office_code')}
            />
          </Field>
        )}
      </CardBody>
    </Card>
  );
}
