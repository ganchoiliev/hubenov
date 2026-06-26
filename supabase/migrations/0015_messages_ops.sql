-- ============================================================================
-- 0015 — operator messaging: make client messages answerable.
--  • conversations.operator_last_read_at / client_last_read_at — per-side read
--    marks that drive the unread badges (read-not-store: a side is "caught up"
--    when its mark is >= the latest message from the other side).
--  • messages → bump conversations.updated_at on insert, so the operator inbox
--    sorts by real activity (the set_updated_at trigger only fires on UPDATE).
--  • op_unread_count() / client_unread_count() — cheap RPCs for the nav badges.
-- Idempotent.
-- ============================================================================

alter table public.conversations
  add column if not exists operator_last_read_at timestamptz,
  add column if not exists client_last_read_at   timestamptz;

-- ── bump conversation on new message (drives inbox ordering) ─────────────────
create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set updated_at = now()
    where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- ── unread counters (latest-message semantics, matches the inbox dot) ────────
-- A conversation is unread by the operator when its newest message was sent by
-- the client and is newer than operator_last_read_at. Staff-only; 0 otherwise.
create or replace function public.op_unread_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select case when public.is_staff() then (
    select count(*)::int
    from public.conversations c
    cross join lateral (
      select m.sender_id, m.created_at
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) last
    where last.sender_id = c.client_id
      and last.created_at > coalesce(c.operator_last_read_at, '-infinity'::timestamptz)
  ) else 0 end;
$$;

-- Mirror for the client: unread when the newest message is from staff (i.e. not
-- the client themselves) and is newer than client_last_read_at.
create or replace function public.client_unread_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select count(*)::int
    from public.conversations c
    cross join lateral (
      select m.sender_id, m.created_at
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) last
    where c.client_id = public.my_profile_id()
      and last.sender_id <> c.client_id
      and last.created_at > coalesce(c.client_last_read_at, '-infinity'::timestamptz)
  ), 0);
$$;

revoke all on function public.op_unread_count()     from public;
revoke all on function public.client_unread_count() from public;
grant execute on function public.op_unread_count()     to authenticated;
grant execute on function public.client_unread_count() to authenticated;

-- ── live updates: conversations (read-marks/bump) + profiles (new clients,
-- booked-parcel awareness on the operator dashboard). messages is already in
-- the publication (0004). Guarded so re-running is a no-op. ──────────────────
do $$ begin alter publication supabase_realtime add table public.conversations; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.profiles;      exception when others then null; end $$;
