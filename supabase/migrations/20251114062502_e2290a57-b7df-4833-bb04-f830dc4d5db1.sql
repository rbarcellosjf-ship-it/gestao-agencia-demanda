-- ============================================
-- MIGRATION: Reestruturação Completa do Sistema
-- ============================================

-- 1. Criar tipos ENUM necessários
DO $$ BEGIN
  CREATE TYPE public.tipo_contrato AS ENUM ('individual', 'empreendimento');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Alterar tabela agendamentos
ALTER TABLE public.agendamentos
  DROP COLUMN IF EXISTS conformidade_id;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS tipo_contrato tipo_contrato,
  ADD COLUMN IF NOT EXISTS comite_credito BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dossie_cliente_url TEXT;

-- Adicionar modalidade_financiamento usando o tipo modalidade já existente
DO $$ BEGIN
  ALTER TABLE public.agendamentos 
    ADD COLUMN modalidade_financiamento modalidade;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Atualizar status default
ALTER TABLE public.agendamentos 
  ALTER COLUMN status SET DEFAULT 'Aguardando entrevista';

-- Criar índice para CPF
CREATE INDEX IF NOT EXISTS idx_agendamentos_cpf ON public.agendamentos(cpf);

-- 3. Alterar tabela conformidades
ALTER TABLE public.conformidades
  ADD COLUMN IF NOT EXISTS entrevista_aprovada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS comite_credito BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS entrevista_id UUID REFERENCES public.agendamentos(id);

-- 4. Criar tabela empregados_agencia
CREATE TABLE IF NOT EXISTS public.empregados_agencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email_preferencia TEXT,
  whatsapp TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS em empregados_agencia
ALTER TABLE public.empregados_agencia ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para empregados_agencia
DO $$ BEGIN
  CREATE POLICY "Agencia can view all empregados"
    ON public.empregados_agencia FOR SELECT
    USING (get_user_role(auth.uid()) = 'agencia'::app_role);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Agencia can insert empregados"
    ON public.empregados_agencia FOR INSERT
    WITH CHECK (get_user_role(auth.uid()) = 'agencia'::app_role);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Agencia can update empregados"
    ON public.empregados_agencia FOR UPDATE
    USING (get_user_role(auth.uid()) = 'agencia'::app_role);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Agencia can delete empregados"
    ON public.empregados_agencia FOR DELETE
    USING (get_user_role(auth.uid()) = 'agencia'::app_role);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Criar bucket para dossiês
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossie-clientes', 'dossie-clientes', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para dossie-clientes
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload dossie"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'dossie-clientes' 
      AND auth.role() = 'authenticated'
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view dossie"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'dossie-clientes' 
      AND auth.role() = 'authenticated'
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Agencia can delete dossie"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'dossie-clientes' 
      AND get_user_role(auth.uid()) = 'agencia'::app_role
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. Criar função e trigger para updated_at em empregados_agencia
CREATE OR REPLACE FUNCTION public.handle_empregados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS empregados_updated_at ON public.empregados_agencia;
CREATE TRIGGER empregados_updated_at
  BEFORE UPDATE ON public.empregados_agencia
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_empregados_updated_at();