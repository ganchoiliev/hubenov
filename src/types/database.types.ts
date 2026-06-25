/**
 * PLACEHOLDER generated types.
 *
 * In Wave 1 this is hand-authored so the app typechecks without a live DB.
 * Once Supabase is running locally, REGENERATE with:
 *   npm run db:types
 * which runs `supabase gen types typescript --local`. Do not edit by hand
 * after that — it is a build artifact.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

import type {
  Profile,
  Address,
  Shipment,
  TrackingEvent,
  Load,
  Invoice,
  PricingRate,
} from './domain';

// Reads stay strongly typed via `Row`. The `& Record<string, unknown>` is
// required because our domain `Row`s are `interface`s, which (unlike generated
// `type` aliases) lack an implicit index signature and so don't satisfy
// supabase-js's `GenericSchema` — without it the whole schema collapses to
// `never` and every insert/update/rpc fails to typecheck. Replaced wholesale
// once the real types are generated (`npm run db:types`).
type Table<Row> = {
  Row: Row & Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      addresses: Table<Address>;
      shipments: Table<Shipment & { sender: Json; receiver: Json }>;
      parcels: Table<{
        id: string;
        shipment_id: string;
        barcode: string;
        weight_kg: number;
        length_cm: number;
        width_cm: number;
        height_cm: number;
        created_at: string;
        updated_at: string;
      }>;
      loads: Table<Load>;
      tracking_events: Table<TrackingEvent>;
      courier_shipments: Table<{
        id: string;
        shipment_id: string;
        carrier: string;
        carrier_ref: string | null;
        label_url: string | null;
        cod_amount: number | null;
        last_polled_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      customs_declarations: Table<{
        id: string;
        shipment_id: string;
        eori: string | null;
        invoice_no: string | null;
        items: Json;
        total_value: number;
        currency: string;
        is_gift: boolean;
        gift_relief_applied: boolean;
        created_at: string;
        updated_at: string;
      }>;
      invoices: Table<Invoice>;
      payments: Table<{
        id: string;
        invoice_id: string;
        method: string;
        amount: number;
        received_at: string;
        recorded_by: string;
        created_at: string;
      }>;
      conversations: Table<{
        id: string;
        client_id: string;
        subject: string;
        created_at: string;
        updated_at: string;
      }>;
      messages: Table<{
        id: string;
        conversation_id: string;
        sender_id: string;
        body: string;
        attachments: Json;
        read_at: string | null;
        created_at: string;
      }>;
      pricing_rates: Table<PricingRate>;
      audit_log: Table<{
        id: string;
        actor_id: string | null;
        action: string;
        entity: string;
        entity_id: string | null;
        meta: Json;
        ip: string | null;
        at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      track_public: {
        Args: { p_code: string };
        Returns: Json;
      };
      auth_role: { Args: Record<string, never>; Returns: string };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      my_profile_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
