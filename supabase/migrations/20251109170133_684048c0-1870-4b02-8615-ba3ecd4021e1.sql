-- Migração completa do sistema de roles com segurança

-- Passo 1: Remover função antiga
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- Passo 2: Criar tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Passo 3: Migrar dados (somente se a coluna role ainda existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        INSERT INTO public.user_roles (user_id, role)
        SELECT user_id, role FROM public.profiles
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- Passo 4: Remover coluna role
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- Passo 5: Criar nova função get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Passo 6: Políticas da tabela user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
CREATE POLICY "System can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (false);

-- Passo 7: Políticas da tabela profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Agencia can view all profiles" ON public.profiles;
CREATE POLICY "Agencia can view all profiles"
ON public.profiles FOR SELECT
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

DROP POLICY IF EXISTS "CCAs can view agencia profiles" ON public.profiles;
CREATE POLICY "CCAs can view agencia profiles"
ON public.profiles FOR SELECT
USING (
  get_user_role(auth.uid()) = 'cca'::app_role
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.user_id AND ur.role = 'agencia'::app_role
  )
);

-- Passo 8: Políticas da tabela demands
DROP POLICY IF EXISTS "CCAs can view their own demands" ON public.demands;
CREATE POLICY "CCAs can view their own demands"
ON public.demands FOR SELECT
USING (auth.uid() = cca_user_id);

DROP POLICY IF EXISTS "Agencia can view all demands" ON public.demands;
CREATE POLICY "Agencia can view all demands"
ON public.demands FOR SELECT
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

DROP POLICY IF EXISTS "CCAs can create demands" ON public.demands;
CREATE POLICY "CCAs can create demands"
ON public.demands FOR INSERT
WITH CHECK (
  auth.uid() = cca_user_id 
  AND get_user_role(auth.uid()) = 'cca'::app_role
);

DROP POLICY IF EXISTS "Agencia can update demands" ON public.demands;
CREATE POLICY "Agencia can update demands"
ON public.demands FOR UPDATE
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

DROP POLICY IF EXISTS "Agencia can delete demands" ON public.demands;
CREATE POLICY "Agencia can delete demands"
ON public.demands FOR DELETE
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

DROP POLICY IF EXISTS "CCAs can delete their own demands" ON public.demands;
CREATE POLICY "CCAs can delete their own demands"
ON public.demands FOR DELETE
USING (auth.uid() = cca_user_id);

-- Passo 9: Políticas da tabela conformidades
DROP POLICY IF EXISTS "CCAs can view their own conformidades" ON public.conformidades;
CREATE POLICY "CCAs can view their own conformidades"
ON public.conformidades FOR SELECT
USING (auth.uid() = cca_user_id);

DROP POLICY IF EXISTS "Agencia can view all conformidades" ON public.conformidades;
CREATE POLICY "Agencia can view all conformidades"
ON public.conformidades FOR SELECT
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

DROP POLICY IF EXISTS "CCAs can create conformidades" ON public.conformidades;
CREATE POLICY "CCAs can create conformidades"
ON public.conformidades FOR INSERT
WITH CHECK (
  auth.uid() = cca_user_id 
  AND get_user_role(auth.uid()) = 'cca'::app_role
);

DROP POLICY IF EXISTS "Agencia can delete conformidades" ON public.conformidades;
CREATE POLICY "Agencia can delete conformidades"
ON public.conformidades FOR DELETE
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

DROP POLICY IF EXISTS "CCAs can delete their own conformidades" ON public.conformidades;
CREATE POLICY "CCAs can delete their own conformidades"
ON public.conformidades FOR DELETE
USING (auth.uid() = cca_user_id);

-- Passo 10: Políticas da tabela agendamentos
DROP POLICY IF EXISTS "CCAs can view their own agendamentos" ON public.agendamentos;
CREATE POLICY "CCAs can view their own agendamentos"
ON public.agendamentos FOR SELECT
USING (auth.uid() = cca_user_id);

DROP POLICY IF EXISTS "Agencia can view all agendamentos" ON public.agendamentos;
CREATE POLICY "Agencia can view all agendamentos"
ON public.agendamentos FOR SELECT
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

DROP POLICY IF EXISTS "CCAs can create agendamentos" ON public.agendamentos;
CREATE POLICY "CCAs can create agendamentos"
ON public.agendamentos FOR INSERT
WITH CHECK (
  auth.uid() = cca_user_id 
  AND get_user_role(auth.uid()) = 'cca'::app_role
);

-- Passo 11: Atualizar função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'cca');
  
  INSERT INTO public.profiles (user_id, full_name, phone, codigo_cca)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'codigo_cca'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;