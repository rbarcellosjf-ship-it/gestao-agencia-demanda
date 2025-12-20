-- Adicionar colunas em distribuicao_tarefas para rastreamento de emails
ALTER TABLE public.distribuicao_tarefas 
ADD COLUMN IF NOT EXISTS resend_sent_id text,
ADD COLUMN IF NOT EXISTS reply_to_address text,
ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS inbound_email_id text,
ADD COLUMN IF NOT EXISTS inbound_from text,
ADD COLUMN IF NOT EXISTS concluida_em timestamptz,
ADD COLUMN IF NOT EXISTS concluida_por_email boolean DEFAULT false;

-- Criar índices úteis
CREATE INDEX IF NOT EXISTS idx_distribuicao_tarefas_resend_sent_id 
ON public.distribuicao_tarefas(resend_sent_id) WHERE resend_sent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_distribuicao_tarefas_inbound_email_id 
ON public.distribuicao_tarefas(inbound_email_id) WHERE inbound_email_id IS NOT NULL;

-- Criar tabela para log de eventos de email
CREATE TABLE IF NOT EXISTS public.task_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuicao_id uuid REFERENCES public.distribuicao_tarefas(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  email_id text,
  from_addr text,
  to_addr text,
  subject text,
  body_preview text,
  action_taken text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para a tabela de eventos
CREATE INDEX IF NOT EXISTS idx_task_email_events_distribuicao_id 
ON public.task_email_events(distribuicao_id);

CREATE INDEX IF NOT EXISTS idx_task_email_events_email_id 
ON public.task_email_events(email_id) WHERE email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_email_events_created_at 
ON public.task_email_events(created_at);

-- Habilitar RLS na nova tabela
ALTER TABLE public.task_email_events ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção via service role (edge functions)
CREATE POLICY "Service role can manage task_email_events"
ON public.task_email_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para agência visualizar todos os eventos
CREATE POLICY "Agencia can view all task email events"
ON public.task_email_events
FOR SELECT
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

-- Política para usuários verem eventos de suas tarefas
CREATE POLICY "Users can view their task email events"
ON public.task_email_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.distribuicao_tarefas dt 
    WHERE dt.id = task_email_events.distribuicao_id 
    AND dt.user_id = auth.uid()
  )
);