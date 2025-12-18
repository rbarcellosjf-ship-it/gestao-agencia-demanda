-- Add nome_cliente column to conformidades table
ALTER TABLE public.conformidades
ADD COLUMN nome_cliente TEXT;

-- Add nome_cliente column to demands table
ALTER TABLE public.demands
ADD COLUMN nome_cliente TEXT;