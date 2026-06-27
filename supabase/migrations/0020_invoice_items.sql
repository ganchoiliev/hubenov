-- 0020: invoice line items.
--
-- Optional per-invoice breakdown stored as JSON: an array of
-- { description: text, amount: number } rows. The invoice's `amount` column
-- stays authoritative (sum of the items, or a manual figure for older/legacy
-- invoices), so totals, dashboards and COD math keep reading a single number.
-- Nullable + idempotent → existing invoices (items = null) render unchanged
-- from `amount` everywhere (list, PDF, account view).
alter table public.invoices add column if not exists items jsonb;
