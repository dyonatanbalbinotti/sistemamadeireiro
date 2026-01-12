-- Atualizar função para incluir funcionários vinculados à empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN _empresa_id IS NULL THEN false
    ELSE (
      -- Usuário é dono da empresa
      EXISTS (
        SELECT 1
        FROM public.empresas
        WHERE id = _empresa_id
          AND user_id = auth.uid()
      )
      -- OU usuário é funcionário vinculado à empresa
      OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND empresa_id = _empresa_id
      )
      -- OU usuário é admin
      OR public.is_admin(auth.uid())
    )
  END
$$;