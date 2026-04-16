-- Drop and recreate the self-view policy to avoid circular dependency
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Simple policy: authenticated users can always view their own profile by user_id match
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());