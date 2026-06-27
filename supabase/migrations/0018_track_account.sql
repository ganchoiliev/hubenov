-- 0018: public account tracking — enter the OT (client) code, get every parcel
-- for that account with its status. STATUS ONLY, never PII (§10): no names,
-- phones or street addresses; only public code, status, direction, destination
-- city and last-update time. Mirrors track_public's security model.
create or replace function public.track_account(p_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'public_code', s.public_code,
    'status', s.status,
    'direction', s.direction,
    'updated_at', s.updated_at,
    'receiver_city', s.receiver->>'city'
  ) order by s.created_at desc), '[]'::jsonb)
  from public.shipments s
  join public.profiles p on p.id = s.client_id
  where p.client_code = upper(trim(p_code));
$$;

revoke all on function public.track_account(text) from public;
grant execute on function public.track_account(text) to anon, authenticated;
