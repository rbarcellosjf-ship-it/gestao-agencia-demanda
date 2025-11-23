-- Adicionar campo telefone_cliente na tabela agendamentos
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS telefone_cliente text;

-- Criar template de email para comitê de crédito
INSERT INTO email_templates (
  template_key, 
  name, 
  subject, 
  body,
  module,
  description,
  available_variables
) VALUES (
  'task_comite',
  'Solicitação de Comitê de Crédito',
  'Nova Tarefa: Análise de Comitê de Crédito - {{cpf}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #2563eb;">Olá {{nome_empregado}},</h2>
    <p>Você recebeu uma nova solicitação para análise de <strong>Comitê de Crédito</strong>.</p>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Dados do Contrato:</h3>
      <ul style="list-style: none; padding: 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>CPF:</strong> {{cpf}}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Código CCA:</strong> {{codigo_cca}}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Valor do Financiamento:</strong> {{valor_financiamento}}
        </li>
        <li style="padding: 8px 0;">
          <strong>Modalidade:</strong> {{modalidade}}
        </li>
      </ul>
    </div>
    
    <p>Por favor, acesse o sistema para processar esta solicitação o mais breve possível.</p>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      Atenciosamente,<br>
      <strong>Sistema de Gestão de Contratos</strong>
    </p>
  </div>',
  'conformidades',
  'Template para notificação de tarefa de comitê de crédito',
  '{"nome_empregado": "Nome do empregado", "cpf": "CPF do cliente", "codigo_cca": "Código CCA", "valor_financiamento": "Valor do financiamento formatado", "modalidade": "Modalidade do contrato"}'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables,
  updated_at = now();