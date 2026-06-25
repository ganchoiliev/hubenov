-- Доставки Хубенов — CLOUD BOOTSTRAP (v9) — fresh project only. Run once.
set check_function_bodies = off;
drop type if exists public.shipment_status cascade;
drop type if exists public.payment_method cascade;
drop type if exists public.invoice_status cascade;
drop type if exists public.payment_status cascade;
drop type if exists public.load_status cascade;
drop type if exists public.tracking_source cascade;
drop type if exists public.tracking_leg cascade;
drop type if exists public.address_kind cascade;
drop type if exists public.parcel_type_code cascade;
drop type if exists public.currency_code cascade;
drop type if exists public.direction_code cascade;
drop type if exists public.country_code cascade;
drop type if exists public.locale_code cascade;
drop type if exists public.user_role cascade;

-- ▼ migrations/0001_init.sql
-- ============================================================================
-- 0001_init — extensions, enums, helper functions (§4)
-- ============================================================================

-- The role helpers below reference public.profiles, which is created in 0002.
-- Allow this forward reference at CREATE time; the bodies only run later, once
-- every table exists. (Same approach pg_dump uses.)
set check_function_bodies = off;

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";         -- case-insensitive client_code

-- ── Enums ──────────────────────────────────────────────────────────────────
create type user_role        as enum ('owner', 'operator', 'client', 'driver');
create type locale_code       as enum ('bg', 'en');
create type country_code      as enum ('GB', 'BG');
create type direction_code    as enum ('UK_BG', 'BG_UK');
create type currency_code     as enum ('GBP', 'EUR', 'BGN');
create type parcel_type_code  as enum ('parcel', 'document', 'pallet', 'food', 'other');
create type address_kind      as enum ('sender', 'receiver');
create type tracking_leg      as enum ('own', 'econt');
create type tracking_source   as enum ('scan', 'manual', 'econt_poll');
create type load_status       as enum ('open', 'departed', 'arrived', 'closed');
create type payment_status    as enum ('unpaid', 'paid', 'partial');
create type invoice_status    as enum ('unpaid', 'paid', 'partial');
create type payment_method    as enum ('cash', 'bank_transfer', 'card_office', 'cod');
create type shipment_status   as enum (
  'draft', 'booked', 'collected_uk', 'at_uk_hub', 'on_load', 'departed_uk',
  'arrived_bg_hub', 'handed_to_econt', 'out_for_delivery', 'delivered',
  'exception', 'returned', 'cancelled'
);

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Role helpers (SECURITY DEFINER → bypass RLS, avoid recursive policies) ──
-- Returns the caller's role from their profile, or null if unauthenticated.
create or replace function public.auth_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

-- owner/operator (and driver, later) are "staff" — full access.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.auth_role() in ('owner', 'operator', 'driver'), false);
$$;

-- The caller's own profile id (used widely in RLS).
create or replace function public.my_profile_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

revoke all on function public.auth_role()     from public;
revoke all on function public.is_staff()      from public;
revoke all on function public.my_profile_id() from public;
grant execute on function public.auth_role()     to authenticated;
grant execute on function public.is_staff()      to authenticated;
grant execute on function public.my_profile_id() to authenticated;

-- ▼ migrations/0002_tables.sql
-- ============================================================================
-- 0002_tables — core schema (§4). Every table: id/created_at/updated_at.
-- ============================================================================

-- ── profiles ───────────────────────────────────────────────────────────────
create table public.profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  role             user_role not null default 'client',
  client_code      citext not null unique,
  full_name        text not null default '',
  phone            text,
  email            text,
  preferred_locale locale_code not null default 'bg',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);

