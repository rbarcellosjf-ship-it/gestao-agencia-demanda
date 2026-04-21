CREATE POLICY "Admin pode inserir configurações"
ON public.configuracoes
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Admin pode atualizar configurações"
ON public.configuracoes
FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Admin pode deletar configurações"
ON public.configuracoes
FOR DELETE
USING (get_user_role(auth.uid()) = 'admin'::app_role);