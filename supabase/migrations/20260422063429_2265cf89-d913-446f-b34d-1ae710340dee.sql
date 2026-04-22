CREATE TABLE public.whatsapp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contexto TEXT NOT NULL,
  referencia_id UUID,
  referencia_tipo TEXT,
  cpf TEXT,
  codigo_cca TEXT,
  destino TEXT NOT NULL,
  destinatario_nome TEXT,
  mensagem_preview TEXT,
  sucesso BOOLEAN NOT NULL DEFAULT false,
  erro TEXT,
  api_response JSONB,
  triggered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_logs_referencia ON public.whatsapp_logs(referencia_id);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);
CREATE INDEX idx_whatsapp_logs_codigo_cca ON public.whatsapp_logs(codigo_cca);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ver logs whatsapp"
ON public.whatsapp_logs FOR SELECT
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Agencia pode ver logs whatsapp"
ON public.whatsapp_logs FOR SELECT
USING (get_user_role(auth.uid()) = 'agencia'::app_role);

CREATE POLICY "Authenticated users can insert whatsapp logs"
ON public.whatsapp_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);