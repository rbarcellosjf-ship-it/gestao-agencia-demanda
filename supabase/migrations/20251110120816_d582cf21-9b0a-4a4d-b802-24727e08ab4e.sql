-- Add new demand type for vendor authorization with restriction
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'demand_type') THEN
    RAISE EXCEPTION 'demand_type enum does not exist';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'autoriza_vendedor_restricao' 
    AND enumtypid = 'demand_type'::regtype
  ) THEN
    ALTER TYPE demand_type ADD VALUE 'autoriza_vendedor_restricao';
  END IF;
END $$;

-- Add new statuses for signature workflow
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'aguardando_assinatura' 
    AND enumtypid = 'demand_status'::regtype
  ) THEN
    ALTER TYPE demand_status ADD VALUE 'aguardando_assinatura';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'assinado' 
    AND enumtypid = 'demand_status'::regtype
  ) THEN
    ALTER TYPE demand_status ADD VALUE 'assinado';
  END IF;
END $$;

-- Add new columns for authorization PDFs
ALTER TABLE public.demands 
ADD COLUMN IF NOT EXISTS mo_autorizacao_pdf TEXT,
ADD COLUMN IF NOT EXISTS mo_autorizacao_assinado_pdf TEXT,
ADD COLUMN IF NOT EXISTS assinatura_data TIMESTAMP WITH TIME ZONE;