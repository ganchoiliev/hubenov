import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Receipt, Send, Pencil, Plus, Download, Search, Trash2, Ban, X, Link2 } from 'lucide-react';
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
import { Dropdown } from '@/components/ui/Dropdown';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import {
  useSendInvoiceEmail,
  useCreateInvoice,
  useCreateClient,
  useClients,
  useClientShipments,
  useCompanySettings,
  useDeleteInvoice,
  useVoidInvoice,
  type ClientRow,
} from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { buildCsv, downloadCsv } from '@/lib/csv';
import { cn, formatMoney, formatDate } from '@/lib/utils';
import { transliterate } from '@/lib/translit';
import type { Database } from '@/types/database.types';
import type { Invoice, InvoiceItem, InvoiceStatus, Currency, PartySnapshot } from '@/types/domain';

type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

type InvoiceRow = Invoice & {
  client?: { full_name: string | null; email: string | null; preferred_locale: string | null } | null;
};

const STATUSES: InvoiceStatus[] = ['unpaid', 'partial', 'paid', 'void'];
const CURRENCIES: Currency[] = ['GBP', 'EUR', 'BGN'];

const INVOICE_TONE: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
  void: 'neutral',
};

export function OpInvoicesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  // Documents (PDF + email) follow the operator's dashboard language, not the
  // client's saved preference — so toggling EN/BG controls the language produced.
  const docLang: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
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
          exportCsv: 'Export CSV',
          del: 'Delete',
          delTitle: 'Delete invoice',
          delBody: 'Deleting an issued invoice leaves a gap in your numbering, which can be a tax/audit problem. This cannot be undone.',
          delConfirm: 'Delete',
          cancel: 'Cancel',
          deleted: 'Invoice deleted',
          delErr: 'Could not delete',
          voidLabel: 'Void',
          voidTitle: 'Void invoice',
          voidBody: 'Mark this invoice as void? It keeps its number but is excluded from your totals — the accounting-safe way to cancel an issued invoice.',
          voidConfirm: 'Void',
          voided: 'Invoice voided',
          searchPlaceholder: 'Search by number or client…',
          noMatches: 'No invoices match your search.',
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
          exportCsv: 'Експорт CSV',
          del: 'Изтрий',
          delTitle: 'Изтриване на фактура',
          delBody: 'Изтриването на издадена фактура оставя дупка в номерацията — възможен данъчен/одит проблем. Действието е необратимо.',
          delConfirm: 'Изтрий',
          cancel: 'Отказ',
          deleted: 'Фактурата е изтрита',
          delErr: 'Неуспешно изтриване',
          voidLabel: 'Анулирай',
          voidTitle: 'Анулиране на фактура',
          voidBody: 'Да се анулира фактурата? Запазва номера си, но се изключва от сумите — счетоводно правилният начин да откажете издадена фактура.',
          voidConfirm: 'Анулирай',
          voided: 'Фактурата е анулирана',
          searchPlaceholder: 'Търси по номер или клиент…',
          noMatches: 'Няма фактури, отговарящи на търсенето.',
        };

  const toast = useToast();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const del = useDeleteInvoice();
  const voidInv = useVoidInvoice();
  const sendEmail = useSendInvoiceEmail();
  const { data: settings } = useCompanySettings();
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');

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

  // Client-side filter: match by invoice number or client name (case-insensitive).
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return invoices ?? [];
    return (invoices ?? []).filter((inv) =>
      [inv.number, inv.client?.full_name ?? ''].some((h) => h.toLowerCase().includes(term)),
    );
  }, [invoices, q]);

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
        locale: docLang,
      });
      toast.success(res.simulated ? L.simulated : L.sent);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSendingId(null);
    }
  }

  async function delInvoice(inv: InvoiceRow) {
    const ok = await confirm({ title: L.delTitle, body: L.delBody, confirmLabel: L.delConfirm, cancelLabel: L.cancel, danger: true });
    if (!ok) return;
    try {
      await del.mutateAsync(inv.id);
      toast.success(L.deleted);
    } catch {
      toast.error(L.delErr);
    }
  }

  async function voidInvoice(inv: InvoiceRow) {
    const ok = await confirm({ title: L.voidTitle, body: L.voidBody, confirmLabel: L.voidConfirm, cancelLabel: L.cancel, danger: true });
    if (!ok) return;
    try {
      await voidInv.mutateAsync(inv.id);
      toast.success(L.voided);
    } catch {
      toast.error(L.delErr);
    }
  }

  async function downloadPdf(inv: InvoiceRow) {
    try {
      const { downloadInvoicePdf, partyForInvoice } = await import('@/lib/invoicePdf');
      let shipmentCode: string | null = null;
      let sender: ReturnType<typeof partyForInvoice> = null;
      let receiver: ReturnType<typeof partyForInvoice> = null;
      let weightKg: number | null = null;
      if (inv.shipment_id) {
        const { data: ship } = await supabase
          .from('shipments')
          .select('public_code, sender, receiver, weight_kg')
          .eq('id', inv.shipment_id)
          .maybeSingle();
        const s = ship as { public_code?: string; sender?: PartySnapshot | null; receiver?: PartySnapshot | null; weight_kg?: number | null } | null;
        if (s) {
          shipmentCode = s.public_code ?? null;
          sender = partyForInvoice(s.sender ?? null);
          receiver = partyForInvoice(s.receiver ?? null);
          weightKg = s.weight_kg ?? null;
        }
      }
      await downloadInvoicePdf({
        number: inv.number,
        dateISO: inv.created_at,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        clientName: inv.client?.full_name ?? '',
        clientEmail: inv.client?.email ?? null,
        items: inv.items,
        company: { name: settings?.company_name, eori: settings?.eori, returnAddress: settings?.return_address },
        shipmentCode,
        sender,
        receiver,
        weightKg,
        locale: docLang,
      });
    } catch {
      toast.error(t('common.error'));
    }
  }

  const onExportCsv = () => {
    const csv = buildCsv(invoices ?? [], [
      { label: 'Number', get: (i) => i.number },
      { label: 'Client', get: (i) => i.client?.full_name ?? '' },
      { label: 'Amount', get: (i) => i.amount },
      { label: 'Currency', get: (i) => i.currency },
      { label: 'Status', get: (i) => i.status },
      { label: 'Date', get: (i) => i.created_at.slice(0, 10) },
    ]);
    downloadCsv(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading title={t('operator.invoices')} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={onExportCsv}
            disabled={!invoices || invoices.length === 0}
          >
            <Download className="h-4 w-4" /> {L.exportCsv}
          </Button>
          <Button className="gap-2" onClick={() => setCreating((v) => !v)}>
            <Plus className="h-4 w-4" /> {L.new_invoice}
          </Button>
        </div>
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

      {invoices && invoices.length > 0 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.searchPlaceholder} className="pl-9" />
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
      ) : filtered.length === 0 ? (
        <EmptyState title={L.noMatches} icon={<Search className="h-7 w-7" />} />
      ) : (
        <Stagger className="space-y-3">
          {filtered.map((inv) => (
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
                      {(inv.status === 'unpaid' || inv.status === 'partial') && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void voidInvoice(inv)}>
                          <Ban className="h-4 w-4" /> {L.voidLabel}
                        </Button>
                      )}
                      <button
                        type="button"
                        aria-label={L.del}
                        title={L.del}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => void delInvoice(inv)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

/** A single editable line-item row in the new-invoice form. */
interface ItemRow {
  description: string;
  amount: string;
}

function NewInvoicePanel({ lang, onDone }: { lang: 'bg' | 'en'; onDone: () => void }) {
  const toast = useToast();
  const locale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const { data: clients } = useClients();
  const createClient = useCreateClient();
  const createInvoice = useCreateInvoice();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<ClientRow | null>(null);
  const [nName, setNName] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ description: '', amount: '' }]);
  const [currency, setCurrency] = useState<Currency>('GBP');
  const [shipmentId, setShipmentId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // The selected existing client's parcels, for the optional parcel link.
  const { data: parcels } = useClientShipments(mode === 'existing' && picked ? picked.id : undefined);

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
          description: 'Описание',
          amount: 'Сума',
          addRow: 'Добави ред',
          removeRow: 'Премахни ред',
          total: 'Общо',
          currency: 'Валута',
          linkParcel: 'Свържи с пратка',
          noParcel: 'Без пратка',
          transport: 'Транспортна услуга',
          create: 'Създай фактура',
          cancel: 'Отказ',
          created: 'Фактурата е създадена',
          badAmount: 'Добавете поне един ред с положителна сума',
          needClient: 'Изберете клиент',
          needName: 'Въведете име',
          err: 'Грешка',
          preview: 'Преглед',
          invoice: 'ФАКТУРА',
          client: 'Клиент',
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
          description: 'Description',
          amount: 'Amount',
          addRow: 'Add row',
          removeRow: 'Remove row',
          total: 'Total',
          currency: 'Currency',
          linkParcel: 'Link to parcel',
          noParcel: 'No parcel',
          transport: 'Transport service',
          create: 'Create invoice',
          cancel: 'Cancel',
          created: 'Invoice created',
          badAmount: 'Add at least one row with a positive amount',
          needClient: 'Select a client',
          needName: 'Enter a name',
          err: 'Error',
          preview: 'Preview',
          invoice: 'INVOICE',
          client: 'Client',
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

  // Parsed line items + live total for the preview and submit.
  const parsedItems = useMemo<InvoiceItem[]>(
    () =>
      items
        .map((r) => ({ description: r.description.trim(), amount: Number(r.amount.replace(',', '.')) || 0 }))
        .filter((r) => r.description || r.amount > 0),
    [items],
  );
  const total = useMemo(
    () => Math.round(parsedItems.reduce((s, it) => s + it.amount, 0) * 100) / 100,
    [parsedItems],
  );

  const previewName =
    mode === 'new' ? nName.trim() || '—' : picked?.full_name || L.client;

  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setItems((rows) => [...rows, { description: '', amount: '' }]);
  const removeRow = (i: number) =>
    setItems((rows) => (rows.length <= 1 ? rows : rows.filter((_, idx) => idx !== i)));

  // Picking a parcel sets the linked shipment_id and adds/fills a transport line.
  const onPickParcel = (id: string) => {
    setShipmentId(id);
    if (!id) return;
    const p = (parcels ?? []).find((x) => x.id === id);
    if (!p) return;
    const desc = `${L.transport} ${p.public_code}`;
    const amt = p.price != null ? String(p.price) : '';
    setItems((rows) => {
      // Fill the first empty row, else append a new one.
      const emptyIdx = rows.findIndex((r) => !r.description.trim() && !r.amount.trim());
      if (emptyIdx >= 0) {
        return rows.map((r, idx) => (idx === emptyIdx ? { description: desc, amount: amt } : r));
      }
      return [...rows, { description: desc, amount: amt }];
    });
  };

  const submit = async () => {
    if (parsedItems.length === 0 || total <= 0) {
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
      await createInvoice.mutateAsync({
        client_id: clientId,
        items: parsedItems,
        currency,
        shipment_id: mode === 'existing' && shipmentId ? shipmentId : null,
      });
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
      onClick={() => {
        setMode(m);
        setShipmentId('');
      }}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        mode === m ? 'bg-brand text-brand-fg' : 'text-muted-fg hover:text-foreground',
      )}
    >
      {label}
    </button>
  );

  const parcelOptions = useMemo(
    () =>
      (parcels ?? []).map((p) => ({
        value: p.id,
        label: `${p.public_code}${p.receiver_city ? ` · ${p.receiver_city}` : ''}`,
      })),
    [parcels],
  );

  return (
    <Card>
      <CardBody className="grid gap-5 lg:grid-cols-2">
        {/* ── Form ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {tab('existing', L.existing)}
            {tab('new', L.neu)}
          </div>

          {mode === 'existing' ? (
            picked ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{picked.full_name || '—'}</p>
                    <p className="truncate text-xs text-muted-fg">
                      {picked.client_code}
                      {picked.phone ? ` · ${picked.phone}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setPicked(null);
                      setShipmentId('');
                    }}
                  >
                    {L.change}
                  </Button>
                </div>

                {/* Parcel link (optional) — fills a transport line on select. */}
                {parcelOptions.length > 0 && (
                  <div>
                    <span className="mb-1 flex items-center gap-1.5 text-xs text-muted-fg">
                      <Link2 className="h-3.5 w-3.5" /> {L.linkParcel}
                    </span>
                    <Dropdown
                      value={shipmentId}
                      onChange={onPickParcel}
                      options={[{ value: '', label: L.noParcel }, ...parcelOptions]}
                      placeholder={L.noParcel}
                      ariaLabel={L.linkParcel}
                      className="w-full"
                    />
                  </div>
                )}
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

          {/* ── Line items editor ─────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr,8rem,2rem] gap-2 px-1 text-xs font-medium text-muted-fg">
              <span>{L.description}</span>
              <span>{L.amount}</span>
              <span className="sr-only">{L.removeRow}</span>
            </div>
            {items.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr,8rem,2rem] items-center gap-2">
                <Input
                  value={row.description}
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  placeholder={L.description}
                />
                <Input
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) => setItem(i, { amount: e.target.value })}
                  placeholder="0.00"
                />
                <button
                  type="button"
                  aria-label={L.removeRow}
                  title={L.removeRow}
                  disabled={items.length <= 1}
                  onClick={() => removeRow(i)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={addRow} className="gap-1.5">
              <Plus className="h-4 w-4" /> {L.addRow}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-fg">{L.currency}</span>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option value="GBP">GBP £</option>
                <option value="EUR">EUR €</option>
                <option value="BGN">BGN лв</option>
              </Select>
            </label>
            <div className="flex items-end justify-end">
              <div className="text-right">
                <span className="block text-xs text-muted-fg">{L.total}</span>
                <span className="font-display text-xl font-extrabold text-foreground">
                  {formatMoney(total, currency, locale)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onDone}>
              {L.cancel}
            </Button>
            <Button size="sm" onClick={() => void submit()} loading={busy} className="gap-2">
              <Plus className="h-4 w-4" /> {L.create}
            </Button>
          </div>
        </div>

        {/* ── Live preview ─────────────────────────────────────────────── */}
        <div>
          <span className="mb-2 block text-xs font-medium text-muted-fg">{L.preview}</span>
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-lg font-extrabold tracking-tight text-brand">{L.invoice}</span>
              <Badge tone="brand">{currency}</Badge>
            </div>
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-fg">{L.client}</p>
            <p className="font-semibold text-foreground">{previewName}</p>

            <div className="mt-4 border-t border-border pt-3">
              {parsedItems.length === 0 ? (
                <p className="text-sm text-muted-fg">—</p>
              ) : (
                <div className="space-y-1.5">
                  {parsedItems.map((it, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-foreground">{it.description || '—'}</span>
                      <span className="shrink-0 tabular-nums text-muted-fg">
                        {formatMoney(it.amount, currency, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
              <span className="text-sm font-semibold text-foreground">{L.total}</span>
              <span className="font-display text-lg font-extrabold text-foreground">
                {formatMoney(total, currency, locale)}
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
