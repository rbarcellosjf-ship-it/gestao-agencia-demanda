-- 1. Drop constraint antiga
ALTER TABLE distribuicao_tarefas 
DROP CONSTRAINT IF EXISTS distribuicao_tarefas_status_check;

-- 2. Atualizar dados existentes (se houver)
UPDATE distribuicao_tarefas 
SET status = 'concluida' 
WHERE status = 'concluido';

UPDATE distribuicao_tarefas 
SET status = 'em_andamento' 
WHERE status = 'pendente';

-- 3. Alterar default para em_andamento
ALTER TABLE distribuicao_tarefas 
ALTER COLUMN status SET DEFAULT 'em_andamento';

-- 4. Criar nova constraint (apenas em_andamento e concluida)
ALTER TABLE distribuicao_tarefas
ADD CONSTRAINT distribuicao_tarefas_status_check
CHECK (status IN ('em_andamento', 'concluida'));

COMMENT ON CONSTRAINT distribuicao_tarefas_status_check ON distribuicao_tarefas 
IS 'Permite apenas status: em_andamento e concluida';