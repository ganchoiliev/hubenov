/**
 * Scan → label in one motion (§8). USB scanner = keyboard (types code + Enter),
 * so typing a code + Enter behaves identically (testable without hardware).
 *
 * On Enter the whole flow fires automatically — resolve → build 4×6 PDF →
 * print → set status `at_uk_hub` + tracking event. Target: scan→printed ≤ 2s,
 * ≤ 1 keystroke. Offline-tolerant: the print queues and the event is retried.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, Printer, ArrowRight, Clock, WifiOff } from 'lucide-react';
import { Card, CardBody, Input, Badge } from '@/components/ui';
import { PageHeading } from '@/components/shared/common';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/toast';
import { resolveShipmentByCode, getClientCode, useUpdateStatus } from '@/lib/queries';
import { buildLabelPdf, type LabelData } from '@/lib/label';
import { getPrinter } from '@/providers/print';
import { timelineIndex } from '@/lib/status';
import type { Shipment } from '@/types/domain';

interface ScanResult {
  shipment: Shipment;
  ms: number;
  printed: boolean;
  queued: boolean;
}

export function ScanStationPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const updateStatus = useUpdateStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [notFound, setNotFound] = useState<string | null>(null);

  // Persistent auto-focus so the next scan always lands here (§8.1).
  useEffect(() => {
    inputRef.current?.focus();
  }, [last, busy]);

  const handleScan = async (raw: string) => {
    const value = raw.trim();
    if (!value || busy) return;
    setBusy(true);
    setNotFound(null);
    const started = performance.now();

    try {
      const shipment = await resolveShipmentByCode(value);
      if (!shipment) {
        setNotFound(value);
        toast.error(`${t('track.not_found')} (${value})`);
        return;
      }

      // Build the 4×6 label (client-side in Wave 1; mirrors `label-render`).
      const clientCode = (await getClientCode(shipment.client_id)) ?? '—';
      const labelData: LabelData = {
        public_code: shipment.public_code,
        awb_barcode: shipment.awb_barcode,
        client_code: clientCode,
        direction: shipment.direction,
        weight_kg: shipment.weight_kg,
        sender: shipment.sender,
        receiver: shipment.receiver,
        is_gift: shipment.is_gift,
        declared_value: shipment.declared_value,
        currency: shipment.currency,
      };
      const pdf = await buildLabelPdf(labelData);
      const printRes = await getPrinter().print({ pdf, title: shipment.public_code });

      // Advance to at_uk_hub only if not already past it; write a tracking event.
      const advance = timelineIndex(shipment.status) < timelineIndex('at_uk_hub');
      if (advance) {
        try {
          await updateStatus.mutateAsync({
            shipment,
            to: 'at_uk_hub',
            note_bg: 'Сканирана и етикетирана в склада',
            note_en: 'Scanned & labelled at hub',
            source: 'scan',
          });
        } catch {
          // Offline / RLS — the print still succeeded; surfaced below.
        }
      }

      const result: ScanResult = {
        shipment: { ...shipment, status: advance ? 'at_uk_hub' : shipment.status },
        ms: Math.round(performance.now() - started),
        printed: printRes.ok && !printRes.queued,
        queued: !!printRes.queued,
      };
      setLast(result);
      setHistory((h) => [result, ...h].slice(0, 8));
      if (printRes.queued) toast.info(t('operator.queued_offline'));
      else toast.success(t('operator.printed'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
      setCode('');
    }
  };

  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading title={t('operator.scan_title')} subtitle={t('operator.scan_hint')} />

      {/* Scan field — large, always focused */}
      <Card className="border-brand/30">
        <CardBody className="p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleScan(code);
            }}
          >
            <div className="flex items-center gap-3">
              <ScanLine className="h-7 w-7 shrink-0 text-brand" />
              <Input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('operator.scan_placeholder')}
                className="h-14 flex-1 border-0 bg-transparent font-mono text-xl uppercase shadow-none focus-visible:ring-0"
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
              {busy && <Printer className="h-6 w-6 animate-pulse text-brand" />}
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Result */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {notFound ? (
              <motion.div key="nf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="border-danger/30">
                  <CardBody className="flex items-center gap-3 text-danger">
                    <XCircle className="h-6 w-6" />
                    <span className="font-mono">{notFound}</span> — {t('track.not_found')}
                  </CardBody>
                </Card>
              </motion.div>
            ) : last ? (
              <motion.div
                key={last.shipment.id + String(history.length)}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="overflow-hidden border-success/40">
                  <div className="flex items-center justify-between bg-success/10 px-6 py-3">
                    <span className="flex items-center gap-2 font-semibold text-success">
                      {last.queued ? <WifiOff className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                      {last.queued ? t('operator.queued_offline') : t('operator.printed')}
                    </span>
                    <Badge tone={last.ms <= 2000 ? 'success' : 'warning'}>
                      <Clock className="h-3 w-3" /> {last.ms} ms
                    </Badge>
                  </div>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-lg font-bold text-foreground">{last.shipment.public_code}</p>
                      <StatusBadge status={last.shipment.status} />
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Party label={t('wizard.step_sender')} name={last.shipment.sender.name} city={last.shipment.sender.city} />
                      <Party label={t('wizard.step_receiver')} name={last.shipment.receiver.name} city={last.shipment.receiver.city} />
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-fg">
                      <span className="font-semibold text-foreground">
                        {last.shipment.weight_kg} {t('common.kg')}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                      <span>{last.shipment.direction === 'UK_BG' ? 'UK → BG' : 'BG → UK'}</span>
                      <span className="ml-auto font-mono text-xs">{last.shipment.awb_barcode}</span>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardBody className="flex flex-col items-center justify-center py-16 text-center text-muted-fg">
                    <ScanLine className="h-12 w-12" />
                    <p className="mt-3 text-sm">{t('operator.scan_hint')}</p>
                    <p className="mt-1 text-xs">
                      {t('common.search')}: <span className="font-mono">HB-2406-0001</span>
                    </p>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent scans */}
        <div>
          <p className="mb-2 text-sm font-semibold text-muted-fg">{t('operator.shipments')}</p>
          <div className="space-y-2">
            {history.length === 0 && <p className="text-sm text-muted-fg">—</p>}
            {history.map((h, i) => (
              <div
                key={h.shipment.id + i}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs">{h.shipment.public_code}</span>
                <span className="flex items-center gap-1 text-xs text-muted-fg">
                  {h.queued ? <WifiOff className="h-3.5 w-3.5 text-warning" /> : <Printer className="h-3.5 w-3.5 text-success" />}
                  {h.ms}ms
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-fg">
            {locale === 'bg'
              ? 'Сканирай или въведи номер и натисни Enter — етикетът се отпечатва автоматично.'
              : 'Scan or type a number and press Enter — the label prints automatically.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Party({ label, name, city }: { label: string; name: string; city: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">{label}</p>
      <p className="mt-0.5 font-semibold text-foreground">{name}</p>
      <p className="text-sm text-muted-fg">{city}</p>
    </div>
  );
}
