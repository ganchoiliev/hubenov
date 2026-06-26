// notify — transactional SMS on key status changes, via Vonage (no Twilio).
// Staff-only (A.N.T.): the caller's JWT must resolve to operator/owner, so a
// client can't use it to blast SMS. Provider keys stay server-side (§5).
// Best-effort: callers never block on it.
//
// Secrets:
//   supabase secrets set VONAGE_API_KEY=xxx VONAGE_API_SECRET=yyy \
//     VONAGE_FROM='Hubenov'
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
import { z } from 'npm:zod@3.23.8';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

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

/** Best-effort national → E.164 (digits only). Defaults to the two markets we
 *  serve: BG mobiles (0 8x / 0 9x) → +359, UK (0 7x …) → +44. */
function toMsisdn(raw: string): string {
  const d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) {
    if (d.startsWith('08') || d.startsWith('09')) return `359${d.slice(1)}`;
    return `44${d.slice(1)}`;
  }
  return d;
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

  const apiKey = Deno.env.get('VONAGE_API_KEY');
  const apiSecret = Deno.env.get('VONAGE_API_SECRET');
  const from = Deno.env.get('VONAGE_FROM') ?? 'Hubenov';
  if (!apiKey || !apiSecret) {
    // No provider yet → log-only so the flow still works end-to-end.
    console.log(`[notify:sms] (no VONAGE keys) → ${to}: ${body}`);
    return json({ ok: true, simulated: true, body });
  }

  const res = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      api_secret: apiSecret,
      from,
      to: toMsisdn(to),
      text: body,
      type: 'unicode', // Cyrillic-safe
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    messages?: { status?: string; ['error-text']?: string }[];
  };
  const msg = data.messages?.[0];
  if (!res.ok || !msg || msg.status !== '0') {
    return json({ ok: false, status: msg?.status, error: msg?.['error-text'] ?? 'send_failed' }, 502);
  }
  return json({ ok: true });
});
