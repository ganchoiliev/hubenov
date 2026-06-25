// track-poll — WAVE 2, scheduled (Supabase cron, ~every 30 min). Econt is
// pull-based (no push webhooks, §5), so we poll active courier_shipments,
// diff against the latest tracking_event, and append new events.
//
// Schedule (config.toml / dashboard):
//   [functions.track-poll]  →  schedule = "*/30 * * * *"
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { json } from '../_shared/cors.ts';

// Maps an Econt status string to our shipment_status enum.
const STATUS_MAP: Record<string, string> = {
  delivered: 'delivered',
  out_for_delivery: 'out_for_delivery',
  in_office: 'handed_to_econt',
  received: 'handed_to_econt',
};

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const econtConfigured = !!Deno.env.get('ECONT_USERNAME');
  if (!econtConfigured) {
    return json({ skipped: true, reason: 'econt_not_configured (Wave 2)' });
  }

  // Active = handed to Econt but not yet delivered.
  const { data: active, error } = await admin
    .from('courier_shipments')
    .select('id, shipment_id, carrier_ref')
    .not('carrier_ref', 'is', null);
  if (error) return json({ error: 'db_error' }, 500);

  let appended = 0;
  for (const cs of active ?? []) {
    // TODO(Wave 2): call econt-proxy getShipmentStatuses with cs.carrier_ref,
    // map via STATUS_MAP, compare to the latest tracking_event for the shipment,
    // and insert any new events with source 'econt_poll'.
    void cs;
    void STATUS_MAP;
  }

  return json({ polled: active?.length ?? 0, appended });
});
