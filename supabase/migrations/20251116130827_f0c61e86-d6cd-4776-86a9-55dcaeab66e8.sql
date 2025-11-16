-- Adicionar foreign key em user_roles referenciando profiles
-- Isso resolve o erro de relacionamento e permite JOINs automáticos
ALTER TABLE public.user_roles
ADD CONSTRAINT fk_user_roles_profiles
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Criar índice para otimizar performance de JOINs
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON public.user_roles(user_id);

-- Adicionar comentário para documentação
COMMENT ON CONSTRAINT fk_user_roles_profiles ON public.user_roles 
IS 'Links user roles to their profile information for automatic JOINs';