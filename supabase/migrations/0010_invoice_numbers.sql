-- ============================================================================
-- 0010 — auto invoice numbers (INV-0001, INV-0002, …). Lets an operator create
-- an invoice from the client record without hand-typing a unique number.
-- invoices.number is NOT NULL UNIQUE; a BEFORE INSERT trigger fills it when the
-- caller omits it (fires before the NOT NULL check — same pattern as
-- fill_shipment_codes). Idempotent: safe to re-run.
-- ============================================================================
create sequence if not exists public.invoice_seq;

create or replace function public.fill_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.number is null or new.number = '' then
    new.number := 'INV-' || lpad(nextval('public.invoice_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fill_invoice_number on public.invoices;
create trigger trg_fill_invoice_number
  before insert on public.invoices
  for each row execute function public.fill_invoice_number();
