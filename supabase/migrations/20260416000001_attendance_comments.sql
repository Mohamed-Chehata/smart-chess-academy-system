-- =============================================================================
-- Attendance records + Monthly player progress comments
-- =============================================================================

-- ─── attendance ───────────────────────────────────────────────────────────────
-- One row per player per session date. is_present = false records absences.
CREATE TABLE IF NOT EXISTS public.attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  is_present   BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  recorded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, session_date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on attendance"
  ON public.attendance FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Coaches full access on attendance"
  ON public.attendance FOR ALL TO authenticated
  USING (public.is_coach(auth.uid()))
  WITH CHECK (public.is_coach(auth.uid()));

-- ─── player_comments ──────────────────────────────────────────────────────────
-- One comment per player per month (upserted). Tracks monthly progress notes.
CREATE TABLE IF NOT EXISTS public.player_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month      DATE NOT NULL,   -- always first day of the month
  comment    TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, month)
);

CREATE OR REPLACE FUNCTION public.update_player_comments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_player_comments_updated_at ON public.player_comments;
CREATE TRIGGER trg_player_comments_updated_at
  BEFORE UPDATE ON public.player_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_player_comments_updated_at();

ALTER TABLE public.player_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on player_comments"
  ON public.player_comments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Coaches full access on player_comments"
  ON public.player_comments FOR ALL TO authenticated
  USING (public.is_coach(auth.uid()))
  WITH CHECK (public.is_coach(auth.uid()));

-- ─── Grants ───────────────────────────────────────────────────────────────────
GRANT ALL ON public.attendance       TO authenticated, service_role;
GRANT ALL ON public.player_comments  TO authenticated, service_role;
GRANT SELECT ON public.attendance      TO anon;
GRANT SELECT ON public.player_comments TO anon;

NOTIFY pgrst, 'reload schema';
