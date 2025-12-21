-- Corrigir políticas RLS da tabela empresas para exigir autenticação

-- Primeiro, remover as políticas existentes que são RESTRICTIVE
DROP POLICY IF EXISTS "Admins podem ver todas as empresas" ON public.empresas;
DROP POLICY IF EXISTS "Usuários podem atualizar sua própria empresa" ON public.empresas;
DROP POLICY IF EXISTS "Usuários podem ver sua própria empresa" ON public.empresas;

-- Criar novas políticas PERMISSIVE (padrão) que exigem autenticação

-- Política para admins verem todas as empresas (requer autenticação)
CREATE POLICY "Admins podem ver todas as empresas" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- Política para usuários verem sua própria empresa (requer autenticação)
CREATE POLICY "Usuarios podem ver sua propria empresa" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Política para usuários atualizarem sua própria empresa (requer autenticação)
CREATE POLICY "Usuarios podem atualizar sua propria empresa" 
ON public.empresas 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política para admins atualizarem qualquer empresa
CREATE POLICY "Admins podem atualizar qualquer empresa" 
ON public.empresas 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Política para admins inserirem empresas
CREATE POLICY "Admins podem inserir empresas" 
ON public.empresas 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Política para admins deletarem empresas
CREATE POLICY "Admins podem deletar empresas" 
ON public.empresas 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));