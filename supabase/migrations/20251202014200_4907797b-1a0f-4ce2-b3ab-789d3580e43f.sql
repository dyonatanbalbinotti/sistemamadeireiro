-- Remover coluna email da tabela profiles (segurança: evitar exposição de emails)
-- Emails devem ser acessados apenas via auth.users por funções administrativas
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Atualizar função handle_new_user para não incluir email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insere o perfil do usuário (sem email)
  INSERT INTO public.profiles (id, nome)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nome', '')
  );
  
  -- Cria automaticamente um role 'user' padrão para novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  
  RETURN NEW;
END;
$$;