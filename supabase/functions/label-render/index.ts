// label-render — builds the own-AWB 4×6" label PDF (Code128 + OT code +
// sender/receiver + route + customs summary) and stores it (§5, §8). Mirrors
// src/lib/label.ts so the operator station and the server produce the same
// label. Requires a signed-in staff caller (RLS via the user's JWT).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import bwipjs from 'npm:bwip-js@4.5.1';
import { json, preflight, corsHeaders } from '../_shared/cors.ts';

const inputSchema = z.object({ shipment_id: z.string().uuid() });

// BG Cyrillic → Latin (standard PDF fonts are WinAnsi-only). See src/lib/translit.ts.
const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};
function pdfSafe(s: string): string {
  let out = '';
  for (const ch of s ?? '') {
    const low = ch.toLowerCase();
    const m = MAP[low];
    if (m === undefined) out += ch;
    else out += ch === low ? m : m.charAt(0).toUpperCase() + m.slice(1);
  }
  // deno-lint-ignore no-control-regex
  return out.replace(/[^\x20-\xff]/g, '?');
}

interface Party {
  name: string; phone: string; line1: string; line2?: string | null;
  city: string; postcode: string; country: string; econt_office_code?: string | null;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid_input' }, 422);

  // User-scoped client: RLS ensures only staff/owner can read the shipment.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: s, error } = await supabase
    .from('shipments')
    .select('*, client:profiles!shipments_client_id_fkey(client_code)')
    .eq('id', parsed.data.shipment_id)
    .maybeSingle();
  if (error || !s) return json({ error: 'not_found' }, 404);

  const sender = s.sender as Party;
  const receiver = s.receiver as Party;
  const clientCode = (s.client as { client_code?: string } | null)?.client_code ?? '—';

  // Barcode PNG (Code128)
  const png: Uint8Array = await bwipjs.toBuffer({
    bcid: 'code128',
    text: s.awb_barcode,
    scale: 3,
    height: 12,
    includetext: false,
  });

  const W = 288, H = 432, M = 14;
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.13, 0.09);
  const route = s.direction === 'UK_BG' ? 'United Kingdom  ->  Bulgaria' : 'Bulgaria  ->  United Kingdom';

  page.drawText('HUBENOV DELIVERIES', { x: M, y: H - 26, size: 13, font: bold, color: ink });
  page.drawText(route, { x: M, y: H - 42, size: 9, font, color: ink });
  page.drawText(`OT: ${clientCode}`, { x: W - M - 90, y: H - 26, size: 10, font: bold, color: ink });

  const img = await doc.embedPng(png);
  page.drawImage(img, { x: M, y: H - 116, width: W - 2 * M, height: 56 });
  page.drawText(s.awb_barcode, { x: M, y: H - 132, size: 11, font: bold, color: ink });
  page.drawText(s.public_code, { x: W - M - 100, y: H - 132, size: 10, font, color: ink });

  const block = (title: string, p: Party, startY: number): number => {
    let y = startY;
    page.drawText(title, { x: M, y, size: 8, font: bold, color: rgb(0.4, 0.45, 0.42) }); y -= 14;
    page.drawText(pdfSafe(p.name), { x: M, y, size: 11, font: bold, color: ink }); y -= 13;
    page.drawText(pdfSafe(p.phone), { x: M, y, size: 9, font, color: ink }); y -= 13;
    page.drawText(pdfSafe([p.line1, p.line2].filter(Boolean).join(', ')).slice(0, 48), { x: M, y, size: 9, font, color: ink }); y -= 12;
    const cityLine = p.econt_office_code
      ? `${pdfSafe(p.city)} - Econt ${p.econt_office_code}`
      : `${pdfSafe(p.postcode)} ${pdfSafe(p.city)}, ${p.country}`;
    page.drawText(cityLine.slice(0, 48), { x: M, y, size: 9, font, color: ink }); y -= 16;
    return y;
  };

  let y = H - 158;
  y = block('SENDER / IZPRASHTACH', sender, y);
  y = block('RECEIVER / POLUCHATEL', receiver, y - 4);

  page.drawText(`Weight: ${Number(s.weight_kg).toFixed(1)} kg`, { x: M, y: 52, size: 10, font: bold, color: ink });
  page.drawText(s.is_gift ? 'GIFT / PODARAK' : 'GOODS / STOKA', { x: M, y: 38, size: 10, font, color: ink });
  page.drawText(`Value: ${Number(s.declared_value).toFixed(2)} ${s.currency}`, { x: W - M - 130, y: 38, size: 9, font, color: ink });

  const bytes = await doc.save();

  // Store and return a signed URL (§10 signed URLs for Storage).
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const path = `${parsed.data.shipment_id}.pdf`;
  await admin.storage.createBucket('labels', { public: false }).catch(() => {});
  const up = await admin.storage.from('labels').upload(path, bytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (up.error) return json({ error: 'storage_error', detail: up.error.message }, 500);

  const signed = await admin.storage.from('labels').createSignedUrl(path, 3600);
  await admin.from('courier_shipments').upsert(
    { shipment_id: parsed.data.shipment_id, carrier: 'econt', label_url: signed.data?.signedUrl ?? null },
    { onConflict: 'shipment_id' },
  ).catch(() => {});

  return new Response(JSON.stringify({ label_url: signed.data?.signedUrl, path }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
