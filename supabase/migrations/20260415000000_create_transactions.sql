-- ─────────────────────────────────────────────────────────────────────────────
-- Transactions table
-- ─────────────────────────────────────────────────────────────────────────────

-- Enums
DO $$ BEGIN
  CREATE TYPE public.transaction_category AS ENUM (
    'frais_inscription',
    'loyer',
    'salaire_coach',
    'materiel',
    'cotisation',
    'fournitures',
    'transport',
    'evenement',
    'autres'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  category    public.transaction_category NOT NULL,
  type        public.transaction_type NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_transactions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_transactions_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
