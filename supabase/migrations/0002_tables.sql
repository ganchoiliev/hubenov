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
