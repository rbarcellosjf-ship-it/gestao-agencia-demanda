-- CONFORMIDADES - Admin policies
CREATE POLICY "Admin can view all conformidades" ON public.conformidades FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can create conformidades" ON public.conformidades FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can update conformidades" ON public.conformidades FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete conformidades" ON public.conformidades FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- AGENDAMENTOS - Admin policies
CREATE POLICY "Admin can view all agendamentos" ON public.agendamentos FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can create agendamentos" ON public.agendamentos FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can update agendamentos" ON public.agendamentos FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete agendamentos" ON public.agendamentos FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- DEMANDS - Admin policies
CREATE POLICY "Admin can view all demands" ON public.demands FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can create demands" ON public.demands FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can update demands" ON public.demands FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete demands" ON public.demands FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- ENTREVISTAS_AGENDAMENTO - Admin policies
CREATE POLICY "Admin pode ver entrevistas" ON public.entrevistas_agendamento FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin pode criar entrevistas" ON public.entrevistas_agendamento FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin pode atualizar entrevistas" ON public.entrevistas_agendamento FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin pode deletar entrevistas" ON public.entrevistas_agendamento FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- ASSINATURAS_AGENDAMENTO - Admin policies
CREATE POLICY "Admin pode ver assinaturas" ON public.assinaturas_agendamento FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin pode criar assinaturas" ON public.assinaturas_agendamento FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin pode atualizar assinaturas" ON public.assinaturas_agendamento FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin pode deletar assinaturas" ON public.assinaturas_agendamento FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- EMPREGADOS_AGENCIA - Admin policies
CREATE POLICY "Admin can view empregados" ON public.empregados_agencia FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can create empregados" ON public.empregados_agencia FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can update empregados" ON public.empregados_agencia FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete empregados" ON public.empregados_agencia FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- DISTRIBUICAO_TAREFAS - Admin policies
CREATE POLICY "Admin can view all tasks" ON public.distribuicao_tarefas FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can create tasks" ON public.distribuicao_tarefas FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can update tasks" ON public.distribuicao_tarefas FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete tasks" ON public.distribuicao_tarefas FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- DOCUMENTOS_EXTRAIDOS - Admin policies
CREATE POLICY "Admin can view all documentos" ON public.documentos_extraidos FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can create documentos" ON public.documentos_extraidos FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can update documentos" ON public.documentos_extraidos FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete documentos" ON public.documentos_extraidos FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- PROFILES - Admin policies (if not already exists)
CREATE POLICY "Admin can create profiles" ON public.profiles FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admin can delete profiles" ON public.profiles FOR DELETE USING (get_user_role(auth.uid()) = 'admin');