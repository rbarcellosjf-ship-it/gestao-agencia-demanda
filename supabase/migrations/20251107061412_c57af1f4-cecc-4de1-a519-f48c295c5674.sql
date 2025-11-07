-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('agencia', 'cca');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role app_role NOT NULL,
  codigo_cca TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create demand_type enum
CREATE TYPE public.demand_type AS ENUM (
  'autoriza_reavaliacao',
  'desconsidera_avaliacoes',
  'vincula_imovel',
  'cancela_avaliacao_sicaq',
  'cancela_proposta_siopi',
  'solicitar_avaliacao_sigdu',
  'outras'
);

-- Create demand_status enum
CREATE TYPE public.demand_status AS ENUM ('pendente', 'concluida', 'cancelada');

-- Create demands table
CREATE TABLE public.demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cca_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_cca TEXT NOT NULL,
  type demand_type NOT NULL,
  cpf TEXT,
  matricula TEXT,
  cartorio TEXT,
  description TEXT,
  status demand_status NOT NULL DEFAULT 'pendente',
  response_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  concluded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- Demands policies
CREATE POLICY "CCAs can view their own demands"
  ON public.demands FOR SELECT
  USING (auth.uid() = cca_user_id);

CREATE POLICY "Agencia can view all demands"
  ON public.demands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'agencia'
    )
  );

CREATE POLICY "CCAs can create demands"
  ON public.demands FOR INSERT
  WITH CHECK (
    auth.uid() = cca_user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'cca'
    )
  );

CREATE POLICY "Agencia can update demands"
  ON public.demands FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'agencia'
    )
  );

-- Create modalidade enum
CREATE TYPE public.modalidade_financiamento AS ENUM ('SBPE', 'MCMV', 'OUTRO');

-- Create conformidades table
CREATE TABLE public.conformidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cca_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_cca TEXT NOT NULL,
  cpf TEXT NOT NULL,
  valor_financiamento DECIMAL(15, 2) NOT NULL,
  modalidade modalidade_financiamento NOT NULL,
  modalidade_outro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.conformidades ENABLE ROW LEVEL SECURITY;

-- Conformidades policies
CREATE POLICY "CCAs can view their own conformidades"
  ON public.conformidades FOR SELECT
  USING (auth.uid() = cca_user_id);

CREATE POLICY "Agencia can view all conformidades"
  ON public.conformidades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'agencia'
    )
  );

CREATE POLICY "CCAs can create conformidades"
  ON public.conformidades FOR INSERT
  WITH CHECK (
    auth.uid() = cca_user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'cca'
    )
  );

-- Create agendamentos table
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conformidade_id UUID NOT NULL REFERENCES public.conformidades(id) ON DELETE CASCADE,
  cca_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('assinatura', 'entrevista')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Agendamentos policies
CREATE POLICY "CCAs can view their own agendamentos"
  ON public.agendamentos FOR SELECT
  USING (auth.uid() = cca_user_id);

CREATE POLICY "Agencia can view all agendamentos"
  ON public.agendamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'agencia'
    )
  );

CREATE POLICY "CCAs can create agendamentos"
  ON public.agendamentos FOR INSERT
  WITH CHECK (
    auth.uid() = cca_user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'cca'
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demands_updated_at
  BEFORE UPDATE ON public.demands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    role,
    codigo_cca
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'cca'),
    NEW.raw_user_meta_data->>'codigo_cca'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();