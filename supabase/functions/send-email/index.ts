// send-email — operator-initiated transactional email via Resend. The Resend
// key stays server-side (B.L.A.S.T. §5 Secure). Staff-only: the caller's JWT is
// verified and their profile.role must be operator/owner (A.N.T. — No-trust).
//
// Secrets:
//   supabase secrets set RESEND_API_KEY=re_xxx \
//     RESEND_FROM='Доставки Хубенов <noreply@hubenov.delivery>'
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
import { z } from 'npm:zod@3.23.8';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
});

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // ── AuthZ: only staff may send mail ────────────────────────────────────────
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'server_misconfigured' }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userRes.user) return json({ error: 'unauthorized' }, 401);

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', userRes.user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== 'operator' && role !== 'owner') return json({ error: 'forbidden' }, 403);

  // ── Validate payload ───────────────────────────────────────────────────────
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid_input' }, 422);
  const { to, subject, html, text, replyTo } = parsed.data;

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'Доставки Хубенов <noreply@hubenov.delivery>';
  if (!apiKey) {
    // No provider yet → log-only so the flow still works end-to-end.
    console.log(`[send-email] (no RESEND_API_KEY) → ${to}: ${subject}`);
    return json({ ok: true, simulated: true });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text, reply_to: replyTo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ ok: false, status: res.status, data }, 502);
  return json({ ok: true, id: (data as { id?: string }).id });
});
