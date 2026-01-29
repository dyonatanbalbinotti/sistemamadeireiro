-- 1. Criar função para verificar acesso legítimo a perfis com rate limiting
CREATE OR REPLACE FUNCTION public.can_access_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _profile_empresa_id uuid;
  _user_empresa_id uuid;
  _is_admin boolean;
  _is_owner boolean;
  _is_self boolean;
BEGIN
  -- Sempre pode ver seu próprio perfil
  IF _user_id = _profile_id THEN
    RETURN true;
  END IF;
  
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO _is_admin;
  
  IF _is_admin THEN
    RETURN true;
  END IF;
  
  -- Obter empresa_id do perfil alvo
  SELECT empresa_id INTO _profile_empresa_id
  FROM profiles WHERE id = _profile_id;
  
  -- Se perfil não existe, negar acesso (não revelar existência)
  IF _profile_empresa_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se usuário é dono da empresa do perfil
  SELECT EXISTS (
    SELECT 1 FROM empresas 
    WHERE id = _profile_empresa_id AND user_id = _user_id
  ) INTO _is_owner;
  
  IF _is_owner THEN
    RETURN true;
  END IF;
  
  -- Verificar se é funcionário da mesma empresa (pode ver colegas)
  SELECT empresa_id INTO _user_empresa_id
  FROM profiles WHERE id = _user_id;
  
  IF _user_empresa_id = _profile_empresa_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 2. Remover políticas antigas de SELECT
DROP POLICY IF EXISTS "Usuarios podem ver seu proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Donos podem ver perfis de funcionários da empresa" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;

-- 3. Criar política unificada mais segura usando a função
CREATE POLICY "Acesso seguro a perfis"
ON public.profiles
FOR SELECT
USING (
  -- Próprio perfil
  id = auth.uid()
  -- OU Admin
  OR public.is_admin(auth.uid())
  -- OU Dono da empresa do perfil
  OR EXISTS (
    SELECT 1 FROM empresas 
    WHERE empresas.id = profiles.empresa_id 
    AND empresas.user_id = auth.uid()
  )
  -- OU Funcionário da mesma empresa (pode ver colegas)
  OR EXISTS (
    SELECT 1 FROM profiles p2
    WHERE p2.id = auth.uid()
    AND p2.empresa_id = profiles.empresa_id
    AND p2.empresa_id IS NOT NULL
  )
);

-- 4. Adicionar log de acesso a perfis para auditoria
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar apenas acessos a perfis de terceiros
  IF NEW.id != auth.uid() THEN
    INSERT INTO audit_logs (
      user_id,
      table_name,
      action,
      record_id,
      new_data
    ) VALUES (
      auth.uid(),
      'profiles',
      'ACCESS',
      NEW.id,
      jsonb_build_object('accessed_at', now(), 'target_nome', NEW.nome)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Criar função para detectar acessos suspeitos a perfis
CREATE OR REPLACE FUNCTION public.check_profile_access_rate()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _recent_access_count int;
BEGIN
  -- Contar acessos a perfis diferentes nos últimos 60 segundos
  SELECT COUNT(DISTINCT record_id) INTO _recent_access_count
  FROM audit_logs
  WHERE user_id = _user_id
    AND table_name = 'profiles'
    AND action = 'ACCESS'
    AND created_at > NOW() - interval '60 seconds';
  
  -- Se acessou mais de 20 perfis diferentes em 1 minuto, é suspeito
  IF _recent_access_count > 20 THEN
    INSERT INTO suspicious_access_attempts (
      user_id,
      target_table,
      attempt_type,
      details
    ) VALUES (
      _user_id,
      'profiles',
      'mass_profile_access',
      jsonb_build_object(
        'profiles_accessed', _recent_access_count,
        'detection_time', now()
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;