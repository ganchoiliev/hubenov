// send-sms-hook — Supabase Auth "Send SMS hook". Auth calls this server-to-server
// whenever it must deliver a phone OTP (login / signup / phone-change / reauth).
// There is NO user JWT on this call — Auth authenticates with a Standard Webhooks
// signature — so it MUST be deployed with --no-verify-jwt and verify the
// signature itself. Empty 200 = success. We send the code via Infobip, which is
// the supported route because Supabase has no native Infobip SMS provider.
//
// Secrets:
//   SEND_SMS_HOOK_SECRET — shown when you enable the hook (format "v1,whsec_…");
//                          set it verbatim via `supabase secrets set`.
//   INFOBIP_API_KEY / INFOBIP_BASE_URL / INFOBIP_FROM — shared with `notify`.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { sendSms } from '../_shared/infobip.ts';

interface HookPayload {
  user: { phone?: string | null };
  sms: { otp?: string };
}

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: { message: 'method_not_allowed' } });

  const secret = Deno.env.get('SEND_SMS_HOOK_SECRET');
  if (!secret) return reply(500, { error: { message: 'hook_not_configured' } });

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  // Standard Webhooks: HMAC over `${id}.${timestamp}.${body}` using the base64
  // secret (strip the "v1,whsec_" prefix Supabase shows). Rejects forgeries +
  // replays, so an attacker can't drive our Infobip balance through this URL.
  let data: HookPayload;
  try {
    const wh = new Webhook(secret.replace('v1,whsec_', ''));
    data = wh.verify(payload, headers) as HookPayload;
  } catch (_e) {
    return reply(401, { error: { message: 'invalid_signature' } });
  }

  const phone = data.user?.phone ?? '';
  const otp = data.sms?.otp ?? '';
  if (!phone || !otp) return reply(400, { error: { message: 'missing_phone_or_otp' } });

  // Bilingual one-liner (stays within a single Unicode SMS segment).
  const text = `Код за вход / Sign-in code: ${otp} — Доставки Хубенов`;
  const r = await sendSms(phone, text);
  if (!r.ok) return reply(502, { error: { message: r.error ?? 'sms_send_failed', http_code: 502 } });

  return reply(200, {});
});
