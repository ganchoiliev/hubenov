/**
 * Own-AWB 4×6" label core (§5 label-render, §8). Code128 barcode + OT code +
 * sender/receiver + route + customs summary, as a printer-agnostic PDF (not
 * ZPL — §8). Runs in the browser so scan→print works in Wave 1 without the
 * Edge Function; the `label-render` function mirrors this spec server-side.
 */
import { PDFDocument, rgb } from 'pdf-lib';
// Use the explicit browser subpath — bwip-js's root export map has no default
// `types` condition, so a bare `bwip-js` import fails under bundler resolution.
import bwipjs from 'bwip-js/browser';
import { embedUnicodeFonts } from './pdfFont';
import type { PartySnapshot, Direction } from '@/types/domain';

export interface LabelData {
  public_code: string;
  awb_barcode: string;
  client_code: string;
  direction: Direction;
  weight_kg: number;
  sender: PartySnapshot;
  receiver: PartySnapshot;
  is_gift: boolean;
  declared_value: number;
  currency: string;
}

// 4×6 inch at 72pt/in.
const W = 288;
const H = 432;
const M = 14;

/** Render a Code128 barcode to PNG bytes via an offscreen canvas. */
export async function renderBarcodePng(text: string): Promise<Uint8Array> {
  if (typeof document === 'undefined') {
    throw new Error('renderBarcodePng requires a DOM (use the Edge Function server-side)');
  }
  const canvas = document.createElement('canvas');
  bwipjs.toCanvas(canvas, {
    bcid: 'code128',
    text,
    scale: 3,
    height: 12,
    includetext: false,
    paddingwidth: 0,
    paddingheight: 0,
  });
  const dataUrl = canvas.toDataURL('image/png');
  return dataUrlToBytes(dataUrl);
}

export async function buildLabelPdf(data: LabelData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  const { font, bold } = await embedUnicodeFonts(doc);

  const ink = rgb(0.06, 0.13, 0.09);
  const line = (y: number) =>
    page.drawLine({
      start: { x: M, y },
      end: { x: W - M, y },
      thickness: 0.8,
      color: rgb(0.7, 0.74, 0.71),
    });

  // Header — brand + route
  page.drawText('HUBENOV DELIVERIES', { x: M, y: H - 26, size: 13, font: bold, color: ink });
  page.drawText(routeText(data.direction), { x: M, y: H - 42, size: 9, font, color: ink });
  page.drawText(`OT: ${data.client_code}`, { x: W - M - 90, y: H - 26, size: 10, font: bold, color: ink });
  line(H - 50);

  // Barcode
  try {
    const png = await renderBarcodePng(data.awb_barcode);
    const img = await doc.embedPng(png);
    const bw = W - 2 * M;
    const bh = 56;
    page.drawImage(img, { x: M, y: H - 50 - bh - 8, width: bw, height: bh });
  } catch {
    // Fallback: no barcode image (e.g. no DOM) — still print the code.
  }
  page.drawText(data.awb_barcode, { x: M, y: H - 124, size: 11, font: bold, color: ink });
  page.drawText(data.public_code, { x: W - M - 100, y: H - 124, size: 10, font, color: ink });
  line(H - 134);

  // Sender / receiver
  let y = H - 150;
  y = block(page, font, bold, ink, 'SENDER / ИЗПРАЩАЧ', data.sender, M, y);
  y -= 6;
  line(y);
  y -= 14;
  y = block(page, font, bold, ink, 'RECEIVER / ПОЛУЧАТЕЛ', data.receiver, M, y);

  // Footer — weight, gift/goods, value
  line(70);
  page.drawText(`Weight: ${data.weight_kg.toFixed(1)} kg`, { x: M, y: 52, size: 10, font: bold, color: ink });
  page.drawText(data.is_gift ? 'GIFT / ПОДАРЪК' : 'GOODS / СТОКА', {
    x: M,
    y: 38,
    size: 10,
    font,
    color: ink,
  });
  page.drawText(`Value: ${data.declared_value.toFixed(2)} ${data.currency}`, {
    x: W - M - 130,
    y: 38,
    size: 9,
    font,
    color: ink,
  });

  return doc.save();
}

function block(
  page: ReturnType<PDFDocument['addPage']>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  bold: Awaited<ReturnType<PDFDocument['embedFont']>>,
  ink: ReturnType<typeof rgb>,
  title: string,
  p: PartySnapshot,
  x: number,
  startY: number,
): number {
  let y = startY;
  page.drawText(title, { x, y, size: 8, font: bold, color: rgb(0.4, 0.45, 0.42) });
  y -= 14;
  page.drawText(p.name, { x, y, size: 11, font: bold, color: ink });
  y -= 13;
  page.drawText(p.phone, { x, y, size: 9, font, color: ink });
  y -= 13;
  const addr = [p.line1, p.line2].filter(Boolean).join(', ');
  page.drawText(addr.slice(0, 48), { x, y, size: 9, font, color: ink });
  y -= 12;
  const cityLine = p.econt_office_code
    ? `${p.city} — Econt office ${p.econt_office_code}`
    : `${p.postcode} ${p.city}, ${p.country}`;
  page.drawText(cityLine.slice(0, 48), { x, y, size: 9, font, color: ink });
  y -= 14;
  return y;
}

function routeText(d: Direction): string {
  return d === 'UK_BG' ? 'United Kingdom  ->  Bulgaria' : 'Bulgaria  ->  United Kingdom';
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
