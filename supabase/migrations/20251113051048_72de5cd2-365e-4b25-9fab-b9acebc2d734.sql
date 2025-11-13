-- Create table for document extraction logs
CREATE TABLE IF NOT EXISTS public.documentos_extraidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('certidao_casamento', 'matricula_imovel')),
  arquivo_url TEXT,
  dados_extraidos JSONB NOT NULL DEFAULT '{}'::jsonb,
  texto_gerado TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.documentos_extraidos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own documents"
  ON public.documentos_extraidos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agencia can view all documents"
  ON public.documentos_extraidos FOR SELECT
  USING (get_user_role(auth.uid()) = 'agencia');

CREATE POLICY "Authenticated users can insert documents"
  ON public.documentos_extraidos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_documentos_extraidos_user_id ON public.documentos_extraidos(user_id);
CREATE INDEX idx_documentos_extraidos_tipo ON public.documentos_extraidos(tipo_documento);