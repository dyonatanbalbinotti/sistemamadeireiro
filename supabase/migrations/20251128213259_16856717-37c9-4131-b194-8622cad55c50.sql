-- Remove a política de SELECT existente que permite acesso não autenticado
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil ou admin vê todos" ON public.profiles;

-- Cria nova política que permite APENAS administradores visualizarem perfis
CREATE POLICY "Apenas admins podem visualizar perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- A política de UPDATE permanece para que usuários possam atualizar seus próprios dados
-- mas não podem ler outros perfis