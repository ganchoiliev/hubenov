/**
 * Scan workstation (§8). A USB/Bluetooth scanner types the code + Enter, so the
 * flow is identical when typing by hand (testable without hardware). Always
 * auto-focused so the next scan lands here.
 *
 * Modes decide what each scan DOES — so an operator can blast through a whole
 * batch hands-free:
 *   • label   — print the 4×6 label + receive into the hub (at_uk_hub)
 *   • receive — receive into the hub only (no print)
 *   • lookup  — just show the parcel; act via the buttons
 * Every result also exposes manual tools (print label, customs, advance, open).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ScanLine,
  QrCode,
  CheckCircle2,
  XCircle,
  Printer,
  ArrowRight,
  Clock,
  WifiOff,
  FileText,
  Eye,
  Volume2,
  VolumeX,
  PackageCheck,
  Tag,
  Info,
  RotateCcw,
} from 'lucide-react';
import { Card, CardBody, Input, Badge, Button } from '@/components/ui';
import { PageHeading } from '@/components/shared/common';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/toast';
import { resolveShipmentByCode, getClientCode, useUpdateStatus, useCompanySettings } from '@/lib/queries';
import { parseScanPayload } from '@/lib/scanPayload';
import { buildLabelPdf } from '@/lib/label';
import { getPrinter } from '@/providers/print';
import { assessCustoms } from '@/lib/customs';
import { timelineIndex, nextStatuses, statusLabel } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { Shipment, Currency, ParcelType } from '@/types/domain';

type Mode = 'label' | 'receive' | 'lookup' | 'inbound';
const MODE_KEY = 'hubenov.scan.mode.v1';
const SOUND_KEY = 'hubenov.scan.sound.v1';

interface ScanResult {
  shipment: Shipment;
  ms: number;
  printed: boolean;
  queued: boolean;
}

const PARCEL_DESC: Record<ParcelType, string> = {
  parcel: 'Parcel',
  document: 'Documents',
  pallet: 'Pallet',
  food: 'Food',
  other: 'Goods',
};

/** Short confirmation tone — high = ok, low = error. Best-effort. */
function beep(ok: boolean): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = ok ? 880 : 200;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    /* audio unavailable */
  }
}

