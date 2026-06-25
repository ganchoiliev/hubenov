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
