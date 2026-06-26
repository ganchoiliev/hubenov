import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { Receipt, FileDown } from 'lucide-react';
import { Button, Card, CardBody, Badge, Skeleton } from '@/components/ui';
import { PageHeading, EmptyState, Stat } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useMyInvoices } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { formatMoney, formatDate } from '@/lib/utils';
import type { Invoice, InvoiceStatus, Currency, PartySnapshot } from '@/types/domain';

const TONE_BY_STATUS: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
  void: 'neutral',
};

export function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'bg-BG';
  const toast = useToast();
  const { profile } = useAuth();
  const { data: invoices, isLoading } = useMyInvoices(profile?.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const docLang: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  const L =
    i18n.resolvedLanguage === 'en'
      ? { outstanding: 'Outstanding balance', no_invoices: 'No invoices yet' }
      : { outstanding: 'Дължима сума', no_invoices: 'Все още няма фактури' };

  const list: Invoice[] = invoices ?? [];

  // Outstanding = sum of everything not fully paid. Mixed currencies are summed
  // per-currency so we never add GBP to EUR; show the dominant currency total.
  const outstandingByCurrency = list.reduce<Record<string, number>>((acc, inv) => {
    if (inv.status !== 'paid' && inv.status !== 'void') {
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

  // Generate the PDF on demand (invoices have no stored pdf_url). Enrich it with
  // the linked parcel's sender/receiver/addresses/weight — all readable by the
  // owning client under RLS. Dynamic import keeps pdf-lib out of the portal bundle.
  const download = async (inv: Invoice) => {
    setBusyId(inv.id);
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
        clientName: profile?.full_name ?? '',
        clientEmail: profile?.email ?? null,
        company: {},
        shipmentCode,
        sender,
        receiver,
        weightKg,
        locale: docLang,
      });
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusyId(null);
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
                      loading={busyId === inv.id}
                      onClick={() => void download(inv)}
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
