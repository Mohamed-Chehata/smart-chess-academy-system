-- ─────────────────────────────────────────────────────────────────────────────
-- Transfer type: extend transaction_type enum, make category nullable,
-- add from_account / to_account columns.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add 'transfer' value to the transaction_type enum (idempotent)
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'transfer';

-- 2. Make category nullable so transfer rows can omit it
ALTER TABLE public.transactions ALTER COLUMN category DROP NOT NULL;

-- 3. Add transfer-specific columns (idempotent via IF NOT EXISTS)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS from_account TEXT,
  ADD COLUMN IF NOT EXISTS to_account   TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
