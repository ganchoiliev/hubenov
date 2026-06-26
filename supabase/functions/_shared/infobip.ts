// Shared Infobip SMS sender. Used by both the transactional `notify` function
// (status updates) and the Auth `send-sms-hook` (login OTP), so the phone
// normalisation + provider call live in exactly one place. Provider keys stay
// server-side (B.L.A.S.T. §5). Endpoint is /sms/2/text/advanced — proven live.
//
// Secrets: INFOBIP_API_KEY, INFOBIP_BASE_URL (e.g. jr6dz4.api.infobip.com),
//          INFOBIP_FROM (e.g. "Hubenov").

/** Best-effort national → E.164 digits (no '+'). Defaults to the two markets we
 *  serve: BG mobiles (0 8x / 0 9x) → 359, UK (0 7x …) → 44. */
export function toMsisdn(raw: string): string {
  const d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) {
    if (d.startsWith('08') || d.startsWith('09')) return `359${d.slice(1)}`;
    return `44${d.slice(1)}`;
  }
  return d;
}

export interface SmsResult {
  ok: boolean;
  /** true when no provider is configured (logged, not sent) — flow still works. */
  simulated?: boolean;
  groupId?: number;
  error?: string;
}

/** Send one SMS via Infobip. Resolves ok:true on Infobip groupId 1 (PENDING) or
 *  3 (DELIVERED); ok:false (with a reason) otherwise. Never throws. */
export async function sendSms(to: string, text: string): Promise<SmsResult> {
  const apiKey = Deno.env.get('INFOBIP_API_KEY');
  const baseRaw = Deno.env.get('INFOBIP_BASE_URL');
  const from = Deno.env.get('INFOBIP_FROM') ?? 'Hubenov';
  if (!apiKey || !baseRaw) {
    console.log(`[infobip] (no config) → ${to}: ${text}`);
    return { ok: true, simulated: true };
  }
  const base = baseRaw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  try {
    const res = await fetch(`https://${base}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ messages: [{ from, destinations: [{ to: toMsisdn(to) }], text }] }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { status?: { groupId?: number; description?: string } }[];
      requestError?: { serviceException?: { text?: string } };
    };
    const st = data.messages?.[0]?.status;
    const gid = st?.groupId;
    if (!res.ok || (gid !== 1 && gid !== 3)) {
      return {
        ok: false,
        groupId: gid,
        error: st?.description ?? data.requestError?.serviceException?.text ?? 'send_failed',
      };
    }
    return { ok: true, groupId: gid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch_failed' };
  }
}
