-- Adicionar campo para dossiê na tabela entrevistas_agendamento
ALTER TABLE entrevistas_agendamento 
ADD COLUMN dossie_cliente_url text;

-- Adicionar campo para matrícula com ônus na tabela assinaturas_agendamento
ALTER TABLE assinaturas_agendamento 
ADD COLUMN matricula_onus_url text;

-- Adicionar campo para matrícula com ônus na tabela agendamentos (para consistência)
ALTER TABLE agendamentos 
ADD COLUMN matricula_onus_url text;