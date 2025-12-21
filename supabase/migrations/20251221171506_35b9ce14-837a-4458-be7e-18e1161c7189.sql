-- Remover constraint atual de modalidade_financiamento
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_modalidade_financiamento_check;

-- Adicionar nova constraint aceitando MAIÚSCULO e minúsculo
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_modalidade_financiamento_check 
  CHECK (modalidade_financiamento = ANY (ARRAY['MCMV', 'SBPE', 'mcmv', 'sbpe']));

-- Atualizar dados existentes para MAIÚSCULO
UPDATE agendamentos SET modalidade_financiamento = UPPER(modalidade_financiamento) 
WHERE modalidade_financiamento IS NOT NULL;