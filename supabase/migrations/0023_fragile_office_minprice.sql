-- ============================================================================
-- 0023 — fragile flag + receiving office + the new tariff (£2/kg, £20 minimum)
--  • shipments.is_fragile      — operator ticks "Чупливо"; prints on the label
--  • shipments.origin_office   — which of the 4 UK offices received the parcel
--  • pricing_rates.price_per_kg + min_charge — the live table was flat-band
--    only; this adds the per-kg model and replaces the bands with the real
--    tariff: £2/kg on chargeable weight, £20 minimum (covers up to 10 kg).
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- AFTER running: redeploy the pricing function (it now understands per-kg):
--   supabase functions deploy pricing
-- ============================================================================

-- 1) Fragile flag
alter table public.shipments
  add column if not exists is_fragile boolean not null default false;

-- 2) Receiving office (slugs, not free text)
alter table public.shipments
  add column if not exists origin_office text;

do $$ begin
  alter table public.shipments
    add constraint shipments_origin_office_chk
    check (origin_office is null or origin_office in
      ('eccles_central','eccles_minimarket','burnley','queensferry'));
exception when duplicate_object then null; end $$;

-- 3) Per-kg pricing columns (the engine uses: max(min_charge, kg × price_per_kg)
--    when price_per_kg > 0; otherwise the flat band price as before)
alter table public.pricing_rates
  add column if not exists price_per_kg numeric(12,2) not null default 0;
alter table public.pricing_rates
  add column if not exists min_charge numeric(12,2) not null default 0;

-- 4) Replace the old flat bands with the real tariff: one linear band per
--    direction — £2/kg, £20 minimum. The owner can fine-tune in Settings later.
delete from public.pricing_rates;
insert into public.pricing_rates
  (direction, weight_from_kg, weight_to_kg, price, price_per_kg, min_charge,
   currency, volumetric_divisor, surcharge_gift, surcharge_remote) values
  ('UK_BG', 0, 1000, 0, 2, 20, 'GBP', 5000, 0, 6),
  ('BG_UK', 0, 1000, 0, 2, 20, 'GBP', 5000, 0, 6);
