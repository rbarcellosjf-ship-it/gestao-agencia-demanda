-- Permitir que usuários NÃO autenticados vejam a lista de CCAs ativos (necessário para o dropdown no cadastro)
-- Mantém os dados mínimos (codigo/nome) acessíveis, mas apenas registros ativos.

ALTER TABLE public.escritorios_cca ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Evita erro caso a policy já exista
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'escritorios_cca'
      AND policyname = 'Anyone can view active escritorios'
  ) THEN
    CREATE POLICY "Anyone can view active escritorios"
    ON public.escritorios_cca
    FOR SELECT
    TO anon
    USING (ativo = true);
  END IF;
END
$$;