-- Remove a política insegura que permite usuários criarem seus próprios roles
DROP POLICY IF EXISTS "Usuários podem criar seu próprio role inicial" ON public.user_roles;

-- Modifica o trigger handle_new_user para criar automaticamente um role 'user' padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insere o perfil do usuário
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email
  );
  
  -- Cria automaticamente um role 'user' padrão para novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  
  RETURN NEW;
END;
$function$;

-- Apenas admins podem inserir roles (para casos excepcionais)
CREATE POLICY "Apenas admins podem inserir roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Apenas admins podem atualizar roles
CREATE POLICY "Apenas admins podem atualizar roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Apenas admins podem deletar roles
CREATE POLICY "Apenas admins podem deletar roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));