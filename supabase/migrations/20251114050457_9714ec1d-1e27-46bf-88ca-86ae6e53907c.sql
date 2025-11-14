-- Add email_preferencia to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_preferencia TEXT;

COMMENT ON COLUMN public.profiles.email_preferencia IS 'Email de preferência para receber tarefas distribuídas';

-- Update distribuicao_tarefas to reference auth.users directly
-- First, if there are any existing records, we need to handle them
-- Since this is a new feature, we can assume the table might be empty or we'll update the foreign key

-- Drop existing foreign key if it exists (in case of previous implementation)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'distribuicao_tarefas_user_id_fkey' 
        AND table_name = 'distribuicao_tarefas'
    ) THEN
        ALTER TABLE public.distribuicao_tarefas DROP CONSTRAINT distribuicao_tarefas_user_id_fkey;
    END IF;
END $$;

-- Add foreign key to auth.users
ALTER TABLE public.distribuicao_tarefas
ADD CONSTRAINT distribuicao_tarefas_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;