/**
 * Own-AWB 4×6" label core (§5 label-render, §8). Code128 barcode + OT code +
 * sender/receiver + contents + route, as a printer-agnostic PDF (not ZPL — §8).
 *
 * Multi-piece: a shipment with `pieces > 1` renders ONE page per box, each
 * stamped "КАШОН i / N", so a single print job produces every box's label and
 * the team can see at a glance that no box is missing.
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
  /** "Чупливо" — prints a bold FRAGILE strip so every handler sees it. */
  is_fragile?: boolean;
  declared_value: number;
  /** Delivery price charged to the client — printed on the label (not the
   *  goods value; customs value stays on the customs doc). */
  price?: number | null;
  currency: string;
  /** Total boxes in this shipment (default 1). Renders one page per box. */
  pieces?: number;
  /** Customs/contents description, e.g. "очила, дрехи, картичка". */
  contents?: string | null;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
}

// 4×6 inch at 72pt/in.
const W = 288;
const H = 432;
const M = 14;

const INK = rgb(0.06, 0.13, 0.09);
const GREEN = rgb(0.09, 0.42, 0.27);
const MUTED = rgb(0.4, 0.45, 0.42);
const HAIR = rgb(0.7, 0.74, 0.71);

type Page = ReturnType<PDFDocument['addPage']>;
type Font = Awaited<ReturnType<PDFDocument['embedFont']>>;
type Img = Awaited<ReturnType<PDFDocument['embedPng']>>;

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
  const { font, bold } = await embedUnicodeFonts(doc);

  // The AWB barcode is the same for every box — render it once.
  let barcode: Img | null = null;
  try {
    barcode = await doc.embedPng(await renderBarcodePng(data.awb_barcode));
  } catch {
    barcode = null;
  }

  const total = Math.max(1, Math.floor(data.pieces ?? 1));
  for (let i = 1; i <= total; i++) {
    drawLabel(doc.addPage([W, H]), font, bold, data, barcode, i, total);
  }
  return doc.save();
}

