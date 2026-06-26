/**
 * Dispatch pack — merge every parcel's label / customs invoice in a load into a
 * single PDF for one-shot printing at the Friday van. Reuses the per-shipment
 * builders (label.ts, customsDoc.ts) and concatenates with pdf-lib.
 *
 * Heavy (pdf-lib + bwip-js via label.ts) — import dynamically:
 *   const { buildLabelsPack } = await import('@/lib/dispatchPack')
 */
import { PDFDocument } from 'pdf-lib';
import { buildLabelPdf } from './label';
import { buildCustomsPdf } from './customsDoc';
import { assessCustoms } from './customs';
import type { Shipment, Currency } from '@/types/domain';

async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const part of parts) {
    const src = await PDFDocument.load(part);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/** One 4×6 label per shipment, merged. `clientCodeById` maps client_id → OT code. */
export async function buildLabelsPack(
  shipments: Shipment[],
  clientCodeById: Record<string, string>,
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for (const s of shipments) {
    parts.push(
      await buildLabelPdf({
        public_code: s.public_code,
        awb_barcode: s.awb_barcode,
        client_code: clientCodeById[s.client_id] ?? '',
        direction: s.direction,
        weight_kg: s.weight_kg,
        sender: s.sender,
        receiver: s.receiver,
        is_gift: s.is_gift,
        declared_value: s.declared_value,
        currency: s.currency,
      }),
    );
  }
  return mergePdfs(parts);
}

const PARCEL_DESC: Record<string, string> = {
  parcel: 'Parcel',
  document: 'Documents',
  pallet: 'Pallet',
  food: 'Food',
  other: 'Goods',
};

/** One customs invoice / gift declaration per shipment (single line from the
 *  declared value), merged. */
export async function buildCustomsPack(
  shipments: Shipment[],
  company: { name?: string | null; eori?: string | null; returnAddress?: string | null },
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for (const s of shipments) {
    const items = [
      { description: PARCEL_DESC[s.parcel_type] ?? 'Goods', qty: 1, unit_value: s.declared_value },
    ];
    const a = assessCustoms(items, s.is_gift, s.currency as Currency, company.eori ?? null);
    parts.push(
      await buildCustomsPdf({
        ref: s.public_code,
        dateISO: new Date().toISOString(),
        isGift: s.is_gift,
        giftReliefApplied: a.gift_relief_applied,
        eori: company.eori ?? null,
        exporter: s.sender,
        consignee: s.receiver,
        items,
        total: a.total_value,
        currency: s.currency as Currency,
        weightKg: s.weight_kg,
      }),
    );
  }
  return mergePdfs(parts);
}

export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
