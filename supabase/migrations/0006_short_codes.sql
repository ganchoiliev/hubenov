-- ============================================================================
-- 0006_short_codes — shorter, friendlier order numbers.
-- HB-0005 instead of HB-2606-0005 — easier to read out on the phone and type,
-- for both operator and client. The AWB barcode (HBN000005) is unchanged.
-- Replaces the generator function; the existing trigger keeps pointing at it.
-- ============================================================================
create or replace function public.fill_shipment_codes()
returns trigger
language plpgsql
as $$
declare
  n bigint;
begin
  if new.public_code is null or new.awb_barcode is null then
    n := nextval('public.shipment_seq');
    if new.public_code is null then
      new.public_code := 'HB-' || lpad(n::text, 4, '0');
    end if;
    if new.awb_barcode is null then
      new.awb_barcode := 'HBN' || lpad(n::text, 6, '0');
    end if;
  end if;
  return new;
end;
$$;