-- ── addresses ──────────────────────────────────────────────────────────────
create table public.addresses (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  country           country_code not null,
  line1             text not null,
  line2             text,
  city              text not null,
  postcode          text not null,
  econt_office_code text,
  is_default        boolean not null default false,
  kind              address_kind not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index addresses_profile_idx on public.addresses(profile_id);

-- ── loads (one van trip — recurring weekly Friday) ──────────────────────────
create table public.loads (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  vehicle_reg         text,
  driver_name         text,
  direction           direction_code not null default 'UK_BG',
  status              load_status not null default 'open',
  scheduled_departure timestamptz not null,
  booking_cutoff      timestamptz not null,
  departed_at         timestamptz,
  arrived_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index loads_status_idx on public.loads(status);

-- ── shipments ──────────────────────────────────────────────────────────────
create table public.shipments (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.profiles(id) on delete restrict,
  public_code    text not null unique,
  awb_barcode    text not null unique,
  sender         jsonb not null,
  receiver       jsonb not null,
  direction      direction_code not null,
  parcel_type    parcel_type_code not null default 'parcel',
  weight_kg      numeric(8,2) not null check (weight_kg > 0),
  length_cm      numeric(8,2) not null default 30,
  width_cm       numeric(8,2) not null default 30,
  height_cm      numeric(8,2) not null default 30,
  declared_value numeric(12,2) not null default 0,
  currency       currency_code not null default 'GBP',
  is_gift        boolean not null default false,
  status         shipment_status not null default 'draft',
  price          numeric(12,2),
  payment_status payment_status not null default 'unpaid',
  load_id        uuid references public.loads(id) on delete set null,
  notes          text,
  created_by     uuid not null references public.profiles(id) on delete restrict,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index shipments_client_idx on public.shipments(client_id);
create index shipments_load_idx   on public.shipments(load_id);
create index shipments_status_idx on public.shipments(status);
create index shipments_awb_idx    on public.shipments(awb_barcode);

-- ── parcels (multi-box support) ─────────────────────────────────────────────
create table public.parcels (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  barcode     text not null unique,
  weight_kg   numeric(8,2) not null check (weight_kg > 0),
  length_cm   numeric(8,2) not null default 30,
  width_cm    numeric(8,2) not null default 30,
  height_cm   numeric(8,2) not null default 30,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index parcels_shipment_idx on public.parcels(shipment_id);

-- ── tracking_events ─────────────────────────────────────────────────────────
create table public.tracking_events (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  leg         tracking_leg not null default 'own',
  status      shipment_status not null,
  location    text,
  note_bg     text,
  note_en     text,
  occurred_at timestamptz not null default now(),
  source      tracking_source not null default 'manual',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tracking_shipment_idx on public.tracking_events(shipment_id, occurred_at);

-- ── courier_shipments (Econt last-mile linkage) ─────────────────────────────
create table public.courier_shipments (
  id             uuid primary key default gen_random_uuid(),
  shipment_id    uuid not null references public.shipments(id) on delete cascade,
  carrier        text not null default 'econt',
  carrier_ref    text,
  label_url      text,
  cod_amount     numeric(12,2),
  last_polled_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index courier_shipment_idx on public.courier_shipments(shipment_id);

-- ── customs_declarations ────────────────────────────────────────────────────
create table public.customs_declarations (
  id                  uuid primary key default gen_random_uuid(),
  shipment_id         uuid not null references public.shipments(id) on delete cascade,
  eori                text,
  invoice_no          text,
  items               jsonb not null default '[]'::jsonb,
  total_value         numeric(12,2) not null default 0,
  currency            currency_code not null default 'GBP',
  is_gift             boolean not null default false,
  gift_relief_applied boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index customs_shipment_idx on public.customs_declarations(shipment_id);

-- ── invoices ────────────────────────────────────────────────────────────────
create table public.invoices (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles(id) on delete restrict,
  shipment_id uuid references public.shipments(id) on delete set null,
  number      text not null unique,
  amount      numeric(12,2) not null,
  currency    currency_code not null default 'GBP',
  status      invoice_status not null default 'unpaid',
  pdf_url     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index invoices_client_idx on public.invoices(client_id);

-- ── payments ────────────────────────────────────────────────────────────────
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  method      payment_method not null,
  amount      numeric(12,2) not null check (amount > 0),
  received_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index payments_invoice_idx on public.payments(invoice_id);

-- ── conversations / messages (realtime) ─────────────────────────────────────
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles(id) on delete cascade,
  subject    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_client_idx on public.conversations(client_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete restrict,
  body            text not null,
  attachments     jsonb not null default '[]'::jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

-- ── pricing_rates (admin-editable) ──────────────────────────────────────────
create table public.pricing_rates (
  id                 uuid primary key default gen_random_uuid(),
  direction          direction_code not null,
  weight_from_kg     numeric(8,2) not null,
  weight_to_kg       numeric(8,2) not null,
  price              numeric(12,2) not null,
  currency           currency_code not null default 'GBP',
  volumetric_divisor integer not null default 5000,
  surcharge_gift     numeric(12,2) not null default 0,
  surcharge_remote   numeric(12,2) not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index pricing_direction_idx on public.pricing_rates(direction, weight_from_kg);

-- ── audit_log (append-only) ─────────────────────────────────────────────────
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  meta       jsonb not null default '{}'::jsonb,
  ip         text,
  at         timestamptz not null default now()
);
create index audit_entity_idx on public.audit_log(entity, entity_id);

-- ── updated_at triggers on every mutable table ──────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','addresses','loads','shipments','parcels','tracking_events',
    'courier_shipments','customs_declarations','invoices','payments',
    'conversations','messages','pricing_rates'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ▼ migrations/0003_rls.sql
-- ============================================================================
-- 0003_rls — Row-Level Security on EVERY table (§1 L, §10).
-- Clients touch only their own rows; staff (owner/operator/driver) touch all.
-- Public PII is never exposed here — track-by-number uses a SECURITY DEFINER
-- RPC (0004) that returns status only.
-- ============================================================================

alter table public.profiles             enable row level security;
alter table public.addresses            enable row level security;
alter table public.loads                enable row level security;
alter table public.shipments            enable row level security;
alter table public.parcels              enable row level security;
alter table public.tracking_events      enable row level security;
alter table public.courier_shipments    enable row level security;
alter table public.customs_declarations enable row level security;
alter table public.invoices             enable row level security;
alter table public.payments             enable row level security;
alter table public.conversations        enable row level security;
alter table public.messages             enable row level security;
alter table public.pricing_rates        enable row level security;
alter table public.audit_log            enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_staff_all on public.profiles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── addresses ───────────────────────────────────────────────────────────────
create policy addresses_owner on public.addresses for all to authenticated
  using (profile_id = public.my_profile_id() or public.is_staff())
  with check (profile_id = public.my_profile_id() or public.is_staff());

-- ── loads (staff only) ──────────────────────────────────────────────────────
create policy loads_staff on public.loads for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── shipments ───────────────────────────────────────────────────────────────
create policy shipments_select on public.shipments for select to authenticated
  using (client_id = public.my_profile_id() or public.is_staff());
-- Clients may create their own (draft) shipment; staff may create any.
create policy shipments_insert on public.shipments for insert to authenticated
  with check (
    public.is_staff()
    or (client_id = public.my_profile_id() and created_by = public.my_profile_id())
  );
-- Clients may edit only their own DRAFT; staff may edit anything.
create policy shipments_update on public.shipments for update to authenticated
  using (public.is_staff() or (client_id = public.my_profile_id() and status = 'draft'))
  with check (public.is_staff() or (client_id = public.my_profile_id() and status = 'draft'));
create policy shipments_delete_staff on public.shipments for delete to authenticated
  using (public.is_staff());

-- ── parcels (scoped via parent shipment) ────────────────────────────────────
create policy parcels_select on public.parcels for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.shipments s
               where s.id = parcels.shipment_id and s.client_id = public.my_profile_id())
  );
create policy parcels_write_staff on public.parcels for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── tracking_events (client read own; staff write) ──────────────────────────
create policy tracking_select on public.tracking_events for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.shipments s
               where s.id = tracking_events.shipment_id and s.client_id = public.my_profile_id())
  );
create policy tracking_write_staff on public.tracking_events for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── courier_shipments / customs (staff; client may read own) ────────────────
create policy courier_select on public.courier_shipments for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.shipments s
               where s.id = courier_shipments.shipment_id and s.client_id = public.my_profile_id())
  );
create policy courier_write_staff on public.courier_shipments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy customs_select on public.customs_declarations for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.shipments s
               where s.id = customs_declarations.shipment_id and s.client_id = public.my_profile_id())
  );
create policy customs_write_staff on public.customs_declarations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── invoices (client read own; staff manage) ────────────────────────────────
create policy invoices_select on public.invoices for select to authenticated
  using (client_id = public.my_profile_id() or public.is_staff());
create policy invoices_write_staff on public.invoices for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── payments (staff only) ───────────────────────────────────────────────────
create policy payments_staff on public.payments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── conversations / messages ────────────────────────────────────────────────
create policy conversations_access on public.conversations for all to authenticated
  using (client_id = public.my_profile_id() or public.is_staff())
  with check (client_id = public.my_profile_id() or public.is_staff());

create policy messages_select on public.messages for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.conversations c
               where c.id = messages.conversation_id and c.client_id = public.my_profile_id())
  );
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = public.my_profile_id()
    and (
      public.is_staff()
      or exists (select 1 from public.conversations c
                 where c.id = messages.conversation_id and c.client_id = public.my_profile_id())
    )
  );

