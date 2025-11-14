-- Atualizar políticas RLS de agendamentos para permitir Agência criar
-- e adicionar políticas de UPDATE

-- 1. Dropar política antiga restritiva
DROP POLICY IF EXISTS "CCAs can create agendamentos" ON agendamentos;

-- 2. CCAs podem criar seus próprios agendamentos
CREATE POLICY "CCAs can create their own agendamentos"
ON agendamentos FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = cca_user_id) AND 
  (get_user_role(auth.uid()) = 'cca'::app_role)
);

-- 3. Agência pode criar agendamentos para qualquer CCA
CREATE POLICY "Agencia can create agendamentos"
ON agendamentos FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'agencia'::app_role
);

-- 4. Agência pode atualizar qualquer agendamento
CREATE POLICY "Agencia can update all agendamentos"
ON agendamentos FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

-- 5. CCAs podem atualizar seus próprios agendamentos
CREATE POLICY "CCAs can update their own agendamentos"
ON agendamentos FOR UPDATE
TO authenticated
USING (auth.uid() = cca_user_id);