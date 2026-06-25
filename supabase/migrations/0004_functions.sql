-- ============================================================================
-- 0004_functions — new-user provisioning, code generation, public tracking,
-- append-only audit, realtime (§4, §6, §10).
-- ============================================================================

-- ── client_code generator (HB-XXXX, unambiguous alphabet) ───────────────────
create or replace function public.gen_client_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

-- ── Auto-create a profile on signup (phone-OTP primary) ─────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role, client_code, full_name, phone, email, preferred_locale)
  values (
    new.id,
    'client',
    public.gen_client_code(),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    new.email,
    coalesce((new.raw_user_meta_data->>'preferred_locale')::locale_code, 'bg')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── public_code / awb auto-fill on shipment insert ──────────────────────────
create sequence if not exists public.shipment_seq start 1;

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

create trigger fill_shipment_codes_trg
  before insert on public.shipments
  for each row execute function public.fill_shipment_codes();

-- ── Public track-by-number — STATUS ONLY, never PII (§10) ───────────────────
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
  where s.public_code = upper(trim(p_code)) or s.awb_barcode = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.track_public(text) from public;
grant execute on function public.track_public(text) to anon, authenticated;

-- ── Append-only guard on audit_log (defense in depth beyond RLS) ────────────
create or replace function public.block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

create trigger audit_no_update before update on public.audit_log
  for each row execute function public.block_mutation();
create trigger audit_no_delete before delete on public.audit_log
  for each row execute function public.block_mutation();

-- ── Realtime: messaging + live status (§2) ──────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.tracking_events;
alter publication supabase_realtime add table public.shipments;