-- ── pricing_rates (readable for quotes; writable by staff) ──────────────────
create policy pricing_select on public.pricing_rates for select to anon, authenticated
  using (true);
create policy pricing_write_staff on public.pricing_rates for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── audit_log (append-only: insert by authenticated, read by staff) ─────────
create policy audit_insert on public.audit_log for insert to authenticated
  with check (true);
create policy audit_select_staff on public.audit_log for select to authenticated
  using (public.is_staff());
-- No update/delete policies → those operations are denied for everyone.

-- ▼ migrations/0004_functions.sql
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

-- ▼ migrations/0005_fixes.sql
-- ============================================================================
-- 0005_fixes — issues found during end-to-end verification.
-- (1) Conversations: one per client. StrictMode's double mount + no unique
--     constraint created duplicates, which later broke .maybeSingle() and
--     surfaced as a random "Възникна грешка" toast. Dedupe, then enforce it.
-- ============================================================================

-- Repoint messages from duplicate conversations to the kept (oldest) one.
with ranked as (
  select id, client_id,
         first_value(id) over (partition by client_id order by created_at, id) as keep_id
  from public.conversations
)
update public.messages m
set conversation_id = r.keep_id
from ranked r
where m.conversation_id = r.id and r.id <> r.keep_id;

-- Delete the duplicates, keeping the oldest per client.
with ranked as (
  select id, row_number() over (partition by client_id order by created_at, id) as rn
  from public.conversations
)
delete from public.conversations c
using ranked r
where c.id = r.id and r.rn > 1;

