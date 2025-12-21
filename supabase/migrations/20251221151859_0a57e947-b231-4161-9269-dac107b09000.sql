-- Migração 2: Criar tabela escritorios_cca e adicionar campos em profiles

-- 1. Criar tabela escritorios_cca (lista de CCAs cadastrados)
CREATE TABLE public.escritorios_cca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar campos de controle na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ;

-- 3. Habilitar RLS na tabela escritorios_cca
ALTER TABLE public.escritorios_cca ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para escritorios_cca
-- Todos autenticados podem ver CCAs ativos (para dropdown no signup)
CREATE POLICY "Authenticated users can view active escritorios" 
ON public.escritorios_cca 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Admin e Agencia podem inserir novos CCAs
CREATE POLICY "Admin and Agencia can insert escritorios" 
ON public.escritorios_cca 
FOR INSERT 
WITH CHECK (
  get_user_role(auth.uid()) IN ('admin', 'agencia')
);

-- Admin e Agencia podem atualizar CCAs
CREATE POLICY "Admin and Agencia can update escritorios" 
ON public.escritorios_cca 
FOR UPDATE 
USING (
  get_user_role(auth.uid()) IN ('admin', 'agencia')
);

-- Admin e Agencia podem deletar CCAs
CREATE POLICY "Admin and Agencia can delete escritorios" 
ON public.escritorios_cca 
FOR DELETE 
USING (
  get_user_role(auth.uid()) IN ('admin', 'agencia')
);

-- 5. Trigger para atualizar updated_at
CREATE TRIGGER update_escritorios_cca_updated_at
BEFORE UPDATE ON public.escritorios_cca
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Adicionar configuração de aprovação obrigatória (se não existir)
INSERT INTO public.configuracoes (chave, valor, descricao)
VALUES ('exigir_aprovacao_cadastro', 'false', 'Quando ativado, novos usuários precisam ser aprovados por um administrador')
ON CONFLICT (chave) DO NOTHING;

-- 7. Políticas adicionais para profiles (admin pode ver e atualizar todos)
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin');

-- 8. Políticas adicionais para user_roles (admin pode gerenciar)
CREATE POLICY "Admin can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');