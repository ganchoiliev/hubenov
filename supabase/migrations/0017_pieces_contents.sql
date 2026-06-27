-- 0017: multi-piece shipments + customs contents description
--
-- pieces:   number of boxes in one shipment (one HB code, N labels "i/N").
-- contents: what's inside, for customs + printed on the label.
alter table public.shipments
  add column if not exists pieces integer not null default 1,
  add column if not exists contents text;

alter table public.shipments
  add constraint shipments_pieces_positive check (pieces >= 1 and pieces <= 99) not valid;
