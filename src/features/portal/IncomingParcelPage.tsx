/**
 * Client self-service: pre-register an incoming parcel (ordered from Amazon / a UK
 * shop to our Manchester hub). The client gives the courier tracking № + their BG
 * delivery details; we create a `booked` shipment with that tracking № as the
 * inbound reference, so when the box arrives the operator's Inbound scan matches it
 * and the label auto-prints. Final weight/price are set on arrival.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, CheckCircle2, Home, Building2, ArrowRight } from 'lucide-react';
import { Button, Card, CardBody, Input, Field, Select } from '@/components/ui';
import { PageHeading } from '@/components/shared/common';
import { EcontOfficePicker } from '@/components/shared/EcontOfficePicker';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useRegisterIncoming } from '@/lib/queries';
import { cn } from '@/lib/utils';
import type { Currency } from '@/types/domain';

const CURRENCIES: Currency[] = ['GBP', 'EUR', 'BGN'];
const EMPTY = { tracking: '', shop: '', weight: '', rname: '', rphone: '', raddr: '', rcity: '', rpost: '', office: '', declared: '', currency: 'GBP' as Currency };

export function IncomingParcelPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const toast = useToast();
  const { profile } = useAuth();
  const register = useRegisterIncoming();

  const [form, setForm] = useState({ ...EMPTY });
  const [mode, setMode] = useState<'address' | 'office'>('address');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
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
          ok_title: 'Пратката е регистрирана',
          ok_text: 'Щом колетът пристигне в склада ни, ще го обработим и ще ви уведомим. Можете да следите статуса в профила си.',
          ok_ref: 'Входящ номер',
          ok_code: 'Номер на пратката',
          to_ship: 'Виж пратките',
          another: 'Регистрирай друга',
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
          ok_title: 'Parcel registered',
          ok_text: "Once it reaches our hub we'll process it and let you know. You can follow the status in your account.",
          ok_ref: 'Incoming ref',
          ok_code: 'Shipment code',
          to_ship: 'View shipments',
          another: 'Register another',
        };

  const weightNum = Number(form.weight.replace(',', '.'));
  const est = weightNum > 0 ? (weightNum * 2).toFixed(2) : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const ok =
      form.tracking.trim() &&
      weightNum > 0 &&
      form.rname.trim() &&
      form.rphone.trim() &&
      (mode === 'address' ? form.rcity.trim() : form.office);
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
          phone: form.rphone.trim(),
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
      setCreatedCode(created.public_code);
      setForm({ ...EMPTY });
      setMode('address');
    } catch {
      toast.error(L.err);
    }
  };

  if (createdCode) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardBody className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="font-display text-2xl font-extrabold text-foreground">{L.ok_title}</h1>
            <p className="text-muted-fg">{L.ok_text}</p>
            <div className="rounded-xl border border-border bg-muted/40 p-4 font-mono text-lg font-bold text-foreground">
              {L.ok_code}: {createdCode}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/portal/shipments">
                <Button className="gap-2">
                  {L.to_ship} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setCreatedCode(null)}>
                {L.another}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading title={L.title} subtitle={L.subtitle} />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand-50 p-3 text-sm text-brand-700">
        <Inbox className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L.how}</span>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
        <Card>
          <CardBody className="space-y-4">
            <Field label={L.tracking} htmlFor="trk">
              <Input id="trk" value={form.tracking} onChange={set('tracking')} placeholder={L.tracking_ph} className="font-mono" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.shop} htmlFor="shop">
                <Input id="shop" value={form.shop} onChange={set('shop')} placeholder={L.shop_ph} />
              </Field>
              <Field label={L.weight} htmlFor="wt" hint={L.weight_hint}>
                <Input id="wt" inputMode="decimal" value={form.weight} onChange={set('weight')} placeholder="0.0" required />
              </Field>
            </div>
            {est && (
              <p className="text-sm text-muted-fg">
                {L.est}: <span className="font-semibold text-foreground">≈ £{est}</span>
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-display text-sm font-bold text-foreground">{L.deliver}</h2>
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
          </CardBody>
        </Card>

        <Card>
          <CardBody>
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
    </div>
  );
}
