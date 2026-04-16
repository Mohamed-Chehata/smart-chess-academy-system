-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS memo TEXT;

-- Drop existing RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can update player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can insert player profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- CREATE PERMISSIVE SELECT POLICIES
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Coaches can view player profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING ((role = 'player') AND is_coach(auth.uid()));

-- CREATE PERMISSIVE UPDATE POLICIES
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Coaches can update player profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING ((role = 'player') AND is_coach(auth.uid()))
WITH CHECK ((role = 'player') AND is_coach(auth.uid()));

-- CREATE PERMISSIVE INSERT POLICIES
CREATE POLICY "Admins can insert any profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Coaches can insert player profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK ((role = 'player') AND is_coach(auth.uid()));

-- CREATE PERMISSIVE DELETE POLICY
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING ((user_id <> auth.uid()) AND is_admin(auth.uid()));