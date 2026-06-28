/**
 * Client self-service: register + track incoming parcels (ordered from Amazon / a
 * UK shop to our Manchester hub). Registering creates a `booked` shipment carrying
 * the courier tracking № as inbound_ref, so the operator's Inbound scan matches it
 * on arrival and the label auto-prints. The list below tracks each one's status.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, Home, Building2, RotateCcw, PackageSearch, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardBody, Input, Field, Select } from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { EcontOfficePicker } from '@/components/shared/EcontOfficePicker';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useRegisterIncoming, useMyIncoming } from '@/lib/queries';
import { cn, formatDate } from '@/lib/utils';
import { toE164 } from '@/lib/phone';
import type { Currency } from '@/types/domain';

const CURRENCIES: Currency[] = ['GBP', 'EUR', 'BGN'];
const SHOPS = ['Amazon', 'eBay', 'ASOS', 'SHEIN', 'Temu', 'Next'];
const EMPTY = { tracking: '', shop: '', weight: '', rname: '', rphone: '', raddr: '', rcity: '', rpost: '', office: '', declared: '', currency: 'GBP' as Currency };

export function IncomingParcelPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const dateLocale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const toast = useToast();
  const { profile } = useAuth();
  const register = useRegisterIncoming();
  const { data: incoming } = useMyIncoming(profile?.id);

  const [form, setForm] = useState({ ...EMPTY });
  const [mode, setMode] = useState<'address' | 'office'>('address');
  const [justRegistered, setJustRegistered] = useState<{ id: string; code: string } | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const L =
    lang === 'bg'
      ? {
          title: 'Очаквам пратка',
          subtitle: 'Поръчали сте от Amazon или UK магазин до нашия адрес? Регистрирайте я и я доставяме до България.',
          how: 'Използвайте нашия адрес в Манчестър при поръчка, въведете номера за проследяване тук, и щом колетът пристигне — го изпращаме до вас.',
          tracking: 'Номер за проследяване (Amazon/куриер)',
          tracking_ph: 'напр. TBA1234567890',
          shop: 'Магазин (по избор)',
          shop_ph: 'напр. Amazon, eBay, ASOS',
          weight: 'Очаквано тегло (кг)',
          weight_hint: 'Ориентировъчно — претегляме точно при пристигане.',
          est: 'Ориентировъчна цена',
          deliver: 'Доставка в България',
          use_last: 'Както последния път',
          rname: 'Получател',
          rname_ph: 'Име на получателя',
          rphone: 'Телефон',
          mode_addr: 'До адрес',
          mode_office: 'До офис на Еконт',
          addr: 'Адрес',
          city: 'Град',
          post: 'Пощенски код',
          declared: 'Стойност на стоката (по избор)',
          currency: 'Валута',
          submit: 'Регистрирай пратката',
          err: 'Моля, попълнете номер, тегло, получател и адрес/офис.',
          ok: 'Пратката е регистрирана:',
          ok_title: 'Пратката е регистрирана успешно',
          ok_view: 'Виж пратката',
          ok_again: 'Регистрирай нова',
          list_title: 'Моите входящи пратки',
          list_empty_t: 'Все още няма входящи пратки',
          list_empty_d: 'Регистрирайте първата си пратка от формата по-горе.',
          ref: 'Реф.',
        }
      : {
          title: 'Incoming parcel',
          subtitle: 'Ordered from Amazon or a UK shop to our address? Register it and we deliver it to Bulgaria.',
          how: 'Use our Manchester address at checkout, enter the tracking number here, and the moment the parcel arrives we forward it to you.',
          tracking: 'Tracking number (Amazon/courier)',
          tracking_ph: 'e.g. TBA1234567890',
          shop: 'Shop (optional)',
          shop_ph: 'e.g. Amazon, eBay, ASOS',
          weight: 'Estimated weight (kg)',
          weight_hint: 'A rough estimate — we weigh it exactly on arrival.',
          est: 'Estimated price',
          deliver: 'Delivery in Bulgaria',
          use_last: 'Same as last time',
          rname: 'Recipient',
          rname_ph: 'Recipient name',
          rphone: 'Phone',
          mode_addr: 'To address',
          mode_office: 'To Econt office',
          addr: 'Address',
          city: 'City',
          post: 'Postcode',
          declared: 'Goods value (optional)',
          currency: 'Currency',
          submit: 'Register parcel',
          err: 'Please fill the tracking number, weight, recipient and address/office.',
          ok: 'Parcel registered:',
          ok_title: 'Parcel registered successfully',
          ok_view: 'View parcel',
          ok_again: 'Register another',
          list_title: 'My incoming parcels',
          list_empty_t: 'No incoming parcels yet',
          list_empty_d: 'Register your first one in the form above.',
          ref: 'Ref',
        };

  const weightNum = Number(form.weight.replace(',', '.'));
  const est = weightNum > 0 ? (weightNum * 2).toFixed(2) : null;
  const last = incoming?.[0]?.receiver;

  const useLast = () => {
    if (!last) return;
    setForm((f) => ({
      ...f,
      rname: last.name ?? '',
      rphone: last.phone ?? '',
      raddr: last.line1 ?? '',
      rcity: last.city ?? '',
      rpost: last.postcode ?? '',
      office: last.econt_office_code ?? '',
    }));
    setMode(last.econt_office_code ? 'office' : 'address');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const ok =
      form.tracking.trim() && weightNum > 0 && form.rname.trim() && form.rphone.trim() && (mode === 'address' ? form.rcity.trim() : form.office);
    if (!ok) {
      toast.error(L.err);
      return;
    }
    try {
      const created = await register.mutateAsync({
        client_id: profile.id,
        inbound_ref: form.tracking.trim().toUpperCase(),
        sender: { name: profile.full_name ?? '', phone: '', line1: form.shop.trim(), city: 'Manchester', postcode: '', country: 'GB' },
        receiver: {
          name: form.rname.trim(),
          phone: toE164('+359', form.rphone.trim()),
          line1: mode === 'address' ? form.raddr.trim() : '',
          city: mode === 'address' ? form.rcity.trim() : '',
          postcode: mode === 'address' ? form.rpost.trim() : '',
          country: 'BG',
          econt_office_code: mode === 'office' ? form.office || null : null,
        },
        weight_kg: weightNum,
        declared_value: Number(form.declared.replace(',', '.')) || 0,
        currency: form.currency,
        notes: `${lang === 'bg' ? 'Входяща пратка' : 'Incoming parcel'}${form.shop.trim() ? ` · ${form.shop.trim()}` : ''}`,
      });
      toast.success(`${L.ok} ${created.public_code}`);
      setJustRegistered({ id: created.id, code: created.public_code });
      setForm({ ...EMPTY });
      setMode('address');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error(L.err);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading title={L.title} subtitle={L.subtitle} />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand-50 p-3 text-sm text-brand-700">
        <Inbox className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L.how}</span>
      </div>

      {justRegistered && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{L.ok_title}</p>
            <p className="mt-0.5 font-mono text-base font-bold">{justRegistered.code}</p>
            <div className="mt-2 flex gap-4 text-sm">
              <Link to={`/portal/shipments/${justRegistered.id}`} className="font-medium underline hover:no-underline">
                {L.ok_view}
              </Link>
              <button
                type="button"
                onClick={() => setJustRegistered(null)}
                className="font-medium text-emerald-700/80 hover:text-emerald-900"
              >
                {L.ok_again}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
        <Card>
          <CardBody className="space-y-4">
            <Field label={L.tracking} htmlFor="trk">
              <Input id="trk" value={form.tracking} onChange={set('tracking')} placeholder={L.tracking_ph} className="font-mono" required />
            </Field>
            <Field label={L.shop} htmlFor="shop">
              <Input id="shop" value={form.shop} onChange={set('shop')} placeholder={L.shop_ph} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {SHOPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, shop: s }))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    form.shop === s ? 'border-brand bg-brand text-brand-fg' : 'border-border text-muted-fg hover:bg-muted',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Field label={L.weight} htmlFor="wt" hint={L.weight_hint}>
              <Input id="wt" inputMode="decimal" value={form.weight} onChange={set('weight')} placeholder="0.0" required />
            </Field>
            {est && (
              <p className="text-sm text-muted-fg">
                {L.est}: <span className="font-semibold text-foreground">≈ £{est}</span>
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-foreground">{L.deliver}</h2>
              {last?.name && (
                <button type="button" onClick={useLast} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline">
                  <RotateCcw className="h-3.5 w-3.5" /> {L.use_last}
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.rname} htmlFor="rn">
                <Input id="rn" value={form.rname} onChange={set('rname')} placeholder={L.rname_ph} required />
              </Field>
              <Field label={L.rphone} htmlFor="rp">
                <Input id="rp" type="tel" value={form.rphone} onChange={set('rphone')} placeholder="+359…" required />
              </Field>
            </div>

            <div className="inline-flex rounded-xl border border-border p-1">
              <button
                type="button"
                onClick={() => setMode('address')}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', mode === 'address' ? 'bg-brand text-brand-fg' : 'text-muted-fg')}
              >
                <Home className="h-4 w-4" /> {L.mode_addr}
              </button>
              <button
                type="button"
                onClick={() => setMode('office')}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', mode === 'office' ? 'bg-brand text-brand-fg' : 'text-muted-fg')}
              >
                <Building2 className="h-4 w-4" /> {L.mode_office}
              </button>
            </div>

            {mode === 'address' ? (
              <div className="space-y-4">
                <Field label={L.addr} htmlFor="ra">
                  <Input id="ra" value={form.raddr} onChange={set('raddr')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={L.city} htmlFor="rc">
                    <Input id="rc" value={form.rcity} onChange={set('rcity')} required />
                  </Field>
                  <Field label={L.post} htmlFor="rpc">
                    <Input id="rpc" value={form.rpost} onChange={set('rpost')} />
                  </Field>
                </div>
              </div>
            ) : (
              <EcontOfficePicker
                selected={form.office || null}
                onPick={(o) => setForm((f) => ({ ...f, office: o.code, rcity: f.rcity || o.city }))}
                onClear={() => setForm((f) => ({ ...f, office: '' }))}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.declared} htmlFor="dv">
                <Input id="dv" inputMode="decimal" value={form.declared} onChange={set('declared')} placeholder="0.00" />
              </Field>
              <Field label={L.currency} htmlFor="cur">
                <Select id="cur" value={form.currency} onChange={set('currency')}>
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

        <Button type="submit" size="lg" loading={register.isPending} className="w-full gap-2">
          <Inbox className="h-4 w-4" /> {L.submit}
        </Button>
      </form>

      {/* Tracker */}
      <div className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-foreground">
          <PackageSearch className="h-4.5 w-4.5 text-brand" /> {L.list_title}
        </h2>
        {!incoming || incoming.length === 0 ? (
          <EmptyState title={L.list_empty_t} description={L.list_empty_d} icon={<Inbox className="h-7 w-7" />} />
        ) : (
          <div className="space-y-2">
            {incoming.map((p) => (
              <Link key={p.id} to={`/portal/shipments/${p.id}`}>
                <Card className="transition-shadow hover:shadow-lift">
                  <CardBody className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-foreground">{p.public_code}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-fg">
                        {p.inbound_ref && (
                          <>
                            {L.ref}: <span className="font-mono">{p.inbound_ref}</span> ·{' '}
                          </>
                        )}
                        {formatDate(p.created_at, dateLocale)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
