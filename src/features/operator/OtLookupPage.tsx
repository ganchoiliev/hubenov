import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UserSearch, Phone, Mail, Package, Receipt, Pencil, Plus, Send, PackagePlus, Search } from 'lucide-react';
import { Button, Card, CardBody, Input, Spinner, Badge, Select, Switch } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/toast';
import { PageHeading, EmptyState } from '@/components/shared/common';
import {
  useOtLookup,
  useUpdateProfile,
  useCreateInvoice,
  useSendInvoiceEmail,
  useClients,
} from '@/lib/queries';
import { otCodeSchema } from '@/schemas';
import { formatMoney } from '@/lib/utils';
import { transliterate } from '@/lib/translit';
import type { Profile, Invoice, Shipment, Currency } from '@/types/domain';

export function OtLookupPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const [input, setInput] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { data, isFetching } = useOtLookup(code);
  const [searchParams] = useSearchParams();

  // Deep-link: /op/lookup?code=HB-0001 (e.g. from the Clients tab) auto-resolves.
  useEffect(() => {
    const c = searchParams.get('code');
    if (!c) return;
    const v = c.trim().toUpperCase();
    setInput(v);
    setCode(v);
    setErr(null);
  }, [searchParams]);

  // Search clients by name / phone / email / OT — not just the exact OT code.
  const { data: allClients } = useClients();
  const [clientSearch, setClientSearch] = useState('');
  const matches = useMemo(() => {
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
  const pickClient = (clientCode: string) => {
    const v = clientCode.toUpperCase();
    setInput(v);
    setCode(v);
    setErr(null);
    setClientSearch('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = otCodeSchema.safeParse(input);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? t('common.error'));
      return;
    }
    setErr(null);
    setCode(parsed.data);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading title={t('operator.lookup_title')} />

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('operator.lookup_placeholder')}
          className="flex-1 font-mono uppercase"
          autoFocus
        />
        <Button type="submit" className="gap-2">
          <UserSearch className="h-4 w-4" /> {t('operator.lookup_button')}
        </Button>
      </form>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}

      {/* Search by name / phone / email — when the OT number isn't known */}
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
        <Input
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          placeholder={lang === 'bg' ? 'Или търси по име, телефон, имейл…' : 'Or search by name, phone, email…'}
          className="pl-9"
        />
      </div>
      {clientSearch.trim() && (
        <div className="mt-2 space-y-1">
          {matches.length === 0 ? (
            <p className="px-1 text-xs text-muted-fg">{lang === 'bg' ? 'Няма съвпадения' : 'No matches'}</p>
          ) : (
            matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickClient(c.client_code)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:bg-muted"
              >
                <span className="text-sm font-medium text-foreground">{c.full_name || '—'}</span>
                <span className="font-mono text-xs text-muted-fg">{c.client_code}</span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="mt-8">
        {isFetching && (
          <div className="flex justify-center py-10">
            <Spinner className="h-7 w-7" />
          </div>
        )}

        {code && !isFetching && !data && (
          <EmptyState title={t('operator.lookup_not_found')} icon={<UserSearch className="h-7 w-7" />} />
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Customer */}
            <CustomerCard profile={data.profile} lang={lang} />

            {/* Shipments */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-fg">
                  <Package className="h-4 w-4" /> {t('operator.shipments')} ({data.shipments.length})
                </h3>
                <Link to={`/op/intake?code=${encodeURIComponent(data.profile.client_code)}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <PackagePlus className="h-4 w-4" /> {lang === 'bg' ? 'Нова пратка' : 'New shipment'}
                  </Button>
                </Link>
              </div>
              {data.shipments.length === 0 ? (
                <p className="text-sm text-muted-fg">{t('portal.no_shipments')}</p>
              ) : (
                <div className="space-y-2">
                  {data.shipments.map((s) => (
                    <Link key={s.id} to={`/op/shipments/${s.id}`}>
                      <Card className="transition-shadow hover:shadow-lift">
                        <CardBody className="flex items-center justify-between gap-4 py-4">
                          <div>
                            <p className="font-mono text-sm font-semibold text-foreground">{s.public_code}</p>
                            <p className="text-xs text-muted-fg">
                              {s.receiver.name} · {s.receiver.city} · {s.weight_kg} {t('common.kg')}
                            </p>
                          </div>
                          <StatusBadge status={s.status} />
                        </CardBody>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices */}
            <InvoicesPanel
              profile={data.profile}
              invoices={data.invoices}
              shipments={data.shipments}
              lang={lang}
              locale={locale}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CustomerCard({ profile, lang }: { profile: Profile; lang: 'bg' | 'en' }) {
  const toast = useToast();
  const update = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [notify, setNotify] = useState(profile.notify_email ?? true);

  // Reset the form when a different customer is looked up.
  useEffect(() => {
    setName(profile.full_name);
    setPhone(profile.phone ?? '');
    setEmail(profile.email ?? '');
    setNotify(profile.notify_email ?? true);
    setEditing(false);
  }, [profile.id, profile.full_name, profile.phone, profile.email, profile.notify_email]);

  const T =
    lang === 'bg'
      ? { edit: 'Редактирай', save: 'Запази', cancel: 'Отказ', saved: 'Профилът е обновен', err: 'Грешка при запазване', name: 'Име', phone: 'Телефон', email: 'Имейл', notify: 'Имейл известия за статус', notifyOff: 'Известия изкл.' }
      : { edit: 'Edit', save: 'Save', cancel: 'Cancel', saved: 'Profile updated', err: 'Save failed', name: 'Name', phone: 'Phone', email: 'Email', notify: 'Status email notifications', notifyOff: 'Notifications off' };

  const save = async () => {
    try {
      await update.mutateAsync({
        id: profile.id,
        patch: { full_name: name.trim(), phone: phone.trim() || null, email: email.trim() || null, notify_email: notify },
      });
      toast.success(T.saved);
      setEditing(false);
    } catch {
      toast.error(T.err);
    }
  };

  return (
    <Card>
      <CardBody>
        {editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-fg">{T.name}</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-fg">{T.phone}</span>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-fg">{T.email}</span>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
            <Switch checked={notify} onChange={setNotify} label={T.notify} id={`notify-${profile.id}`} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {T.cancel}
              </Button>
              <Button size="sm" onClick={() => void save()} loading={update.isPending}>
                {T.save}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-extrabold text-foreground">{profile.full_name}</h2>
                <Badge tone="brand">{profile.client_code}</Badge>
                {profile.notify_email === false && <Badge tone="neutral">{T.notifyOff}</Badge>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-muted-fg">
                {profile.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {profile.phone}
                  </span>
                )}
                {profile.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {profile.email}
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="h-4 w-4" /> {T.edit}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function InvoicesPanel({
  profile,
  invoices,
  shipments,
  lang,
  locale,
}: {
  profile: Profile;
  invoices: Invoice[];
  shipments: Shipment[];
  lang: 'bg' | 'en';
  locale: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const create = useCreateInvoice();
  const sendEmail = useSendInvoiceEmail();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('GBP');
  const [shipmentId, setShipmentId] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const T =
    lang === 'bg'
      ? {
          title: 'Фактури',
          create: 'Нова фактура',
          amount: 'Сума',
          currency: 'Валута',
          link: 'Свържи с пратка (по избор)',
          none: 'Без пратка',
          save: 'Създай',
          cancel: 'Отказ',
          created: 'Фактурата е създадена',
          err: 'Грешка',
          send: 'Изпрати',
          sending: 'Изпращане…',
          sent: 'Имейлът е изпратен',
          simulated: 'Тест режим: имейлът е логнат (липсва RESEND_API_KEY)',
          noEmail: 'Няма имейл за този клиент',
          badAmount: 'Невалидна сума',
        }
      : {
          title: 'Invoices',
          create: 'New invoice',
          amount: 'Amount',
          currency: 'Currency',
          link: 'Link to shipment (optional)',
          none: 'No shipment',
          save: 'Create',
          cancel: 'Cancel',
          created: 'Invoice created',
          err: 'Error',
          send: 'Send',
          sending: 'Sending…',
          sent: 'Email sent',
          simulated: 'Test mode: email logged (RESEND_API_KEY not set)',
          noEmail: 'No email on file for this client',
          badAmount: 'Invalid amount',
        };

  const submit = async () => {
    const amt = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(T.badAmount);
      return;
    }
    try {
      await create.mutateAsync({ client_id: profile.id, amount: amt, currency, shipment_id: shipmentId || null });
      toast.success(T.created);
      setOpen(false);
      setAmount('');
      setShipmentId('');
    } catch {
      toast.error(T.err);
    }
  };

  const send = async (inv: Invoice) => {
    if (!profile.email) {
      toast.error(T.noEmail);
      return;
    }
    setSendingId(inv.id);
    try {
      const res = await sendEmail.mutateAsync({
        invoice: inv,
        toEmail: profile.email,
        clientName: profile.full_name,
        locale: lang,
      });
      toast.success(res.simulated ? T.simulated : T.sent);
    } catch {
      toast.error(T.err);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-fg">
          <Receipt className="h-4 w-4" /> {T.title} ({invoices.length})
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4" /> {T.create}
        </Button>
      </div>

      {open && (
        <Card className="mb-3">
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-fg">{T.amount}</span>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-fg">{T.currency}</span>
                <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                  <option value="GBP">GBP £</option>
                  <option value="EUR">EUR €</option>
                  <option value="BGN">BGN лв</option>
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-fg">{T.link}</span>
                <Select
                  value={shipmentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setShipmentId(id);
                    const sh = shipments.find((x) => x.id === id);
                    if (sh?.price != null) setAmount(String(sh.price));
                  }}
                >
                  <option value="">{T.none}</option>
                  {shipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.public_code}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                {T.cancel}
              </Button>
              <Button size="sm" onClick={() => void submit()} loading={create.isPending}>
                {T.save}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-fg">—</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <span className="font-mono text-sm">{inv.number}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatMoney(inv.amount, inv.currency, locale)}</span>
                  <Badge tone={inv.status === 'paid' ? 'success' : 'warning'}>
                    {t(`portal.invoice_${inv.status}`)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={!profile.email || sendingId === inv.id}
                    title={!profile.email ? T.noEmail : undefined}
                    onClick={() => void send(inv)}
                  >
                    <Send className="h-3.5 w-3.5" /> {sendingId === inv.id ? T.sending : T.send}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
