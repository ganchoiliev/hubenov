import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, CreditCard, X } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  Field,
  Badge,
  Skeleton,
} from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatMoney, formatDate } from '@/lib/utils';
import { recordPaymentSchema } from '@/schemas';
import type { Database } from '@/types/database.types';
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types/domain';

type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'card_office', 'cod'];

const INVOICE_TONE: Record<InvoiceStatus, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
};

export function OpInvoicesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const L =
    i18n.resolvedLanguage === 'en'
      ? {
          payment_recorded: 'Payment recorded',
          client: 'Client',
          amount: 'Amount',
          save_payment: 'Save payment',
          no_invoices: 'No invoices yet.',
          no_invoices_desc: 'Invoices issued to clients will appear here.',
          invalid_amount: 'Enter a valid amount.',
        }
      : {
          payment_recorded: 'Плащането е записано',
          client: 'Клиент',
          amount: 'Сума',
          save_payment: 'Запиши плащане',
          no_invoices: 'Все още няма фактури.',
          no_invoices_desc: 'Издадените към клиенти фактури ще се показват тук.',
          invalid_amount: 'Въведете валидна сума.',
        };

  const toast = useToast();
  const qc = useQueryClient();
  const { profile } = useAuth();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['op-invoices'],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openForm(inv: Invoice) {
    setOpenId(inv.id);
    setMethod('cash');
    setAmount(String(inv.amount));
    setFormError(null);
  }

  function closeForm() {
    setOpenId(null);
    setFormError(null);
  }

  async function submit(inv: Invoice) {
    setFormError(null);
    const parsed = recordPaymentSchema.safeParse({
      invoice_id: inv.id,
      method,
      amount: Number(amount),
    });
    if (!parsed.success) {
      setFormError(L.invalid_amount);
      return;
    }
    if (!profile?.id) {
      toast.error(t('common.error'));
      return;
    }

    setSubmitting(true);
    try {
      const paymentRow: PaymentInsert = {
        invoice_id: parsed.data.invoice_id,
        method: parsed.data.method,
        amount: parsed.data.amount,
        recorded_by: profile.id,
      };
      const { error: insErr } = await supabase
        .from('payments')
        .insert(paymentRow as never);
      if (insErr) throw insErr;

      const { data: pays, error: sumErr } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', inv.id);
      if (sumErr) throw sumErr;

      const total = (pays ?? []).reduce(
        (acc, p) => acc + Number((p as { amount: number }).amount),
        0,
      );
      const nextStatus: InvoiceStatus = total >= inv.amount ? 'paid' : 'partial';

      const invoiceUpdate: InvoiceUpdate = { status: nextStatus };
      const { error: updErr } = await supabase
        .from('invoices')
        .update(invoiceUpdate as never)
        .eq('id', inv.id);
      if (updErr) throw updErr;

      toast.success(L.payment_recorded);
      closeForm();
      await qc.invalidateQueries({ queryKey: ['op-invoices'] });
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading title={t('operator.invoices')} />

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState
          title={L.no_invoices}
          description={L.no_invoices_desc}
          icon={<Receipt className="h-7 w-7" />}
        />
      ) : (
        <Stagger className="space-y-3">
          {invoices.map((inv) => (
            <StaggerItem key={inv.id}>
              <Card>
                <CardBody>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {inv.number}
                        </span>
                        <Badge tone={INVOICE_TONE[inv.status]}>
                          {t(`portal.invoice_${inv.status}`)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-fg">
                        {L.client}: <span className="font-mono">{inv.client_id.slice(0, 8)}</span> ·{' '}
                        {formatDate(inv.created_at, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-extrabold text-foreground">
                        {formatMoney(inv.amount, inv.currency, locale)}
                      </span>
                      <Button
                        size="sm"
                        variant={openId === inv.id ? 'secondary' : 'outline'}
                        className="gap-2"
                        onClick={() => (openId === inv.id ? closeForm() : openForm(inv))}
                      >
                        {openId === inv.id ? (
                          <>
                            <X className="h-4 w-4" /> {t('common.cancel')}
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" /> {t('operator.record_payment')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {openId === inv.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void submit(inv);
                          }}
                          className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-2"
                        >
                          <Field label={t('operator.payment_method')} htmlFor={`method-${inv.id}`}>
                            <Select
                              id={`method-${inv.id}`}
                              value={method}
                              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m} value={m}>
                                  {t(`payment.${m}`)}
                                </option>
                              ))}
                            </Select>
                          </Field>

                          <Field
                            label={t('operator.amount_received')}
                            htmlFor={`amount-${inv.id}`}
                            error={formError ?? undefined}
                          >
                            <Input
                              id={`amount-${inv.id}`}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                            />
                          </Field>

                          <div className="sm:col-span-2 flex justify-end">
                            <Button type="submit" size="sm" loading={submitting} className="gap-2">
                              <CreditCard className="h-4 w-4" /> {L.save_payment}
                            </Button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardBody>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
