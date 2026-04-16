-- Fix RLS policies: Change from RESTRICTIVE to PERMISSIVE (default)
-- The issue is that all policies are RESTRICTIVE which requires ALL to pass
-- PERMISSIVE (default) means ANY policy can grant access

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can insert player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can update player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- SELECT policies (PERMISSIVE - any matching policy grants access)
-- Everyone can view their own profile
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
USING (public.is_admin(auth.uid()));

-- Coaches can view all player profiles
CREATE POLICY "Coaches can view player profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'player' AND public.is_coach(auth.uid()));

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
WITH CHECK (role = 'player' AND public.is_coach(auth.uid()));

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
USING (user_id != auth.uid() AND public.is_admin(auth.uid()));