/**
 * Invoice PDF (A4) for email attachment + operator download. Built with pdf-lib
 * using an embedded Unicode font (DejaVu Sans, see pdfFont.ts), so it renders
 * proper Bulgarian when the client's locale is `bg`.
 *
 * Heavy (pdf-lib) — import dynamically:
 *   const { buildInvoicePdf } = await import('@/lib/invoicePdf')
 */
import { PDFDocument, rgb } from 'pdf-lib';
import { embedUnicodeFonts } from './pdfFont';
import type { Currency, InvoiceStatus, PartySnapshot } from '@/types/domain';

export interface InvoiceParty {
  name?: string | null;
  address?: string | null;
}

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
  sender?: InvoiceParty | null;
  receiver?: InvoiceParty | null;
  weightKg?: number | null;
  locale?: 'bg' | 'en';
}

/** Flatten a shipment party snapshot into a printable name + one-line address. */
export function partyForInvoice(p?: PartySnapshot | null): InvoiceParty | null {
  if (!p) return null;
  const addr = [p.line1, p.line2 ?? '', [p.postcode, p.city].filter(Boolean).join(' '), p.country]
    .map((s) => (s ?? '').toString().trim())
    .filter(Boolean)
    .join(', ');
  return { name: p.name || null, address: addr || (p.econt_office_code ? `Econt ${p.econt_office_code}` : null) };
}

const A4 = { w: 595.28, h: 841.89 };
const M = 48;
const money = (n: number, c: Currency) => `${n.toFixed(2)} ${c}`;
const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10); // YYYY-MM-DD

export async function buildInvoicePdf(d: InvoicePdfData): Promise<Uint8Array> {
  const lang = d.locale === 'en' ? 'en' : 'bg';
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

  const brand = lang === 'bg' ? 'Доставки Хубенов' : 'Hubenov Deliveries';
  const statusLabel = {
    bg: { unpaid: 'Неплатена', paid: 'Платена', partial: 'Частично платена', void: 'Анулирана' },
    en: { unpaid: 'Unpaid', paid: 'Paid', partial: 'Partially paid', void: 'Void' },
  }[lang][d.status];

  const t =
    lang === 'bg'
      ? {
          sub: 'UK ⇄ BG доставки на колети',
          invoice: 'ФАКТУРА',
          no: 'Фактура №',
          date: 'Дата',
          status: 'Статус',
          billTo: 'ПОЛУЧАТЕЛ НА ФАКТУРАТА',
          shipmentHdr: 'ПРАТКА',
          from: 'Изпращач',
          to: 'Получател',
          weight: 'Тегло',
          descCol: 'ОПИСАНИЕ',
          amountCol: 'СУМА',
          line: d.shipmentCode ? `Транспортна услуга · Пратка ${d.shipmentCode}` : 'Транспортна услуга (UK ⇄ BG)',
          total: 'ОБЩО',
          pay: 'Плащане: в брой, по банков път или с карта в офиса.',
        }
      : {
          sub: 'UK ⇄ BG parcel delivery',
          invoice: 'INVOICE',
          no: 'Invoice No.',
          date: 'Date',
          status: 'Status',
          billTo: 'BILL TO',
          shipmentHdr: 'SHIPMENT',
          from: 'Sender',
          to: 'Receiver',
          weight: 'Weight',
          descCol: 'DESCRIPTION',
          amountCol: 'AMOUNT',
          line: d.shipmentCode ? `Transport service · Shipment ${d.shipmentCode}` : 'Transport service (UK ⇄ BG)',
          total: 'TOTAL',
          pay: 'Payment: cash, bank transfer, or card at the office.',
        };

  const top = A4.h - M;
  text(brand, M, top - 4, 17, bold);
  text(t.sub, M, top - 20, 9, font, muted);
  if (d.company.returnAddress) text(d.company.returnAddress.slice(0, 64), M, top - 33, 8, font, muted);
  if (d.company.eori) text(`EORI: ${d.company.eori}`, M, top - 44, 8, font, muted);

  right(t.invoice, A4.w - M, top - 4, 17, bold);
  right(`${t.no} ${d.number}`, A4.w - M, top - 21, 10, bold);
  right(`${t.date}: ${fmtDate(d.dateISO)}`, A4.w - M, top - 34, 9, font, muted);
  right(`${t.status}: ${statusLabel}`, A4.w - M, top - 46, 9, font, muted);

  let y = top - 76;
  hr(y);
  y -= 24;
  text(t.billTo, M, y, 8, bold, muted);
  y -= 16;
  text(d.clientName || '-', M, y, 12, bold);
  if (d.clientEmail) {
    y -= 14;
    text(d.clientEmail, M, y, 9, font, muted);
  }

  // Shipment parties — sender / receiver / weight (when the invoice is tied to a
  // parcel). Lines are truncated so a long address never overruns the margin.
  const trunc = (s: string, n = 92) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  if (d.sender || d.receiver || d.weightKg != null) {
    y -= 28;
    text(t.shipmentHdr + (d.shipmentCode ? ` · ${d.shipmentCode}` : ''), M, y, 8, bold, muted);
    if (d.sender && (d.sender.name || d.sender.address)) {
      y -= 15;
      text(trunc(`${t.from}: ${[d.sender.name, d.sender.address].filter(Boolean).join(' · ')}`), M, y, 9);
    }
    if (d.receiver && (d.receiver.name || d.receiver.address)) {
      y -= 15;
      text(trunc(`${t.to}: ${[d.receiver.name, d.receiver.address].filter(Boolean).join(' · ')}`), M, y, 9);
    }
    if (d.weightKg != null) {
      y -= 15;
      text(`${t.weight}: ${d.weightKg} ${lang === 'bg' ? 'кг' : 'kg'}`, M, y, 9);
    }
  }

  y -= 40;
  text(t.descCol, M, y, 8, bold, muted);
  right(t.amountCol, A4.w - M, y, 8, bold, muted);
  y -= 8;
  hr(y);
  y -= 20;
  text(t.line, M, y, 10);
  right(money(d.amount, d.currency), A4.w - M, y, 10);
  y -= 16;
  hr(y);
  y -= 24;
  text(t.total, M, y, 11, bold);
  right(money(d.amount, d.currency), A4.w - M, y, 13, bold);

  y -= 52;
  text(t.pay, M, y, 9, font, muted);
  text(`${brand} · hubenov.delivery`, M, M, 8, font, muted);

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
