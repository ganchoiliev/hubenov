// notify — transactional SMS on key status changes, via Infobip (no Twilio).
// Staff-only (A.N.T.): the caller's JWT must resolve to operator/owner, so a
// client can't use it to blast SMS. Provider keys stay server-side (§5).
// Best-effort: callers never block on it.
//
// Secrets (Infobip account → API key + your per-account base URL):
//   supabase secrets set INFOBIP_API_KEY=xxxxxxxx \
//     INFOBIP_BASE_URL=jr6dz4.api.infobip.com INFOBIP_FROM='Hubenov'
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
import { z } from 'npm:zod@3.23.8';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';
import { sendSms } from '../_shared/infobip.ts';

const schema = z.object({
  channel: z.enum(['sms', 'email']),
  to: z.string().min(3),
  template: z.enum(['booked', 'departed', 'arrived', 'out_for_delivery', 'delivered', 'exception']),
  locale: z.enum(['bg', 'en']).default('bg'),
  vars: z.record(z.string()).default({}),
});

const TEMPLATES: Record<string, { bg: string; en: string }> = {
  booked: { bg: 'Пратка {{code}} е заявена.', en: 'Shipment {{code}} is booked.' },
  departed: { bg: 'Пратка {{code}} тръгна от UK.', en: 'Shipment {{code}} departed the UK.' },
  arrived: { bg: 'Пратка {{code}} пристигна в България.', en: 'Shipment {{code}} arrived in Bulgaria.' },
  out_for_delivery: { bg: 'Пратка {{code}} е за доставка.', en: 'Shipment {{code}} is out for delivery.' },
  delivered: { bg: 'Пратка {{code}} е доставена.', en: 'Shipment {{code}} delivered.' },
  exception: { bg: 'Проблем с пратка {{code}}. Свържете се с нас.', en: 'Issue with shipment {{code}}. Please contact us.' },
};

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // ── AuthZ: staff only ───────────────────────────────────────────────────────
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'server_misconfigured' }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userRes.user) return json({ error: 'unauthorized' }, 401);
  const { data: profile } = await admin.from('profiles').select('role').eq('user_id', userRes.user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== 'operator' && role !== 'owner') return json({ error: 'forbidden' }, 403);

  // ── Validate ────────────────────────────────────────────────────────────────
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid_input' }, 422);
  const { channel, to, template, locale, vars } = parsed.data;
  const body = render(TEMPLATES[template]![locale], vars);

  if (channel !== 'sms') {
    // Email is handled by the send-email function; nothing to do here.
    return json({ ok: true, skipped: 'email_handled_elsewhere' });
  }

  const r = await sendSms(to, body);
  if (!r.ok) return json({ ok: false, groupId: r.groupId, error: r.error }, 502);
  return json({ ok: true, simulated: r.simulated });
});
