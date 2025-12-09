-- Allow managers to view all user profiles (read-only for displaying assigned seller names)
CREATE POLICY "Managers can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to view all user roles (read-only for understanding assignments)
CREATE POLICY "Managers can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));