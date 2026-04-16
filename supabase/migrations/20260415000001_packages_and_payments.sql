-- =============================================================================
-- Packages, Student-Package assignments, Student payment tracking
-- =============================================================================

-- ─── packages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  price       NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT packages_date_order CHECK (end_date >= start_date)
);

CREATE OR REPLACE FUNCTION public.update_packages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_packages_updated_at ON public.packages;
CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_packages_updated_at();

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on packages"
  ON public.packages FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Coaches can view packages"
  ON public.packages FOR SELECT TO authenticated
  USING (public.is_coach(auth.uid()));

-- ─── student_packages ─────────────────────────────────────────────────────────
-- One row per student-package link. A student may have AT MOST ONE is_active=true row.
CREATE TABLE IF NOT EXISTS public.student_packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id  UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce "one active package per student" at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS student_packages_one_active_per_student
  ON public.student_packages (student_id)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.update_student_packages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_student_packages_updated_at ON public.student_packages;
CREATE TRIGGER trg_student_packages_updated_at
  BEFORE UPDATE ON public.student_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_student_packages_updated_at();

ALTER TABLE public.student_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on student_packages"
  ON public.student_packages FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Coaches can view student_packages"
  ON public.student_packages FOR SELECT TO authenticated
  USING (public.is_coach(auth.uid()));

-- ─── student_payments ─────────────────────────────────────────────────────────
-- One row per (student, billing_period). billing_period = first day of the month.
-- Created when admin marks a student as "Paid"; deleted when marked "Unpaid".
CREATE TABLE IF NOT EXISTS public.student_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  billing_period    DATE NOT NULL,
  payment_frequency TEXT NOT NULL
                    CHECK (payment_frequency IN ('monthly', 'weekly', 'package')),
  amount            NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  is_paid           BOOLEAN NOT NULL DEFAULT false,
  paid_at           TIMESTAMPTZ,
  transaction_id    UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  package_id        UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, billing_period)
);

CREATE OR REPLACE FUNCTION public.update_student_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_student_payments_updated_at ON public.student_payments;
CREATE TRIGGER trg_student_payments_updated_at
  BEFORE UPDATE ON public.student_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_student_payments_updated_at();

ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on student_payments"
  ON public.student_payments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Coaches can view student_payments"
  ON public.student_payments FOR SELECT TO authenticated
  USING (public.is_coach(auth.uid()));
