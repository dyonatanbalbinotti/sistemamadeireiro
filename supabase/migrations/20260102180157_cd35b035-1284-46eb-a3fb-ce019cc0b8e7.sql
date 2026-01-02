-- =============================================
-- SECURITY AUDIT MIGRATION - LGPD & OWASP COMPLIANCE
-- =============================================

-- 1. Fix conflicting RLS policy on itens_pedido (CRITICAL)
DROP POLICY IF EXISTS "Usuários podem criar itens de pedidos da sua empresa" ON public.itens_pedido;

-- 2. Create audit_logs table for security tracking (LGPD compliance)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  empresa_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_id ON public.audit_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (security sensitive)
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- System can insert audit logs via function
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Create security-enhanced function for audit logging
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _table_name TEXT,
  _record_id UUID DEFAULT NULL,
  _old_data JSONB DEFAULT NULL,
  _new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _audit_id UUID;
  _empresa_id UUID;
BEGIN
  -- Get user's empresa_id if exists
  SELECT id INTO _empresa_id 
  FROM public.empresas 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  INSERT INTO public.audit_logs (
    user_id,
    empresa_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
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

-- 4. Create login_attempts table for brute force protection
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts(ip_address);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only system can insert login attempts
CREATE POLICY "System insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Only admins can view login attempts
CREATE POLICY "Admins view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Function to check rate limiting for login
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _failed_attempts INT;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO _failed_attempts
  FROM public.login_attempts
  WHERE email = LOWER(TRIM(_email))
    AND success = false
    AND created_at > (now() - INTERVAL '15 minutes');

  -- Block if more than 5 failed attempts
  RETURN _failed_attempts < 5;
END;
$$;

-- 6. Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(_email TEXT, _success BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success)
  VALUES (LOWER(TRIM(_email)), _success);
END;
$$;

-- 7. Improve user_belongs_to_empresa function with null checks
CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Early return false if auth.uid() is null
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN _empresa_id IS NULL THEN false
    ELSE (
      EXISTS (
        SELECT 1
        FROM public.empresas
        WHERE id = _empresa_id
          AND user_id = auth.uid()
      )
      OR public.is_admin(auth.uid())
    )
  END
$$;

-- 8. Improve is_admin function with additional validation
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'admin'::app_role
    )
  END
$$;

-- 9. Create LGPD consent tracking table
CREATE TABLE IF NOT EXISTS public.lgpd_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_consents_user_id ON public.lgpd_consents(user_id);

ALTER TABLE public.lgpd_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users view own consents"
ON public.lgpd_consents
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert/update their own consents
CREATE POLICY "Users manage own consents"
ON public.lgpd_consents
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all consents
CREATE POLICY "Admins view all consents"
ON public.lgpd_consents
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 10. Create data deletion request table (LGPD right to erasure)
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_user_id ON public.data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_status ON public.data_deletion_requests(status);

ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users view own deletion requests"
ON public.data_deletion_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create deletion requests
CREATE POLICY "Users create deletion requests"
ON public.data_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can manage all requests
CREATE POLICY "Admins manage deletion requests"
ON public.data_deletion_requests
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- 11. Add trigger for audit logging on critical tables
CREATE OR REPLACE FUNCTION public.trigger_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Add audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

DROP TRIGGER IF EXISTS audit_empresas ON public.empresas;
CREATE TRIGGER audit_empresas
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

DROP TRIGGER IF EXISTS audit_configuracoes ON public.configuracoes;
CREATE TRIGGER audit_configuracoes
  AFTER INSERT OR UPDATE OR DELETE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

DROP TRIGGER IF EXISTS audit_historico_anuidades ON public.historico_anuidades;
CREATE TRIGGER audit_historico_anuidades
  AFTER INSERT OR UPDATE OR DELETE ON public.historico_anuidades
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();