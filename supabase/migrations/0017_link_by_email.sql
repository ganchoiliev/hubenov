-- ============================================================================
-- 0017 — email-aware account linking. With email-OTP login live, a customer the
-- operator pre-registered with an EMAIL (walk-in, no account yet) must link to
-- that existing profile on first sign-in — not spawn a duplicate. 0009 only
-- linked by phone; this adds an email fallback. Idempotent (create or replace).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  v_email text := lower(trim(coalesce(new.email, '')));
  v_id uuid;
begin
  -- 1) link an existing walk-in profile by phone (last 9 digits)
  if length(v_phone) >= 9 then
    select id into v_id
    from public.profiles
    where user_id is null
      and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9) = right(v_phone, 9)
    order by created_at
    limit 1;
  end if;

  -- 2) else link by email (case-insensitive) — pre-registered email clients
  if v_id is null and v_email <> '' then
    select id into v_id
    from public.profiles
    where user_id is null
      and lower(email) = v_email
    order by created_at
    limit 1;
  end if;

  if v_id is not null then
    update public.profiles
      set user_id = new.id,
          email   = coalesce(email, new.email),
          phone   = coalesce(phone, new.phone)
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
