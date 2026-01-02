-- Primeiro, alterar a coluna user_id para permitir NULL em audit_logs (operações do sistema)
ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- Recriar a função log_audit_event para lidar com user_id nulo
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text, 
  _table_name text, 
  _record_id uuid DEFAULT NULL::uuid, 
  _old_data jsonb DEFAULT NULL::jsonb, 
  _new_data jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _audit_id UUID;
  _empresa_id UUID;
  _user_id UUID;
BEGIN
  -- Get current user id (can be null for system operations)
  _user_id := auth.uid();
  
  -- Get user's empresa_id if exists
  IF _user_id IS NOT NULL THEN
    SELECT id INTO _empresa_id 
    FROM public.empresas 
    WHERE user_id = _user_id 
    LIMIT 1;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    empresa_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    _user_id,
    _empresa_id,
    _action,
    _table_name,
    _record_id,
    -- Sanitize sensitive data before logging
    CASE 
      WHEN _old_data ? 'password' THEN _old_data - 'password'
      WHEN _old_data ? 'token' THEN _old_data - 'token'
      ELSE _old_data
    END,
    CASE 
      WHEN _new_data ? 'password' THEN _new_data - 'password'
      WHEN _new_data ? 'token' THEN _new_data - 'token'
      ELSE _new_data
    END
  )
  RETURNING id INTO _audit_id;

  RETURN _audit_id;
END;
$$;