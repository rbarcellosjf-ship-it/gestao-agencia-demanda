-- Adicionar coluna conformidade_id à tabela agendamentos
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS conformidade_id uuid;

-- Adicionar foreign key para conformidades
ALTER TABLE agendamentos 
  ADD CONSTRAINT fk_agendamentos_conformidade 
  FOREIGN KEY (conformidade_id) 
  REFERENCES conformidades(id) 
  ON DELETE SET NULL;