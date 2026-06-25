-- ============================================================================
-- 0011 — notification preferences.
--  • company_settings.notify_status_emails — global master switch (owner can
--    pause ALL status-change emails from Operator → Settings).
--  • profiles.notify_email — per-client opt-out (operator toggles on the client
--    record). A client is emailed only when BOTH are true.
-- Both default true; idempotent.
-- ============================================================================
alter table public.company_settings
  add column if not exists notify_status_emails boolean not null default true;

alter table public.profiles
  add column if not exists notify_email boolean not null default true;
