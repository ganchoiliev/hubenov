// contact — public contact-form relay. Anon-callable (verify_jwt=false). Emails
// the owner via Resend; the key stays server-side (B.L.A.S.T. §5 Secure). A
// honeypot field + length caps blunt spam; replies go to the sender when given.
//
// Secrets (shared with send-email):
//   RESEND_API_KEY, RESEND_FROM, and optionally CONTACT_TO (owner inbox).
import { z } from 'npm:zod@3.23.8';
import { json, preflight } from '../_shared/cors.ts';

const schema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(3).max(40),
  email: z.string().email().max(160).optional(),
  message: z.string().min(1).max(4000),
  website: z.string().max(0).optional(), // honeypot — must be empty
});

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid_input' }, 422);
  const { name, phone, email, message, website } = parsed.data;

  // Honeypot tripped → pretend success, drop silently.
  if (website) return json({ ok: true });

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'Доставки Хубенов <noreply@hubenov.delivery>';
  const to = Deno.env.get('CONTACT_TO') ?? 'info@hubenov.delivery';
  const subject = `Запитване от сайта — ${name}`;
  const html =
    `<h2>Ново запитване от сайта</h2>` +
    `<p><b>Име:</b> ${esc(name)}</p>` +
    `<p><b>Телефон:</b> ${esc(phone)}</p>` +
    (email ? `<p><b>Имейл:</b> ${esc(email)}</p>` : '') +
    `<p><b>Съобщение:</b></p><p>${esc(message).replace(/\n/g, '<br>')}</p>`;

  if (!apiKey) {
    console.log(`[contact] (no RESEND_API_KEY) ${name} / ${phone}: ${message}`);
    return json({ ok: true, simulated: true });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ ok: false, status: res.status, data }, 502);
  return json({ ok: true, id: (data as { id?: string }).id });
});
