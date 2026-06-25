import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useForm,
  type SubmitHandler,
  type UseFormRegister,
  type FieldErrors,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  UserSearch,
  CheckCircle2,
  PackagePlus,
  ScanLine,
  ArrowRight,
  Copy,
} from 'lucide-react';
import { Button, Card, CardBody, Input, Select, Field, Badge, Spinner } from '@/components/ui';
import { PageHeading } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
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
          declared_value: 'Декларирана стойност',
          currency: 'Валута',
          line1: 'Адрес',
          econt_office: 'Офис на Еконт (по избор)',
          need_client: 'Заредете клиент, за да създадете пратка.',
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
          declared_value: 'Declared value',
          currency: 'Currency',
          line1: 'Address',
          econt_office: 'Econt office (optional)',
          need_client: 'Resolve a client to create a shipment.',
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

  const resolveClient = async () => {
    const code = codeInput.trim().toUpperCase();
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

  const onCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void resolveClient();
    }
  };

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

  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
          currency: data.currency,
          notes: data.notes ?? null,
          client_id: client.id,
          created_by: operatorId,
          status: 'collected_uk',
        })
        .select('*')
        .single();
      if (error) throw error;
      const created = row as unknown as Shipment;
      setCreatedCode(created.public_code);
      toast.success(t('wizard.created'));
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

          {notFound && !resolving && (
            <p className="text-sm font-medium text-danger">{t('operator.lookup_not_found')}</p>
          )}
        </CardBody>
      </Card>

      {/* Step 2 — success panel */}
      {createdCode && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-5"
        >
          <Card className="border-success/40">
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">
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
          withOffice
        />

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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={L.declared_value}
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
            <Input id={wizardName('name')} autoComplete="off" {...register(`${prefix}.name`)} />
          </Field>
          <Field label={labels.phone} error={e?.phone?.message} htmlFor={wizardName('phone')}>
            <Input id={wizardName('phone')} autoComplete="off" {...register(`${prefix}.phone`)} />
          </Field>
        </div>
        <Field label={labels.line1} error={e?.line1?.message} htmlFor={wizardName('line1')}>
          <Input id={wizardName('line1')} autoComplete="off" {...register(`${prefix}.line1`)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.city} error={e?.city?.message} htmlFor={wizardName('city')}>
            <Input id={wizardName('city')} autoComplete="off" {...register(`${prefix}.city`)} />
          </Field>
          <Field label={labels.postcode} error={e?.postcode?.message} htmlFor={wizardName('postcode')}>
            <Input id={wizardName('postcode')} autoComplete="off" {...register(`${prefix}.postcode`)} />
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
