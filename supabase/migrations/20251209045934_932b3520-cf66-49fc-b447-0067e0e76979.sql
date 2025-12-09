-- Allow workers to view all user profiles (read-only for displaying assigned seller names)
CREATE POLICY "Workers can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'worker'::app_role));

-- Allow workers to view all user roles (read-only)
CREATE POLICY "Workers can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'worker'::app_role));