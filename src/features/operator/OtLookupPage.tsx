import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UserSearch, Phone, Mail, Package, Receipt } from 'lucide-react';
import { Button, Card, CardBody, Input, Spinner, Badge } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { useOtLookup } from '@/lib/queries';
import { otCodeSchema } from '@/schemas';
import { formatMoney } from '@/lib/utils';

export function OtLookupPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const [input, setInput] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { data, isFetching } = useOtLookup(code);

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
            <Card>
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-extrabold text-foreground">
                      {data.profile.full_name}
                    </h2>
                    <Badge tone="brand">{data.profile.client_code}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-muted-fg">
                    {data.profile.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {data.profile.phone}
                      </span>
                    )}
                    {data.profile.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {data.profile.email}
                      </span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

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
