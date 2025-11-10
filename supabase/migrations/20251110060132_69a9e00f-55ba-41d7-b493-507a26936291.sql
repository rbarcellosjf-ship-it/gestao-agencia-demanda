-- Add PDF file columns to demands table
ALTER TABLE public.demands 
ADD COLUMN carta_solicitacao_pdf TEXT,
ADD COLUMN ficha_cadastro_pdf TEXT,
ADD COLUMN matricula_imovel_pdf TEXT,
ADD COLUMN numero_pis TEXT;

-- Add new demand type
ALTER TYPE demand_type ADD VALUE IF NOT EXISTS 'incluir_pis_siopi';

-- Create storage bucket for demand PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('demand-pdfs', 'demand-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for demand PDFs
CREATE POLICY "Authenticated users can upload demand PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'demand-pdfs');

CREATE POLICY "Users can view their own demand PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'demand-pdfs');

CREATE POLICY "Users can update their own demand PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'demand-pdfs');

CREATE POLICY "Users can delete their own demand PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'demand-pdfs');

-- Insert email template for SIGDU
INSERT INTO email_templates (name, template_key, subject, body, module, available_variables, description)
VALUES (
  'Solicitar Avaliação SIGDU',
  'sigdu_solicitacao',
  'Solicitação de Avaliação SIGDU - {{cpf}}',
  'Prezado(a),

Solicito abertura de chamado para avaliação no SIGDU conforme dados abaixo:

📋 Dados do Processo:
- CPF: {{cpf}}
- Matrícula: {{matricula}}
- CCA Responsável: {{codigo_cca}} - {{nome_cca}}
- Data da Solicitação: {{data_solicitacao}}
- Telefone para contato: {{telefone_cca}}

📝 Passo a Passo:
[EDITAR: Adicionar instruções detalhadas sobre como executar esta solicitação]

1. [Primeiro passo]
2. [Segundo passo]
3. [Terceiro passo]

Observações: {{observacoes}}

Atenciosamente,
{{nome_cca}}',
  'demands',
  '{"cpf": "CPF do cliente", "matricula": "Matrícula do imóvel", "codigo_cca": "Código CCA", "nome_cca": "Nome do CCA", "data_solicitacao": "Data da solicitação", "telefone_cca": "Telefone do CCA", "observacoes": "Observações adicionais"}',
  'Template para solicitar avaliação SIGDU - Editável'
)
ON CONFLICT (template_key) DO NOTHING;