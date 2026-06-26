// econt-proxy — WAVE 2. Wraps the Econt JSON API (BASIC auth) so credentials
// never touch the client (§5, B.L.A.S.T.). Methods: calculate, createLabel
// (mode `create`), getShipmentStatuses, nomenclature (getCities/getOffices/
// getStreets), requestCourier.
//
// Set secrets first:
//   supabase secrets set ECONT_USERNAME=... ECONT_PASSWORD=... \
//     ECONT_BASE_URL=https://ee.econt.com/services   # demo: https://demo.econt.com/ee/services
//
// Econt is PULL-based (no webhooks) — statuses are polled by `track-poll`.
import { z } from 'npm:zod@3.23.8';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

const reqSchema = z.object({
  method: z.enum(['calculate', 'createLabel', 'getShipmentStatuses', 'getOffices', 'getCities', 'getStreets', 'requestCourier']),
  payload: z.record(z.unknown()).default({}),
});

// Transactional methods that hit the Econt account (create labels / book a
// courier) are staff-only. Read methods (quote, nomenclature, statuses) stay
// open to any authenticated user so clients can browse offices + see a quote.
const STAFF_ONLY = new Set(['createLabel', 'requestCourier']);

async function isStaff(jwt: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return false;
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return false;
  const { data: prof } = await admin.from('profiles').select('role').eq('user_id', data.user.id).maybeSingle();
  const role = (prof as { role?: string } | null)?.role;
  return role === 'operator' || role === 'owner';
}

const ENDPOINTS: Record<string, string> = {
  calculate: 'Shipments/LabelService.createLabel.json', // validate mode for quote
  createLabel: 'Shipments/LabelService.createLabel.json',
  getShipmentStatuses: 'Shipments/ShipmentService.getShipmentStatuses.json',
  getOffices: 'Nomenclatures/NomenclaturesService.getOffices.json',
  getCities: 'Nomenclatures/NomenclaturesService.getCities.json',
  getStreets: 'Nomenclatures/NomenclaturesService.getStreets.json',
  requestCourier: 'Shipments/ShipmentService.requestCourier.json',
};

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);

  const user = Deno.env.get('ECONT_USERNAME');
  const pass = Deno.env.get('ECONT_PASSWORD');
  const base = Deno.env.get('ECONT_BASE_URL');
  if (!user || !pass || !base) {
    return json({ error: 'econt_not_configured', hint: 'Set ECONT_USERNAME/ECONT_PASSWORD/ECONT_BASE_URL (Wave 2).' }, 501);
  }

  const parsed = reqSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid_input' }, 422);

  // A.N.T.: a logged-in client must not be able to create labels or book
  // couriers on the company's Econt account.
  if (STAFF_ONLY.has(parsed.data.method)) {
    const jwt = auth.replace(/^Bearer\s+/i, '');
    if (!(await isStaff(jwt))) return json({ error: 'forbidden' }, 403);
  }

  const endpoint = ENDPOINTS[parsed.data.method];
  const basic = btoa(`${user}:${pass}`);

  const res = await fetch(`${base.replace(/\/$/, '')}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data.payload),
  });

  const data = await res.json().catch(() => ({}));
  return json({ ok: res.ok, status: res.status, data }, res.ok ? 200 : 502);
});
