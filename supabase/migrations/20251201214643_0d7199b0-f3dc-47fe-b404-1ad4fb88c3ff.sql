-- Remove a política conflitante que bloqueia acesso anônimo com 'false'
-- Esta política pode causar conflitos com outras políticas de acesso
DROP POLICY IF EXISTS "Bloquear acesso anônimo" ON public.profiles;

-- A política "Usuários podem ver seu próprio perfil" já existe e é suficiente
-- Ela garante que apenas usuários autenticados podem ver seus próprios dados
-- usando (auth.uid() = id), que é a abordagem recomendada

-- Verificamos também se a política de admin está correta
-- As políticas existentes são:
-- 1. "Apenas admins podem visualizar perfis" - permite admins verem todos os perfis
-- 2. "Usuários podem ver seu próprio perfil" - permite usuários verem apenas seu próprio perfil

-- Não é necessário criar novas políticas, apenas remover a conflitante