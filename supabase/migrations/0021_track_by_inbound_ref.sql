-- 0021: public tracking also matches the inbound (Amazon/courier) tracking number.
--
-- A client who pre-registered an incoming parcel knows its Amazon/courier number
-- (e.g. UK4397839822) better than our HB code, so let them track by it too.
-- Still STATUS ONLY, never PII (§10). Case-insensitive (carrier numbers arrive
-- in mixed case).
create or replace function public.track_public(p_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select case when s.id is null then null else jsonb_build_object(
    'public_code', s.public_code,
    'direction', s.direction,
    'status', s.status,
    'updated_at', s.updated_at,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'status', e.status,
        'leg', e.leg,
        'location', e.location,
        'note_bg', e.note_bg,
        'note_en', e.note_en,
        'occurred_at', e.occurred_at
      ) order by e.occurred_at)
      from public.tracking_events e where e.shipment_id = s.id
    ), '[]'::jsonb)
  ) end
  from public.shipments s
  where s.public_code = upper(trim(p_code))
     or s.awb_barcode = upper(trim(p_code))
     or upper(s.inbound_ref) = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.track_public(text) from public;
grant execute on function public.track_public(text) to anon, authenticated;
