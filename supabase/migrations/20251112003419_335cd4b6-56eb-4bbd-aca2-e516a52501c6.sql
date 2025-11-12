-- Criar template de email para autorização assinada
INSERT INTO email_templates (
  name,
  template_key,
  module,
  subject,
  body,
  description,
  available_variables
) VALUES (
  'Autorização Assinada Digitalmente',
  'autorizacao_assinada',
  'demands',
  'Autorização Assinada - MO {{matricula}}',
  'Olá {{nome_cca}},

A autorização de vendedor com restrição foi assinada digitalmente e está pronta para uso.

📋 Detalhes da Autorização:
- CPF: {{cpf}}
- Matrícula: {{matricula}}
- Data da Assinatura: {{data_assinatura}}

O PDF assinado digitalmente está anexado a este email para sua conveniência.

Você também pode acessar o documento diretamente no sistema de gestão a qualquer momento.

Atenciosamente,
Sistema de Gestão',
  'Template de email enviado quando uma autorização é assinada digitalmente',
  '{"nome_cca": "Nome do CCA", "cpf": "CPF do cliente", "matricula": "Número da matrícula", "data_assinatura": "Data da assinatura formatada"}'::jsonb
);