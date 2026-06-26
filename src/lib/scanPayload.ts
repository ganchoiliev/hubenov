/**
 * Parse whatever a 2D scanner types when it reads a code on an inbound parcel.
 *
 * Reality: a generic carrier label (Amazon/Evri/Royal Mail/…) encodes only a
 * tracking/reference number — never the recipient's name/address. So most scans
 * resolve to a `code` we try to match (our own Hubenov QR, or a pre-registered
 * incoming tracking number). A minority of labels carry STRUCTURED data
 * (vCard/MECARD/JSON); when present we extract it to prefill a new shipment.
 */

export interface ParsedRecipient {
  name?: string;
  phone?: string;
  line1?: string;
  city?: string;
  postcode?: string;
}

export interface ParsedScan {
  /** The original scanned string (stored as inbound_ref for traceability). */
  raw: string;
  /** Best token to resolve an existing shipment (Hubenov code / tracking №), if any. */
  code: string | null;
  /** Structured recipient details, only when the code actually carried them. */
  recipient?: ParsedRecipient;
}

// Our public codes look like HB-0001 / OT-0001 (with or without the dash).
const CODE_RE = /\b((?:HB|OT)-?\d{3,})\b/i;

export function parseScanPayload(raw: string): ParsedScan {
  const value = raw.trim();
  if (!value) return { raw: value, code: null };

  // 1) URL — a Hubenov QR may be a tracking link; pull a code from query/path.
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      const q = u.searchParams.get('code') ?? u.searchParams.get('c') ?? '';
      const fromQuery = q.match(CODE_RE)?.[1];
      const fromPath = u.pathname.match(CODE_RE)?.[1];
      const tail = u.pathname.split('/').filter(Boolean).pop() ?? '';
      const code = (fromQuery ?? fromPath ?? tail).toUpperCase();
      return { raw: value, code: code || null };
    } catch {
      /* not a real URL — fall through */
    }
  }

  // 2) vCard
  if (/^BEGIN:VCARD/i.test(value)) {
    const recipient = parseVCard(value);
    return { raw: value, code: null, recipient: hasData(recipient) ? recipient : undefined };
  }

  // 3) MECARD
  if (/^MECARD:/i.test(value)) {
    const recipient = parseMecard(value);
    return { raw: value, code: null, recipient: hasData(recipient) ? recipient : undefined };
  }

  // 4) JSON
  if (/^[[{]/.test(value)) {
    try {
      const o = JSON.parse(value) as Record<string, unknown>;
      const code = (str(o, ['public_code', 'code', 'tracking', 'reference']) ?? '').toUpperCase() || null;
      const recipient = mapJsonRecipient(o);
      return { raw: value, code, recipient };
    } catch {
      /* not JSON — fall through */
    }
  }

  // 5) A Hubenov code embedded in plain text.
  const our = value.match(CODE_RE)?.[1];
  if (our) return { raw: value, code: our.toUpperCase() };

  // 6) Plain carrier reference / tracking number — try it as a lookup token too.
  return { raw: value, code: value.toUpperCase() };
}

function hasData(r: ParsedRecipient): boolean {
  return Object.values(r).some((v) => !!v);
}

function clean(s: string | undefined): string | undefined {
  const v = s?.trim();
  return v ? v : undefined;
}

function parseVCard(v: string): ParsedRecipient {
  const get = (re: RegExp) => clean(v.match(re)?.[1]);
  const name = get(/[\r\n]FN[^:]*:(.+)/i);
  const phone = get(/[\r\n]TEL[^:]*:(.+)/i);
  // ADR is ;-separated: PO;ext;street;city;region;postcode;country
  const adr = get(/[\r\n]ADR[^:]*:(.+)/i);
  const p = adr ? adr.split(';') : [];
  return { name, phone, line1: clean(p[2]), city: clean(p[3]), postcode: clean(p[5]) };
}

function parseMecard(v: string): ParsedRecipient {
  const body = v.replace(/^MECARD:/i, '');
  const fields: Record<string, string> = {};
  for (const part of body.split(';')) {
    const i = part.indexOf(':');
    if (i > 0) fields[part.slice(0, i).toUpperCase()] = part.slice(i + 1);
  }
  return { name: clean(fields.N), phone: clean(fields.TEL), line1: clean(fields.ADR) };
}

function str(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const val = o[k];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return undefined;
}

function mapJsonRecipient(o: Record<string, unknown>): ParsedRecipient | undefined {
  const r: ParsedRecipient = {
    name: str(o, ['name', 'full_name', 'recipient', 'to']),
    phone: str(o, ['phone', 'tel', 'telephone', 'mobile']),
    line1: str(o, ['address', 'line1', 'street', 'addr']),
    city: str(o, ['city', 'town']),
    postcode: str(o, ['postcode', 'postal_code', 'zip', 'zipcode']),
  };
  return hasData(r) ? r : undefined;
}
