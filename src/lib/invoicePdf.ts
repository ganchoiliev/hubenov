/**
 * Invoice PDF (A4) for email attachment + operator download. Built with pdf-lib
 * in the browser. pdf-lib's StandardFonts are WinAnsi-only (no Cyrillic), so —
 * like the shipping labels — text is Latin/English (the cross-border invoicing
 * norm) and any Cyrillic names are transliterated via `pdfSafe`. A Cyrillic TTF
 * could be embedded later if a fully Bulgarian PDF is wanted.
 *
 * Heavy (pulls in pdf-lib) — import dynamically so it stays out of the main/
 * public bundle: `const { buildInvoicePdf } = await import('@/lib/invoicePdf')`.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfSafe } from './translit';
import type { Currency, InvoiceStatus } from '@/types/domain';

export interface InvoicePdfData {
  number: string;
  dateISO: string;
  amount: number;
  currency: Currency;
  status: InvoiceStatus;
  clientName: string;
  clientEmail?: string | null;
  company: { name?: string | null; eori?: string | null; returnAddress?: string | null };
  shipmentCode?: string | null;
}

const A4 = { w: 595.28, h: 841.89 };
const M = 48;
const money = (n: number, c: Currency) => `${n.toFixed(2)} ${c}`;
const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10); // YYYY-MM-DD
const statusLabel = (s: InvoiceStatus) => (s === 'paid' ? 'PAID' : s === 'partial' ? 'PARTIAL' : 'UNPAID');

export async function buildInvoicePdf(d: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.w, A4.h]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.42, 0.45, 0.5);
  const lineCol = rgb(0.85, 0.87, 0.9);

  const text = (s: string, x: number, y: number, size = 10, f = font, color = ink) =>
    page.drawText(s, { x, y, size, font: f, color });
  const right = (s: string, xRight: number, y: number, size = 10, f = font, color = ink) =>
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y, size, font: f, color });
  const hr = (y: number) =>
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.8, color: lineCol });

  const top = A4.h - M;

  // Header — brand (left) + INVOICE block (right)
  text('HUBENOV DELIVERIES', M, top - 4, 18, bold);
  text('UK <-> BG parcel delivery', M, top - 22, 9, font, muted);
  if (d.company.returnAddress) text(pdfSafe(d.company.returnAddress).slice(0, 64), M, top - 35, 8, font, muted);
  if (d.company.eori) text(`EORI: ${pdfSafe(d.company.eori)}`, M, top - 46, 8, font, muted);

  right('INVOICE', A4.w - M, top - 4, 18, bold);
  right(`No. ${d.number}`, A4.w - M, top - 22, 10, bold);
  right(`Date: ${fmtDate(d.dateISO)}`, A4.w - M, top - 35, 9, font, muted);
  right(`Status: ${statusLabel(d.status)}`, A4.w - M, top - 47, 9, font, muted);

  let y = top - 78;
  hr(y);
  y -= 26;

  // Bill to
  text('BILL TO', M, y, 8, bold, muted);
  y -= 16;
  text(pdfSafe(d.clientName) || '-', M, y, 12, bold);
  if (d.clientEmail) {
    y -= 14;
    text(pdfSafe(d.clientEmail), M, y, 9, font, muted);
  }

  // Table
  y -= 42;
  text('DESCRIPTION', M, y, 8, bold, muted);
  right('AMOUNT', A4.w - M, y, 8, bold, muted);
  y -= 8;
  hr(y);
  y -= 20;
  const desc = d.shipmentCode
    ? `Transport service - Shipment ${d.shipmentCode}`
    : 'Transport service (UK <-> BG)';
  text(desc, M, y, 10);
  right(money(d.amount, d.currency), A4.w - M, y, 10);
  y -= 16;
  hr(y);
  y -= 24;
  text('TOTAL', M, y, 11, bold);
  right(money(d.amount, d.currency), A4.w - M, y, 13, bold);

  // Payment note + footer
  y -= 52;
  text('Payment: cash, bank transfer, or card at the office.', M, y, 9, font, muted);
  text(`${pdfSafe(d.company.name || 'Hubenov Deliveries')} - hubenov.delivery`, M, M, 8, font, muted);

  return doc.save();
}

/** base64 (chunked, stack-safe) for Resend's `attachments[].content`. */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Build + trigger a browser download of the invoice PDF. */
export async function downloadInvoicePdf(d: InvoicePdfData): Promise<void> {
  const bytes = await buildInvoicePdf(d);
  // Copy into a plain ArrayBuffer — Blob's types reject Uint8Array<ArrayBufferLike>.
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${d.number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
