import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Send, Pencil, Plus, Download, Search } from 'lucide-react';
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
import {
  useSendInvoiceEmail,
  useCreateInvoice,
  useCreateClient,
  useClients,
  useCompanySettings,
  type ClientRow,
} from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { cn, formatMoney, formatDate } from '@/lib/utils';
import { transliterate } from '@/lib/translit';
import type { Database } from '@/types/database.types';
import type { Invoice, InvoiceStatus, Currency } from '@/types/domain';

type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

type InvoiceRow = Invoice & {
  client?: { full_name: string | null; email: string | null; preferred_locale: string | null } | null;
};

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
          new_invoice: 'New invoice',
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
          new_invoice: 'Нова фактура',
        };

  const toast = useToast();
  const qc = useQueryClient();
  const sendEmail = useSendInvoiceEmail();
  const { data: settings } = useCompanySettings();
  const [creating, setCreating] = useState(false);

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

  const [editId, setEditId] = useState<string | null>(null);
  const [eAmount, setEAmount] = useState('');
  const [eCurrency, setECurrency] = useState<Currency>('GBP');
  const [eStatus, setEStatus] = useState<InvoiceStatus>('unpaid');
  const [savingEdit, setSavingEdit] = useState(false);

  const [sendingId, setSendingId] = useState<string | null>(null);

  function openEdit(inv: InvoiceRow) {
    setEditId(inv.id);
    setEAmount(String(inv.amount));
    setECurrency(inv.currency);
    setEStatus(inv.status);
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

  async function downloadPdf(inv: InvoiceRow) {
    try {
      const { downloadInvoicePdf } = await import('@/lib/invoicePdf');
      let shipmentCode: string | null = null;
      if (inv.shipment_id) {
        const { data: ship } = await supabase
          .from('shipments')
          .select('public_code')
          .eq('id', inv.shipment_id)
          .maybeSingle();
        shipmentCode = (ship as { public_code?: string } | null)?.public_code ?? null;
      }
      await downloadInvoicePdf({
        number: inv.number,
        dateISO: inv.created_at,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        clientName: inv.client?.full_name ?? '',
        clientEmail: inv.client?.email ?? null,
        company: { name: settings?.company_name, eori: settings?.eori, returnAddress: settings?.return_address },
        shipmentCode,
      });
    } catch {
      toast.error(t('common.error'));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading title={t('operator.invoices')} />
        <Button className="gap-2" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" /> {L.new_invoice}
        </Button>
      </div>

      {creating && (
        <div className="mb-5">
          <NewInvoicePanel
            lang={i18n.resolvedLanguage === 'en' ? 'en' : 'bg'}
            onDone={() => {
              setCreating(false);
              void qc.invalidateQueries({ queryKey: ['op-invoices'] });
            }}
          />
        </div>
      )}

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
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void downloadPdf(inv)}>
                        <Download className="h-4 w-4" /> PDF
                      </Button>
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

function NewInvoicePanel({ lang, onDone }: { lang: 'bg' | 'en'; onDone: () => void }) {
  const toast = useToast();
  const { data: clients } = useClients();
  const createClient = useCreateClient();
  const createInvoice = useCreateInvoice();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<ClientRow | null>(null);
  const [nName, setNName] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('GBP');
  const [busy, setBusy] = useState(false);

  const L =
    lang === 'bg'
      ? {
          existing: 'Съществуващ клиент',
          neu: 'Нов клиент',
          search: 'Търси по име, ОТ, телефон…',
          noMatches: 'Няма съвпадения',
          change: 'Смени',
          name: 'Име',
          phone: 'Телефон',
          email: 'Имейл',
          amount: 'Сума',
          currency: 'Валута',
          create: 'Създай фактура',
          cancel: 'Отказ',
          created: 'Фактурата е създадена',
          badAmount: 'Невалидна сума',
          needClient: 'Изберете клиент',
          needName: 'Въведете име',
          err: 'Грешка',
        }
      : {
          existing: 'Existing client',
          neu: 'New client',
          search: 'Search by name, OT, phone…',
          noMatches: 'No matches',
          change: 'Change',
          name: 'Name',
          phone: 'Phone',
          email: 'Email',
          amount: 'Amount',
          currency: 'Currency',
          create: 'Create invoice',
          cancel: 'Cancel',
          created: 'Invoice created',
          badAmount: 'Invalid amount',
          needClient: 'Select a client',
          needName: 'Enter a name',
          err: 'Error',
        };

  const matches = useMemo(() => {
    const list = clients ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return list
      .filter((c) =>
        [c.full_name, transliterate(c.full_name), c.client_code, c.phone ?? '', c.email ?? '']
          .some((h) => h.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [clients, search]);

  const submit = async () => {
    const amt = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(L.badAmount);
      return;
    }
    setBusy(true);
    try {
      let clientId: string;
      if (mode === 'new') {
        if (!nName.trim()) {
          toast.error(L.needName);
          setBusy(false);
          return;
        }
        const p = await createClient.mutateAsync({
          full_name: nName.trim(),
          phone: nPhone.trim() || null,
          email: nEmail.trim() || null,
          preferred_locale: lang,
        });
        clientId = p.id;
      } else {
        if (!picked) {
          toast.error(L.needClient);
          setBusy(false);
          return;
        }
        clientId = picked.id;
      }
      await createInvoice.mutateAsync({ client_id: clientId, amount: amt, currency });
      toast.success(L.created);
      onDone();
    } catch {
      toast.error(L.err);
    } finally {
      setBusy(false);
    }
  };

  const tab = (m: 'existing' | 'new', label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        mode === m ? 'bg-brand text-brand-fg' : 'text-muted-fg hover:text-foreground',
      )}
    >
      {label}
    </button>
  );

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {tab('existing', L.existing)}
          {tab('new', L.neu)}
        </div>

        {mode === 'existing' ? (
          picked ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{picked.full_name || '—'}</p>
                <p className="truncate text-xs text-muted-fg">
                  {picked.client_code}
                  {picked.phone ? ` · ${picked.phone}` : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
                {L.change}
              </Button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L.search} className="pl-9" />
              </div>
              {search.trim() && (
                <div className="mt-2 space-y-1">
                  {matches.length === 0 ? (
                    <p className="px-1 text-xs text-muted-fg">{L.noMatches}</p>
                  ) : (
                    matches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setPicked(c);
                          setSearch('');
                        }}
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
          )
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-fg">{L.name}</span>
              <Input value={nName} onChange={(e) => setNName(e.target.value)} autoFocus />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-fg">{L.phone}</span>
              <Input value={nPhone} onChange={(e) => setNPhone(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-fg">{L.email}</span>
              <Input value={nEmail} onChange={(e) => setNEmail(e.target.value)} />
            </label>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-fg">{L.amount}</span>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-fg">{L.currency}</span>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="GBP">GBP £</option>
              <option value="EUR">EUR €</option>
              <option value="BGN">BGN лв</option>
            </Select>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onDone}>
            {L.cancel}
          </Button>
          <Button size="sm" onClick={() => void submit()} loading={busy} className="gap-2">
            <Plus className="h-4 w-4" /> {L.create}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
