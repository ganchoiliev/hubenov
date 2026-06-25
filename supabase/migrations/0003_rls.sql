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
