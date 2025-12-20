-- Garantir REPLICA IDENTITY FULL para ver os dados completos nas atualizações
ALTER TABLE public.demands REPLICA IDENTITY FULL;