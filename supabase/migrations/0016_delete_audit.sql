-- ============================================================================
-- 0016 — delete audit trail (the "black box recorder").
-- Operators may hard-delete clients/parcels/invoices/loads. Before any such row
-- disappears, snapshot it into audit_log: who deleted what, when, and the full
-- row as jsonb — so a fat-finger is reconstructable and money records leave a
-- trace. Server-side (A.N.T.): a trigger, not client code, so it can't be
-- bypassed. audit_log stays append-only (0003: no update/delete policy).
-- Idempotent.
-- ============================================================================

create or replace function public.audit_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (public.my_profile_id(), 'delete', tg_table_name, old.id, to_jsonb(old));
  return old;
end $$;

do $$
declare t text;
begin
  foreach t in array array['shipments', 'invoices', 'profiles', 'loads'] loop
    execute format('drop trigger if exists audit_delete_%1$s on public.%1$I;', t);
    execute format(
      'create trigger audit_delete_%1$s before delete on public.%1$I
         for each row execute function public.audit_delete();', t);
  end loop;
end $$;
