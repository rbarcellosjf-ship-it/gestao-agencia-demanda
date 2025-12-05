-- Remover constraint antiga
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;

-- Criar nova constraint com todos os status necessários incluindo Assinado e Assinatura confirmada
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_status_check
CHECK (status = ANY (ARRAY[
  'Aguardando entrevista'::text,
  'Aguardando assinatura'::text,
  'Aprovado'::text,
  'Reprovado'::text,
  'Concluído'::text,
  'Cancelado'::text,
  'Assinado'::text,
  'Assinatura confirmada'::text
]));