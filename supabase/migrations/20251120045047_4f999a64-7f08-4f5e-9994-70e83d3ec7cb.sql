-- Adicionar política RLS para permitir agencia criar conformidades
CREATE POLICY "Agencia can create conformidades" 
ON public.conformidades
FOR INSERT 
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'agencia'
);