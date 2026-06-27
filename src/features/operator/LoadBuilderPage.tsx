import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  Truck,
  User,
  ScanLine,
  PlaneTakeoff,
  PlaneLanding,
  Printer,
  Package,
  ArrowLeft,
  Tags,
  FileText,
  Plus,
  PackageMinus,
} from 'lucide-react';
import { Button, Card, CardBody, Input, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeading, EmptyState, Stat } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { resolveShipmentByCode, notifyStatusEmails, useCompanySettings } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { pdfSafe } from '@/lib/translit';
import type { AnyStatus, Load, Shipment } from '@/types/domain';

export function LoadBuilderPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: settings } = useCompanySettings();
  const [packing, setPacking] = useState<null | 'labels' | 'customs'>(null);
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const dateLocale = locale === 'en' ? 'en-GB' : 'bg-BG';

  const L =
    locale === 'bg'
      ? {
          back: 'Към курсовете',
          loadNotFound: 'Курсът не е намерен',
          loadNotFoundDesc: 'Проверете връзката или изберете курс отново.',
          totalWeight: 'Общо тегло',
          parcels: 'Брой пратки',
          noShipments: 'Все още няма пратки в този курс',
          noShipmentsDesc: 'Сканирайте баркод или ОТ код, за да добавите пратка.',
          loaded: 'Натоварена',
          notFound: 'Пратката не е намерена',
          added: 'Добавена в курса',
          available: 'Налични пратки за този курс',
          add: 'Добави',
          addSelected: 'Добави избраните',
          addAll: 'Добави всички',
          selectAll: 'Избери всички',
          unload: 'Разтовари',
          unloaded: 'Разтоварена от курса',
          unloadAll: 'Разтовари всички',
          unloadAllTitle: 'Разтоварване на курса',
          unloadAllBody: 'Да разтоваря ли всички пратки от този курс? Връщат се „В склад Манчестър".',
          saved: 'Запазено',
          departed: 'Курсът тръгна',
          arrived: 'Курсът пристигна',
          manifestReady: 'Манифестът е готов',
          printLabels: 'Етикети (всички)',
          printCustoms: 'Митница (всички)',
          runSheet: 'Маршрутен лист',
          manifest: 'МАНИФЕСТ НА КУРС',
          colNo: '№',
          colCode: 'Код',
          colReceiver: 'Получател',
          colWeight: 'Тегло (кг)',
        }
      : {
          back: 'Back to loads',
          loadNotFound: 'Load not found',
          loadNotFoundDesc: 'Check the link or pick a load again.',
          totalWeight: 'Total weight',
          parcels: 'Parcel count',
          noShipments: 'No parcels on this load yet',
          noShipmentsDesc: 'Scan a barcode or OT code to add a parcel.',
          loaded: 'Loaded',
          notFound: 'Shipment not found',
          added: 'Added to load',
          available: 'Parcels ready for this load',
          add: 'Add',
          addSelected: 'Add selected',
          addAll: 'Add all',
          selectAll: 'Select all',
          unload: 'Unload',
          unloaded: 'Removed from load',
          unloadAll: 'Unload all',
          unloadAllTitle: 'Unload the course',
          unloadAllBody: 'Unload all parcels from this course? They go back to "At UK hub".',
          saved: 'Saved',
          departed: 'Load departed',
          arrived: 'Load arrived',
          manifestReady: 'Manifest ready',
          printLabels: 'Labels (all)',
          printCustoms: 'Customs (all)',
          runSheet: 'Run-sheet',
          manifest: 'LOAD MANIFEST',
          colNo: 'No.',
          colCode: 'Code',
          colReceiver: 'Receiver',
          colWeight: 'Weight (kg)',
        };

  const [load, setLoad] = useState<Load | null>(null);
  const [loadingLoad, setLoadingLoad] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [scan, setScan] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [eligible, setEligible] = useState<Shipment[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const scanRef = useRef<HTMLInputElement>(null);

  const reloadLoad = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from('loads').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      const row = (data as Load | null) ?? null;
      setLoad(row);
      setVehicle(row?.vehicle_reg ?? '');
      setDriver(row?.driver_name ?? '');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoadingLoad(false);
    }
  }, [id, toast, t]);

  const reloadShipments = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from('shipments').select('*').eq('load_id', id);
      if (error) throw error;
      setShipments((data ?? []) as unknown as Shipment[]);
    } catch {
      toast.error(t('common.error'));
    }
  }, [id, toast, t]);

  // Parcels at the hub, this direction, not yet on a load — offered for one-click add.
  const reloadEligible = useCallback(async () => {
    if (!load) return;
    const { data } = await supabase
      .from('shipments')
      .select('*')
      .is('load_id', null)
      .eq('direction', load.direction)
      .in('status', ['collected_uk', 'at_uk_hub'])
      .order('created_at', { ascending: false })
      .limit(100);
    setEligible((data ?? []) as unknown as Shipment[]);
  }, [load]);

  useEffect(() => {
    void reloadLoad();
    void reloadShipments();
  }, [reloadLoad, reloadShipments]);

  useEffect(() => {
    void reloadEligible();
  }, [reloadEligible]);

  useEffect(() => {
    scanRef.current?.focus();
  }, [load]);

  // Live updates: reflect parcels scanned onto this load from another station and
  // leg changes made elsewhere, without a manual refresh.
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`load-builder-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
        void reloadShipments();
        void reloadEligible();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads', filter: `id=eq.${id}` }, () => {
        void reloadLoad();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [id, reloadShipments, reloadEligible, reloadLoad]);

  /* ── Save vehicle / driver on blur ───────────────────────────────────── */
  const saveField = async (field: 'vehicle_reg' | 'driver_name', value: string) => {
    if (!id || !load) return;
    const current = field === 'vehicle_reg' ? load.vehicle_reg ?? '' : load.driver_name ?? '';
    if (current === value) return;
    try {
      // Concrete object literal (not a computed-key index type) so supabase-js's
      // RejectExcessProperties helper accepts it.
      const patch: { vehicle_reg?: string | null; driver_name?: string | null } =
        field === 'vehicle_reg' ? { vehicle_reg: value || null } : { driver_name: value || null };
      const { error } = await supabase.from('loads').update(patch).eq('id', id);
      if (error) throw error;
      setLoad({ ...load, [field]: value || null });
      toast.success(L.saved);
    } catch {
      toast.error(t('common.error'));
    }
  };

  /* ── Add a shipment to the load (shared by scan + click-to-add) ──────── */
  const addShipment = async (shipment: Shipment, source: 'scan' | 'manual') => {
    if (!id) return;
    const { error: upErr } = await supabase
      .from('shipments')
      .update({ load_id: id, status: 'on_load' as AnyStatus })
      .eq('id', shipment.id);
    if (upErr) throw upErr;
    await supabase.from('tracking_events').insert({
      shipment_id: shipment.id,
      leg: 'own',
      status: 'on_load',
      note_bg: 'Натоварена',
      note_en: 'Loaded',
      source,
    });
    toast.success(`${shipment.public_code} · ${L.added}`);
    await Promise.all([reloadShipments(), reloadEligible()]);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = scan.trim();
    if (!code || !id) return;
    setScanning(true);
    try {
      const shipment = await resolveShipmentByCode(code);
      if (!shipment) {
        toast.error(L.notFound);
        return;
      }
      await addShipment(shipment, 'scan');
      setScan('');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setScanning(false);
      scanRef.current?.focus();
    }
  };

  const toggleSel = (sid: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });

  // Bulk add — one update for all picked parcels (load_id + on_load) + events.
  const addMany = async (ships: Shipment[]) => {
    if (!id || ships.length === 0 || busy) return;
    setBusy(true);
    try {
      const ids = ships.map((s) => s.id);
      const { error } = await supabase
        .from('shipments')
        .update({ load_id: id, status: 'on_load' as AnyStatus })
        .in('id', ids);
      if (error) throw error;
      await supabase
        .from('tracking_events')
        .insert(ids.map((sid) => ({ shipment_id: sid, leg: 'own', status: 'on_load', note_bg: 'Натоварена', note_en: 'Loaded', source: 'manual' })));
      setSel(new Set());
      toast.success(`${ids.length} · ${L.added}`);
      await Promise.all([reloadShipments(), reloadEligible()]);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  // Unload one parcel. If still just loaded, send it back to the hub.
  const unload = async (s: Shipment) => {
    if (busy) return;
    setBusy(true);
    try {
      const patch =
        s.status === 'on_load' ? { load_id: null, status: 'at_uk_hub' as AnyStatus } : { load_id: null };
      const { error } = await supabase.from('shipments').update(patch).eq('id', s.id);
      if (error) throw error;
      if (s.status === 'on_load') {
        await supabase.from('tracking_events').insert({
          shipment_id: s.id,
          leg: 'own',
          status: 'at_uk_hub',
          note_bg: 'Разтоварена от курса',
          note_en: 'Removed from load',
          source: 'manual',
        });
      }
      toast.success(`${s.public_code} · ${L.unloaded}`);
      await Promise.all([reloadShipments(), reloadEligible()]);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  // Empty the whole course (e.g. loaded onto the wrong one).
  const unloadAll = async () => {
    if (shipments.length === 0 || busy) return;
    const ok = await confirm({ title: L.unloadAllTitle, body: L.unloadAllBody, confirmLabel: L.unloadAll, danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      const allIds = shipments.map((s) => s.id);
      const onLoad = shipments.filter((s) => s.status === 'on_load').map((s) => s.id);
      const { error } = await supabase.from('shipments').update({ load_id: null }).in('id', allIds);
      if (error) throw error;
      if (onLoad.length > 0) {
        await supabase.from('shipments').update({ status: 'at_uk_hub' as AnyStatus }).in('id', onLoad);
        await supabase
          .from('tracking_events')
          .insert(onLoad.map((sid) => ({ shipment_id: sid, leg: 'own', status: 'at_uk_hub', note_bg: 'Разтоварена от курса', note_en: 'Removed from load', source: 'manual' })));
      }
      toast.success(L.unloaded);
      await Promise.all([reloadShipments(), reloadEligible()]);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  /* ── Bulk leg transition (departed / arrived) ────────────────────────── */
  const bulkTransition = async (
    loadPatch: Partial<Load>,
    to: AnyStatus,
    note_bg: string,
    note_en: string,
    okMsg: string,
  ) => {
    if (!id || !load || busy) return;
    setBusy(true);
    try {
      const { error: loadErr } = await supabase.from('loads').update(loadPatch).eq('id', id);
      if (loadErr) throw loadErr;

      // Don't steamroll parcels parked in a side-state (exception/returned/etc.).
      const SKIP = ['exception', 'returned', 'cancelled', 'delivered'];
      const movable = shipments.filter((s) => !SKIP.includes(s.status));
      if (movable.length > 0) {
        const { error: shErr } = await supabase
          .from('shipments')
          .update({ status: to })
          .eq('load_id', id)
          .not('status', 'in', `(${SKIP.join(',')})`);
        if (shErr) throw shErr;

        const events = movable.map((s) => ({
          shipment_id: s.id,
          leg: 'own' as const,
          status: to,
          note_bg,
          note_en,
          source: 'manual' as const,
        }));
        const { error: evErr } = await supabase.from('tracking_events').insert(events);
        if (evErr) throw evErr;

        // Best-effort: email every moved client about the leg change. Never throws.
        await notifyStatusEmails(movable, to);
      }

      toast.success(okMsg);
      await Promise.all([reloadLoad(), reloadShipments()]);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const markDeparted = () =>
    bulkTransition(
      { status: 'departed', departed_at: new Date().toISOString() },
      'departed_uk',
      'Тръгна от UK',
      'Departed UK',
      L.departed,
    );

  const markArrived = () =>
    bulkTransition(
      { status: 'arrived', arrived_at: new Date().toISOString() },
      'arrived_bg_hub',
      'Пристигна в България',
      'Arrived in BG',
      L.arrived,
    );

  /* ── Print manifest (pdf-lib) ────────────────────────────────────────── */
  const printManifest = async () => {
    if (!load) return;
    try {
      const doc = await PDFDocument.create();
      const page = doc.addPage([595.28, 841.89]); // A4 portrait, points
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const { height, width } = page.getSize();
      const margin = 48;
      const ink = rgb(0.12, 0.1, 0.08);
      const grey = rgb(0.45, 0.42, 0.4);

      let y = height - margin;
      const text = (s: string, x: number, size: number, f = font, color = ink) =>
        page.drawText(pdfSafe(s), { x, y, size, font: f, color });

      text(L.manifest, margin, 18, bold);
      y -= 26;
      text(`${pdfSafe(load.code)}  ·  ${formatDate(new Date(), dateLocale)}`, margin, 11, font, grey);
      y -= 22;
      text(`${L.colReceiver === 'Receiver' ? 'Vehicle' : 'МПС'}: ${load.vehicle_reg ?? '-'}`, margin, 11, font);
      y -= 16;
      text(
        `${L.colReceiver === 'Receiver' ? 'Driver' : 'Шофьор'}: ${load.driver_name ?? '-'}`,
        margin,
        11,
        font,
      );
      y -= 24;

      // Table header
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: grey,
      });
      y -= 16;
      const cNo = margin;
      const cCode = margin + 36;
      const cRecv = margin + 150;
      const cWeight = width - margin - 70;
      text(L.colNo, cNo, 10, bold);
      text(L.colCode, cCode, 10, bold);
      text(L.colReceiver, cRecv, 10, bold);
      text(L.colWeight, cWeight, 10, bold);
      y -= 8;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: grey,
      });
      y -= 18;

      shipments.forEach((s, i) => {
        if (y < margin + 40) {
          const np = doc.addPage([595.28, 841.89]);
          y = np.getSize().height - margin;
          np.drawText(pdfSafe(`${(i + 1).toString()}. ${s.public_code}`), {
            x: margin,
            y,
            size: 10,
            font,
            color: ink,
          });
          return;
        }
        const row = (s2: string, x: number) =>
          page.drawText(pdfSafe(s2), { x, y, size: 10, font, color: ink });
        row(`${i + 1}`, cNo);
        row(s.public_code, cCode);
        row(`${s.receiver.name}, ${s.receiver.city}`, cRecv);
        row(`${s.weight_kg}`, cWeight);
        y -= 16;
      });

      y -= 8;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: grey,
      });
      y -= 18;
      const totalKg = shipments.reduce((sum, s) => sum + (s.weight_kg ?? 0), 0);
      text(
        `${L.parcels}: ${shipments.length}    ${L.totalWeight}: ${totalKg.toFixed(2)} kg`,
        margin,
        10,
        bold,
      );

      const bytes = await doc.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success(L.manifestReady);
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Dispatch pack — merge every parcel's label / customs doc into one PDF.
  const printLabels = async () => {
    if (shipments.length === 0) return;
    setPacking('labels');
    try {
      const ids = [...new Set(shipments.map((s) => s.client_id))];
      const { data } = await supabase.from('profiles').select('id, client_code').in('id', ids);
      const map = Object.fromEntries(
        ((data ?? []) as { id: string; client_code: string }[]).map((p) => [p.id, p.client_code]),
      );
      const { buildLabelsPack, downloadBytes } = await import('@/lib/dispatchPack');
      downloadBytes(await buildLabelsPack(shipments, map), `labels-${load?.code ?? 'load'}.pdf`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPacking(null);
    }
  };

  const printCustoms = async () => {
    if (shipments.length === 0) return;
    setPacking('customs');
    try {
      const { buildCustomsPack, downloadBytes } = await import('@/lib/dispatchPack');
      const bytes = await buildCustomsPack(shipments, {
        name: settings?.company_name,
        eori: settings?.eori,
        returnAddress: settings?.return_address,
      });
      downloadBytes(bytes, `customs-${load?.code ?? 'load'}.pdf`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPacking(null);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (loadingLoad) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (!load) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title={L.loadNotFound}
          description={L.loadNotFoundDesc}
          icon={<Truck className="h-7 w-7" />}
          action={
            <Link to="/op/loads">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {L.back}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const totalKg = shipments.reduce((sum, s) => sum + (s.weight_kg ?? 0), 0);
  const departable = load.status === 'open';
  const arrivable = load.status === 'departed';

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        title={`${t('operator.load_builder')} · ${load.code}`}
        subtitle={`${load.direction === 'UK_BG' ? 'UK → BG' : 'BG → UK'} · ${formatDate(
          load.scheduled_departure,
          dateLocale,
          { dateStyle: 'medium', timeStyle: 'short' },
        )}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              loading={busy}
              disabled={!departable || busy}
              onClick={() => void markDeparted()}
            >
              <PlaneTakeoff className="h-4 w-4" /> {t('operator.mark_departed')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              loading={busy}
              disabled={!arrivable || busy}
              onClick={() => void markArrived()}
            >
              <PlaneLanding className="h-4 w-4" /> {t('operator.mark_arrived')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void printManifest()}
            >
              <Printer className="h-4 w-4" /> {t('operator.print_manifest')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              loading={packing === 'labels'}
              disabled={shipments.length === 0 || packing !== null}
              onClick={() => void printLabels()}
            >
              <Tags className="h-4 w-4" /> {L.printLabels}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              loading={packing === 'customs'}
              disabled={shipments.length === 0 || packing !== null}
              onClick={() => void printCustoms()}
            >
              <FileText className="h-4 w-4" /> {L.printCustoms}
            </Button>
            <Link to={`/op/loads/${id}/run`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Truck className="h-4 w-4" /> {L.runSheet}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Vehicle + driver */}
      <Card className="mb-5">
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="lb-vehicle"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground"
            >
              <Truck className="h-4 w-4 text-muted-fg" /> {t('operator.vehicle')}
            </label>
            <Input
              id="lb-vehicle"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              onBlur={() => void saveField('vehicle_reg', vehicle.trim())}
              placeholder="—"
              className="uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="lb-driver"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground"
            >
              <User className="h-4 w-4 text-muted-fg" /> {t('operator.driver')}
            </label>
            <Input
              id="lb-driver"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              onBlur={() => void saveField('driver_name', driver.trim())}
              placeholder="—"
            />
          </div>
        </CardBody>
      </Card>

      {/* Scan */}
      <Card className="mb-5 border-brand/30">
        <CardBody>
          <form onSubmit={handleScan} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
              <Input
                ref={scanRef}
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                placeholder={t('operator.scan_placeholder')}
                className="pl-9 font-mono uppercase"
                autoFocus
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="gap-2" loading={scanning}>
              <ScanLine className="h-4 w-4" /> {t('operator.scan_onto_load')}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Available parcels — one-click add (at the hub, this direction, not yet loaded) */}
      {eligible.length > 0 && (
        <Card className="mb-5">
          <CardBody>
            <p className="mb-3 text-sm font-semibold text-muted-fg">
              {L.available} ({eligible.length})
            </p>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSel((prev) => (prev.size === eligible.length ? new Set() : new Set(eligible.map((s) => s.id))))}
                className="text-xs font-medium text-brand hover:underline"
              >
                {L.selectAll}
              </button>
            </div>
            <div className="space-y-2">
              {eligible.map((s) => {
                const on = sel.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSel(s.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? 'border-brand bg-brand-50' : 'border-border hover:bg-muted'}`}
                  >
                    <span className={`h-5 w-5 shrink-0 rounded border ${on ? 'border-brand bg-brand' : 'border-input'}`} />
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-semibold text-foreground">{s.public_code}</span>
                      <span className="ml-2 text-xs text-muted-fg">
                        {s.receiver.name} · {s.receiver.city} · {s.weight_kg} {t('common.kg')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                className="gap-1.5"
                loading={busy}
                disabled={sel.size === 0}
                onClick={() => void addMany(eligible.filter((s) => sel.has(s.id)))}
              >
                <Plus className="h-4 w-4" /> {L.addSelected}
                {sel.size > 0 ? ` (${sel.size})` : ''}
              </Button>
              <Button variant="outline" className="gap-1.5" loading={busy} onClick={() => void addMany(eligible)}>
                {L.addAll} ({eligible.length})
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Stat label={L.parcels} value={shipments.length} />
        <Stat label={L.totalWeight} value={`${totalKg.toFixed(1)} ${t('common.kg')}`} />
      </div>

      {/* Shipment list */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-fg">
          <Package className="h-4 w-4" /> {t('operator.shipments_on_load')} ({shipments.length})
        </h2>
        {shipments.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-fg hover:text-danger"
            loading={busy}
            onClick={() => void unloadAll()}
          >
            <PackageMinus className="h-4 w-4" /> {L.unloadAll}
          </Button>
        )}
      </div>

      {shipments.length === 0 ? (
        <EmptyState
          title={L.noShipments}
          description={L.noShipmentsDesc}
          icon={<Package className="h-7 w-7" />}
        />
      ) : (
        <div className="space-y-2">
          {shipments.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.2) }}
            >
              <Card className="transition-shadow hover:shadow-lift">
                <CardBody className="flex items-center justify-between gap-3 py-4">
                  <Link to={`/op/shipments/${s.id}`} className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-foreground">{s.public_code}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-fg">
                      {s.receiver.name} · {s.receiver.city} · {s.weight_kg} {t('common.kg')}
                    </p>
                  </Link>
                  <StatusBadge status={s.status} />
                  <button
                    type="button"
                    onClick={() => void unload(s)}
                    aria-label={L.unload}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <PackageMinus className="h-4 w-4" /> {L.unload}
                  </button>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
