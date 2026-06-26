/**
 * Domain types — the shared contract for the whole app (§4, §6).
 * These mirror the Postgres schema; `database.types.ts` is generated from
 * Supabase and is the source of truth for row shapes once the DB is live.
 */

export type Role = 'owner' | 'operator' | 'client' | 'driver';
export type Locale = 'bg' | 'en';
export type Country = 'GB' | 'BG';
export type Direction = 'UK_BG' | 'BG_UK';
export type Currency = 'GBP' | 'EUR' | 'BGN';

/** Single customer-facing timeline (§6). */
export const SHIPMENT_STATUSES = [
  'draft',
  'booked',
  'collected_uk',
  'at_uk_hub',
  'on_load',
  'departed_uk',
  'arrived_bg_hub',
  'handed_to_econt',
  'out_for_delivery',
  'delivered',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** Side states outside the happy path. */
export const SIDE_STATUSES = ['exception', 'returned', 'cancelled'] as const;
export type SideStatus = (typeof SIDE_STATUSES)[number];

export type AnyStatus = ShipmentStatus | SideStatus;

export type PaymentStatus = 'unpaid' | 'paid' | 'partial';
export type ParcelType = 'parcel' | 'document' | 'pallet' | 'food' | 'other';
export type AddressKind = 'sender' | 'receiver';
export type TrackingLeg = 'own' | 'econt';
export type TrackingSource = 'scan' | 'manual' | 'econt_poll';
export type LoadStatus = 'open' | 'departed' | 'arrived' | 'closed';
export type InvoiceStatus = 'unpaid' | 'paid' | 'partial' | 'void';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card_office' | 'cod';

export interface Profile {
  id: string;
  user_id: string;
  role: Role;
  client_code: string; // human-friendly "ОТ" code, e.g. HB-7F3K
  full_name: string;
  phone: string | null;
  email: string | null;
  preferred_locale: Locale;
  notify_email: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  profile_id: string;
  country: Country;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  econt_office_code: string | null;
  is_default: boolean;
  kind: AddressKind;
}

/** Snapshot of a party at the time the shipment was created. */
export interface PartySnapshot {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  postcode: string;
  country: Country;
  econt_office_code?: string | null;
}

export interface Shipment {
  id: string;
  client_id: string;
  public_code: string;
  awb_barcode: string;
  sender: PartySnapshot;
  receiver: PartySnapshot;
  direction: Direction;
  parcel_type: ParcelType;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  declared_value: number;
  currency: Currency;
  is_gift: boolean;
  status: AnyStatus;
  price: number | null;
  payment_status: PaymentStatus;
  load_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  leg: TrackingLeg;
  status: AnyStatus;
  location: string | null;
  note_bg: string | null;
  note_en: string | null;
  occurred_at: string;
  source: TrackingSource;
}

export interface Load {
  id: string;
  code: string;
  vehicle_reg: string | null;
  driver_name: string | null;
  direction: Direction;
  status: LoadStatus;
  scheduled_departure: string;
  booking_cutoff: string;
  departed_at: string | null;
  arrived_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  shipment_id: string | null;
  number: string;
  amount: number;
  currency: Currency;
  status: InvoiceStatus;
  pdf_url: string | null;
  created_at: string;
}

export interface PricingRate {
  id: string;
  direction: Direction;
  weight_from_kg: number;
  weight_to_kg: number;
  price: number;
  currency: Currency;
  volumetric_divisor: number;
  surcharge_gift: number;
  surcharge_remote: number;
  /** Linear per-kg price. When set (>0) it overrides the flat band `price`. */
  price_per_kg?: number;
  /** Optional floor applied to per-kg pricing. */
  min_charge?: number;
}

export interface CustomsItem {
  description: string;
  hs_code?: string;
  qty: number;
  unit_value: number;
}

/** A quote returned by the `pricing` function / CourierProvider. */
export interface Quote {
  direction: Direction;
  chargeable_weight_kg: number;
  base_price: number;
  surcharges: { label: string; amount: number }[];
  total: number;
  currency: Currency;
  eta_text_bg: string;
  eta_text_en: string;
}