function drawLabel(page: Page, font: Font, bold: Font, data: LabelData, barcode: Img | null, idx: number, total: number): void {
  const line = (y: number) =>
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: HAIR });

  // ── Header: brand + route + OT code, with a bold piece badge top-right ──────
  page.drawText('ДОСТАВКИ ХУБЕНОВ', { x: M, y: H - 24, size: 12, font: bold, color: INK });
  page.drawText(routeText(data.direction), { x: M, y: H - 38, size: 8, font, color: MUTED });
  page.drawText(`ОТ: ${data.client_code}`, { x: M, y: H - 52, size: 9.5, font: bold, color: INK });

  // Piece badge — big, filled, always shown (e.g. "1/1", "2/4").
  const bw = 60;
  const bh = 30;
  const bx = W - M - bw;
  const by = H - 12 - bh;
  page.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: GREEN });
  const pieceLabel = `${idx}/${total}`;
  const pieceSize = 16;
  const pieceW = bold.widthOfTextAtSize(pieceLabel, pieceSize);
  page.drawText(pieceLabel, { x: bx + (bw - pieceW) / 2, y: by + 9, size: pieceSize, font: bold, color: rgb(1, 1, 1) });
  page.drawText('КАШОН', { x: bx + (bw - bold.widthOfTextAtSize('КАШОН', 6)) / 2, y: by + bh - 9, size: 6, font: bold, color: rgb(1, 1, 1) });

  line(H - 60);

  // ── Barcode (AWB) ───────────────────────────────────────────────────────────
  const barH = 56;
  if (barcode) {
    page.drawImage(barcode, { x: M, y: H - 60 - barH - 6, width: W - 2 * M, height: barH });
  }
  page.drawText(data.awb_barcode, { x: M, y: H - 60 - barH - 20, size: 11, font: bold, color: INK });
  page.drawText(data.public_code, {
    x: W - M - bold.widthOfTextAtSize(data.public_code, 10),
    y: H - 60 - barH - 20,
    size: 10,
    font,
    color: INK,
  });
  let y = H - 60 - barH - 30;
  line(y);
  y -= 16;

  // ── Sender / receiver ───────────────────────────────────────────────────────
  y = block(page, font, bold, 'ИЗПРАЩАЧ / SENDER', data.sender, y);
  y -= 4;
  line(y);
  y -= 14;
  y = block(page, font, bold, 'ПОЛУЧАТЕЛ / RECEIVER', data.receiver, y);

  // ── Contents (customs) ──────────────────────────────────────────────────────
  const contents = data.contents?.trim();
  if (contents) {
    y -= 2;
    line(y);
    y -= 13;
    page.drawText('СЪДЪРЖАНИЕ / CONTENTS', { x: M, y, size: 8, font: bold, color: MUTED });
    y -= 12;
    for (const ln of wrapText(contents, 56, 2)) {
      page.drawText(ln, { x: M, y, size: 9, font, color: INK });
      y -= 11;
    }
  }

  // ── Fragile strip: impossible to miss, right above the footer ──────────────
  if (data.is_fragile) {
    const fh = 18;
    page.drawRectangle({ x: M, y: 68, width: W - 2 * M, height: fh, color: rgb(0.77, 0.12, 0.12) });
    const ft = 'ЧУПЛИВО  ·  FRAGILE  ·  HANDLE WITH CARE';
    const fs = 9;
    const fw = bold.widthOfTextAtSize(ft, fs);
    page.drawText(ft, { x: M + (W - 2 * M - fw) / 2, y: 68 + 5.5, size: fs, font: bold, color: rgb(1, 1, 1) });
  }

  // ── Footer: weight (+ dims), gift/goods and the DELIVERY price charged ─────
  line(64);
  const dims =
    data.length_cm && data.width_cm && data.height_cm
      ? `  ·  ${trimNum(data.length_cm)}×${trimNum(data.width_cm)}×${trimNum(data.height_cm)} см`
      : '';
  page.drawText(`Тегло: ${data.weight_kg.toFixed(1)} кг${dims}`, { x: M, y: 48, size: 10, font: bold, color: INK });
  page.drawText(data.is_gift ? 'ПОДАРЪК / GIFT' : 'СТОКА / GOODS', { x: M, y: 32, size: 9, font, color: INK });
  // The charged delivery price (what the client pays us), not the goods value.
  if (data.price != null && data.price > 0) {
    const cur = data.currency === 'GBP' ? '£' : `${data.currency} `;
    const val = `Доставка: ${cur}${data.price.toFixed(2)}`;
    page.drawText(val, { x: W - M - bold.widthOfTextAtSize(val, 9), y: 32, size: 9, font: bold, color: INK });
  }
}

function block(page: Page, font: Font, bold: Font, title: string, p: PartySnapshot, startY: number): number {
  let y = startY;
  page.drawText(title, { x: M, y, size: 8, font: bold, color: MUTED });
  y -= 14;
  page.drawText(p.name.slice(0, 40), { x: M, y, size: 11, font: bold, color: INK });
  y -= 13;
  page.drawText(p.phone, { x: M, y, size: 9, font, color: INK });
  y -= 13;
  const addr = [p.line1, p.line2].filter(Boolean).join(', ');
  page.drawText(addr.slice(0, 50), { x: M, y, size: 9, font, color: INK });
  y -= 12;
  const cityLine = p.econt_office_code
    ? `${p.city} — Еконт офис ${p.econt_office_code}`
    : `${p.postcode} ${p.city}, ${p.country}`;
  page.drawText(cityLine.slice(0, 50), { x: M, y, size: 9, font, color: INK });
  y -= 14;
  return y;
}

function wrapText(s: string, max: number, maxLines: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const out = lines.slice(0, maxLines);
  if (out.length === maxLines && s.length > out.join(' ').length) {
    out[maxLines - 1] = `${out[maxLines - 1]!.slice(0, max - 1)}…`;
  }
  return out;
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function routeText(d: Direction): string {
  return d === 'UK_BG' ? 'Великобритания  →  България' : 'България  →  Великобритания';
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