export function ScanStationPage() {
  const { t, i18n } = useTranslation();
  const locale: 'bg' | 'en' = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const toast = useToast();
  const updateStatus = useUpdateStatus();
  const { data: settings } = useCompanySettings();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [queueLen, setQueueLen] = useState(0);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const recentRef = useRef<Map<string, number>>(new Map());
  const [last, setLast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(MODE_KEY) as Mode) || 'label');
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off');

  // Persistent auto-focus so the next scan always lands here.
  useEffect(() => {
    inputRef.current?.focus();
  }, [last, processing, mode]);

  const L =
    locale === 'bg'
      ? {
          modes: { label: 'Етикет', receive: 'Приемане', lookup: 'Търсене', inbound: 'Входящи' },
          modeHint: {
            label: 'Сканирай → печата етикет + приема в склада',
            receive: 'Сканирай → само приема в склада (без печат)',
            lookup: 'Сканирай → показва пратката (без действие)',
            inbound: 'Сканирай чужд баркод → създай пратка + автоматичен етикет',
          },
          sound: 'Звук',
          scanned: 'Сканирани',
          inQueue: 'в опашка',
          reset: 'Нулирай',
          printLabel: 'Етикет',
          customs: 'Митница',
          open: 'Виж',
          received: 'Приета в склада',
          recent: 'Последни сканирания',
          tips: 'Как се работи',
          tip1: 'Свържи USB/Bluetooth скенер — работи като клавиатура, нищо за настройка.',
          tip2: 'Или въведи номера ръчно и натисни Enter.',
          tip3: 'Печат: задай принтер по подразбиране в браузъра; размерът на етикета е в Настройки.',
          tip4: 'Режими: «Етикет» печата и приема; «Приемане» само приема; «Търсене» само показва.',
          idleTitle: 'Готов за сканиране',
          idleHint: 'Сканирай баркод или въведи ОТ/HB номер',
          example: 'напр.',
        }
      : {
          modes: { label: 'Label', receive: 'Receive', lookup: 'Lookup', inbound: 'Inbound' },
          modeHint: {
            label: 'Scan → print label + receive into hub',
            receive: 'Scan → receive into hub only (no print)',
            lookup: 'Scan → show the parcel (no action)',
            inbound: 'Scan an external barcode → create parcel + auto label',
          },
          sound: 'Sound',
          scanned: 'Scanned',
          inQueue: 'queued',
          reset: 'Reset',
          printLabel: 'Label',
          customs: 'Customs',
          open: 'Open',
          received: 'Received at hub',
          recent: 'Recent scans',
          tips: 'How it works',
          tip1: 'Plug in a USB/Bluetooth scanner — it acts as a keyboard, nothing to set up.',
          tip2: 'Or type the number by hand and press Enter.',
          tip3: 'Printing: set a default printer in the browser; label size is in Settings.',
          tip4: 'Modes: "Label" prints + receives; "Receive" only receives; "Lookup" only shows.',
          idleTitle: 'Ready to scan',
          idleHint: 'Scan a barcode or type an OT/HB number',
          example: 'e.g.',
        };

  const setModePersist = (m: Mode) => {
    setMode(m);
    localStorage.setItem(MODE_KEY, m);
  };
  const toggleSound = () => {
    setSound((v) => {
      localStorage.setItem(SOUND_KEY, v ? 'off' : 'on');
      return !v;
    });
  };

  const labelFor = async (shipment: Shipment) => {
    const clientCode = (await getClientCode(shipment.client_id)) ?? '—';
    const pdf = await buildLabelPdf({
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
    });
    return getPrinter(settings?.print_method).print({ pdf, title: shipment.public_code });
  };

  // ── Scan engine ────────────────────────────────────────────────────────────
  // A hardware scanner fires `code + Enter` faster than a print + network round
  // trip. We never disable the input; codes go into a queue and are processed
  // strictly one at a time, so nothing is dropped or re-ordered. Identical codes
  // within a short window are ignored (double-trigger scanners).
  const DEDUP_MS = 2500;

  // Inbound: a parcel arriving from an external website/courier. Scan its QR or
  // barcode → if it matches a Hubenov shipment (our QR) or a pre-registered
  // tracking № we print our label + receive it; otherwise open intake prefilled
  // (with any structured data found) to create it and auto-print.
  const handleInbound = async (value: string) => {
    const parsed = parseScanPayload(value);
    const started = performance.now();
    const shipment = parsed.code ? await resolveShipmentByCode(parsed.code) : null;
    if (shipment) {
      const needStatus = timelineIndex(shipment.status) < timelineIndex('at_uk_hub');
      const [printRes, statusOk] = await Promise.all([
        labelFor(shipment).catch(() => null),
        needStatus
          ? updateStatus
              .mutateAsync({
                shipment,
                to: 'at_uk_hub',
                note_bg: 'Входяща пратка приета',
                note_en: 'Inbound parcel received',
                source: 'scan',
              })
              .then(() => true)
              .catch(() => false)
          : Promise.resolve(false),
      ]);
      const result: ScanResult = {
        shipment: { ...shipment, status: statusOk ? 'at_uk_hub' : shipment.status },
        ms: Math.round(performance.now() - started),
        printed: !!printRes && printRes.ok && !printRes.queued,
        queued: !!printRes?.queued,
      };
      setLast(result);
      setHistory((h) => [result, ...h].slice(0, 8));
      setCount((c) => c + 1);
      if (sound) beep(true);
      toast[result.queued ? 'info' : 'success'](result.queued ? t('operator.queued_offline') : t('operator.printed'));
      return;
    }
    // Unknown → create it in intake, prefilled + auto-print on save.
    if (sound) beep(true);
    const params = new URLSearchParams({ inbound: parsed.raw, autoprint: '1' });
    if (parsed.recipient?.name) params.set('rname', parsed.recipient.name);
    if (parsed.recipient?.phone) params.set('rphone', parsed.recipient.phone);
    if (parsed.recipient?.line1) params.set('raddr', parsed.recipient.line1);
    if (parsed.recipient?.city) params.set('rcity', parsed.recipient.city);
    if (parsed.recipient?.postcode) params.set('rpost', parsed.recipient.postcode);
    navigate(`/op/intake?${params.toString()}`);
  };

  const processOne = async (value: string) => {
    setNotFound(null);
    const started = performance.now();
    try {
      if (mode === 'inbound') {
        await handleInbound(value);
        return;
      }
      const shipment = await resolveShipmentByCode(value);
      if (!shipment) {
        setNotFound(value);
        if (sound) beep(false);
        toast.error(`${t('track.not_found')} (${value})`);
        return;
      }

      let printed = false;
      let queued = false;
      let finalStatus = shipment.status;

      if (mode === 'label' || mode === 'receive') {
        const needStatus = timelineIndex(shipment.status) < timelineIndex('at_uk_hub');
        // Print and the status write run concurrently so a slow printer never
        // blocks receiving the parcel into the hub.
        const printTask: Promise<{ ok: boolean; queued?: boolean } | null> =
          mode === 'label' ? labelFor(shipment).catch(() => null) : Promise.resolve(null);
        const statusTask: Promise<boolean> = needStatus
          ? updateStatus
              .mutateAsync({
                shipment,
                to: 'at_uk_hub',
                note_bg: mode === 'label' ? 'Сканирана и етикетирана в склада' : 'Приета в склада',
                note_en: mode === 'label' ? 'Scanned & labelled at hub' : 'Received at hub',
                source: 'scan',
              })
              .then(() => true)
              .catch(() => false) // offline / RLS / already moved — print still succeeded
          : Promise.resolve(false);
        const [printRes, statusOk] = await Promise.all([printTask, statusTask]);
        if (statusOk) finalStatus = 'at_uk_hub';
        if (printRes) {
          printed = printRes.ok && !printRes.queued;
          queued = !!printRes.queued;
        }
      }

      const result: ScanResult = {
        shipment: { ...shipment, status: finalStatus },
        ms: Math.round(performance.now() - started),
        printed,
        queued,
      };
      setLast(result);
      setHistory((h) => [result, ...h].slice(0, 8));
      setCount((c) => c + 1);
      if (sound) beep(true);
      if (mode === 'label') toast[queued ? 'info' : 'success'](queued ? t('operator.queued_offline') : t('operator.printed'));
      else if (mode === 'receive') toast.success(L.received);
    } catch {
      if (sound) beep(false);
      toast.error(t('common.error'));
    }
  };

  const pump = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      while (queueRef.current.length > 0) {
        const value = queueRef.current[0]!;
        await processOne(value);
        queueRef.current.shift();
        setQueueLen(queueRef.current.length);
      }
    } finally {
      processingRef.current = false;
      setProcessing(false);
      inputRef.current?.focus();
    }
  };

  const enqueue = (raw: string) => {
    const value = raw.trim().toUpperCase();
    if (!value) return;
    const now = Date.now();
    for (const [k, ts] of recentRef.current) if (now - ts > DEDUP_MS) recentRef.current.delete(k);
    const seen = recentRef.current.get(value);
    if ((seen && now - seen < DEDUP_MS) || queueRef.current.includes(value)) return; // double-trigger / already queued
    recentRef.current.set(value, now);
    queueRef.current.push(value);
    setQueueLen(queueRef.current.length);
    void pump();
  };

  const doPrintLabel = async () => {
    if (!last) return;
    try {
      const r = await labelFor(last.shipment);
      toast[r.queued ? 'info' : 'success'](r.queued ? t('operator.queued_offline') : t('operator.printed'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const doCustoms = async () => {
    if (!last) return;
    const s = last.shipment;
    try {
      const { downloadCustomsPdf } = await import('@/lib/customsDoc');
      const items = [{ description: PARCEL_DESC[s.parcel_type], qty: 1, unit_value: s.declared_value }];
      const a = assessCustoms(items, s.is_gift, s.currency as Currency, settings?.eori ?? null);
      await downloadCustomsPdf({
        ref: s.public_code,
        dateISO: new Date().toISOString(),
        isGift: s.is_gift,
        giftReliefApplied: a.gift_relief_applied,
        eori: settings?.eori ?? null,
        exporter: s.sender,
        consignee: s.receiver,
        items,
        total: a.total_value,
        currency: s.currency as Currency,
        weightKg: s.weight_kg,
      });
    } catch {
      toast.error(t('common.error'));
    }
  };

  const doAdvance = async () => {
    if (!last) return;
    const to = nextStatuses(last.shipment.status)[0];
    if (!to) return;
    try {
      await updateStatus.mutateAsync({ shipment: last.shipment, to, source: 'manual' });
      setLast((l) => (l ? { ...l, shipment: { ...l.shipment, status: to } } : l));
      toast.success(`${last.shipment.public_code} · ${statusLabel(to, locale)}`);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const nextStatus = last ? nextStatuses(last.shipment.status)[0] : undefined;

  const modeBtn = (m: Mode, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setModePersist(m)}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        mode === m ? 'bg-brand text-brand-fg shadow-soft' : 'text-muted-fg hover:text-foreground',
      )}
    >
      {icon} {L.modes[m]}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading title={t('operator.scan_title')} subtitle={L.modeHint[mode]} />

      {/* Mode selector + session controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {modeBtn('label', <Tag className="h-4 w-4" />)}
          {modeBtn('receive', <PackageCheck className="h-4 w-4" />)}
          {modeBtn('inbound', <QrCode className="h-4 w-4" />)}
          {modeBtn('lookup', <Eye className="h-4 w-4" />)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-fg">
            {L.scanned}: <span className="font-semibold tabular-nums text-foreground">{count}</span>
          </span>
          {queueLen > 0 && (
            <Badge tone="warning">
              {queueLen} {L.inQueue}
            </Badge>
          )}
          {count > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => {
                setCount(0);
                setHistory([]);
                setLast(null);
              }}
            >
              <RotateCcw className="h-4 w-4" /> {L.reset}
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={toggleSound} aria-label={L.sound}>
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-fg" />}
          </Button>
        </div>
      </div>

      {/* Scan field — large, always focused */}
      <Card className="border-brand/30">
        <CardBody className="p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enqueue(code);
              setCode('');
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
              />
              {processing && <Printer className="h-6 w-6 animate-pulse text-brand" />}
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Screen-reader announcement of each scan result */}
      <p className="sr-only" aria-live="polite">
        {notFound
          ? `${notFound} ${t('track.not_found')}`
          : last
            ? `${last.shipment.public_code} ${statusLabel(last.shipment.status, locale)}`
            : ''}
      </p>

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
                key={last.shipment.id + String(count)}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="overflow-hidden border-success/40">
                  <div className="flex items-center justify-between bg-success/10 px-6 py-3">
                    <span className="flex items-center gap-2 font-semibold text-success">
                      {last.queued ? <WifiOff className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                      {mode === 'label'
                        ? last.queued
                          ? t('operator.queued_offline')
                          : t('operator.printed')
                        : mode === 'receive'
                          ? L.received
                          : last.shipment.public_code}
                    </span>
                    {mode === 'label' && (
                      <Badge tone={last.ms <= 2000 ? 'success' : 'warning'}>
                        <Clock className="h-3 w-3" /> {last.ms} ms
                      </Badge>
                    )}
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

                    {/* Per-result tools */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void doPrintLabel()}>
                        <Printer className="h-4 w-4" /> {L.printLabel}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void doCustoms()}>
                        <FileText className="h-4 w-4" /> {L.customs}
                      </Button>
                      {nextStatus && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void doAdvance()}>
                          <ArrowRight className="h-4 w-4" /> {statusLabel(nextStatus, locale)}
                        </Button>
                      )}
                      <Link to={`/op/shipments/${last.shipment.id}`} className="ml-auto">
                        <Button size="sm" variant="ghost" className="gap-1.5">
                          <Eye className="h-4 w-4" /> {L.open}
                        </Button>
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardBody className="flex flex-col items-center justify-center py-16 text-center text-muted-fg">
                    <ScanLine className="h-12 w-12" />
                    <p className="mt-3 text-sm font-medium text-foreground">{L.idleTitle}</p>
                    <p className="mt-1 text-xs">{L.idleHint}</p>
                    <p className="mt-1 text-xs">
                      {L.example} <span className="font-mono">HB-0001</span>
                    </p>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent scans + tips */}
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-muted-fg">{L.recent}</p>
            <div className="space-y-2">
              {history.length === 0 && <p className="text-sm text-muted-fg">—</p>}
              {history.map((h, i) => (
                <div
                  key={h.shipment.id + i}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs">{h.shipment.public_code}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-fg">
                    {h.queued ? (
                      <WifiOff className="h-3.5 w-3.5 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    )}
                    {h.shipment.receiver.city}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Card className="bg-muted/40">
            <CardBody className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Info className="h-4 w-4 text-brand" /> {L.tips}
              </p>
              <ul className="space-y-1.5 text-xs leading-relaxed text-muted-fg">
                <li>• {L.tip1}</li>
                <li>• {L.tip2}</li>
                <li>• {L.tip3}</li>
                <li>• {L.tip4}</li>
              </ul>
            </CardBody>
          </Card>
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
