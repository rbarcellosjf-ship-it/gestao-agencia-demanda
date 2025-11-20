-- Adicionar campos necessários em entrevistas_agendamento
ALTER TABLE entrevistas_agendamento
ADD COLUMN IF NOT EXISTS codigo_cca text,
ADD COLUMN IF NOT EXISTS tipo_contrato text,
ADD COLUMN IF NOT EXISTS modalidade_financiamento text,
ADD COLUMN IF NOT EXISTS comite_credito boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cca_user_id uuid;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_entrevistas_status 
ON entrevistas_agendamento(status);

CREATE INDEX IF NOT EXISTS idx_entrevistas_cca 
ON entrevistas_agendamento(cca_user_id);

CREATE INDEX IF NOT EXISTS idx_entrevistas_conformidade
ON entrevistas_agendamento(conformidade_id);

-- Templates WhatsApp necessários
INSERT INTO whatsapp_templates (template_key, name, message, available_variables, description)
VALUES (
  'agendamento_entrevista',
  'Agendamento de Entrevista - Cliente',
  'Olá, {{nome_cliente}}! 👋

Aqui é o assistente da {{nome_empresa}} - Agência {{agencia}}.
Precisamos agendar sua entrevista para análise do contrato.

Temos as seguintes opções disponíveis:
📅 Opção 1: {{data_opcao_1}}
📅 Opção 2: {{data_opcao_2}}
⏰ Horário disponível: entre {{horario_inicio}} e {{horario_fim}}
📍 Local: {{endereco_agencia}}

Por gentileza, responda com "1" ou "2" para confirmar a opção desejada.',
  '{"nome_cliente": "Nome do cliente", "nome_empresa": "Nome da empresa", "agencia": "Nome da agência", "data_opcao_1": "Data formatada da opção 1", "data_opcao_2": "Data formatada da opção 2", "horario_inicio": "Horário de início", "horario_fim": "Horário de término", "endereco_agencia": "Endereço da agência"}',
  'Mensagem enviada ao cliente com opções de data para agendamento de entrevista'
) ON CONFLICT (template_key) DO NOTHING;

INSERT INTO whatsapp_templates (template_key, name, message, available_variables, description)
VALUES (
  'entrevista_aprovada',
  'Notificação de Entrevista Aprovada - CCA',
  '✅ Entrevista Aprovada!

Olá, {{nome_cca}}! 
A entrevista do cliente foi aprovada pela Agência.

📋 Detalhes:
• CPF: {{cpf}}
• Tipo: {{tipo_contrato}}
• Modalidade: {{modalidade_financiamento}}
• Data da Entrevista: {{data_entrevista}}
• CCA: {{codigo_cca}}

Próximo passo: Aguardar agendamento de assinatura.

Acesse o sistema para mais detalhes.',
  '{"nome_cca": "Nome completo do CCA", "cpf": "CPF do cliente", "tipo_contrato": "Individual ou Empreendimento", "modalidade_financiamento": "MCMV ou SBPE", "data_entrevista": "Data formatada da entrevista", "codigo_cca": "Código do CCA"}',
  'Notificação enviada ao CCA quando uma entrevista é aprovada'
) ON CONFLICT (template_key) DO NOTHING;

-- RLS Policies para entrevistas_agendamento
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "CCAs podem ver suas entrevistas pendentes" ON entrevistas_agendamento;
DROP POLICY IF EXISTS "Usuários autenticados podem criar entrevistas" ON entrevistas_agendamento;
DROP POLICY IF EXISTS "Agencia pode atualizar entrevistas" ON entrevistas_agendamento;

-- CCAs podem ver suas próprias entrevistas
CREATE POLICY "CCAs podem ver suas entrevistas pendentes"
ON entrevistas_agendamento
FOR SELECT
TO authenticated
USING (
  auth.uid() = cca_user_id
  OR get_user_role(auth.uid()) = 'agencia'
);

-- CCAs e Agencia podem criar entrevistas
CREATE POLICY "Usuários autenticados podem criar entrevistas"
ON entrevistas_agendamento
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = cca_user_id
  OR get_user_role(auth.uid()) = 'agencia'
);

-- Agencia pode atualizar qualquer entrevista
CREATE POLICY "Agencia pode atualizar entrevistas"
ON entrevistas_agendamento
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'agencia')
WITH CHECK (get_user_role(auth.uid()) = 'agencia');