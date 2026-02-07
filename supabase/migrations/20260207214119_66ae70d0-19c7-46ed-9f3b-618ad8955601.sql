
-- Drop the problematic policy
DROP POLICY IF EXISTS "Acesso seguro a perfis" ON public.profiles;

-- Recreate using security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM profiles WHERE id = _user_id;
$$;

CREATE POLICY "Acesso seguro a perfis"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM empresas 
    WHERE empresas.id = profiles.empresa_id 
    AND empresas.user_id = auth.uid()
  )
  OR (
    profiles.empresa_id IS NOT NULL 
    AND profiles.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);
