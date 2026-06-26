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

  const apiKey = Deno.env.get('INFOBIP_API_KEY');
  const baseRaw = Deno.env.get('INFOBIP_BASE_URL');
  const from = Deno.env.get('INFOBIP_FROM') ?? 'Hubenov';
  if (!apiKey || !baseRaw) {
    // No provider yet → log-only so the flow still works end-to-end.
    console.log(`[notify:sms] (no INFOBIP config) → ${to}: ${body}`);
    return json({ ok: true, simulated: true, body });
  }
  const base = baseRaw.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const res = await fetch(`https://${base}/sms/2/text/advanced`, {
    method: 'POST',
    headers: { Authorization: `App ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      messages: [{ from, destinations: [{ to: toMsisdn(to) }], text: body }],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    messages?: { status?: { groupId?: number; name?: string; description?: string } }[];
    requestError?: { serviceException?: { text?: string } };
  };
  const st = data.messages?.[0]?.status;
  const gid = st?.groupId;
  // Infobip groupId: 1 = PENDING (accepted), 3 = DELIVERED. Anything else = problem.
  if (!res.ok || (gid !== 1 && gid !== 3)) {
    const err = st?.description ?? data.requestError?.serviceException?.text ?? 'send_failed';
    return json({ ok: false, groupId: gid, error: err }, 502);
  }
  return json({ ok: true });
});
