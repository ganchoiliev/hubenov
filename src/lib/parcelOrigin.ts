import type { Shipment } from '@/types/domain';

/**
 * Online / forwarded parcels — the ones a customer ordered from a UK shop
 * (Amazon, eBay…) to our hub and had us forward on. They are identified by a
 * customer-supplied tracking number (`inbound_ref`); the shop the client picked
 * at registration is stored in `sender.line1`.
 *
 * This is the single source of truth for "is this an online parcel and from
 * whom" so every surface (lists, detail, portal) shows it consistently.
 */
const KNOWN_RETAILERS = [
  'Amazon',
  'eBay',
  'ASOS',
  'SHEIN',
  'Temu',
  'Next',
  'AliExpress',
  'Argos',
  'John Lewis',
  'Zara',
  'Nike',
  'Sports Direct',
  'Boohoo',
] as const;

export interface ParcelOrigin {
  /** True when the parcel carries a customer tracking number. */
  isOnline: boolean;
  /** The Amazon/courier tracking number, trimmed, or null. */
  ref: string | null;
  /** Best-guess shop name to display, or null when unknown. */
  retailer: string | null;
}

export function getParcelOrigin(s: Pick<Shipment, 'inbound_ref' | 'sender'>): ParcelOrigin {
  const ref = s.inbound_ref?.trim() || null;
  if (!ref) return { isOnline: false, ref: null, retailer: null };

  let retailer: string | null = null;
  const shop = (s.sender.line1 || '').trim();
  if (shop) {
    const lower = shop.toLowerCase();
    retailer =
      KNOWN_RETAILERS.find((k) => k.toLowerCase() === lower) ??
      KNOWN_RETAILERS.find((k) => lower.includes(k.toLowerCase())) ??
      shop; // unknown shop → show whatever the operator/client typed
  }
  // Fall back to the carrier signature in the tracking number (Amazon = TBA…).
  if (!retailer && /^TBA/i.test(ref)) retailer = 'Amazon';

  return { isOnline: true, ref, retailer };
}
