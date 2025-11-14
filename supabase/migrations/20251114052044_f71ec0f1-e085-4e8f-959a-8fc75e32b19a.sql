-- Add email_preferencia column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_preferencia TEXT;

-- Create distribuicao_tarefas table if not exists
CREATE TABLE IF NOT EXISTS distribuicao_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_tarefa TEXT NOT NULL,
  referencia_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE distribuicao_tarefas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON distribuicao_tarefas;
DROP POLICY IF EXISTS "Agencia can create task distributions" ON distribuicao_tarefas;
DROP POLICY IF EXISTS "Agencia can update task distributions" ON distribuicao_tarefas;
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON distribuicao_tarefas;
DROP POLICY IF EXISTS "Agencia can manage tasks" ON distribuicao_tarefas;
DROP POLICY IF EXISTS "Agencia users can view their assigned tasks" ON distribuicao_tarefas;
DROP POLICY IF EXISTS "Agencia can create task distributions" ON distribuicao_tarefas;
DROP POLICY IF EXISTS "Agencia can update task distributions" ON distribuicao_tarefas;

-- Create new policies
CREATE POLICY "Users can view their assigned tasks"
ON distribuicao_tarefas FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR get_user_role(auth.uid()) = 'agencia'
);

CREATE POLICY "Agencia can create task distributions"
ON distribuicao_tarefas FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'agencia');

CREATE POLICY "Agencia can update task distributions"
ON distribuicao_tarefas FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'agencia');

-- Add trigger for updated_at if not exists
DROP TRIGGER IF EXISTS update_distribuicao_tarefas_updated_at ON distribuicao_tarefas;
CREATE TRIGGER update_distribuicao_tarefas_updated_at
BEFORE UPDATE ON distribuicao_tarefas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();