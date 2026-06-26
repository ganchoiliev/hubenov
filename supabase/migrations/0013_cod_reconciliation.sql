-- 0013 — COD reconciliation & invoice integrity.
--
-- (1) COD now carries its OWN currency and a remittance timestamp. This lets the
--     owner answer the question that actually matters in a cash business — "how
--     much money is Econt holding that's mine?" (delivered + COD, not yet remitted)
--     — and stops summing GBP + BGN into one bogus total.
-- (2) One invoice per shipment — closes the duplicate-invoice gap (intake
--     auto-invoice racing a manual create).

-- ── COD fields ───────────────────────────────────────────────────────────────
alter table public.courier_shipments
  add column if not exists cod_currency    text,
  add column if not exists cod_remitted_at timestamptz;

-- Backfill COD currency from the parent shipment so existing rows aggregate right.
update public.courier_shipments cs
set cod_currency = s.currency
from public.shipments s
where cs.shipment_id = s.id
  and cs.cod_amount is not null
  and cs.cod_currency is null;

-- ── Invoice integrity ────────────────────────────────────────────────────────
-- De-link any pre-existing duplicate invoices (keep one per shipment) so the
-- unique index below creates cleanly. No invoice row is deleted — the extras just
-- lose their shipment link and can be reviewed/voided manually.
with ranked as (
  select id, row_number() over (partition by shipment_id order by created_at, id) as rn
  from public.invoices
  where shipment_id is not null
)
update public.invoices i
set shipment_id = null
from ranked r
where i.id = r.id and r.rn > 1;

-- One invoice per shipment (partial: ad-hoc invoices may carry a null shipment_id).
create unique index if not exists invoices_shipment_uniq
  on public.invoices(shipment_id)
  where shipment_id is not null;
