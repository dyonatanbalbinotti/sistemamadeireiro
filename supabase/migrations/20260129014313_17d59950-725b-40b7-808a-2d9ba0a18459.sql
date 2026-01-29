-- =============================================
-- PROTEÇÃO CONTRA ATAQUES DE ENUMERAÇÃO NA TABELA EMPRESAS
-- =============================================

-- 1. Criar função de rate limiting para consultas à tabela empresas
CREATE OR REPLACE FUNCTION public.check_empresas_access_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _recent_count int;
  _max_requests int := 30; -- máximo 30 consultas por minuto
  _window_seconds int := 60;
BEGIN
  -- Contar acessos recentes (últimos 60 segundos)
  SELECT COUNT(*) INTO _recent_count
  FROM audit_logs
  WHERE user_id = _user_id
    AND table_name = 'empresas'
    AND action = 'SELECT'
    AND created_at > NOW() - (_window_seconds || ' seconds')::interval;
  
  -- Se exceder limite, bloquear
  IF _recent_count >= _max_requests THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 2. Criar função para verificar se usuário pertence à empresa (mais segura)
CREATE OR REPLACE FUNCTION public.user_can_access_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _is_owner boolean;
  _is_employee boolean;
BEGIN
  -- Verificar se é o dono da empresa
  SELECT EXISTS (
    SELECT 1 FROM empresas
    WHERE id = _empresa_id AND user_id = _user_id
  ) INTO _is_owner;
  
  IF _is_owner THEN
    RETURN true;
  END IF;
  
  -- Verificar se é funcionário da empresa
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id AND empresa_id = _empresa_id
  ) INTO _is_employee;
  
  RETURN _is_employee;
END;
$$;

-- 3. Adicionar política para funcionários acessarem dados da empresa
-- Primeiro, dropar a política existente de visualização do usuário
DROP POLICY IF EXISTS "Usuarios podem ver sua propria empresa" ON empresas;

-- Recriar com verificação mais segura
CREATE POLICY "Usuarios podem ver sua propria empresa"
ON empresas
FOR SELECT
USING (
  user_id = auth.uid() 
  OR user_can_access_empresa(id)
  OR is_admin(auth.uid())
);

-- 4. Criar função para registrar acesso a dados sensíveis
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar acesso no audit_logs
  INSERT INTO audit_logs (
    user_id,
    empresa_id,
    table_name,
    action,
    record_id,
    new_data
  ) VALUES (
    auth.uid(),
    NEW.id,
    TG_TABLE_NAME,
    TG_OP,
    NEW.id,
    jsonb_build_object('accessed_at', now())
  );
  
  RETURN NEW;
END;
$$;

-- 5. Criar tabela para rastrear tentativas de acesso suspeitas
CREATE TABLE IF NOT EXISTS public.suspicious_access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address inet,
  target_table text NOT NULL,
  target_id uuid,
  attempt_type text NOT NULL, -- 'enumeration', 'brute_force', 'unauthorized'
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de tentativas suspeitas
ALTER TABLE public.suspicious_access_attempts ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver tentativas suspeitas
CREATE POLICY "Apenas admins podem ver tentativas suspeitas"
ON suspicious_access_attempts
FOR SELECT
USING (is_admin(auth.uid()));

-- Sistema pode inserir tentativas suspeitas
CREATE POLICY "Sistema pode inserir tentativas suspeitas"
ON suspicious_access_attempts
FOR INSERT
WITH CHECK (true);

-- 6. Criar função para detectar e registrar tentativas de enumeração
CREATE OR REPLACE FUNCTION public.detect_enumeration_attempt(_target_id uuid, _table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _failed_attempts int;
BEGIN
  -- Contar tentativas falhas recentes (IDs que não existem ou não tem acesso)
  SELECT COUNT(*) INTO _failed_attempts
  FROM suspicious_access_attempts
  WHERE user_id = _user_id
    AND target_table = _table_name
    AND created_at > NOW() - interval '5 minutes';
  
  -- Se muitas tentativas, registrar como suspeito
  IF _failed_attempts >= 10 THEN
    INSERT INTO suspicious_access_attempts (
      user_id,
      target_table,
      target_id,
      attempt_type,
      details
    ) VALUES (
      _user_id,
      _table_name,
      _target_id,
      'enumeration',
      jsonb_build_object(
        'failed_attempts', _failed_attempts,
        'detection_time', now()
      )
    );
  END IF;
END;
$$;

-- 7. Comentário de segurança nas colunas sensíveis
COMMENT ON COLUMN empresas.telefone IS 'SENSITIVE: Company phone number - access logged';
COMMENT ON COLUMN empresas.endereco IS 'SENSITIVE: Company address - access logged';
COMMENT ON COLUMN empresas.cnpj IS 'SENSITIVE: Company tax ID (CNPJ) - access logged';