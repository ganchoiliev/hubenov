import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UserSearch, Phone, Mail, Package, Receipt, Pencil } from 'lucide-react';
import { Button, Card, CardBody, Input, Spinner, Badge } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/toast';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { useOtLookup, useUpdateProfile } from '@/lib/queries';
import { otCodeSchema } from '@/schemas';
import { formatMoney } from '@/lib/utils';
import type { Profile } from '@/types/domain';

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
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-fg">
                <Package className="h-4 w-4" /> {t('operator.shipments')} ({data.shipments.length})
              </h3>
              {data.shipments.length === 0 ? (
                <p className="text-sm text-muted-fg">{t('portal.no_shipments')}</p>
              ) : (
                <div className="space-y-2">
                  {data.shipments.map((s) => (
                    <Link key={s.id} to={`/portal/shipments/${s.id}`}>
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
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-fg">
                <Receipt className="h-4 w-4" /> {t('operator.invoices')} ({data.invoices.length})
              </h3>
              {data.invoices.length === 0 ? (
                <p className="text-sm text-muted-fg">—</p>
              ) : (
                <div className="space-y-2">
                  {data.invoices.map((inv) => (
                    <Card key={inv.id}>
                      <CardBody className="flex items-center justify-between py-3.5">
                        <span className="font-mono text-sm">{inv.number}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatMoney(inv.amount, inv.currency, locale)}</span>
                          <Badge tone={inv.status === 'paid' ? 'success' : 'warning'}>
                            {t(`portal.invoice_${inv.status}`)}
                          </Badge>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
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

  // Reset the form when a different customer is looked up.
  useEffect(() => {
    setName(profile.full_name);
    setPhone(profile.phone ?? '');
    setEmail(profile.email ?? '');
    setEditing(false);
  }, [profile.id, profile.full_name, profile.phone, profile.email]);

  const T =
    lang === 'bg'
      ? { edit: 'Редактирай', save: 'Запази', cancel: 'Отказ', saved: 'Профилът е обновен', err: 'Грешка при запазване', name: 'Име', phone: 'Телефон', email: 'Имейл' }
      : { edit: 'Edit', save: 'Save', cancel: 'Cancel', saved: 'Profile updated', err: 'Save failed', name: 'Name', phone: 'Phone', email: 'Email' };

  const save = async () => {
    try {
      await update.mutateAsync({
        id: profile.id,
        patch: { full_name: name.trim(), phone: phone.trim() || null, email: email.trim() || null },
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
