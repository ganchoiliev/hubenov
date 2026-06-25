// customs-docs — commercial invoice / gift declaration PDF (§5). Validates
// EORI + HS where commercial; applies gift relief under the ceiling. Mirrors
// src/lib/customs.ts. Staff-authenticated.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { json, preflight, corsHeaders } from '../_shared/cors.ts';

const GIFT_RELIEF_CEILING_GBP = 39;

const itemSchema = z.object({
  description: z.string().min(1),
  hs_code: z.string().optional(),
  qty: z.number().int().positive(),
  unit_value: z.number().nonnegative(),
});
const inputSchema = z.object({
  shipment_id: z.string().uuid(),
  is_gift: z.boolean(),
  eori: z.string().optional().nullable(),
  invoice_no: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
  currency: z.enum(['GBP', 'EUR', 'BGN']).default('GBP'),
});

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid_input', details: parsed.error.flatten() }, 422);
  const input = parsed.data;

  const total = Math.round(input.items.reduce((s, i) => s + i.qty * i.unit_value, 0) * 100) / 100;
  const giftRelief = input.is_gift && total <= GIFT_RELIEF_CEILING_GBP;
  const commercial = !giftRelief;

  const warnings: string[] = [];
  if (commercial && !input.eori) warnings.push('EORI required for commercial consignment');
  if (commercial && input.items.some((i) => !i.hs_code)) warnings.push('HS code missing on commercial item(s)');
  if (input.is_gift && total > GIFT_RELIEF_CEILING_GBP) warnings.push('Gift above relief ceiling — treated as commercial');

  // Build the PDF (A5-ish).
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.13, 0.09);

  const title = giftRelief ? 'GIFT DECLARATION' : 'COMMERCIAL INVOICE';
  page.drawText('HUBENOV DELIVERIES', { x: 24, y: 560, size: 14, font: bold, color: ink });
  page.drawText(title, { x: 24, y: 540, size: 11, font: bold, color: ink });
  if (input.invoice_no) page.drawText(`No: ${input.invoice_no}`, { x: 300, y: 540, size: 9, font, color: ink });
  if (input.eori) page.drawText(`EORI: ${input.eori}`, { x: 24, y: 522, size: 9, font, color: ink });

  let y = 495;
  page.drawText('Item', { x: 24, y, size: 9, font: bold, color: ink });
  page.drawText('HS', { x: 220, y, size: 9, font: bold, color: ink });
  page.drawText('Qty', { x: 300, y, size: 9, font: bold, color: ink });
  page.drawText('Value', { x: 350, y, size: 9, font: bold, color: ink });
  y -= 16;
  for (const it of input.items) {
    page.drawText(it.description.slice(0, 40), { x: 24, y, size: 9, font, color: ink });
    page.drawText(it.hs_code ?? '-', { x: 220, y, size: 9, font, color: ink });
    page.drawText(String(it.qty), { x: 300, y, size: 9, font, color: ink });
    page.drawText((it.qty * it.unit_value).toFixed(2), { x: 350, y, size: 9, font, color: ink });
    y -= 14;
  }
  y -= 8;
  page.drawText(`TOTAL: ${total.toFixed(2)} ${input.currency}`, { x: 24, y, size: 11, font: bold, color: ink });

  const bytes = await doc.save();

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const path = `${input.shipment_id}.pdf`;
  await admin.storage.createBucket('customs', { public: false }).catch(() => {});
  const up = await admin.storage.from('customs').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (up.error) return json({ error: 'storage_error', detail: up.error.message }, 500);
  const signed = await admin.storage.from('customs').createSignedUrl(path, 3600);

  await admin.from('customs_declarations').upsert(
    {
      shipment_id: input.shipment_id,
      eori: input.eori ?? null,
      invoice_no: input.invoice_no ?? null,
      items: input.items,
      total_value: total,
      currency: input.currency,
      is_gift: input.is_gift,
      gift_relief_applied: giftRelief,
    },
    { onConflict: 'shipment_id' },
  ).catch(() => {});

  return new Response(
    JSON.stringify({ url: signed.data?.signedUrl, total, gift_relief_applied: giftRelief, warnings }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
