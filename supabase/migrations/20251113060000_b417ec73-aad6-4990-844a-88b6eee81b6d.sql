-- Adiciona políticas RLS para UPDATE na tabela conformidades

-- CCAs podem atualizar suas próprias conformidades
CREATE POLICY "CCAs can update their own conformidades"
ON public.conformidades
FOR UPDATE
USING (auth.uid() = cca_user_id);

-- Agencia pode atualizar todas as conformidades
CREATE POLICY "Agencia can update conformidades"
ON public.conformidades
FOR UPDATE
USING (get_user_role(auth.uid()) = 'agencia'::app_role);