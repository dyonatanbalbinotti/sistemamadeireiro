-- Remover política antiga que só permite ver o próprio perfil
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;

-- Criar nova política que permite ver próprio perfil OU se for admin
CREATE POLICY "Usuários podem ver seu próprio perfil ou admin vê todos"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR 
  is_admin(auth.uid())
);