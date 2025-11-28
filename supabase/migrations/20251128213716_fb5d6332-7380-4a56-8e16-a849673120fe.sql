-- Adiciona política para usuários poderem ver seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Agora temos duas políticas de SELECT:
-- 1. Admins podem ver todos os perfis (política já existente)
-- 2. Usuários podem ver apenas seu próprio perfil (nova política)