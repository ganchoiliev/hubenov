/**
 * CourierProvider — the only seam the app sees for last-mile (Econt). Swappable
 * without touching components (§2, §13). Wave 1 ships MockEcontProvider; Wave 2
 * implements EcontProvider inside the `econt-proxy` Edge Function.
 */
import type { Quote } from '@/types/domain';
import type { QuoteInput } from '@/schemas';

export interface EcontOffice {
  code: string;
  name: string;
  city: string;
  address: string;
}

export interface CourierLabel {
  carrier_ref: string;
  label_url: string;
  tracking_url: string;
}

export interface CourierStatus {
  carrier_ref: string;
  status: string;
  location: string | null;
  occurred_at: string;
  note_bg: string;
  note_en: string;
}

export interface CourierProvider {
  readonly name: 'econt';
  /** Quote the BG last-mile leg. */
  calculate(input: QuoteInput): Promise<Quote>;
  /** Create a carrier label (Econt mode `create`). */
  createLabel(shipmentId: string): Promise<CourierLabel>;
  /** Pull statuses for active carrier shipments (Econt is pull-based, §5). */
  getShipmentStatuses(carrierRefs: string[]): Promise<CourierStatus[]>;
  /** Office nomenclature for the BG receiver picker. */
  getOffices(citySearch: string): Promise<EcontOffice[]>;
  /** Request a courier pickup. */
  requestCourier(shipmentId: string): Promise<{ requested_at: string }>;
}
