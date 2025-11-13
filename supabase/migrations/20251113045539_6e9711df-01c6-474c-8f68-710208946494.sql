-- Adicionar campos de status e data de agendamento na tabela conformidades
ALTER TABLE public.conformidades 
ADD COLUMN status TEXT DEFAULT 'Em conformidade',
ADD COLUMN data_agendamento TIMESTAMP WITH TIME ZONE;

-- Criar tabela de configurações do sistema
CREATE TABLE public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir configuração padrão para nome da empresa
INSERT INTO public.configuracoes (chave, valor, descricao)
VALUES ('nome_empresa', 'Manchester Financeira', 'Nome da empresa exibido nas comunicações');

-- Habilitar RLS na tabela configuracoes
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Policies para configuracoes
CREATE POLICY "Todos podem ler configurações"
  ON public.configuracoes FOR SELECT
  USING (true);

CREATE POLICY "Agencia pode atualizar configurações"
  ON public.configuracoes FOR UPDATE
  USING (get_user_role(auth.uid()) = 'agencia');

CREATE POLICY "Agencia pode inserir configurações"
  ON public.configuracoes FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'agencia');

-- Criar tabela de entrevistas_agendamento
CREATE TABLE public.entrevistas_agendamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conformidade_id UUID REFERENCES public.conformidades(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  contrato_id TEXT,
  data_opcao_1 DATE NOT NULL,
  data_opcao_2 DATE NOT NULL,
  data_confirmada DATE,
  horario_inicio TEXT NOT NULL,
  horario_fim TEXT NOT NULL,
  agencia TEXT DEFAULT 'Manchester',
  endereco_agencia TEXT DEFAULT 'Avenida Barao Do Rio Branco, 2340',
  nome_empresa TEXT,
  status TEXT DEFAULT 'pendente',
  opcao_escolhida INTEGER,
  mensagem_id TEXT,
  chat_id TEXT,
  lembrete_enviado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_entrevistas_status ON public.entrevistas_agendamento(status);
CREATE INDEX idx_entrevistas_telefone ON public.entrevistas_agendamento(telefone);
CREATE INDEX idx_entrevistas_chat_id ON public.entrevistas_agendamento(chat_id);
CREATE INDEX idx_entrevistas_conformidade ON public.entrevistas_agendamento(conformidade_id);

-- Habilitar RLS
ALTER TABLE public.entrevistas_agendamento ENABLE ROW LEVEL SECURITY;

-- Policies para entrevistas_agendamento
CREATE POLICY "Agencia pode ver todas entrevistas"
  ON public.entrevistas_agendamento FOR SELECT
  USING (get_user_role(auth.uid()) = 'agencia');

CREATE POLICY "CCAs podem ver suas entrevistas"
  ON public.entrevistas_agendamento FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conformidades c
      WHERE c.id = entrevistas_agendamento.conformidade_id
      AND c.cca_user_id = auth.uid()
    )
  );

CREATE POLICY "Agencia pode criar entrevistas"
  ON public.entrevistas_agendamento FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'agencia');

CREATE POLICY "CCAs podem criar entrevistas"
  ON public.entrevistas_agendamento FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conformidades c
      WHERE c.id = entrevistas_agendamento.conformidade_id
      AND c.cca_user_id = auth.uid()
    )
  );

CREATE POLICY "Agencia pode atualizar entrevistas"
  ON public.entrevistas_agendamento FOR UPDATE
  USING (get_user_role(auth.uid()) = 'agencia');

CREATE POLICY "Sistema pode atualizar entrevistas (webhook)"
  ON public.entrevistas_agendamento FOR UPDATE
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_entrevistas_updated_at
  BEFORE UPDATE ON public.entrevistas_agendamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();