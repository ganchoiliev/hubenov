-- ============================================================================
-- 0018 — invoice "void" status. Accounting-safe cancel: keeps the invoice and
-- its number (no gap in the sequence), marks it void, and the app excludes void
-- invoices from revenue/outstanding totals. Idempotent.
-- Note: ALTER TYPE ... ADD VALUE must be committed before the value is used;
-- run this on its own (the SQL editor autocommits).
-- ============================================================================
alter type public.invoice_status add value if not exists 'void';
