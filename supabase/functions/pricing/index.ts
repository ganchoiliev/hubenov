// pricing — server-authoritative quote from pricing_rates (§5). Never trust
// client math. Validates input with Zod, rate-limited, public (anon-callable).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';
import { corsHeaders, json, preflight, rateLimit, clientIp } from '../_shared/cors.ts';

const inputSchema = z.object({
  direction: z.enum(['UK_BG', 'BG_UK']),
  weight_kg: z.number().positive().max(1000),
  length_cm: z.number().positive().max(300).default(30),
  width_cm: z.number().positive().max(300).default(30),
  height_cm: z.number().positive().max(300).default(30),
  is_gift: z.boolean().default(false),
  remote_area: z.boolean().default(false),
  currency: z.enum(['GBP', 'EUR', 'BGN']).default('GBP'),
});

interface Rate {
  direction: string;
  weight_from_kg: number;
  weight_to_kg: number;
  price: number;
  /** Linear tariff (migration 0023): base = max(min_charge, kg × price_per_kg). */
  price_per_kg?: number | null;
  min_charge?: number | null;
  currency: string;
  volumetric_divisor: number;
  surcharge_gift: number;
  surcharge_remote: number;
}

function chargeable(w: number, l: number, wi: number, h: number, divisor: number): number {
  const vol = divisor > 0 ? (l * wi * h) / divisor : 0;
  return Math.ceil(Math.max(w, vol) * 2) / 2;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!rateLimit(`pricing:${clientIp(req)}`, 60)) return json({ error: 'rate_limited' }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'invalid_input', details: parsed.error.flatten() }, 422);
  const input = parsed.data;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('pricing_rates')
    .select('*')
    .eq('direction', input.direction);
  if (error) return json({ error: 'db_error' }, 500);

  const rates = (data ?? []) as Rate[];
  const divisor = rates[0]?.volumetric_divisor ?? 5000;
  const cw = chargeable(input.weight_kg, input.length_cm, input.width_cm, input.height_cm, divisor);

  const band =
    rates.find((r) => cw > r.weight_from_kg - 1e-9 && cw <= r.weight_to_kg + 1e-9) ??
    [...rates].sort((a, b) => b.weight_to_kg - a.weight_to_kg)[0];
  if (!band) return json({ error: 'no_rate' }, 404);

  const surcharges: { label: string; amount: number }[] = [];
  if (input.is_gift && band.surcharge_gift) surcharges.push({ label: 'gift', amount: band.surcharge_gift });
  if (input.remote_area && band.surcharge_remote) surcharges.push({ label: 'remote', amount: band.surcharge_remote });

  // Per-kg tariff when defined (£2/kg with a £20 floor after 0023); otherwise
  // the legacy flat band price. Same math as the client preview engine.
  const perKg = Number(band.price_per_kg ?? 0);
  const base =
    perKg > 0
      ? Math.max(Number(band.min_charge ?? 0), Math.round(cw * perKg * 100) / 100)
      : band.price;

  const total = Math.round((base + surcharges.reduce((s, x) => s + x.amount, 0)) * 100) / 100;

  return new Response(
    JSON.stringify({
      direction: input.direction,
      chargeable_weight_kg: cw,
      base_price: base,
      surcharges,
      total,
      currency: input.currency ?? band.currency,
      eta_text_bg: input.direction === 'UK_BG' ? '3–5 работни дни след курса' : '4–7 работни дни',
      eta_text_en: input.direction === 'UK_BG' ? '3–5 working days after departure' : '4–7 working days',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
