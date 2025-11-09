-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Agencia can view CCA profiles" ON profiles;
DROP POLICY IF EXISTS "CCAs can view agencia profiles" ON profiles;

-- Create new policies without recursion
-- Agencia can view all profiles (using simple role check from JWT)
CREATE POLICY "Agencia can view all profiles"
ON profiles
FOR SELECT
USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'agencia'
);

-- CCAs can view agencia profiles (using simple role check)
CREATE POLICY "CCAs can view agencia profiles v2"
ON profiles
FOR SELECT
USING (
  role = 'agencia' AND 
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'cca'
);