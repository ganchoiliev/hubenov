import { useEffect, useState, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, m as motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Card, CardBody, Field, Input, Select } from '@/components/ui';
import { PageHeading } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useCreateShipment } from '@/lib/queries';
import { EcontOfficePicker } from '@/components/shared/EcontOfficePicker';
import { shipmentInputSchema, type ShipmentInput } from '@/schemas';
import { calculateQuote } from '@/lib/pricing';
import { PLACEHOLDER_RATES } from '@/lib/rates';
import { formatMoney, cn } from '@/lib/utils';

const STEPS = ['wizard.step_route', 'wizard.step_sender', 'wizard.step_receiver', 'wizard.step_parcel', 'wizard.step_review'] as const;

export function NewShipmentPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const toast = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createShipment = useCreateShipment();
  const [step, setStep] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<'address' | 'office'>('address');
  const [agreed, setAgreed] = useState(false);
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const stepDescriptions =
    lang === 'bg'
      ? ['Посока и вид на пратката', 'Кой изпраща пратката', 'Кой получава пратката', 'Тегло, размери и стойност', 'Преглед и потвърждение']
      : ['Direction & parcel type', 'Who is sending', 'Who receives', 'Weight, size & value', 'Review & confirm'];

  const form = useForm<ShipmentInput>({
    resolver: zodResolver(shipmentInputSchema),
    mode: 'onTouched',
    defaultValues: {
      direction: 'UK_BG',
      parcel_type: 'parcel',
      is_gift: true,
      currency: 'GBP',
      weight_kg: 5,
      length_cm: 30,
      width_cm: 30,
      height_cm: 30,
      declared_value: 0,
      sender: { country: 'GB', name: '', phone: '', line1: '', city: '', postcode: '' },
      receiver: { country: 'BG', name: '', phone: '', line1: '', city: '', postcode: '' },
    },
  });
  const { register, handleSubmit, watch, setValue, trigger, formState } = form;
  const direction = watch('direction');

  // Keep party countries consistent with the chosen direction.
  useEffect(() => {
    if (direction === 'UK_BG') {
      setValue('sender.country', 'GB');
      setValue('receiver.country', 'BG');
    } else {
      setValue('sender.country', 'BG');
      setValue('receiver.country', 'GB');
    }
  }, [direction, setValue]);

  // Prefill sender from the client's most recent shipment (or their profile) so
  // they never retype their own details. Runs once when the profile loads.
  useEffect(() => {
    if (!profile) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from('shipments')
        .select('sender')
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      const s = (data?.sender ?? null) as Partial<ShipmentInput['sender']> | null;
      if (s && s.name) {
        setValue('sender.name', s.name ?? '');
        setValue('sender.phone', s.phone ?? '');
        setValue('sender.line1', s.line1 ?? '');
        setValue('sender.city', s.city ?? '');
        setValue('sender.postcode', s.postcode ?? '');
      } else {
        setValue('sender.name', profile.full_name ?? '');
        setValue('sender.phone', profile.phone ?? '');
      }
    })();
    return () => {
      active = false;
    };
  }, [profile, setValue]);

  const stepFields: (keyof ShipmentInput | `sender.${string}` | `receiver.${string}`)[][] = [
    ['direction', 'parcel_type', 'is_gift'],
    ['sender.name', 'sender.phone', 'sender.line1', 'sender.city', 'sender.postcode'],
    ['receiver.name', 'receiver.phone', 'receiver.line1', 'receiver.city', 'receiver.postcode'],
    ['weight_kg', 'length_cm', 'width_cm', 'height_cm', 'declared_value'],
  ];

  const next = async () => {
    const fields = stepFields[step];
    if (fields) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ok = await trigger(fields as any);
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: ShipmentInput) => {
    if (!profile) return;
    try {
      const shipment = await createShipment.mutateAsync({
        ...data,
        client_id: profile.id,
        created_by: profile.id,
      });
      toast.success(t('wizard.created'));
      navigate(`/portal/shipments/${shipment.id}`);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const values = watch();
  const quote = safeQuote(values);
  const receiverIsBg = watch('receiver.country') === 'BG';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading title={t('wizard.title')} />

      {/* Stepper — numbered circles with labels (labels hidden on small screens) */}
      <div className="mb-8 flex items-start">
        {STEPS.map((s, i) => (
          <Fragment key={s}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  i < step && 'bg-brand text-brand-fg',
                  i === step && 'bg-brand text-brand-fg ring-4 ring-brand/20',
                  i > step && 'bg-muted text-muted-fg',
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'mt-2 hidden w-20 text-center text-[11px] font-medium leading-tight sm:block',
                  i === step ? 'text-foreground' : 'text-muted-fg',
                )}
              >
                {t(s)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mt-4 h-0.5 flex-1 transition-colors', i < step ? 'bg-brand' : 'bg-border')} />
            )}
          </Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardBody className="min-h-[320px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-5">
                  <h2 className="font-display text-lg font-bold text-foreground">{t(STEPS[step]!)}</h2>
                  <p className="mt-1 text-sm text-muted-fg">{stepDescriptions[step]}</p>
                </div>

                {step === 0 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('quote.direction')}>
                      <Select {...register('direction')}>
                        <option value="UK_BG">{t('services.uk_bg')}</option>
                        <option value="BG_UK">{t('services.bg_uk')}</option>
                      </Select>
                    </Field>
                    <Field label={t('quote.parcel_type')}>
                      <Select {...register('parcel_type')}>
                        <option value="parcel">{lang === 'bg' ? 'Колет' : 'Parcel'}</option>
                        <option value="document">{lang === 'bg' ? 'Документи' : 'Documents'}</option>
                        <option value="food">{lang === 'bg' ? 'Храна' : 'Food'}</option>
                        <option value="other">{lang === 'bg' ? 'Друго' : 'Other'}</option>
                      </Select>
                    </Field>
                    <Field label={t('quote.is_gift')}>
                      <Select {...register('is_gift', { setValueAs: (v) => v === 'true' })}>
                        <option value="true">{t('services.gifts')}</option>
                        <option value="false">{t('services.goods')}</option>
                      </Select>
                    </Field>
                  </div>
                )}

                {step === 1 && <PartyForm prefix="sender" register={register} errors={formState.errors} t={t} />}

                {step === 2 && (
                  <ReceiverStep
                    register={register}
                    errors={formState.errors}
                    t={t}
                    lang={lang}
                    isBg={receiverIsBg}
                    mode={deliveryMode}
                    setMode={setDeliveryMode}
                    setValue={setValue}
                    officeCode={watch('receiver.econt_office_code') ?? null}
                  />
                )}

                {step === 3 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('quote.weight_label')} error={formState.errors.weight_kg?.message}>
                      <Input type="number" step="0.1" min="0.1" {...register('weight_kg', { valueAsNumber: true })} />
                    </Field>
                    <Field label={t('quote.declared_value')} error={formState.errors.declared_value?.message}>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg">£</span>
                        <Input type="number" step="1" min="0" className="pl-7" {...register('declared_value', { valueAsNumber: true })} />
                      </div>
                      <p className="mt-1 text-xs text-muted-fg">
                        {lang === 'bg'
                          ? 'Приблизителна стойност на съдържанието — за митница и застраховка.'
                          : 'Approx. value of the contents — for customs & insurance.'}
                      </p>
                    </Field>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium">{t('quote.dimensions')}</label>
                      <div className="grid grid-cols-3 gap-3">
                        <Input type="number" min="1" {...register('length_cm', { valueAsNumber: true })} />
                        <Input type="number" min="1" {...register('width_cm', { valueAsNumber: true })} />
                        <Input type="number" min="1" {...register('height_cm', { valueAsNumber: true })} />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Field
                        label={lang === 'bg' ? 'Съдържание (за митница)' : 'Contents (for customs)'}
                        error={formState.errors.contents?.message}
                      >
                        <Input
                          {...register('contents')}
                          placeholder={lang === 'bg' ? 'напр. дрехи, очила, картичка' : 'e.g. clothes, glasses, card'}
                        />
                      </Field>
                    </div>
                    {quote && (
                      <div className="rounded-xl border border-brand/20 bg-brand-50 p-4 sm:col-span-2 dark:bg-brand-50/20">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-fg">{t('quote.result_total')}</p>
                            <p className="font-display text-3xl font-extrabold text-brand-700">
                              {formatMoney(quote.total, quote.currency, locale)}
                            </p>
                          </div>
                          <div className="text-right text-xs leading-relaxed text-muted-fg">
                            <p>
                              {lang === 'bg' ? 'Таксувано тегло' : 'Chargeable weight'}:{' '}
                              <span className="font-semibold text-foreground">
                                {quote.chargeable_weight_kg} {t('common.kg')}
                              </span>
                            </p>
                            <p className="mt-0.5">{lang === 'bg' ? quote.eta_text_bg : quote.eta_text_en}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <>
                    <Review values={values} quote={quote} locale={locale} t={t} lang={lang} />
                    <label className="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-brand"
                      />
                      <span className="text-muted-fg">
                        {lang === 'bg'
                          ? 'Потвърждавам, че пратката не съдържа забранени артикули и съм запознат с '
                          : 'I confirm the parcel contains no prohibited items and I have read the '}
                        <Link to="/rules" target="_blank" className="font-medium text-brand-700 hover:underline">
                          {lang === 'bg' ? 'правилата за пратки' : 'shipping rules'}
                        </Link>
                        .
                      </span>
                    </label>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </CardBody>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={prev} disabled={step === 0} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> {t('common.back')}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} className="gap-1">
              {t('common.next')} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" loading={createShipment.isPending} disabled={!agreed}>
              {t('wizard.submit')}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function PartyForm({
  prefix,
  register,
  errors,
  t,
}: {
  prefix: 'sender' | 'receiver';
  register: UseFormRegister<ShipmentInput>;
  errors: FieldErrors<ShipmentInput>;
  t: (k: string) => string;
}) {
  const e = errors[prefix] as Record<string, { message?: string }> | undefined;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={t('wizard.name')} error={e?.name?.message}>
        <Input {...register(`${prefix}.name` as any)} />
      </Field>
      <Field label={t('wizard.phone')} error={e?.phone?.message}>
        <Input {...register(`${prefix}.phone` as any)} />
      </Field>
      <div className="sm:col-span-2">
        <Field label={t('wizard.address')} error={e?.line1?.message}>
          <Input {...register(`${prefix}.line1` as any)} />
        </Field>
      </div>
      <Field label={t('wizard.city')} error={e?.city?.message}>
        <Input {...register(`${prefix}.city` as any)} />
      </Field>
      <Field label={t('wizard.postcode')} error={e?.postcode?.message}>
        <Input {...register(`${prefix}.postcode` as any)} />
      </Field>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */
function ReceiverStep({
  register,
  errors,
  t,
  lang,
  isBg,
  mode,
  setMode,
  setValue,
  officeCode,
}: {
  register: UseFormRegister<ShipmentInput>;
  errors: FieldErrors<ShipmentInput>;
  t: (k: string) => string;
  lang: 'bg' | 'en';
  isBg: boolean;
  mode: 'address' | 'office';
  setMode: (m: 'address' | 'office') => void;
  setValue: (name: any, value: any) => void;
  officeCode: string | null;
}) {
  const e = errors.receiver as Record<string, { message?: string }> | undefined;
  const T =
    lang === 'bg'
      ? { method: 'Начин на доставка', addr: 'До адрес', office: 'До офис на Еконт', hint: 'Изберете офис от списъка по-долу.' }
      : { method: 'Delivery method', addr: 'To address', office: 'To Econt office', hint: 'Pick an office from the list below.' };

  return (
    <div className="space-y-5">
      {/* Name + phone are always needed */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('wizard.name')} error={e?.name?.message}>
          <Input {...register('receiver.name' as any)} />
        </Field>
        <Field label={t('wizard.phone')} error={e?.phone?.message}>
          <Input {...register('receiver.phone' as any)} />
        </Field>
      </div>

      {/* Econt only serves Bulgaria → only offer the choice for BG receivers */}
      {isBg && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">{T.method}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('address');
                setValue('receiver.econt_office_code', null);
              }}
              className={cn(
                'rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                mode === 'address' ? 'border-brand bg-brand text-brand-fg' : 'border-border hover:bg-muted',
              )}
            >
              {T.addr}
            </button>
            <button
              type="button"
              onClick={() => setMode('office')}
              className={cn(
                'rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                mode === 'office' ? 'border-brand bg-brand text-brand-fg' : 'border-border hover:bg-muted',
              )}
            >
              {T.office}
            </button>
          </div>
        </div>
      )}

      {!isBg || mode === 'address' ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={t('wizard.address')} error={e?.line1?.message}>
              <Input {...register('receiver.line1' as any)} />
            </Field>
          </div>
          <Field label={t('wizard.city')} error={e?.city?.message}>
            <Input {...register('receiver.city' as any)} />
          </Field>
          <Field label={t('wizard.postcode')} error={e?.postcode?.message}>
            <Input {...register('receiver.postcode' as any)} />
          </Field>
        </div>
      ) : (
        <div className="space-y-2">
          <EcontOfficePicker
            onPick={(o) => {
              setValue('receiver.econt_office_code', o.code);
              setValue('receiver.city', o.city);
              setValue('receiver.line1', o.address || `Офис ${o.name}`);
              setValue('receiver.postcode', o.code);
            }}
            selected={officeCode}
          />
          {!officeCode && <p className="text-xs text-muted-fg">{T.hint}</p>}
        </div>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function Review({
  values,
  quote,
  locale,
  t,
  lang,
}: {
  values: ShipmentInput;
  quote: ReturnType<typeof safeQuote>;
  locale: string;
  t: (k: string) => string;
  lang: 'bg' | 'en';
}) {
  const L =
    lang === 'bg'
      ? { contents: 'Съдържание', gift: 'Подарък / лична пратка', goods: 'Стока', eta: 'Очаквана доставка', toOffice: 'Офис на Еконт' }
      : { contents: 'Contents', gift: 'Gift / personal', goods: 'Goods', eta: 'Estimated delivery', toOffice: 'Econt office' };
  const parcelLabel = (
    lang === 'bg'
      ? { parcel: 'Колет', document: 'Документи', pallet: 'Палет', food: 'Храна', other: 'Друго' }
      : { parcel: 'Parcel', document: 'Documents', pallet: 'Pallet', food: 'Food', other: 'Other' }
  )[values.parcel_type];
  const r = values.receiver;
  const dest = r.econt_office_code
    ? `${L.toOffice} ${r.econt_office_code}, ${r.city}`
    : `${[r.line1].filter(Boolean).join(', ')}, ${r.postcode} ${r.city}`;

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryParty
          label={t('wizard.step_sender')}
          name={values.sender.name}
          phone={values.sender.phone}
          line={`${values.sender.line1}, ${values.sender.postcode} ${values.sender.city}, ${values.sender.country}`}
        />
        <SummaryParty label={t('wizard.step_receiver')} name={r.name} phone={r.phone} line={`${dest}, ${r.country}`} />
      </div>

      <div className="space-y-2 rounded-xl border border-border p-4">
        <SummaryRow k={L.contents} v={`${parcelLabel} · ${values.is_gift ? L.gift : L.goods}`} />
        <SummaryRow
          k={t('common.weight')}
          v={`${values.weight_kg} ${t('common.kg')} · ${values.length_cm}×${values.width_cm}×${values.height_cm} cm`}
        />
        <SummaryRow k={t('quote.declared_value')} v={formatMoney(values.declared_value, values.currency, locale)} />
        {quote && <SummaryRow k={L.eta} v={lang === 'bg' ? quote.eta_text_bg : quote.eta_text_en} />}
      </div>

      {quote && (
        <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand-50 p-4 dark:bg-brand-50/20">
          <span className="font-semibold text-foreground">{t('quote.result_total')}</span>
          <span className="font-display text-2xl font-extrabold text-brand-700">
            {formatMoney(quote.total, quote.currency, locale)}
          </span>
        </div>
      )}
    </div>
  );
}

function SummaryParty({ label, name, phone, line }: { label: string; name: string; phone: string; line: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-fg">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{name}</p>
      <p className="text-muted-fg">{phone}</p>
      <p className="mt-1 text-muted-fg">{line}</p>
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-fg">{k}</span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  );
}

function safeQuote(v: ShipmentInput) {
  try {
    return calculateQuote(
      {
        direction: v.direction,
        weight_kg: v.weight_kg || 0.1,
        length_cm: v.length_cm || 1,
        width_cm: v.width_cm || 1,
        height_cm: v.height_cm || 1,
        is_gift: v.is_gift,
        remote_area: false,
        currency: v.currency,
      },
      PLACEHOLDER_RATES,
    );
  } catch {
    return null;
  }
}
