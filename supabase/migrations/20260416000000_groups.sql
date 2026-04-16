-- =============================================================================
-- Groups, Group-Coach assignments, group_id on profiles
-- =============================================================================

-- ─── groups ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  description TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.update_groups_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_groups_updated_at ON public.groups;
CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_groups_updated_at();

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on groups"
  ON public.groups FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Coaches can view groups"
  ON public.groups FOR SELECT TO authenticated
  USING (public.is_coach(auth.uid()));

-- ─── group_coaches ─────────────────────────────────────────────────────────────
-- Many-to-many: one group can have multiple coaches
CREATE TABLE IF NOT EXISTS public.group_coaches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  coach_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, coach_id)
);

ALTER TABLE public.group_coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on group_coaches"
  ON public.group_coaches FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Coaches can view their own group_coaches"
  ON public.group_coaches FOR SELECT TO authenticated
  USING (public.is_coach(auth.uid()));

-- ─── Add group_id to profiles ─────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- ─── Grants ───────────────────────────────────────────────────────────────────
GRANT ALL ON public.groups         TO authenticated, service_role;
GRANT ALL ON public.group_coaches  TO authenticated, service_role;
GRANT SELECT ON public.groups        TO anon;
GRANT SELECT ON public.group_coaches TO anon;

NOTIFY pgrst, 'reload schema';
