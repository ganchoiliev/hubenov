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
