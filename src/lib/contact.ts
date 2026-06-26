/**
 * Contact + booking deep-links. Derives WhatsApp / Viber / tel / mailto targets
 * from the company numbers so the (often non-techy) audience can reach us in one
 * tap, and so a quote can be turned into a prefilled "book this parcel" message.
 */
import { company } from '@/lib/env';

/** Normalise a UK-style phone to bare international digits (no +, no spaces). */
export function toIntlDigits(raw: string): string {
  const s = raw.replace(/[^\d+]/g, '');
  if (s.startsWith('+')) return s.slice(1);
  if (s.startsWith('00')) return s.slice(2);
  if (s.startsWith('0')) return `44${s.slice(1)}`; // UK local → +44
  return s;
}

const WHATSAPP = toIntlDigits(company.whatsapp);
const TEL = toIntlDigits(company.phone);

export const whatsappUrl = (text?: string): string =>
  `https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const viberUrl = (text?: string): string =>
  `viber://chat?number=${encodeURIComponent(`+${TEL}`)}${text ? `&text=${encodeURIComponent(text)}` : ''}`;

export const telUrl = (): string => `tel:+${TEL}`;

export const mailtoUrl = (subject: string, body = ''): string =>
  `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
