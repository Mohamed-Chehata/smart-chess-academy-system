-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can insert player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can update player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create security definer function to get user role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
$$;

-- Create security definer function to check if user is coach
CREATE OR REPLACE FUNCTION public.is_coach(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'coach'
  );
$$;

-- SELECT policies
-- Everyone can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all profiles (using security definer function)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Coaches can view player profiles
CREATE POLICY "Coaches can view player profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'player' AND public.is_coach(auth.uid())
);

-- INSERT policies
-- Admins can insert any profile
CREATE POLICY "Admins can insert any profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Coaches can insert player profiles only
CREATE POLICY "Coaches can insert player profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'player' AND public.is_coach(auth.uid())
);

-- UPDATE policies
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
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Coaches can update player profiles
CREATE POLICY "Coaches can update player profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (role = 'player' AND public.is_coach(auth.uid()))
WITH CHECK (role = 'player' AND public.is_coach(auth.uid()));

-- DELETE policies
-- Admins can delete any profile except their own
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  user_id != auth.uid() AND public.is_admin(auth.uid())
);