// message-notify — alert the other side when a chat message is posted, so
// client messages stop landing unread. Authenticated (verify_jwt=true); the
// caller's JWT decides direction (A.N.T. — No-trust, derive from identity, not
// from the request body):
//   • caller is the conversation's client  → email the office (CONTACT_TO)
//   • caller is staff (operator/owner)      → email the client (respects toggle)
// The Resend key stays server-side (B.L.A.S.T. §5 Secure). Best-effort: a send
// failure never blocks the chat — the message is already persisted by the app.
//
// Secrets (shared with send-email / contact):
//   RESEND_API_KEY, RESEND_FROM, CONTACT_TO, optional APP_URL.
import { z } from 'npm:zod@3.23.8';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

const schema = z.object({ conversation_id: z.string().uuid() });

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

async function sendResend(to: string, subject: string, html: string, replyTo?: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'Доставки Хубенов <noreply@hubenov.delivery>';
  if (!apiKey) {
    console.log(`[message-notify] (no RESEND_API_KEY) → ${to}: ${subject}`);
    return { ok: true, simulated: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, data };
  return { ok: true, id: (data as { id?: string }).id };
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'server_misconfigured' }, 500);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid_input' }, 422);
  const { conversation_id } = parsed.data;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Who is calling?
  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userRes.user) return json({ error: 'unauthorized' }, 401);
  const { data: caller } = await admin
    .from('profiles')
    .select('id, role, full_name')
    .eq('user_id', userRes.user.id)
    .maybeSingle();
  const callerRow = caller as { id?: string; role?: string; full_name?: string } | null;
  if (!callerRow?.id) return json({ error: 'forbidden' }, 403);

  // The conversation + its client.
  const { data: conv } = await admin
    .from('conversations')
    .select('id, client_id')
    .eq('id', conversation_id)
    .maybeSingle();
  const convRow = conv as { id: string; client_id: string } | null;
  if (!convRow) return json({ error: 'not_found' }, 404);

  const { data: client } = await admin
    .from('profiles')
    .select('id, full_name, email, notify_email, preferred_locale')
    .eq('id', convRow.client_id)
    .maybeSingle();
  const clientRow = client as
    | { id: string; full_name?: string; email?: string; notify_email?: boolean; preferred_locale?: string }
    | null;

  // Latest message → preview.
  const { data: last } = await admin
    .from('messages')
    .select('body, sender_id, created_at')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastRow = last as { body?: string; sender_id?: string } | null;
  const previewRaw = (lastRow?.body ?? '').slice(0, 400);
  const preview = esc(previewRaw).replace(/\n/g, '<br>');
  const appUrl = (Deno.env.get('APP_URL') ?? 'https://hubenov.delivery').replace(/\/$/, '');

  const isClient = callerRow.id === convRow.client_id;
  const isStaff = callerRow.role === 'operator' || callerRow.role === 'owner';

  if (isClient) {
    // Client wrote → tell the office.
    const to = Deno.env.get('CONTACT_TO') ?? 'info@hubenov.delivery';
    const name = esc(clientRow?.full_name || 'клиент');
    const html =
      `<h2>Ново съобщение от клиент</h2>` +
      `<p><b>${name}</b> ви писа в портала:</p>` +
      `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#333">${preview}</blockquote>` +
      `<p><a href="${appUrl}/op/messages">Отвори Съобщения в таблото →</a></p>`;
    const r = await sendResend(to, `Ново съобщение от ${clientRow?.full_name || 'клиент'}`, html);
    return json({ ok: r.ok, direction: 'to_office', ...r });
  }

  if (isStaff) {
    // Staff replied → tell the client (respecting the notification toggles).
    if (!clientRow?.email) return json({ ok: true, skipped: 'no_client_email' });
    const { data: settings } = await admin
      .from('company_settings')
      .select('notify_status_emails')
      .limit(1)
      .maybeSingle();
    const globalOn = (settings as { notify_status_emails?: boolean } | null)?.notify_status_emails ?? true;
    if (!globalOn || clientRow.notify_email === false) return json({ ok: true, skipped: 'opted_out' });

    const en = clientRow.preferred_locale === 'en';
    const subject = en ? 'New reply from Hubenov Deliveries' : 'Нов отговор от Доставки Хубенов';
    const intro = en ? 'Our office replied to your message:' : 'Нашият офис отговори на съобщението ви:';
    const cta = en ? 'Open Messages →' : 'Отвори Съобщения →';
    const html =
      `<h2>${esc(subject)}</h2>` +
      `<p>${intro}</p>` +
      `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#333">${preview}</blockquote>` +
      `<p><a href="${appUrl}/portal/messages">${cta}</a></p>`;
    const r = await sendResend(clientRow.email, subject, html);
    return json({ ok: r.ok, direction: 'to_client', ...r });
  }

  return json({ error: 'forbidden' }, 403);
});
