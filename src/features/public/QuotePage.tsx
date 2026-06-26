import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calculator, Package2, Phone, MessageCircle } from 'lucide-react';
import { Button, Card, CardBody, Field, Input, Select } from '@/components/ui';
import { Section, PageHeading } from '@/components/shared/common';
import { quoteInputSchema, type QuoteInput } from '@/schemas';
import { getCourier } from '@/providers/courier';
import { formatMoney } from '@/lib/utils';
import { whatsappUrl, viberUrl, telUrl } from '@/lib/contact';
import { WhatsAppIcon } from '@/components/brand/ContactIcons';
import type { Quote } from '@/types/domain';

export function QuotePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const lang: 'bg' | 'en' = locale === 'en-GB' ? 'en' : 'bg';
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lastInput, setLastInput] = useState<QuoteInput | null>(null);
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuoteInput>({
    resolver: zodResolver(quoteInputSchema),
    defaultValues: {
      direction: 'UK_BG',
      weight_kg: 5,
      length_cm: 30,
      width_cm: 30,
      height_cm: 30,
      is_gift: true,
      declared_value: 0,
      currency: 'GBP',
      remote_area: false,
    },
  });

  const onSubmit = async (data: QuoteInput) => {
    setPending(true);
    try {
      // Wave 1: MockEcontProvider. Wave 2: server-authoritative `pricing` fn.
      const q = await getCourier().calculate(data);
      setQuote(q);
      setLastInput(data);
    } finally {
      setPending(false);
    }
  };

  const bookingMsg = quote && lastInput ? buildBookingMessage(lastInput, quote, lang) : '';

  return (
    <Section>
      <PageHeading title={t('quote.title')} subtitle={t('quote.subtitle')} />

      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
              <Field label={t('quote.direction')} error={errors.direction?.message}>
                <Select {...register('direction')}>
                  <option value="UK_BG">{t('services.uk_bg')}</option>
                  <option value="BG_UK">{t('services.bg_uk')}</option>
                </Select>
              </Field>

              <Field label={t('quote.parcel_type')}>
                <Select {...register('is_gift', { setValueAs: (v) => v === 'true' })}>
                  <option value="true">{t('services.gifts')}</option>
                  <option value="false">{t('services.goods')}</option>
                </Select>
              </Field>

              <Field label={t('quote.weight_label')} error={errors.weight_kg?.message}>
                <Input type="number" step="0.1" min="0.1" {...register('weight_kg', { valueAsNumber: true })} />
              </Field>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {t('quote.dimensions')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <Input type="number" min="1" placeholder="Д / L" {...register('length_cm', { valueAsNumber: true })} />
                  <Input type="number" min="1" placeholder="Ш / W" {...register('width_cm', { valueAsNumber: true })} />
                  <Input type="number" min="1" placeholder="В / H" {...register('height_cm', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" size="lg" loading={pending} className="w-full gap-2">
                  <Calculator className="h-4 w-4" />
                  {pending ? t('quote.calculating') : t('quote.calculate')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {quote ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card className="overflow-hidden border-brand/30">
                  <div className="bg-brand p-6 text-brand-fg">
                    <p className="text-sm font-medium opacity-90">{t('quote.result_total')}</p>
                    <p className="mt-1 font-display text-4xl font-extrabold">
                      {formatMoney(quote.total, quote.currency, locale)}
                    </p>
                  </div>
                  <CardBody className="space-y-3">
                    <Row label={t('quote.chargeable')} value={`${quote.chargeable_weight_kg} ${t('common.kg')}`} />
                    <Row label={t('common.price')} value={formatMoney(quote.base_price, quote.currency, locale)} />
                    {quote.surcharges.map((s) => (
                      <Row key={s.label} label={s.label} value={`+ ${formatMoney(s.amount, quote.currency, locale)}`} />
                    ))}
                    <Row
                      label={t('quote.result_eta')}
                      value={locale === 'en-GB' ? quote.eta_text_en : quote.eta_text_bg}
                    />
                    <p className="pt-2 text-xs text-muted-fg">{t('quote.disclaimer')}</p>
                    <div className="space-y-2 pt-1">
                      <p className="text-sm font-semibold text-foreground">{t('quote.book_title')}</p>
                      <a href={whatsappUrl(bookingMsg)} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1faa55]">
                          <WhatsAppIcon className="h-4 w-4" /> {t('quote.book_whatsapp')}
                        </Button>
                      </a>
                      <div className="grid grid-cols-2 gap-2">
                        <a href={viberUrl(bookingMsg)} className="block">
                          <Button variant="outline" className="w-full gap-2">
                            <MessageCircle className="h-4 w-4" /> Viber
                          </Button>
                        </a>
                        <a href={telUrl()} className="block">
                          <Button variant="outline" className="w-full gap-2">
                            <Phone className="h-4 w-4" /> {t('quote.book_call')}
                          </Button>
                        </a>
                      </div>
                      <p className="pt-1 text-center text-xs text-muted-fg">
                        {t('quote.book_dropoff')}{' '}
                        <Link to="/login" className="font-medium text-brand-700 hover:underline">
                          {t('quote.book_online')}
                        </Link>
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center"
              >
                <Package2 className="h-10 w-10 text-muted-fg" />
                <p className="mt-3 text-sm text-muted-fg">{t('quote.subtitle')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="capitalize text-muted-fg">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

/** Build a prefilled booking message (WhatsApp/Viber) from the quote inputs. */
function buildBookingMessage(input: QuoteInput, quote: Quote, lang: 'bg' | 'en'): string {
  const moneyLocale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const price = formatMoney(quote.total, quote.currency, moneyLocale);
  const dir =
    input.direction === 'UK_BG'
      ? lang === 'bg'
        ? 'Великобритания → България'
        : 'UK → Bulgaria'
      : lang === 'bg'
        ? 'България → Великобритания'
        : 'Bulgaria → UK';
  const kind = input.is_gift
    ? lang === 'bg'
      ? 'подарък/лична'
      : 'gift/personal'
    : lang === 'bg'
      ? 'стока'
      : 'goods';
  const dims = `${input.length_cm}×${input.width_cm}×${input.height_cm}`;
  return lang === 'bg'
    ? `Здравейте! Искам да изпратя пратка:
• Посока: ${dir}
• Тегло: ${input.weight_kg} кг
• Размери: ${dims} см
• Тип: ${kind}
• Ориентировъчна цена: ${price}
Моля, потвърдете и ми кажете кога да я донеса.`
    : `Hello! I'd like to send a parcel:
• Route: ${dir}
• Weight: ${input.weight_kg} kg
• Size: ${dims} cm
• Type: ${kind}
• Estimated price: ${price}
Please confirm and let me know when to drop it off.`;
}
