-- Atualizar a função handle_new_user para usar o email de cadastro como email_preferencia padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_codigo_cca text;
BEGIN
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'cca');
  
  -- Para usuários agencia/admin, usar 'AGENCIA' ou 'ADMIN' como codigo_cca
  -- Para CCAs, pegar do metadata ou usar placeholder
  IF user_role = 'agencia' THEN
    user_codigo_cca := 'AGENCIA';
  ELSIF user_role = 'admin' THEN
    user_codigo_cca := 'ADMIN';
  ELSE
    user_codigo_cca := COALESCE(NEW.raw_user_meta_data->>'codigo_cca', 'PENDENTE');
  END IF;
  
  INSERT INTO public.profiles (user_id, full_name, phone, codigo_cca, email_preferencia)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    user_codigo_cca,
    NEW.email  -- Usa o email de cadastro como padrão para notificações
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;