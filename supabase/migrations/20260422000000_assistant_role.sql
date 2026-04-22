-- ─────────────────────────────────────────────────────────────────────────────
-- Add 'assistant' role
-- Assistants get the same DB access as admins; branch isolation is enforced
-- at the application layer (BranchContext + query filters).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the old role check constraint and recreate it with 'assistant' included
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'coach', 'player', 'assistant'));

-- 2. Expand is_admin() so every existing RLS policy automatically covers assistants
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = user_uuid
      AND role IN ('admin', 'assistant')
  );
$$;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
