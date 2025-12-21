-- Adicionar coluna assinatura_confirmada na tabela conformidades
ALTER TABLE conformidades 
ADD COLUMN assinatura_confirmada boolean DEFAULT false;