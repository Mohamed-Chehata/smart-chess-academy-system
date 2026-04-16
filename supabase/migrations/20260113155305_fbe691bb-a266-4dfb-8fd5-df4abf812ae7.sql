-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view own profile and players" ON public.profiles;
DROP POLICY IF EXISTS "Players can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can insert player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can update player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create proper PERMISSIVE policies for SELECT
-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() AND admin_check.role = 'admin'
  )
);

-- Coaches can view all player profiles
CREATE POLICY "Coaches can view player profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'player' AND
  EXISTS (
    SELECT 1 FROM public.profiles coach_check 
    WHERE coach_check.user_id = auth.uid() AND coach_check.role = 'coach'
  )
);

-- Create proper PERMISSIVE policies for INSERT
-- Admins can insert any profile
CREATE POLICY "Admins can insert any profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() AND admin_check.role = 'admin'
  )
);

-- Coaches can insert player profiles only
CREATE POLICY "Coaches can insert player profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'player' AND
  EXISTS (
    SELECT 1 FROM public.profiles coach_check 
    WHERE coach_check.user_id = auth.uid() AND coach_check.role = 'coach'
  )
);

-- Create proper PERMISSIVE policies for UPDATE
-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() AND admin_check.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() AND admin_check.role = 'admin'
  )
);

-- Coaches can update player profiles
CREATE POLICY "Coaches can update player profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  role = 'player' AND
  EXISTS (
    SELECT 1 FROM public.profiles coach_check 
    WHERE coach_check.user_id = auth.uid() AND coach_check.role = 'coach'
  )
)
WITH CHECK (
  role = 'player' AND
  EXISTS (
    SELECT 1 FROM public.profiles coach_check 
    WHERE coach_check.user_id = auth.uid() AND coach_check.role = 'coach'
  )
);

-- Create proper PERMISSIVE policies for DELETE
-- Admins can delete any profile (except their own for safety)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  user_id != auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() AND admin_check.role = 'admin'
  )
);