import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, CreditCard, X, Send, Pencil } from 'lucide-react';
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
import { useSendInvoiceEmail } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { formatMoney, formatDate } from '@/lib/utils';
import { recordPaymentSchema } from '@/schemas';
import type { Database } from '@/types/database.types';
import type { Invoice, InvoiceStatus, PaymentMethod, Currency } from '@/types/domain';

type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

type InvoiceRow = Invoice & {
  client?: { full_name: string | null; email: string | null; preferred_locale: string | null } | null;
};

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'card_office', 'cod'];
const STATUSES: InvoiceStatus[] = ['unpaid', 'partial', 'paid'];
const CURRENCIES: Currency[] = ['GBP', 'EUR', 'BGN'];

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
          currency: 'Currency',
          status: 'Status',
          save_payment: 'Save payment',
          save: 'Save',
          edit: 'Edit',
          send: 'Send',
          sending: 'Sending…',
          sent: 'Email sent',
          simulated: 'Test mode: email logged (RESEND_API_KEY not set)',
          no_email: 'No email on file for this client',
          saved: 'Invoice updated',
          no_invoices: 'No invoices yet.',
          no_invoices_desc: 'Invoices issued to clients will appear here.',
          invalid_amount: 'Enter a valid amount.',
        }
      : {
          payment_recorded: 'Плащането е записано',
          client: 'Клиент',
          amount: 'Сума',
          currency: 'Валута',
          status: 'Статус',
          save_payment: 'Запиши плащане',
          save: 'Запази',
          edit: 'Редактирай',
          send: 'Изпрати',
          sending: 'Изпращане…',
          sent: 'Имейлът е изпратен',
          simulated: 'Тест режим: имейлът е логнат (липсва RESEND_API_KEY)',
          no_email: 'Няма имейл за този клиент',
          saved: 'Фактурата е обновена',
          no_invoices: 'Все още няма фактури.',
          no_invoices_desc: 'Издадените към клиенти фактури ще се показват тук.',
          invalid_amount: 'Въведете валидна сума.',
        };

  const toast = useToast();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const sendEmail = useSendInvoiceEmail();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['op-invoices'],
    queryFn: async (): Promise<InvoiceRow[]> => {
      // Embed the client (one FK invoices.client_id → profiles) for name/email.
      const { data, error } = await supabase
        .from('invoices')
        .select('*, client:profiles!client_id(full_name, email, preferred_locale)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceRow[];
    },
  });

  const [payId, setPayId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [eAmount, setEAmount] = useState('');
  const [eCurrency, setECurrency] = useState<Currency>('GBP');
  const [eStatus, setEStatus] = useState<InvoiceStatus>('unpaid');
  const [savingEdit, setSavingEdit] = useState(false);

  const [sendingId, setSendingId] = useState<string | null>(null);

  function openPay(inv: InvoiceRow) {
    setPayId(inv.id);
    setEditId(null);
    setMethod('cash');
    setAmount(String(inv.amount));
    setFormError(null);
  }

  function openEdit(inv: InvoiceRow) {
    setEditId(inv.id);
    setPayId(null);
    setEAmount(String(inv.amount));
    setECurrency(inv.currency);
    setEStatus(inv.status);
  }

  async function submitPayment(inv: InvoiceRow) {
    setFormError(null);
    const parsed = recordPaymentSchema.safeParse({ invoice_id: inv.id, method, amount: Number(amount) });
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
      const { error: insErr } = await supabase.from('payments').insert(paymentRow as never);
      if (insErr) throw insErr;

      const { data: pays, error: sumErr } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', inv.id);
      if (sumErr) throw sumErr;

      const total = (pays ?? []).reduce((acc, p) => acc + Number((p as { amount: number }).amount), 0);
      const nextStatus: InvoiceStatus = total >= inv.amount ? 'paid' : 'partial';

      const invoiceUpdate: InvoiceUpdate = { status: nextStatus };
      const { error: updErr } = await supabase.from('invoices').update(invoiceUpdate as never).eq('id', inv.id);
      if (updErr) throw updErr;

      toast.success(L.payment_recorded);
      setPayId(null);
      await qc.invalidateQueries({ queryKey: ['op-invoices'] });
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(inv: InvoiceRow) {
    const amt = Number(eAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(L.invalid_amount);
      return;
    }
    setSavingEdit(true);
    try {
      const patch: InvoiceUpdate = { amount: amt, currency: eCurrency, status: eStatus };
      const { error } = await supabase.from('invoices').update(patch as never).eq('id', inv.id);
      if (error) throw error;
      toast.success(L.saved);
      setEditId(null);
      await qc.invalidateQueries({ queryKey: ['op-invoices'] });
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingEdit(false);
    }
  }

  async function send(inv: InvoiceRow) {
    if (!inv.client?.email) {
      toast.error(L.no_email);
      return;
    }
    setSendingId(inv.id);
    try {
      const res = await sendEmail.mutateAsync({
        invoice: inv,
        toEmail: inv.client.email,
        clientName: inv.client.full_name ?? '',
        locale: inv.client.preferred_locale === 'en' ? 'en' : 'bg',
      });
      toast.success(res.simulated ? L.simulated : L.sent);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSendingId(null);
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
        <EmptyState title={L.no_invoices} description={L.no_invoices_desc} icon={<Receipt className="h-7 w-7" />} />
      ) : (
        <Stagger className="space-y-3">
          {invoices.map((inv) => (
            <StaggerItem key={inv.id}>
              <Card>
                <CardBody>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">{inv.number}</span>
                        <Badge tone={INVOICE_TONE[inv.status]}>{t(`portal.invoice_${inv.status}`)}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-fg">
                        {L.client}: {inv.client?.full_name || inv.client_id.slice(0, 8)} · {formatDate(inv.created_at, locale)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-1 font-display text-lg font-extrabold text-foreground">
                        {formatMoney(inv.amount, inv.currency, locale)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!inv.client?.email || sendingId === inv.id}
                        title={!inv.client?.email ? L.no_email : undefined}
                        onClick={() => void send(inv)}
                      >
                        <Send className="h-4 w-4" /> {sendingId === inv.id ? L.sending : L.send}
                      </Button>
                      <Button
                        size="sm"
                        variant={editId === inv.id ? 'secondary' : 'outline'}
                        className="gap-1.5"
                        onClick={() => (editId === inv.id ? setEditId(null) : openEdit(inv))}
                      >
                        <Pencil className="h-4 w-4" /> {L.edit}
                      </Button>
                      <Button
                        size="sm"
                        variant={payId === inv.id ? 'secondary' : 'outline'}
                        className="gap-1.5"
                        onClick={() => (payId === inv.id ? setPayId(null) : openPay(inv))}
                      >
                        {payId === inv.id ? (
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
                    {editId === inv.id && (
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
                            void saveEdit(inv);
                          }}
                          className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-3"
                        >
                          <Field label={L.amount} htmlFor={`e-amount-${inv.id}`}>
                            <Input
                              id={`e-amount-${inv.id}`}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={eAmount}
                              onChange={(e) => setEAmount(e.target.value)}
                            />
                          </Field>
                          <Field label={L.currency} htmlFor={`e-cur-${inv.id}`}>
                            <Select
                              id={`e-cur-${inv.id}`}
                              value={eCurrency}
                              onChange={(e) => setECurrency(e.target.value as Currency)}
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label={L.status} htmlFor={`e-st-${inv.id}`}>
                            <Select
                              id={`e-st-${inv.id}`}
                              value={eStatus}
                              onChange={(e) => setEStatus(e.target.value as InvoiceStatus)}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {t(`portal.invoice_${s}`)}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <div className="flex justify-end sm:col-span-3">
                            <Button type="submit" size="sm" loading={savingEdit} className="gap-2">
                              {L.save}
                            </Button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                    {payId === inv.id && (
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
                            void submitPayment(inv);
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
                          <div className="flex justify-end sm:col-span-2">
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
