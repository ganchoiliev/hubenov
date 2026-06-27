-- 0022: first-class shipment "kind".
--
-- Distinguishes a FORWARDED online order (the customer shopped a UK store to our
-- hub and we forward it on) from an ordinary SEND (the customer hands us a
-- parcel). Until now "online" was inferred from inbound_ref; promoting it to a
-- real column makes forwarding a reportable product line, simplifies the demand
-- queries, and leaves room for future kinds (e.g. a 'buy_for_me' concierge —
-- add later with: alter type shipment_kind add value 'buy_for_me';).

-- 1. The enum (idempotent).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'shipment_kind') then
    create type shipment_kind as enum ('send', 'forward');
  end if;
end $$;

-- 2. The column — default 'send' keeps every existing and future row valid.
alter table public.shipments
  add column if not exists kind shipment_kind not null default 'send';

-- 3. Backfill — anything that carried a customer tracking number was a forward.
update public.shipments
   set kind = 'forward'
 where inbound_ref is not null
   and kind = 'send';

-- 4. Index — drives the "online parcels" filter and demand reporting.
create index if not exists shipments_kind_idx on public.shipments (kind);
