/**
 * Phone normalization for the two markets we serve. The login form defaults to
 * UK (+44) with a one-tap switch to BG (+359). Clients type the local number
 * however they like — "07…", "7…", with spaces/brackets — and we resolve it to
 * E.164 for Supabase OTP. Explicit international input (+… / 00…) always wins
 * over the selector so a pasted full number is never double-prefixed.
 */
export interface DialCountry {
  /** ISO 3166-1 alpha-2 — stable key. */
  code: string;
  /** E.164 dial prefix, e.g. "+44". */
  dial: string;
  /** Flag emoji (falls back to letters on platforms without flag glyphs). */
  flag: string;
  /** Short label for the option. */
  label: string;
}

/** UK first (most senders are UK diaspora), Bulgaria second. */
export const DIAL_COUNTRIES: DialCountry[] = [
  { code: 'GB', dial: '+44', flag: '🇬🇧', label: 'UK' },
  { code: 'BG', dial: '+359', flag: '🇧🇬', label: 'BG' },
];

export const DEFAULT_DIAL = '+44';

/**
 * Combine a selected dial code with a locally-typed number → E.164 ("+digits").
 * Rules, in order:
 *   1. starts with "+"  → already international; keep its digits.
 *   2. starts with "00" → international prefix; swap for "+".
 *   3. otherwise        → strip leading zero(s), prefix the chosen dial code.
 */
export function toE164(dial: string, local: string): string {
  const raw = (local ?? '').trim();
  if (raw.startsWith('+')) return '+' + raw.slice(1).replace(/\D/g, '');
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  const national = digits.replace(/^0+/, '');
  const dialDigits = (dial || DEFAULT_DIAL).replace(/\D/g, '');
  return `+${dialDigits}${national}`;
}

/** Loose E.164 check: "+", non-zero first digit, 8–15 digits total. */
export function isE164(v: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(v);
}
