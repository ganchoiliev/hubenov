// notify — WAVE 2. Email + SMS on key status changes. Provider keys stay
// server-side (§5). Called by status-change triggers / the operator console.
//
// Secrets:
//   supabase secrets set SMS_API_KEY=... EMAIL_API_KEY=...
import { z } from 'npm:zod@3.23.8';
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

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid_input' }, 422);
  const { channel, to, template, locale, vars } = parsed.data;

  const body = render(TEMPLATES[template]![locale], vars);

  const smsKey = Deno.env.get('SMS_API_KEY');
  const emailKey = Deno.env.get('EMAIL_API_KEY');
  if ((channel === 'sms' && !smsKey) || (channel === 'email' && !emailKey)) {
    // Wave 1: log-only so the rest of the flow works without a provider.
    console.log(`[notify:${channel}] → ${to}: ${body}`);
    return json({ ok: true, simulated: true, body });
  }

  // TODO(Wave 2): POST to the SMS / email provider here using the secret key.
  return json({ ok: true, simulated: false, body });
});
