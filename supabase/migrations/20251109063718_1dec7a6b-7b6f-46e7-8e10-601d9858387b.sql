-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Agencia can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "CCAs can view agencia profiles v2" ON public.profiles;
DROP POLICY IF EXISTS "CCAs can view agencia profiles" ON public.profiles;

-- Create a security definer function to check user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE profiles.user_id = user_id LIMIT 1;
$$;

-- Recreate profiles policies using the function
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Agencia can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_user_role(auth.uid()) = 'agencia');

CREATE POLICY "CCAs can view agencia profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'agencia' AND 
  public.get_user_role(auth.uid()) = 'cca'
);