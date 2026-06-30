/**
 * Customs commercial-invoice / gift-declaration PDF (A4) for cross-border
 * parcels (UK ⇄ BG). Built client-side with pdf-lib + an embedded Unicode font
 * (DejaVu Sans, see pdfFont.ts) so Cyrillic names/addresses render correctly.
 * Section labels stay English (customs-officer friendly). Gift relief vs
 * commercial is assessed by `assessCustoms`.
 *
 * Heavy (pdf-lib) — import dynamically:
 *   const { downloadCustomsPdf } = await import('@/lib/customsDoc')
 */
import { PDFDocument, rgb } from 'pdf-lib';
import { embedUnicodeFonts } from './pdfFont';
import type { CustomsItem, Currency, PartySnapshot } from '@/types/domain';

export interface CustomsPdfData {
  ref: string; // shipment public code
  dateISO: string;
  isGift: boolean;
  giftReliefApplied: boolean;
  eori?: string | null;
  exporter: PartySnapshot;
  consignee: PartySnapshot;
  items: CustomsItem[];
  total: number;
  currency: Currency;
  weightKg: number;
}

const A4 = { w: 595.28, h: 841.89 };
const M = 48;
const money = (n: number, c: Currency) => `${n.toFixed(2)} ${c}`;
const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function addr(p: PartySnapshot): string[] {
  const l1 = [p.line1, p.line2].filter(Boolean).join(', ');
  const l2 = p.econt_office_code
    ? `${p.city} — Econt office ${p.econt_office_code}`
    : `${p.postcode} ${p.city}, ${p.country}`;
  return [p.name, p.phone, l1, l2].filter(Boolean);
}

export async function buildCustomsPdf(d: CustomsPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.w, A4.h]);
  const { font, bold } = await embedUnicodeFonts(doc);

  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.42, 0.45, 0.5);
  const lineCol = rgb(0.85, 0.87, 0.9);

  const text = (s: string, x: number, y: number, size = 10, f = font, color = ink) =>
    page.drawText(s, { x, y, size, font: f, color });
  const right = (s: string, xr: number, y: number, size = 10, f = font, color = ink) =>
    page.drawText(s, { x: xr - f.widthOfTextAtSize(s, size), y, size, font: f, color });
  const hr = (y: number) =>
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.8, color: lineCol });

  const top = A4.h - M;
  const commercial = !d.giftReliefApplied;
  const title = commercial ? 'COMMERCIAL INVOICE' : 'GIFT DECLARATION';

  text('HUBENOV DELIVERIES', M, top - 4, 16, bold);
  text('Customs document — UK <-> BG', M, top - 20, 9, font, muted);
  right(title, A4.w - M, top - 4, 16, bold);
  right(`Ref: ${d.ref}`, A4.w - M, top - 20, 9, font, muted);
  right(`Date: ${fmtDate(d.dateISO)}`, A4.w - M, top - 32, 9, font, muted);

  let y = top - 54;
  hr(y);
  y -= 22;

  // Exporter / Consignee columns
  const colR = A4.w / 2 + 6;
  text('EXPORTER (SENDER)', M, y, 8, bold, muted);
  text('CONSIGNEE (RECEIVER)', colR, y, 8, bold, muted);
  y -= 15;
  const exLines = addr(d.exporter);
  const coLines = addr(d.consignee);
  const rows = Math.max(exLines.length, coLines.length);
  let yy = y;
  for (let i = 0; i < rows; i++) {
    const ex = exLines[i];
    const co = coLines[i];
    if (ex) text(ex, M, yy, i === 0 ? 11 : 9, i === 0 ? bold : font, i === 0 ? ink : muted);
    if (co) text(co, colR, yy, i === 0 ? 11 : 9, i === 0 ? bold : font, i === 0 ? ink : muted);
    yy -= i === 0 ? 15 : 12;
  }
  y = yy - 6;
  if (d.eori) {
    text(`Exporter EORI: ${d.eori}`, M, y, 9, font, muted);
    y -= 14;
  }
  text(`Reason for export: ${d.isGift ? 'Gift / personal (no commercial value)' : 'Sale of goods'}`, M, y, 9, font, muted);
  y -= 14;
  text(`Country of origin: ${d.exporter.country}    ·    Gross weight: ${d.weightKg.toFixed(1)} kg`, M, y, 9, font, muted);

  // Items table
  y -= 26;
  const xHs = 320;
  const xQty = 400;
  const xAmt = A4.w - M;
  text('DESCRIPTION', M, y, 8, bold, muted);
  text('HS CODE', xHs, y, 8, bold, muted);
  text('QTY', xQty, y, 8, bold, muted);
  right('AMOUNT', xAmt, y, 8, bold, muted);
  y -= 8;
  hr(y);
  y -= 18;
  for (const it of d.items) {
    text(it.description.slice(0, 52), M, y, 10);
    text(it.hs_code ? it.hs_code : '-', xHs, y, 9, font, muted);
    text(String(it.qty), xQty, y, 10);
    right(money(it.qty * it.unit_value, d.currency), xAmt, y, 10);
    y -= 16;
  }
  hr(y);
  y -= 22;
  text('TOTAL', M, y, 11, bold);
  right(money(d.total, d.currency), xAmt, y, 13, bold);

  // Declaration + signature
  y -= 48;
  text('I declare the information above is true and correct, and that the goods', M, y, 9, font, muted);
  y -= 12;
  text('are of the stated origin and value.', M, y, 9, font, muted);
  y -= 40;
  // Auto-signed: print the exporter's name + date on the lines so the document
  // is ready to use without a manual signature (a typed name + date is accepted
  // on a commercial-invoice declaration).
  text(d.exporter.name, M, y + 4, 11, bold);
  text(fmtDate(d.dateISO), A4.w - M - 160, y + 4, 11, bold);
  page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.8, color: lineCol });
  page.drawLine({ start: { x: A4.w - M - 160, y }, end: { x: A4.w - M, y }, thickness: 0.8, color: lineCol });
  text('Signature (electronic)', M, y - 12, 8, font, muted);
  text('Date', A4.w - M - 160, y - 12, 8, font, muted);

  text('HUBENOV DELIVERIES - hubenov.delivery', M, M, 8, font, muted);
  return doc.save();
}

export async function downloadCustomsPdf(d: CustomsPdfData): Promise<void> {
  const bytes = await buildCustomsPdf(d);
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customs-${d.ref}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
