-- ============================================================================
-- 0009 — walk-in clients. An operator can create a client at intake without the
-- customer ever having an account: user_id becomes nullable, client_code (ОТ)
-- auto-generates, and when the customer LATER signs up with the same phone,
-- their walk-in profile (and all its shipments) is linked automatically.
-- ============================================================================
alter table public.profiles alter column user_id drop not null;
alter table public.profiles alter column client_code set default public.gen_client_code();

-- On signup: link an existing walk-in profile by phone (last 9 digits), else create.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  v_id uuid;
begin
  if length(v_phone) >= 9 then
    select id into v_id
    from public.profiles
    where user_id is null
      and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9) = right(v_phone, 9)
    order by created_at
    limit 1;
  end if;

  if v_id is not null then
    update public.profiles
      set user_id = new.id, email = coalesce(email, new.email)
    where id = v_id;
  else
    insert into public.profiles (user_id, role, client_code, full_name, phone, email, preferred_locale)
    values (
      new.id, 'client', public.gen_client_code(),
      coalesce(new.raw_user_meta_data->>'full_name', ''), new.phone, new.email,
      coalesce((new.raw_user_meta_data->>'preferred_locale')::locale_code, 'bg')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
