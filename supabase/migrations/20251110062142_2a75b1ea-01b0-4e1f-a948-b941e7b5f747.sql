-- Create WhatsApp templates table
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_key TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  description TEXT,
  demand_type TEXT,
  available_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view templates"
ON public.whatsapp_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Agencia can insert templates"
ON public.whatsapp_templates
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'agencia'::app_role);

CREATE POLICY "Agencia can update templates"
ON public.whatsapp_templates
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

CREATE POLICY "Agencia can delete templates"
ON public.whatsapp_templates
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO whatsapp_templates (name, template_key, message, demand_type, available_variables, description)
VALUES 
(
  'Nova Demanda Criada',
  'nova_demanda',
  '🔔 *Nova Demanda Criada*

*CCA:* {{nome_cca}} ({{codigo_cca}})
*Tipo:* {{tipo_demanda}}
*CPF:* {{cpf}}
*Descrição:* {{descricao}}',
  'all',
  '{"nome_cca": "Nome do CCA", "codigo_cca": "Código do CCA", "tipo_demanda": "Tipo da demanda", "cpf": "CPF do cliente", "descricao": "Descrição da demanda"}',
  'Notificação enviada ao gerente quando uma nova demanda é criada'
),
(
  'Demanda Respondida',
  'demanda_respondida',
  '🔔 *Demanda Respondida*

*Status:* {{status}}
*Tipo:* {{tipo_demanda}}
*Resposta:* {{resposta}}

A gerência analisou sua demanda.',
  'all',
  '{"status": "Status da demanda", "tipo_demanda": "Tipo da demanda", "resposta": "Resposta do gerente"}',
  'Notificação enviada ao CCA quando uma demanda é respondida'
),
(
  'Conformidade Criada',
  'nova_conformidade',
  '🔔 *Nova Conformidade Criada*

*CCA:* {{nome_cca}} ({{codigo_cca}})
*CPF:* {{cpf}}
*Valor:* {{valor_financiamento}}
*Modalidade:* {{modalidade}}',
  'conformidade',
  '{"nome_cca": "Nome do CCA", "codigo_cca": "Código do CCA", "cpf": "CPF do cliente", "valor_financiamento": "Valor do financiamento", "modalidade": "Modalidade"}',
  'Notificação enviada ao gerente quando uma nova conformidade é criada'
);