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
