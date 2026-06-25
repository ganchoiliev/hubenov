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
