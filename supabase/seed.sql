-- ============================================================================
-- seed.sql — reproducible demo data (§11). Runs on `supabase db reset`.
-- Pricing + a weekly load always seed. Demo auth accounts/shipments are in a
-- guarded block so a GoTrue version mismatch can't break the whole reset.
-- TODO(owner): replace placeholder pricing with real rates via the admin editor.
-- ============================================================================

-- ── Pricing bands (placeholder — mirror src/lib/rates.ts) ───────────────────
insert into public.pricing_rates (direction, weight_from_kg, weight_to_kg, price, currency, volumetric_divisor, surcharge_gift, surcharge_remote) values
  ('UK_BG', 0, 2, 7, 'GBP', 5000, 0, 6),
  ('UK_BG', 2, 5, 11, 'GBP', 5000, 0, 6),
  ('UK_BG', 5, 10, 16, 'GBP', 5000, 0, 6),
  ('UK_BG', 10, 20, 26, 'GBP', 5000, 0, 6),
  ('UK_BG', 20, 30, 38, 'GBP', 5000, 0, 6),
  ('UK_BG', 30, 1000, 52, 'GBP', 5000, 0, 6),
  ('BG_UK', 0, 2, 9, 'GBP', 5000, 0, 6),
  ('BG_UK', 2, 5, 13, 'GBP', 5000, 0, 6),
  ('BG_UK', 5, 10, 19, 'GBP', 5000, 0, 6),
  ('BG_UK', 10, 20, 30, 'GBP', 5000, 0, 6),
  ('BG_UK', 20, 30, 42, 'GBP', 5000, 0, 6),
  ('BG_UK', 30, 1000, 58, 'GBP', 5000, 0, 6);

-- ── Next Friday load ─────────────────────────────────────────────────────────
do $$
declare
  dep timestamptz;
begin
  dep := date_trunc('day', now())
         + (((5 - extract(dow from now())::int + 7) % 7) || ' days')::interval
         + interval '14 hours';
  if dep <= now() then dep := dep + interval '7 days'; end if;

  insert into public.loads (code, vehicle_reg, driver_name, direction, status, scheduled_departure, booking_cutoff)
  values ('LD-' || to_char(dep, 'YYYYMMDD'), 'MA70 HBN', 'И. Хубенов', 'UK_BG', 'open', dep, dep - interval '24 hours')
  on conflict (code) do nothing;
exception when others then
  raise notice 'seed: load skipped (%).', sqlerrm;
end $$;

-- ── Demo auth accounts + shipments + tracking (guarded) ─────────────────────
-- Local-dev convenience: email/password login. Production uses phone OTP.
--   owner@hubenov.co.uk / operator@hubenov.co.uk / client@hubenov.co.uk
--   password: password123
do $$
declare
  owner_uid    uuid := '00000000-0000-0000-0000-000000000001';
  operator_uid uuid := '00000000-0000-0000-0000-000000000002';
  client_uid   uuid := '00000000-0000-0000-0000-000000000003';
  client_pid   uuid;
  ship1        uuid;
  ship2        uuid;
  load_id      uuid;
  inv_id       uuid;
