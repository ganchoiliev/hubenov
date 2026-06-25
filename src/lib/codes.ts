/**
 * Human-friendly identifier generators. Deterministic alphabet avoids
 * ambiguous characters (no O/0, I/1) for hand-keying at the counter.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomToken(len: number, rnd: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  }
  return out;
}

/** Client "ОТ" code, e.g. HB-7F3K (admin lookup key, NOT a credential — §10). */
export function generateClientCode(rnd: () => number = Math.random): string {
  return `HB-${randomToken(4, rnd)}`;
}

/**
 * Public shipment code, e.g. HB-2406-0007. Year+month prefix + sequence.
 * Safe to show publicly (track-by-number) — leaks no PII.
 */
export function generatePublicCode(seq: number, date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `HB-${yy}${mm}-${String(seq).padStart(4, '0')}`;
}

/** AWB barcode payload (Code128). Compact, numeric-ish, scanner-friendly. */
export function generateAwb(seq: number, rnd: () => number = Math.random): string {
  const rand = randomToken(4, rnd);
  return `HBN${String(seq).padStart(6, '0')}${rand}`;
}
