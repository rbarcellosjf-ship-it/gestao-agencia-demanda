-- Create clients cache table for auto-prefill by CPF
CREATE TABLE public.clientes_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL UNIQUE,
  nome TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clientes_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view clients cache"
ON public.clientes_cache
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert clients cache"
ON public.clientes_cache
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update clients cache"
ON public.clientes_cache
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_clientes_cache_updated_at
BEFORE UPDATE ON public.clientes_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for CPF lookups
CREATE INDEX idx_clientes_cache_cpf ON public.clientes_cache(cpf);