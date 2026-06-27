-- 0019: friendlier client OT code.
--
-- Letters only (no I/O/Q look-alikes, no digits at all). Two wins:
--  1) cleaner to read/type/dictate — no 0/O, 1/I, 8/B, 5/S, 2/Z confusion;
--  2) can NEVER be all-digits, so a client code can't collide with a parcel
--     public_code like HB-0034 (the old alphabet could randomly emit HB-4729).
-- Still random (≈ 23^4 ≈ 280k) so the public account-track stays non-enumerable.
-- Affects NEW clients only — existing codes are unchanged.
create or replace function public.gen_client_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPRSTUVWXYZ';
  code text;
  i int;
begin
  loop
    code := 'HB-';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where client_code = code::citext);
  end loop;
  return code;
end;
$$;