begin
  -- Create auth users (idempotent on id). The on_auth_user_created trigger
  -- auto-creates a matching profile row.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', owner_uid, 'authenticated', 'authenticated',
      'owner@hubenov.co.uk', crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Иван Хубенов","preferred_locale":"bg"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', operator_uid, 'authenticated', 'authenticated',
      'operator@hubenov.co.uk', crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Оператор Манчестър","preferred_locale":"bg"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', client_uid, 'authenticated', 'authenticated',
      'client@hubenov.co.uk', crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Мария Петрова","preferred_locale":"bg"}', now(), now())
  on conflict (id) do nothing;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (owner_uid::text, owner_uid, json_build_object('sub', owner_uid::text, 'email', 'owner@hubenov.co.uk'), 'email', now(), now(), now()),
    (operator_uid::text, operator_uid, json_build_object('sub', operator_uid::text, 'email', 'operator@hubenov.co.uk'), 'email', now(), now(), now()),
    (client_uid::text, client_uid, json_build_object('sub', client_uid::text, 'email', 'client@hubenov.co.uk'), 'email', now(), now(), now())
  on conflict do nothing;

  -- GoTrue scans ALL these token columns into non-null strings; any NULL left
  -- by a raw auth.users insert breaks sign-in (401/500). Force them all to ''.
  update auth.users set
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    email_change = coalesce(email_change, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, '')
  where id in (owner_uid, operator_uid, client_uid);

  -- Promote roles / set friendly codes on the trigger-created profiles.
  update public.profiles set role='owner',    client_code='HB-OWNR', full_name='Иван Хубенов',     phone='+447895909915' where user_id=owner_uid;
  update public.profiles set role='operator', client_code='HB-OPER', full_name='Оператор Манчестър', phone='+447895909915' where user_id=operator_uid;
  update public.profiles set role='client',   client_code='HB-7F3K', full_name='Мария Петрова',     phone='+447700900123' where user_id=client_uid;

  select id into client_pid from public.profiles where user_id = client_uid;
  select id into load_id from public.loads order by scheduled_departure desc limit 1;

  -- Demo shipment #1 — in transit on the load
  insert into public.shipments (client_id, public_code, awb_barcode, sender, receiver, direction,
      parcel_type, weight_kg, length_cm, width_cm, height_cm, declared_value, currency, is_gift,
      status, price, payment_status, load_id, created_by)
  values (client_pid, 'HB-2406-0001', 'HBN000001',
    '{"name":"Мария Петрова","phone":"+447700900123","line1":"12 Liverpool Road","city":"Manchester","postcode":"M30 7JA","country":"GB"}',
    '{"name":"Георги Петров","phone":"+359888123456","line1":"ул. Цар Симеон 4","city":"София","postcode":"1000","country":"BG","econt_office_code":"1010"}',
    'UK_BG', 'parcel', 6.5, 40, 30, 25, 80, 'GBP', true, 'departed_uk', 28, 'paid', load_id, client_pid)
  returning id into ship1;

  -- Demo shipment #2 — just booked
  insert into public.shipments (client_id, public_code, awb_barcode, sender, receiver, direction,
      parcel_type, weight_kg, length_cm, width_cm, height_cm, declared_value, currency, is_gift,
      status, price, payment_status, created_by)
  values (client_pid, 'HB-2406-0002', 'HBN000002',
    '{"name":"Мария Петрова","phone":"+447700900123","line1":"12 Liverpool Road","city":"Manchester","postcode":"M30 7JA","country":"GB"}',
    '{"name":"Стоянка Илиева","phone":"+359877654321","line1":"бул. Мария Луиза 21","city":"Пловдив","postcode":"4000","country":"BG"}',
    'UK_BG', 'food', 3.0, 30, 20, 20, 25, 'GBP', true, 'booked', 18, 'unpaid', client_pid)
  returning id into ship2;

  -- Tracking history for #1 (public track-by-number shows this, status only)
  insert into public.tracking_events (shipment_id, leg, status, location, note_bg, note_en, occurred_at, source) values
    (ship1, 'own', 'booked',       'Manchester', 'Пратката е заявена',          'Shipment booked',        now() - interval '4 days', 'manual'),
    (ship1, 'own', 'collected_uk', 'Manchester', 'Приета в офиса',              'Collected at counter',   now() - interval '3 days', 'scan'),
    (ship1, 'own', 'at_uk_hub',    'Manchester', 'В склада в Манчестър',        'At Manchester hub',      now() - interval '2 days', 'scan'),
    (ship1, 'own', 'on_load',      'Manchester', 'Натоварена на буса',          'Loaded on the van',      now() - interval '1 day',  'scan'),
    (ship1, 'own', 'departed_uk',  'Dover',      'Бусът тръгна за България',     'Departed the UK',        now() - interval '12 hours','manual');
  insert into public.tracking_events (shipment_id, leg, status, note_bg, note_en, occurred_at, source) values
    (ship2, 'own', 'booked', 'Пратката е заявена', 'Shipment booked', now() - interval '2 hours', 'manual');

  -- Invoice + recorded payment for #1
  insert into public.invoices (client_id, shipment_id, number, amount, currency, status)
  values (client_pid, ship1, 'INV-2406-0001', 28, 'GBP', 'paid') returning id into inv_id;
  insert into public.payments (invoice_id, method, amount, recorded_by)
  values (inv_id, 'cash', 28, (select id from public.profiles where user_id = operator_uid));

  raise notice 'seed: demo accounts ready (owner/operator/client @hubenov.co.uk / password123).';
exception when others then
  raise notice 'seed: demo account block skipped (%). Pricing + load still seeded; create accounts via signup.', sqlerrm;
end $$;
