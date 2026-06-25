-- ============================================================================
-- Repair demo logins on Supabase Cloud (run ONCE in SQL Editor).
-- GoTrue scans every token column into a non-null Go string, so any NULL left
-- by the raw seed makes sign-in fail (401/500). This resets the password,
-- confirms the email, and forces ALL token columns to '' (needs pgcrypto).
-- ============================================================================
update auth.users set
  encrypted_password          = crypt('password123', gen_salt('bf')),
  email_confirmed_at          = now(),
  confirmation_token          = '',
  recovery_token              = '',
  email_change_token_new      = '',
  email_change_token_current  = '',
  email_change                = '',
  phone_change                = '',
  phone_change_token          = '',
  reauthentication_token      = ''
where email in ('owner@hubenov.co.uk','operator@hubenov.co.uk','client@hubenov.co.uk');

-- Verify: all three should show every token column as '' (empty), not NULL.
select email,
       confirmation_token is null      as conf_null,
       recovery_token is null          as rec_null,
       reauthentication_token is null  as reauth_null,
       phone_change is null            as phone_null
from auth.users
where email like '%@hubenov.co.uk' order by email;
