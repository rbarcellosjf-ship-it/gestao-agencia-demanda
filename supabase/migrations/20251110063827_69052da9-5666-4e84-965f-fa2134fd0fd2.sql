-- Allow all authenticated users to view all user roles
-- This is needed for the notification system to find managers/CCAs
CREATE POLICY "Authenticated users can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);