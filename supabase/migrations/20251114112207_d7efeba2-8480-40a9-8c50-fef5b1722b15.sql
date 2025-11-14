-- Normalizar CPFs existentes na tabela agendamentos
UPDATE agendamentos 
SET cpf = regexp_replace(cpf, '\D', '', 'g')
WHERE cpf IS NOT NULL AND cpf ~ '\D';

-- Normalizar CPFs existentes na tabela conformidades
UPDATE conformidades 
SET cpf = regexp_replace(cpf, '\D', '', 'g')
WHERE cpf IS NOT NULL AND cpf ~ '\D';

-- Adicionar check constraint para CPF sem formatação em agendamentos
ALTER TABLE agendamentos 
DROP CONSTRAINT IF EXISTS cpf_numeric_only;

ALTER TABLE agendamentos 
ADD CONSTRAINT cpf_numeric_only 
CHECK (cpf IS NULL OR cpf ~ '^\d+$');

-- Adicionar check constraint para CPF sem formatação em conformidades
ALTER TABLE conformidades 
DROP CONSTRAINT IF EXISTS cpf_numeric_only;

ALTER TABLE conformidades 
ADD CONSTRAINT cpf_numeric_only 
CHECK (cpf ~ '^\d+$');