-- Enforce one conversation per client (guarded so re-runs / fresh resets pass).
do $$
begin
  alter table public.conversations
    add constraint conversations_client_unique unique (client_id);
exception when duplicate_object then null;
end $$;

-- ▼ migrations/0006_short_codes.sql
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

-- ▼ migrations/0007_company_settings.sql
-- ============================================================================
-- 0007_company_settings — single-row config the owner edits in Operator →
-- Settings: company EORI (customs), label size, and print method. Kept generic
-- so printing stays model-agnostic (PDF works on any printer; QZ later).
-- ============================================================================
create table if not exists public.company_settings (
  id             int primary key default 1,
  company_name   text not null default 'Доставки Хубенов',
  eori           text,
  label_size     text not null default 'A6',      -- 'A6' | '100x150' | 'A4'
  print_method   text not null default 'browser', -- 'browser' | 'qz'
  return_address text,
  updated_at     timestamptz not null default now(),
  constraint company_settings_singleton check (id = 1)
);

alter table public.company_settings enable row level security;

-- Staff manage it; nothing public needs it yet (label-render reads it server-side).
do $$
begin
  create policy company_settings_staff on public.company_settings for all to authenticated
    using (public.is_staff()) with check (public.is_staff());
exception when duplicate_object then null;
end $$;

insert into public.company_settings (id) values (1) on conflict (id) do nothing;

-- ▼ migrations/0008_real_rates_realtime.sql
-- ============================================================================
-- 0008 — real, competitive diaspora-van pricing + broadcast more tables so the
-- UI updates live (no manual refresh). Run AFTER 0007.
--
-- Rates benchmarked against UK→BG diaspora/consolidated van couriers (much
-- cheaper than express couriers). The owner can fine-tune in Operator → Settings.
-- ============================================================================
delete from public.pricing_rates;
insert into public.pricing_rates
  (direction, weight_from_kg, weight_to_kg, price, currency, volumetric_divisor, surcharge_gift, surcharge_remote) values
  ('UK_BG', 0,  2,    7, 'GBP', 5000, 0, 6),
  ('UK_BG', 2,  5,   11, 'GBP', 5000, 0, 6),
  ('UK_BG', 5,  10,  16, 'GBP', 5000, 0, 6),
  ('UK_BG', 10, 20,  26, 'GBP', 5000, 0, 6),
  ('UK_BG', 20, 30,  38, 'GBP', 5000, 0, 6),
  ('UK_BG', 30, 1000, 52, 'GBP', 5000, 0, 6),
  ('BG_UK', 0,  2,    9, 'GBP', 5000, 0, 6),
  ('BG_UK', 2,  5,   13, 'GBP', 5000, 0, 6),
  ('BG_UK', 5,  10,  19, 'GBP', 5000, 0, 6),
  ('BG_UK', 10, 20,  30, 'GBP', 5000, 0, 6),
  ('BG_UK', 20, 30,  42, 'GBP', 5000, 0, 6),
  ('BG_UK', 30, 1000, 58, 'GBP', 5000, 0, 6);

-- Live updates: broadcast row changes for these tables too.
-- (shipments / tracking_events / messages were added in 0004.)
do $$ begin alter publication supabase_realtime add table public.loads;            exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.invoices;         exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.pricing_rates;    exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.company_settings; exception when others then null; end $$;

-- ▼ migrations/0009_walkin_clients.sql
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

-- ▼ seed.sql
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

