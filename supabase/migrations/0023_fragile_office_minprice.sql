-- ============================================================================
-- 0023 — fragile flag + receiving office + £20/10kg minimum price
--  • shipments.is_fragile     — operator/client ticks "Чупливо"; prints on label
--  • shipments.origin_office  — which of the 4 UK offices received the parcel
--  • pricing_rates.min_charge — £20 floor (the engine already applies
--    max(min_charge, kg × price_per_kg), so bands only need the value set)
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS / idempotent).
-- ============================================================================

alter table public.shipments
  add column if not exists is_fragile boolean not null default false;

-- Slugs, not free text: 'eccles_central' | 'eccles_minimarket' | 'burnley' | 'queensferry'
alter table public.shipments
  add column if not exists origin_office text;

do $$ begin
  alter table public.shipments
    add constraint shipments_origin_office_chk
    check (origin_office is null or origin_office in
      ('eccles_central','eccles_minimarket','burnley','queensferry'));
exception when duplicate_object then null; end $$;

-- £20 minimum on every band (both directions). The owner can fine-tune later
-- in Operator → Settings; this sets the new floor everywhere at once.
update public.pricing_rates set min_charge = 20 where coalesce(min_charge, 0) < 20;
