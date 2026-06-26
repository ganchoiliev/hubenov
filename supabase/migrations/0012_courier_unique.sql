-- ============================================================================
-- 0012 — one Econt last-mile linkage row per shipment. Lets the operator record
-- the Econt tracking number + COD at handoff (upsert by shipment_id) while the
-- live Econt API is off. Idempotent.
-- ============================================================================
create unique index if not exists courier_shipments_shipment_uniq
  on public.courier_shipments (shipment_id);
