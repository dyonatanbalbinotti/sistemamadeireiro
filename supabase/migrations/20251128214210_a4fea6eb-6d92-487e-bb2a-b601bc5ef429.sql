-- Adiciona política explícita bloqueando acesso anônimo/não autenticado
-- Esta política garante que apenas usuários autenticados possam visualizar perfis
CREATE POLICY "Bloquear acesso anônimo"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Agora temos proteção em camadas:
-- 1. Bloqueia explicitamente usuários anônimos
-- 2. Admins podem ver todos os perfis
-- 3. Usuários autenticados podem ver apenas seu próprio perfil