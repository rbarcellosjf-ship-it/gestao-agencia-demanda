-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  description TEXT,
  available_variables JSONB NOT NULL DEFAULT '{}',
  module TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- All authenticated users can view templates
CREATE POLICY "Authenticated users can view templates"
ON public.email_templates
FOR SELECT
TO authenticated
USING (true);

-- Only agencia can insert templates
CREATE POLICY "Agencia can insert templates"
ON public.email_templates
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'agencia'::app_role);

-- Only agencia can update templates
CREATE POLICY "Agencia can update templates"
ON public.email_templates
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

-- Only agencia can delete templates
CREATE POLICY "Agencia can delete templates"
ON public.email_templates
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial template for "Pedir Prioridade"
INSERT INTO public.email_templates (name, template_key, subject, body, module, available_variables, description)
VALUES (
  'Pedido de Prioridade - Conformidade',
  'conformidade_prioridade',
  'Solicitação de Prioridade - CPF {{cpf}}',
  'Prezado(a),

Solicito prioridade para análise do processo em conformidade com os seguintes dados:

📋 Dados do Processo:
- CPF: {{cpf}}
- Valor do Financiamento: {{valor_financiamento}}
- Modalidade: {{modalidade}}
- CCA Responsável: {{codigo_cca}} - {{nome_cca}}
- Data de Envio: {{data_envio}}
- Telefone para contato: {{telefone_cca}}

Agradeço a atenção.

Atenciosamente,
{{nome_cca}}',
  'conformidades',
  '{"cpf": "CPF do cliente", "valor_financiamento": "Valor formatado do financiamento", "modalidade": "Modalidade do financiamento", "codigo_cca": "Código do CCA", "nome_cca": "Nome completo do CCA", "data_envio": "Data de envio formatada", "telefone_cca": "Telefone do CCA"}',
  'Template de e-mail para solicitar prioridade na análise de conformidade'
);