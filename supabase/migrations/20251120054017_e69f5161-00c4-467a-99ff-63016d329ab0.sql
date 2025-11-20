-- 1. Atualizar codigo_cca para agencia com valor fixo '0126'
UPDATE profiles 
SET codigo_cca = '0126'
WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'agencia'
);

-- 2. Preencher codigo_cca vazio para CCAs (se houver)
UPDATE profiles 
SET codigo_cca = 'CCA-' || LEFT(user_id::text, 8)
WHERE codigo_cca IS NULL OR codigo_cca = '';

-- 3. Tornar codigo_cca NOT NULL
ALTER TABLE profiles 
ALTER COLUMN codigo_cca SET NOT NULL;

-- 4. Adicionar tipo_contrato à tabela conformidades
ALTER TABLE conformidades 
ADD COLUMN IF NOT EXISTS tipo_contrato text;

-- 5. Preencher valores padrão para registros existentes
UPDATE conformidades 
SET tipo_contrato = 'individual'
WHERE tipo_contrato IS NULL;

-- 6. Tornar tipo_contrato NOT NULL com default
ALTER TABLE conformidades 
ALTER COLUMN tipo_contrato SET NOT NULL,
ALTER COLUMN tipo_contrato SET DEFAULT 'individual';

-- 7. Adicionar check constraint para tipo_contrato
ALTER TABLE conformidades 
ADD CONSTRAINT conformidades_tipo_contrato_check 
CHECK (tipo_contrato IN ('individual', 'empreendimento'));

-- 8. Adicionar conformidade_id à tabela entrevistas_agendamento (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entrevistas_agendamento' 
    AND column_name = 'conformidade_id'
  ) THEN
    ALTER TABLE entrevistas_agendamento 
    ADD COLUMN conformidade_id uuid REFERENCES conformidades(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_entrevistas_conformidade 
    ON entrevistas_agendamento(conformidade_id);
  END IF;
END $$;

-- 9. Criar função para atualizar entrevista_aprovada automaticamente
CREATE OR REPLACE FUNCTION atualizar_entrevista_aprovada()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a entrevista foi aprovada E tem conformidade vinculada
  IF NEW.status = 'Aprovado' AND NEW.conformidade_id IS NOT NULL THEN
    UPDATE conformidades
    SET entrevista_aprovada = true
    WHERE id = NEW.conformidade_id;
  END IF;
  
  -- Se a entrevista foi reprovada
  IF NEW.status = 'Reprovado' AND NEW.conformidade_id IS NOT NULL THEN
    UPDATE conformidades
    SET entrevista_aprovada = false
    WHERE id = NEW.conformidade_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Criar trigger para executar após UPDATE em agendamentos
DROP TRIGGER IF EXISTS trigger_atualizar_entrevista_aprovada ON agendamentos;
CREATE TRIGGER trigger_atualizar_entrevista_aprovada
AFTER UPDATE ON agendamentos
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION atualizar_entrevista_aprovada();