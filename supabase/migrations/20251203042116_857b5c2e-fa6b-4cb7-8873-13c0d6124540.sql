-- Create table for pending signature scheduling (similar to entrevistas_agendamento)
CREATE TABLE public.assinaturas_agendamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conformidade_id UUID REFERENCES public.conformidades(id),
  cca_user_id UUID,
  cliente_nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  data_opcao_1 DATE NOT NULL,
  data_opcao_2 DATE NOT NULL,
  data_confirmada DATE,
  horario_inicio TEXT NOT NULL,
  horario_fim TEXT NOT NULL,
  agencia TEXT DEFAULT 'Manchester',
  endereco_agencia TEXT DEFAULT 'Avenida Barao Do Rio Branco, 2340',
  status TEXT DEFAULT 'pendente',
  opcao_escolhida INTEGER,
  codigo_cca TEXT,
  tipo_contrato TEXT,
  modalidade_financiamento TEXT,
  observacoes TEXT,
  mensagem_id TEXT,
  chat_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assinaturas_agendamento ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agencia pode ver todas assinaturas" ON public.assinaturas_agendamento
FOR SELECT USING (get_user_role(auth.uid()) = 'agencia'::app_role);

CREATE POLICY "Agencia pode criar assinaturas" ON public.assinaturas_agendamento
FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'agencia'::app_role);

CREATE POLICY "Agencia pode atualizar assinaturas" ON public.assinaturas_agendamento
FOR UPDATE USING (get_user_role(auth.uid()) = 'agencia'::app_role);

CREATE POLICY "CCAs podem ver suas assinaturas" ON public.assinaturas_agendamento
FOR SELECT USING (auth.uid() = cca_user_id);

CREATE POLICY "CCAs podem criar assinaturas" ON public.assinaturas_agendamento
FOR INSERT WITH CHECK ((auth.uid() = cca_user_id) OR (get_user_role(auth.uid()) = 'agencia'::app_role));

CREATE POLICY "Sistema pode atualizar assinaturas (webhook)" ON public.assinaturas_agendamento
FOR UPDATE USING (true);

-- Create index for performance
CREATE INDEX idx_assinaturas_conformidade_id ON public.assinaturas_agendamento(conformidade_id);
CREATE INDEX idx_assinaturas_status ON public.assinaturas_agendamento(status);

-- Trigger for updated_at
CREATE TRIGGER update_assinaturas_agendamento_updated_at
BEFORE UPDATE ON public.assinaturas_agendamento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert WhatsApp template for signature scheduling
INSERT INTO public.whatsapp_templates (name, template_key, message, description, demand_type, available_variables)
VALUES (
  'Agendamento de Assinatura',
  'agendamento_assinatura',
  'Olá {{nome_cliente}}! 📝

Sua assinatura de contrato está pronta para ser agendada.

*Opções de data disponíveis:*
📅 Opção 1: {{data_opcao_1}}
📅 Opção 2: {{data_opcao_2}}

⏰ Horário: {{horario_inicio}} às {{horario_fim}}

📍 Local: {{agencia}}
{{endereco_agencia}}

Por favor, responda com *1* ou *2* para confirmar sua preferência de data, ou informe outra data de sua preferência.

Aguardamos sua confirmação!',
  'Mensagem enviada ao cliente com opções de data para assinatura do contrato',
  'all',
  '{"nome_cliente": "Nome do cliente", "data_opcao_1": "Primeira opção de data", "data_opcao_2": "Segunda opção de data", "horario_inicio": "Horário de início", "horario_fim": "Horário de fim", "agencia": "Nome da agência", "endereco_agencia": "Endereço da agência"}'
);