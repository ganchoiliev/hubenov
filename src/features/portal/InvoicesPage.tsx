import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { Receipt, FileDown } from 'lucide-react';
import { Button, Card, CardBody, Badge, Skeleton } from '@/components/ui';
import { PageHeading, EmptyState, Stat } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useMyInvoices } from '@/lib/queries';
import { formatMoney, formatDate } from '@/lib/utils';
import type { Invoice, InvoiceStatus, Currency } from '@/types/domain';

const TONE_BY_STATUS: Record<InvoiceStatus, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
};

export function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const toast = useToast();
  const { profile } = useAuth();
  const { data: invoices, isLoading } = useMyInvoices(profile?.id);

  const L =
    i18n.resolvedLanguage === 'en'
      ? { outstanding: 'Outstanding balance', no_invoices: 'No invoices yet' }
      : { outstanding: 'Дължима сума', no_invoices: 'Все още няма фактури' };

  const list: Invoice[] = invoices ?? [];

  // Outstanding = sum of everything not fully paid. Mixed currencies are summed
  // per-currency so we never add GBP to EUR; show the dominant currency total.
  const outstandingByCurrency = list.reduce<Record<string, number>>((acc, inv) => {
    if (inv.status !== 'paid') {
      acc[inv.currency] = (acc[inv.currency] ?? 0) + inv.amount;
    }
    return acc;
  }, {});
  const outstandingEntries = Object.entries(outstandingByCurrency);
  const outstandingValue =
    outstandingEntries.length === 0
      ? formatMoney(0, (list[0]?.currency ?? 'EUR') as Currency, locale)
      : outstandingEntries
          .map(([currency, amount]) => formatMoney(amount, currency, locale))
          .join(' · ');

  const openPdf = (inv: Invoice) => {
    if (!inv.pdf_url) return;
    try {
      window.open(inv.pdf_url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div>
      <PageHeading title={t('portal.invoices')} />

      <div className="mb-6 grid gap-4 sm:max-w-xs">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <Stat label={L.outstanding} value={outstandingValue} />
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title={L.no_invoices} icon={<Receipt className="h-7 w-7" />} />
      ) : (
        <div className="space-y-2">
          {list.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.18 }}
            >
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-foreground">{inv.number}</p>
                      <Badge tone={TONE_BY_STATUS[inv.status]}>
                        {t(`portal.invoice_${inv.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-fg">{formatDate(inv.created_at, locale)}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-display text-lg font-extrabold text-foreground">
                      {formatMoney(inv.amount, inv.currency, locale)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!inv.pdf_url}
                      onClick={() => openPdf(inv)}
                      className="gap-2"
                    >
                      <FileDown className="h-4 w-4" /> {t('portal.download_pdf')}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
