-- Corrigir políticas RLS das tabelas empresas e profiles para exigir autenticação

-- =============================================
-- TABELA: empresas
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Admins podem ver todas as empresas" ON public.empresas;
DROP POLICY IF EXISTS "Usuarios podem ver sua propria empresa" ON public.empresas;
DROP POLICY IF EXISTS "Usuarios podem atualizar sua propria empresa" ON public.empresas;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer empresa" ON public.empresas;
DROP POLICY IF EXISTS "Admins podem inserir empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins podem deletar empresas" ON public.empresas;

-- Criar novas políticas PERMISSIVE que exigem autenticação
CREATE POLICY "Admins podem ver todas as empresas" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Usuarios podem ver sua propria empresa" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Usuarios podem atualizar sua propria empresa" 
ON public.empresas 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins podem atualizar qualquer empresa" 
ON public.empresas 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir empresas" 
ON public.empresas 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar empresas" 
ON public.empresas 
FOR DELETE 
TO authenticated
USING (public.is_admin(auth.uid()));

-- =============================================
-- TABELA: profiles
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Apenas admins podem visualizar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;

-- Criar novas políticas PERMISSIVE que exigem autenticação
CREATE POLICY "Usuarios podem ver seu proprio perfil" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins podem ver todos os perfis" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Usuarios podem atualizar seu proprio perfil" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());