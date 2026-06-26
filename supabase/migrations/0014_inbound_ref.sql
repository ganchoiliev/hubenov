-- 0014 — inbound parcels received from external websites/couriers.
-- `inbound_ref` stores the scanned carrier/booking reference so a scan can either
-- match a pre-registered parcel (customer gave us their incoming tracking number,
-- or we issued a Hubenov QR) or simply be recorded for traceability + search.
alter table public.shipments add column if not exists inbound_ref text;

create index if not exists shipments_inbound_ref_idx
  on public.shipments(inbound_ref)
  where inbound_ref is not null;
