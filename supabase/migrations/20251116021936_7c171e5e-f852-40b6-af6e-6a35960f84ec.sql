-- Permitir que empregados atualizem o status de suas próprias tarefas
CREATE POLICY "Users can update their own task status"
ON distribuicao_tarefas
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());